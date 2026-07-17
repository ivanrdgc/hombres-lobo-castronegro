// Acciones sobre Firestore: lobby, configuración y partida (modo automático y
// manual). Port literal de public/js/actions.js con tipos; misma semántica de
// transacciones «primero gana» y mismos documentos.
import {
  db, doc, getDoc, updateDoc, deleteDoc, runTransaction, writeBatch, getDocs, collection,
} from '../../core/sync/fb';
import type { Transaction } from 'firebase/firestore';
import { state, saveSession, clearSession, navigate } from '../../core/sync/store.svelte';
import { CodedError } from '../../core/sync/guard';
import { slugify, randomId, playerIdFor } from '../../core/util/ids';
import type { GroupDoc, PlayerDoc, TableSettings } from '../../core/sync/schema';
import { dealRoles, ROLES, isWolfSide, isWolfTeamRole, OFFICIAL_MIN_PLAYERS, CASUAL_MIN_PLAYERS, generateKeywords } from './roles';
import type { RoleDef, RoleId } from './roles';
import {
  computeNightSteps, stepActors, resolveDawn, resolveVote, applyDeathsChain,
  checkWinner, annotateDeaths, rotateKeyword, GITANA_QUESTIONS,
} from './engine';
import type { GameState, StepId, WinnerId } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON round-trip genérico
const sanitize = <T>(x: T): any => JSON.parse(JSON.stringify(x === undefined ? null : x));

// Firestore puede devolver «resource-exhausted» en ráfagas puntuales:
// se reintenta con espera creciente en vez de enseñar un error al jugador.
async function txWithRetry<T>(body: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await runTransaction(db, body);
    } catch (e) {
      if ((e as { code?: string })?.code === 'resource-exhausted' && attempt < 3) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
}

const gref = (slug: string) => doc(db, 'groups', slug);
const pref = (slug: string, pid: string) => doc(db, 'groups', slug, 'players', pid);
const mySlug = () => state.route.slug!;
const myPid = () => state.session!.pid;

// Composición recomendada por el reglamento para una primera partida.
export const DEFAULT_EXTRA_ROLES: RoleId[] = ['vidente', 'bruja', 'cazador', 'cupido'];

export const DEFAULT_SETTINGS: TableSettings = {
  revealDead: true, showComposition: true, alguacil: false, casual: false,
  primeraNocheTranquila: false, wolvesCount: null, // null = tabla oficial
  villagersCount: null, // null = los aldeanos rellenan los huecos libres
  videnteSoloBando: false, // la vidente solo ve si es lobo o no
  ocultarCausas: false, // no anunciar la causa de las muertes nocturnas
  pacing: 'teatral', // ritmo por defecto: pausas amplias y guion con ambientación
};

// ——— Lobby ———

// Elegir (o cambiar) el juego de la mesa: lo ve todo el grupo al instante.
export async function selectGame(gameId: string | null): Promise<void> {
  await updateDoc(gref(mySlug()), { currentGame: gameId || null });
}

// Elegir el dispositivo que narrará las partidas automáticas (se recuerda para
// todos los juegos). Durante una partida automática en curso, el narrador ES el
// máster: al cambiarlo se traspasa el mando y el nuevo dispositivo toma la voz.
export async function setNarratorDevice(pid: string | null): Promise<void> {
  const g = state.group;
  const patch: Record<string, unknown> = { lastNarratorId: pid || null };
  if (pid && g?.status === 'playing' && g.game && g.game.mode === 'auto') patch.masterId = pid;
  await updateDoc(gref(mySlug()), patch);
}

export async function createGroup(userName: string, groupName: string): Promise<void> {
  const slug = slugify(groupName);
  if (!slug) throw new Error('Nombre de grupo no válido.');
  const pid = playerIdFor(userName);
  if (!pid) throw new Error('Nombre de jugador no válido.');
  const token = randomId('t');
  await txWithRetry(async (tx) => {
    const g = await tx.get(gref(slug));
    if (g.exists()) throw new CodedError('group-taken');
    tx.set(gref(slug), {
      name: groupName.trim(),
      createdAt: Date.now(),
      masterId: null, // en el lobby no hay máster: todos configuran e inician
      lastNarratorId: pid, // el primer dispositivo narra por defecto (cambiable)
      currentGame: null, // la mesa elige juego después
      status: 'lobby',
      settings: DEFAULT_SETTINGS,
      extraRoles: DEFAULT_EXTRA_ROLES,
      game: null,
    });
    tx.set(pref(slug, pid), basePlayer(userName, token));
  });
  saveSession(slug, { pid, token, name: userName.trim() });
  navigate('/g/' + slug);
}

export async function joinGroup(slug: string, userName: string): Promise<void> {
  const pid = playerIdFor(userName);
  if (!pid) throw new Error('Nombre de jugador no válido.');
  const token = randomId('t');
  await txWithRetry(async (tx) => {
    const g = await tx.get(gref(slug));
    if (!g.exists()) throw new CodedError('no-group');
    const p = await tx.get(pref(slug, pid));
    if (p.exists()) throw new CodedError('name-taken');
    if (g.data().status === 'playing') throw new CodedError('playing');
    tx.set(pref(slug, pid), basePlayer(userName, token));
  });
  saveSession(slug, { pid, token, name: userName.trim() });
}

// Reconectar como un jugador existente (desconecta el dispositivo anterior).
export async function takeOverPlayer(slug: string, userName: string): Promise<void> {
  const pid = playerIdFor(userName);
  if (!pid) throw new CodedError('no-player');
  const token = randomId('t');
  const snap = await getDoc(pref(slug, pid));
  if (!snap.exists()) throw new CodedError('no-player');
  await updateDoc(pref(slug, pid), { deviceToken: token, heartbeatAt: Date.now() });
  saveSession(slug, { pid, token, name: snap.data().name });
}

// Entrar en un grupo que ya existe desde la portada: como jugador o reclamando
// el rol de máster (el máster anterior pasa a ser un jugador más). Si el nombre
// ya está en uso dentro del grupo, se reconecta como ese jugador.
export async function joinExistingGroup(groupName: string, userName: string, claimMaster: boolean): Promise<void> {
  const slug = slugify(groupName);
  const pid = playerIdFor(userName);
  if (!slug || !pid) throw new Error('Nombre no válido.');
  const token = randomId('t');
  let joinedName = userName.trim();
  await txWithRetry(async (tx) => {
    const g = await tx.get(gref(slug));
    if (!g.exists()) throw new CodedError('no-group');
    const p = await tx.get(pref(slug, pid));
    if (p.exists()) {
      joinedName = p.data().name;
      tx.update(pref(slug, pid), { deviceToken: token, heartbeatAt: Date.now() });
    } else {
      if (g.data().status === 'playing') throw new CodedError('playing');
      tx.set(pref(slug, pid), basePlayer(userName, token));
    }
    if (claimMaster) tx.update(gref(slug), { masterId: pid });
  });
  saveSession(slug, { pid, token, name: joinedName });
  navigate('/g/' + slug);
}

function basePlayer(name: string, token: string) {
  return {
    name: name.trim(), deviceToken: token, order: Date.now(),
    role: null, alive: null, inGame: false,
    isPlayer: true, // por defecto todo dispositivo juega; se puede desactivar
    heartbeatAt: Date.now(), // nace «activo»: el latido periódico lo mantiene
  };
}

// Activa/desactiva un dispositivo como jugador (se recuerda entre partidas).
export async function setPlayerActive(pid: string, active: boolean): Promise<void> {
  await updateDoc(pref(mySlug(), pid), { isPlayer: !!active });
}

export async function leaveGroup(): Promise<void> {
  const slug = state.route.slug;
  const myId = state.session?.pid;
  if (!slug || !myId) return;
  await txWithRetry(async (tx) => {
    const g = await tx.get(gref(slug));
    if (!g.exists()) return;
    const others = state.players.filter((p) => p.id !== myId);
    if (!others.length) {
      tx.delete(pref(slug, myId));
      tx.delete(gref(slug));
      return;
    }
    if (g.data().masterId === myId) {
      tx.update(gref(slug), { masterId: others[0].id });
    }
    tx.delete(pref(slug, myId));
  });
  clearSession(slug);
  navigate('/');
}

export async function kickPlayer(pid: string): Promise<void> {
  await deleteDoc(pref(mySlug(), pid));
}

export async function deleteGroup(): Promise<void> {
  const slug = mySlug();
  const ps = await getDocs(collection(db, 'groups', slug, 'players'));
  const batch = writeBatch(db);
  ps.forEach((d) => batch.delete(d.ref));
  batch.delete(gref(slug));
  await batch.commit();
  clearSession(slug);
  navigate('/');
}

// Orden de la mesa (sentido horario). Se guarda en el grupo y persiste entre partidas.
export async function setSeating(order: string[]): Promise<void> {
  await updateDoc(gref(mySlug()), { seating: order });
}

export async function setExtraRoles(roles: RoleId[]): Promise<void> {
  await updateDoc(gref(mySlug()), { extraRoles: roles });
}

// Restaura la composición recomendada (roles, lobos en auto, sin alguacil).
export async function resetRolesConfig(): Promise<void> {
  const s = { ...DEFAULT_SETTINGS, ...(state.group?.settings || {}), wolvesCount: null, villagersCount: null, alguacil: false };
  await updateDoc(gref(mySlug()), { extraRoles: DEFAULT_EXTRA_ROLES, settings: s });
}

// Restaura los ajustes de partida (sin tocar la composición del menú de roles).
export async function resetGameSettings(): Promise<void> {
  const cur = state.group?.settings || {};
  const s = { ...DEFAULT_SETTINGS, wolvesCount: cur.wolvesCount ?? null, villagersCount: cur.villagersCount ?? null, alguacil: !!cur.alguacil };
  await updateDoc(gref(mySlug()), { settings: s });
}

export async function setSettings(patch: Partial<TableSettings>): Promise<void> {
  // Escritura atómica por campo: dos cambios seguidos nunca se pisan entre sí.
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) updates['settings.' + k] = v === undefined ? null : v;
  await updateDoc(gref(mySlug()), updates);
}

export async function makeMaster(pid: string): Promise<void> {
  await updateDoc(gref(mySlug()), { masterId: pid });
}

// ——— Inicio y fin de partida ———

// El máster (narrador) y QUIÉNES juegan se deciden AQUÍ, al arrancar (pantalla
// «Empezar partida»):
//   auto            → narratorId es el dispositivo elegido para narrar
//   manual / guiado → el máster es quien pulsa empezar (state.session.pid)
// playerIds es la selección explícita de quién recibe rol. En automático el
// narrador puede además jugar (mismo móvil) o solo narrar (tele/altavoz); en
// guiado/manual el narrador humano nunca juega.
export async function startGame(mode: 'auto' | 'manual' | 'guiado', narratorId: string | null, playerIds: string[]): Promise<void> {
  const slug = mySlug();
  const ids = state.players.map((p) => p.id);
  await txWithRetry(async (tx) => {
    const gsnap = await tx.get(gref(slug));
    const g = gsnap.data() as GroupDoc | undefined;
    if (!g || g.status !== 'lobby') throw new Error('Estado no válido');
    const masterId = (mode === 'auto' ? narratorId : myPid()) || myPid();
    const snaps = await Promise.all(ids.map((id) => tx.get(pref(slug, id))));
    const players = snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }) as PlayerDoc);
    if (!players.some((p) => p.id === masterId)) throw new Error('El narrador elegido ya no está en el grupo.');
    // Orden de mesa: el guardado en el grupo manda; los nuevos se añaden al final.
    const savedSeating = Array.isArray(g.seating) ? g.seating : [];
    const seatOrder = savedSeating.filter((id) => players.some((p) => p.id === id))
      .concat(players.filter((p) => !savedSeating.includes(p.id))
        .sort((a, b) => (a.order || 0) - (b.order || 0)).map((p) => p.id));
    const seatIdx = Object.fromEntries(seatOrder.map((id, i) => [id, i]));
    for (const p of players) p.order = seatIdx[p.id] ?? p.order;
    const eligible = players.filter((p) => playerIds.includes(p.id) && (mode === 'auto' || p.id !== masterId));
    const settings0 = g.settings || DEFAULT_SETTINGS;
    // Reglas oficiales: de 8 a 18 jugadores además del narrador.
    const minP = settings0.casual ? CASUAL_MIN_PLAYERS : OFFICIAL_MIN_PLAYERS;
    if (eligible.length < minP) {
      throw new Error(settings0.casual
        ? `Hacen falta al menos ${CASUAL_MIN_PLAYERS} jugadores seleccionados.`
        : `Las reglas oficiales piden al menos ${OFFICIAL_MIN_PLAYERS} jugadores. Puedes activar el «modo casual» en los ajustes para jugar desde ${CASUAL_MIN_PLAYERS}.`);
    }

    const seed = Math.floor(Date.now() % 2147483647);
    const { assignments, center, composition, dropped } = dealRoles(
      eligible, g.extraRoles || [], seed, settings0.wolvesCount || null,
      settings0.villagersCount ?? null); // 0 aldeanos es un valor válido

    // Palabras clave: solo hacen falta si hay roles que designan jugadores en
    // secreto durante la noche (enamorados de Cupido, encantados del Gaitero).
    // Con composición secreta también se fingen los roles activados que no se
    // repartieron; para poder fingir a Cupido/Gaitero hacen falta palabras clave.
    const selectedRoles = (g.extraRoles || []).filter((r) => ROLES[r]);
    const fakeAllSelected = mode === 'auto' && !settings0.showComposition;
    const keywordsActive = mode === 'auto' && !!(composition.cupido || composition.gaitero
      || (fakeAllSelected && selectedRoles.some((r) => r === 'cupido' || r === 'gaitero')));
    // Se generan de sobra: una reserva para renovar las pronunciadas y un juego
    // de SEÑUELOS que jamás se asignan a nadie (para las llamadas falsas: así
    // no se quema la palabra de ningún jugador real).
    const kws = keywordsActive ? generateKeywords(eligible.length + 32, seed + 7) : [];
    const kwOf: Record<string, string | null> = {};
    eligible.forEach((p, i) => { kwOf[p.id] = kws[i] || null; });
    const kwPool = keywordsActive ? kws.slice(eligible.length, eligible.length + 20) : [];
    const kwDecoys = keywordsActive ? kws.slice(eligible.length + 20) : [];

    // Mitades de la mesa para el Abominable Sectario.
    const sorted = eligible.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const half = Math.ceil(sorted.length / 2);
    const sectOf: Record<string, 'A' | 'B'> = {};
    sorted.forEach((p, i) => { sectOf[p.id] = i < half ? 'A' : 'B'; });

    for (const p of players) {
      const roleId = assignments[p.id];
      if (!roleId) { // máster narrador en modo manual
        tx.update(pref(slug, p.id), sanitize({
          inGame: false, role: null, alive: null, roleSeen: true,
        }));
        continue;
      }
      tx.update(pref(slug, p.id), sanitize({
        inGame: true, role: roleId, alive: true, roleSeen: false, order: p.order,
        lover: false, charmed: false, infected: false, transformed: false,
        revealedTonto: false, ancianoHit: false, protectedLast: null,
        modelId: null, wolfSide: null, sect: sectOf[p.id], keyword: kwOf[p.id] || null,
        causeOfDeath: null, deathAt: null, actorPower: null, videnteLog: [],
        powers: { heal: true, poison: true, infect: true, zorro: true, juez: true },
      }));
    }

    const settings = g.settings || DEFAULT_SETTINGS;
    const modeName = ({ auto: 'automático', manual: 'manual', guiado: 'guiado' } as Record<string, string>)[mode] || mode;
    const log = [{ kind: 'evento', txt: `🌑 Comienza la partida en modo ${modeName} con ${eligible.length} jugadores.` }];
    if (settings.showComposition) {
      const compTxt = (Object.entries(composition) as [RoleId, number][])
        .map(([r, n]) => `${ROLES[r].emoji} ${ROLES[r].name}${n > 1 ? ' ×' + n : ''}`).join(', ');
      log.push({ kind: 'evento', txt: `🎴 Cartas en juego: ${compTxt}.${center.length ? ' (2 de ellas quedan en el centro para el Ladrón.)' : ''}` });
    } else {
      log.push({ kind: 'evento', txt: '🎴 La composición de roles permanece en secreto.' });
    }
    const aaId = Object.keys(assignments).find((id) => assignments[id] === 'aldeano_aldeano');
    if (aaId) {
      const aaName = (eligible.find((p) => p.id === aaId) || {}).name;
      log.push({ kind: 'evento', txt: `👥 La carta de ${aaName} tiene dos caras y ambas muestran un aldeano: ${aaName} es el Aldeano-Aldeano y todo el pueblo sabe con certeza que es inocente.` });
    }
    // Con composición secreta, los descartes NO se anuncian: la voz fingirá
    // que todos los roles activados están en juego.
    if (dropped.length && settings.showComposition) {
      const droppedTxt = dropped.map((d) => `${ROLES[d.id].name} (${d.reason === 'min' ? `pide ≥${(ROLES[d.id] as RoleDef).minPlayers} jugadores` : 'sin sitio en la mesa'})`).join(', ');
      log.push({ kind: 'evento', txt: `ℹ️ Roles activados pero no repartidos: ${droppedTxt}.` });
    }

    tx.update(gref(slug), sanitize({
      status: 'playing',
      masterId,
      lastNarratorId: masterId, // recordado para partidas sucesivas
      seating: seatOrder, // orden de mesa normalizado (recordado)
      game: {
        mode, startedAt: Date.now(), seed,
        night: 0, dayNum: 0,
        phase: mode === 'manual' ? 'manual' : 'reveal',
        stepIdx: 0, steps: [], acts: {},
        vote: null, votesLeft: 0, pending: [], winner: null, keywordsActive,
        kwPool, kwIdx: 0, kwDecoys,
        selectedRoles, fakeAllSelected, compositionPublic: !!settings0.showComposition,
        wolvesKnown: false, hermanasKnown: false, hermanosKnown: false,
        alguacilId: null, soloVoteId: null, soloVoteName: null, juezArmed: null,
        powersLost: false, wolfDeathOccurred: false, caballeroRust: null,
        gitanaQ: null, deathTick: 0, lastDawn: null,
        revealDead: !!settings.revealDead,
        noKillNight1: !!settings.primeraNocheTranquila,
        videnteBando: !!settings.videnteSoloBando,
        hideNightCauses: !!settings.ocultarCausas,
        roleRefresh: null, refreshNonce: 0, paused: null,
        composition, centerCards: center, dropped, log,
      },
    }));
  });
}

export async function confirmRoleSeen(): Promise<void> {
  await updateDoc(pref(mySlug(), myPid()), { roleSeen: true });
}

export async function backToLobby(): Promise<void> {
  const slug = mySlug();
  const batch = writeBatch(db);
  for (const p of state.players) {
    batch.update(pref(slug, p.id), sanitize({
      inGame: false, role: null, alive: null, roleSeen: false, lover: false,
      charmed: false, infected: false, transformed: false, revealedTonto: false,
      ancianoHit: false, protectedLast: null, modelId: null, wolfSide: null,
      sect: null, keyword: null, causeOfDeath: null, deathAt: null, actorPower: null, powers: null, videnteLog: null,
    }));
  }
  batch.update(gref(slug), { status: 'lobby', game: null, masterId: null });
  await batch.commit();
}

// Abandonar la partida en curso (salida administrativa): el rol se revela a
// todos y el jugador queda fuera AL INSTANTE, sin efectos de última hora (ni
// flecha del Cazador, ni muerte de pena del enamorado, ni sucesión del
// Alguacil). Si su marcha decide el ganador, la partida se cierra sola
// (en manual no: allí manda el narrador).
export async function leaveGame(): Promise<void> {
  await gameTx((game, players) => {
    if (game.phase === 'end') return null;
    const ps = inGamePlayers(players);
    const meP = ps.find((p) => p.id === myPid());
    if (!meP || meP.alive === false) return null;
    // El abandono respeta el ajuste de la mesa: con «revelar rol al morir» se
    // muestra la carta; con roles ocultos, se queda boca abajo como cualquier
    // otra muerte.
    const def = meP.role ? ROLES[meP.role] : null;
    game.log!.push({ kind: 'muerte', txt: game.revealDead !== false
      ? `🚪 ${meP.name} abandona la partida y muestra su carta: era ${def ? `${def.emoji} ${def.name}` : 'un misterio'}.`
      : `🚪 ${meP.name} abandona la partida. Su carta se queda boca abajo.` });
    meP.alive = false;
    meP.causeOfDeath = 'abandono';
    meP.deathAt = Date.now();
    meP.roleSeen = true; // el reparto no debe esperarle
    // Sus asuntos pendientes desaparecen sin resolverse.
    const hadSirvienta = (game.pending || []).some((h) => h.type === 'sirvienta' && h.targetId === meP.id);
    game.pending = (game.pending || []).filter((h) => h.pid !== meP.id && h.targetId !== meP.id);
    if (hadSirvienta) game.vote = null; // el juicio se disuelve: el condenado ya no está
    if (game.alguacilId === meP.id) {
      game.alguacilId = null;
      game.log!.push({ kind: 'evento', txt: '⭐ El pueblo se queda sin Alguacil.' });
    }
    if (game.soloVoteId === meP.id) { game.soloVoteId = null; game.soloVoteName = null; }
    // Repaso de roles: sin él puede que ya hayan confirmado todos los vivos.
    if (game.roleRefresh && !game.roleRefresh.closing) {
      const alive = ps.filter((p) => p.alive);
      if (alive.length && alive.every((p) => (game.roleRefresh!.confirmed || {})[p.id])) {
        game.roleRefresh = { closing: true, at: Date.now() };
      }
    }
    // ¿Su marcha decide la partida? (en manual decide el narrador)
    if (game.mode !== 'manual') {
      const w = checkWinner(ps);
      if (w) {
        game.winner = w;
        game.phase = 'end';
        game.paused = null;
      }
    }
    return {
      game,
      playerPatches: { [meP.id]: { alive: false, causeOfDeath: 'abandono', deathAt: meP.deathAt, roleSeen: true } },
    };
  }, { allowPaused: true });
}

export async function endGameNow(winner: WinnerId | null): Promise<void> {
  await gameTx((game, players) => {
    game.winner = winner || checkWinner(players.filter((p) => p.inGame)) || 'nadie';
    game.phase = 'end';
    game.paused = null;
    game.log!.push({ kind: 'evento', txt: '🏁 La partida se da por terminada: se revelan todos los roles.' });
    return { game };
  }, { allowPaused: true });
}

// ——— Utilidades de transacción ———

interface GameTxResult {
  game?: GameState;
  playerPatches?: Record<string, Partial<PlayerDoc>>;
}

type GameTxFn = (game: GameState, players: PlayerDoc[], g: GroupDoc) => GameTxResult | null | undefined;

// Lee grupo + todos los jugadores, ejecuta fn(gameCopy, players) => {game, playerPatches}
// y escribe el resultado. fn puede devolver null para abortar sin cambios.
async function gameTx(fn: GameTxFn, opts: { allowPaused?: boolean; skipPlayers?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const ids = state.players.map((p) => p.id);
  await txWithRetry(async (tx) => {
    const gsnap = await tx.get(gref(slug));
    if (!gsnap.exists()) throw new Error('El grupo ya no existe');
    const g = { id: gsnap.id, ...gsnap.data() } as GroupDoc;
    if (!g.game) throw new Error('No hay partida en curso');
    if (g.game.paused && !opts.allowPaused) return; // partida en pausa: todo congelado
    // skipPlayers: transacciones que solo tocan el doc del grupo ahorran N lecturas
    // (usan la caché local de jugadores solo para leer nombres/estados).
    const players = opts.skipPlayers
      ? state.players.map((p) => ({ ...p }))
      : (await Promise.all(ids.map((id) => tx.get(pref(slug, id)))))
        .filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }) as PlayerDoc);
    const game = JSON.parse(JSON.stringify(g.game)) as GameState;
    const res = fn(game, players, g);
    if (!res) return;
    if (res.playerPatches) {
      for (const [pid, patch] of Object.entries(res.playerPatches)) {
        if (patch && Object.keys(patch).length) tx.update(pref(slug, pid), sanitize(patch));
      }
    }
    tx.update(gref(slug), { game: sanitize(res.game || game) });
  });
}

// Diferencias entre jugadores originales y mutados por el motor.
const VOLATILE = ['alive', 'causeOfDeath', 'deathAt', 'ancianoHit', 'infected', 'charmed',
  'transformed', 'revealedTonto', 'powers', 'role', 'lover', 'modelId', 'wolfSide', 'protectedLast', 'actorPower'] as const;

function diffPlayers(before: PlayerDoc[], after: PlayerDoc[]): Record<string, Partial<PlayerDoc>> {
  const patches: Record<string, Partial<PlayerDoc>> = {};
  const byId = Object.fromEntries(before.map((p) => [p.id, p]));
  for (const p of after) {
    const orig = byId[p.id];
    if (!orig) continue;
    const patch: Record<string, unknown> = {};
    for (const k of VOLATILE) {
      if (JSON.stringify(p[k] ?? null) !== JSON.stringify(orig[k] ?? null)) patch[k] = p[k] ?? null;
    }
    if (Object.keys(patch).length) patches[p.id] = patch as Partial<PlayerDoc>;
  }
  return patches;
}

function inGamePlayers(players: PlayerDoc[]): PlayerDoc[] {
  return players.filter((p) => p.inGame);
}

// ——— Transiciones del conductor (modo automático) ———

export async function startFirstNight(): Promise<void> {
  await gameTx((game, players) => {
    if (game.phase !== 'reveal') return null;
    const ps = inGamePlayers(players);
    if (!ps.every((p) => p.roleSeen)) return null;
    game.phase = 'night'; game.night = 1;
    game.steps = computeNightSteps(game, ps);
    game.stepIdx = 0; game.acts = {};
    game.log!.push({ kind: 'noche', txt: '🌙 Noche 1: Castronegro duerme…' });
    return { game };
  });
}

export async function advanceGhostStep(expectedIdx: number): Promise<void> {
  await gameTx((game) => {
    if (game.phase !== 'night' || game.stepIdx !== expectedIdx) return null;
    if (game.steps[game.stepIdx] === 'amanecer') return null;
    game.stepIdx += 1;
    return { game };
  }, { skipPlayers: true });
}

export async function runDawn(): Promise<void> {
  await gameTx((game, players, g) => {
    if (game.phase !== 'night' || game.steps[game.stepIdx] !== 'amanecer') return null;
    const ps = inGamePlayers(players);
    const res = resolveDawn(game, ps);
    Object.assign(game, res.gameUpdates);

    const byId = Object.fromEntries(res.players.map((p) => [p.id, p]));
    const logs: { kind: string; txt: string }[] = [];
    annotateDeaths(res.deaths, byId, logs, game);
    game.dayNum += 1;
    game.log!.push({ kind: 'dia', txt: `☀️ Amanece en Castronegro (día ${game.dayNum}).` });
    game.log!.push(...logs, ...res.logs);

    // ¿Ganó el Ángel muriendo la primera noche?
    let winner: WinnerId | null = null;
    if (game.night === 1 && res.deaths.some((d) => d.role === 'angel')) winner = 'angel';
    if (!winner) winner = checkWinner(res.players);

    game.pending = res.pendings || [];
    if ((g.settings || {}).alguacil && game.dayNum === 1) {
      game.pending.push({ type: 'alguacil_elect' });
    }
    game.gitanaQ = null;
    game.vote = null;
    game.votesLeft = 1;
    game.lastDawn = {
      deaths: res.deaths.map((d) => ({
        name: byId[d.pid].name || '',
        role: game.revealDead && d.role ? ROLES[d.role]?.name || null : null,
      })),
      events: [...logs, ...res.logs].map((l) => l.txt),
      gitana: res.gitanaAnnounce || null,
      cuervo: res.cuervoAnnounce || null,
      oso: res.osoAnnounce || null,
    };
    if (winner) { game.phase = 'end'; game.winner = winner; }
    else game.phase = 'day';
    return { game, playerPatches: diffPlayers(ps, res.players) };
  });
}

export async function startNextNight(): Promise<void> {
  await gameTx((game, players) => {
    if (game.phase !== 'day' || game.pending.length || (game.votesLeft || 0) > 0 || game.winner) return null;
    const ps = inGamePlayers(players);
    game.night += 1;
    game.phase = 'night';
    game.steps = computeNightSteps(game, ps);
    game.stepIdx = 0;
    game.acts = {};
    game.gitanaQ = null;
    game.lastDawn = null;
    game.juezSecondActive = false;
    game.log!.push({ kind: 'noche', txt: `🌙 Cae la noche ${game.night} sobre Castronegro…` });
    return { game };
  });
}

// ——— Acciones nocturnas de los jugadores ———

type NightApply = (game: GameState, ps: PlayerDoc[], myId: string) => GameTxResult | null;

// Acción genérica: valida paso + actor y aplica cambios; avanza si el paso queda completo.
async function nightAction(stepId: StepId, apply: NightApply): Promise<void> {
  await gameTx((game, players, g) => {
    if (game.phase !== 'night' || game.steps[game.stepIdx] !== stepId) return null;
    const ps = inGamePlayers(players);
    const actors = stepActors(stepId, game, ps);
    let myId = myPid();
    // En modo guiado, el máster registra las decisiones en nombre del actor.
    if (game.mode === 'guiado' && myId === g.masterId && actors && actors.length && !actors.includes(myId)) {
      myId = actors[0];
    }
    if (!actors || !actors.includes(myId)) return null;
    const res = apply(game, ps, myId) || {};
    // El paso completo NO avanza aquí: lo avanza el conductor tras una pausa
    // aleatoria, para que los tiempos no delaten quién acaba de actuar.
    const psAfter = ps.map((p) => (res.playerPatches?.[p.id] ? { ...p, ...res.playerPatches[p.id] } : p));
    const still = stepActors(stepId, game, psAfter);
    if (!still || !still.length) {
      // Grupos que ya se han reconocido físicamente: la app puede mostrarlos.
      const flag = ({ lobos_reconocen: 'wolvesKnown', dos_hermanas: 'hermanasKnown', tres_hermanos: 'hermanosKnown' } as Record<string, 'wolvesKnown' | 'hermanasKnown' | 'hermanosKnown'>)[stepId];
      if (flag) game[flag] = true;
      // En guiado no hay pausas de disimulo (solo actúa el móvil del máster):
      // el paso completado avanza al instante y el máster marca el ritmo.
      if (game.mode === 'guiado') game.stepIdx += 1;
    }
    return { game, playerPatches: res.playerPatches };
  });
}

export const actLadron = (roleIdx: number | null) => nightAction('ladron', (game, ps, myId) => {
  game.acts.ladronDone = true;
  if (roleIdx === null || roleIdx === undefined) return {};
  const chosen = (game.centerCards || [])[roleIdx];
  if (!chosen) return {};
  game.centerCards![roleIdx] = 'ladron';
  // Con la nueva carta pueden aparecer pasos nuevos esta misma noche.
  const psAfter = ps.map((p) => (p.id === myId ? { ...p, role: chosen } : p));
  game.steps = computeNightSteps(game, psAfter);
  return { playerPatches: { [myId]: { role: chosen } } };
});

export const actCupido = (a: string, b: string) => nightAction('cupido', (game) => {
  game.acts.cupidoPair = [a, b];
  return { playerPatches: { [a]: { lover: true }, [b]: { lover: true } } };
});

export const confirmLover = () => nightAction('enamorados', (game, ps, myId) => {
  game.acts.loversSeen = { ...(game.acts.loversSeen || {}), [myId]: true };
  // La palabra del enamorado solo debe renovarse si podrá volver a sonar: es
  // decir, si el Gaitero está REALMENTE repartido (una llamada de encantamiento
  // podría nombrarlo más adelante). Las llamadas falsas usan señuelos, y sin
  // gaitero en juego nadie volverá a pronunciarla: se queda fija.
  const gaiteroDealt = (game.composition || {}).gaitero! > 0 || ps.some((p) => p.role === 'gaitero');
  return { playerPatches: gaiteroDealt ? rotateKeyword(game, ps, myId) : {} };
});

export const actNinoSalvaje = (pid: string | null) => nightAction('nino_salvaje', (game, ps, myId) => ({
  playerPatches: { [myId]: { modelId: pid || 'nadie' } },
}));

export const actPerroLobo = (wolf: boolean) => nightAction('perro_lobo', (game, ps, myId) => ({
  playerPatches: { [myId]: { wolfSide: !!wolf } },
}));

export const confirmHermana = () => nightAction('dos_hermanas', (game, ps, myId) => {
  game.acts.hermanasSeen = { ...(game.acts.hermanasSeen || {}), [myId]: true };
  return {};
});

export const confirmHermano = () => nightAction('tres_hermanos', (game, ps, myId) => {
  game.acts.hermanosSeen = { ...(game.acts.hermanosSeen || {}), [myId]: true };
  return {};
});

export const actActor = (power: 'vidente' | 'defensor' | 'cuervo' | null, target: string | null) => nightAction('actor', (game, ps, myId) => {
  game.acts.actor = { power: (power || null) as 'vidente' | 'defensor' | 'cuervo', target: target || null };
  const patch: Partial<PlayerDoc> = { actorPower: power || null };
  if (power === 'vidente' && target) {
    const t = ps.find((p) => p.id === target);
    const meP = ps.find((p) => p.id === myId);
    if (t && meP) {
      const entry = game.videnteBando
        ? { pid: target, wolf: isWolfTeamRole(t.role), night: game.night }
        : { pid: target, role: t.role, night: game.night };
      patch.videnteLog = [...(meP.videnteLog || []), entry];
    }
  }
  return { playerPatches: { [myId]: patch } };
});

export const actDefensor = (pid: string | null) => nightAction('defensor', (game, ps, myId) => {
  game.acts.defensorTarget = pid || null;
  return { playerPatches: { [myId]: { protectedLast: pid || null } } };
});

export const actVidente = (pid: string | null) => nightAction('vidente', (game, ps, myId) => {
  game.acts.videnteTarget = pid || null;
  if (!pid) return {};
  // Historial privado de visiones: visible en su carta el resto de la partida.
  // Con «solo bando» activo, solo se guarda (y ve) si es lobo o no.
  const target = ps.find((p) => p.id === pid);
  const meP = ps.find((p) => p.id === myId);
  if (!target || !meP) return {};
  const entry = game.videnteBando
    ? { pid, wolf: isWolfTeamRole(target.role), night: game.night }
    : { pid, role: target.role, night: game.night };
  const log = [...(meP.videnteLog || []), entry];
  return { playerPatches: { [myId]: { videnteLog: log } } };
});

export const actVidenteSeen = () => nightAction('vidente', (game) => {
  game.acts.videnteSeen = true;
  return {};
});

export const actZorroSeen = () => nightAction('zorro', (game) => {
  game.acts.zorroSeen = true;
  return {};
});

export const actActorSeen = () => nightAction('actor', (game) => {
  game.acts.actorSeen = true;
  return {};
});

export const actZorro = (pid: string | null, foundWolf: boolean) => nightAction('zorro', (game, ps, myId) => {
  game.acts.zorroTarget = pid || null;
  if (pid) {
    game.acts.zorroResult = !!foundWolf;
    if (!foundWolf) return { playerPatches: { [myId]: { powers: { ...(ps.find((p) => p.id === myId)!.powers || {}), zorro: false } } } };
  }
  return {};
});

export const actCuervo = (pid: string | null) => nightAction('cuervo', (game) => {
  game.acts.cuervoTarget = pid || null;
  return {};
});

export const confirmLoboReconocido = () => nightAction('lobos_reconocen', (game, ps, myId) => {
  game.acts.lobosSeen = { ...(game.acts.lobosSeen || {}), [myId]: true };
  return {};
});

export const actLobos = (pid: string | null) => nightAction('lobos', (game, ps, myId) => {
  if (game.acts.wolfVictim !== undefined) return {};
  game.acts.wolfVictim = pid || null;
  game.wolvesKnown = true; // al abrir los ojos para cazar, la manada ya se ha visto
  game.acts.wolfBy = myId;
  return {};
});

export const actInfecto = (use: boolean) => nightAction('infecto_decision', (game, ps, myId) => {
  game.acts.infectoDecided = true;
  if (use) {
    game.acts.infectoUsed = true;
    const p = ps.find((x) => x.id === myId)!;
    return { playerPatches: { [myId]: { powers: { ...(p.powers || {}), infect: false } } } };
  }
  return {};
});

export const actFeroz = (pid: string | null) => nightAction('lobo_feroz', (game) => {
  game.acts.ferozVictim = pid || null;
  return {};
});

export const actAlbino = (pid: string | null) => nightAction('lobo_albino', (game) => {
  game.acts.albinoVictim = pid || null;
  return {};
});

export const actBruja = (healPid: string | null, poisonPid: string | null) => nightAction('bruja', (game, ps, myId) => {
  const meP = ps.find((p) => p.id === myId)!;
  const powers = { ...(meP.powers || {}) };
  game.acts.brujaDone = true;
  if (healPid && powers.heal !== false) { game.acts.brujaHeal = healPid; powers.heal = false; }
  if (poisonPid && powers.poison !== false) { game.acts.brujaPoison = poisonPid; powers.poison = false; }
  return { playerPatches: { [myId]: { powers } } };
});

export const actGaitero = (targets: string[]) => nightAction('gaitero', (game) => {
  game.acts.gaiteroTargets = targets || [];
  // Los encantados lo son desde ya: el paso siguiente los "despierta" por sus palabras clave.
  const patches: Record<string, Partial<PlayerDoc>> = {};
  for (const pid of targets || []) patches[pid] = { charmed: true };
  return { playerPatches: patches };
});

export const confirmEncantado = () => nightAction('encantados', (game, ps, myId) => {
  game.acts.encantadosSeen = { ...(game.acts.encantadosSeen || {}), [myId]: true };
  // Sin renovación: el encantamiento es único por jugador y las llamadas falsas
  // usan señuelos, así que la palabra de un encantado no volverá a sonar jamás.
  return {};
});

export const actGitana = (qIdx: number | null) => nightAction('gitana', (game) => {
  game.acts.gitanaDone = true;
  if (qIdx !== null && qIdx !== undefined) {
    game.acts.gitanaQIdx = qIdx;
    game.acts.gitanaText = GITANA_QUESTIONS[qIdx] || null;
  }
  return {};
});

// La gitana también puede escribir su propia pregunta (de sí o no).
export const actGitanaCustom = (text: string) => nightAction('gitana', (game) => {
  const q = String(text || '').trim().slice(0, 140);
  if (!q) return null;
  game.acts.gitanaDone = true;
  game.acts.gitanaText = q;
  return {};
});

// ——— Día: votación y resoluciones pendientes ———

export async function castVote(choice: string): Promise<void> {
  await gameTx((game, players, g) => {
    if (game.phase !== 'day' || game.pending.length || (game.votesLeft || 0) <= 0 || game.vote) return null;
    const ps = inGamePlayers(players);
    const myId = myPid();
    const guidedMaster = game.mode === 'guiado' && myId === g.masterId;
    const voter = ps.find((p) => p.id === myId);
    if (!guidedMaster) {
      // El Tonto del Pueblo descubierto no tiene voto, pero SÍ puede registrar
      // la decisión colectiva (es quien la anota, no un voto ponderado).
      if (!voter || !voter.alive) return null;
      if (game.soloVoteId && game.soloVoteId !== myId) return null;
    }
    if (choice !== 'nadie' && choice !== 'empate') {
      const t = ps.find((p) => p.id === choice);
      if (!t || !t.alive) return null;
    }
    game.log!.push({ kind: 'dia', txt: `🗳️ ${voter ? voter.name : 'El narrador'} registra la decisión del pueblo.` });

    // ¿Debe intervenir la sirvienta antes de revelar la carta?
    const sirvienta = ps.find((p) => p.alive && p.role === 'sirvienta' && !p.lover);
    const target = (choice !== 'nadie' && choice !== 'empate') ? ps.find((p) => p.id === choice) : null;
    const normalDeath = target && !(target.role === 'tonto' && !target.revealedTonto) && !(target.role === 'angel' && game.dayNum === 1);
    if (normalDeath && sirvienta && sirvienta.id !== target.id) {
      game.vote = { target: choice, by: myId };
      game.pending = [{ type: 'sirvienta', targetId: choice, deadline: Date.now() + 25000 }];
      return { game };
    }
    return applyVoteResolution(game, ps, choice);
  });
}

function applyVoteResolution(game: GameState, ps: PlayerDoc[], choice: string): GameTxResult | null {
  const res = resolveVote(game, ps, choice);
  if (!res) return null;
  Object.assign(game, res.gameUpdates);
  game.log!.push(...res.logs);
  game.pending = (game.pending || []).concat(res.pendings || []);
  game.vote = null;
  game.votesLeft = (game.votesLeft || 0) - 1;
  game.soloVoteId = null;
  game.soloVoteName = null;
  if (res.winner) { game.winner = res.winner; game.phase = 'end'; }
  else if (game.juezArmed && (game.votesLeft || 0) <= 0) {
    game.votesLeft = 1;
    game.juezArmed = null;
    game.log!.push({ kind: 'dia', txt: '⚖️ ¡El Juez Tartamudo exige una segunda votación inmediata!' });
    game.juezSecondActive = true;
  }
  return { game, playerPatches: diffPlayers(ps, res.players as PlayerDoc[]) };
}

export async function armJuez(): Promise<void> {
  await gameTx((game, players) => {
    if (game.phase !== 'day' || game.winner) return null;
    if (game.powersLost) return null; // el castigo del Anciano también alcanza al Juez
    const meP = players.find((p) => p.id === myPid());
    if (!meP || !meP.alive || meP.role !== 'juez' || (meP.powers || {}).juez === false) return null;
    game.juezArmed = meP.id;
    return { game, playerPatches: { [meP.id]: { powers: { ...(meP.powers || {}), juez: false } } } };
  });
}

export async function resolveSirvienta(accept: boolean): Promise<void> {
  await gameTx((game, players, g) => {
    const head = (game.pending || [])[0];
    if (!head || head.type !== 'sirvienta') return null;
    const ps = inGamePlayers(players);
    const caller = myPid();
    const sv = ps.find((p) => p.alive && p.role === 'sirvienta');
    if (caller !== (sv && sv.id) && caller !== g.masterId) return null;
    const target = ps.find((p) => p.id === head.targetId);
    const sirvienta = ps.find((p) => p.alive && p.role === 'sirvienta' && !p.lover);
    game.pending = game.pending.slice(1);
    if (accept && sirvienta && target) {
      const stolenRole = target.role;
      target.role = 'sirvienta';
      sirvienta.role = stolenRole;
      game.log!.push({ kind: 'dia', txt: `🧹 ¡${sirvienta.name} revela que es la Abnegada Sirvienta y asume en secreto el rol del condenado!` });
      const patches: Record<string, Partial<PlayerDoc>> = {
        [sirvienta.id]: {
          role: stolenRole, ancianoHit: false, revealedTonto: false, actorPower: null,
          protectedLast: null, modelId: null, wolfSide: null,
          powers: { heal: true, poison: true, infect: true, zorro: true, juez: true },
        },
        [target.id]: { role: 'sirvienta' },
      };
      const res = applyVoteResolution(game, ps, head.targetId!);
      if (!res) return null;
      // Combinar parches (la resolución añade la muerte del condenado).
      res.playerPatches = res.playerPatches || {};
      for (const [pid, patch] of Object.entries(patches)) {
        res.playerPatches[pid] = { ...(res.playerPatches[pid] || {}), ...patch };
      }
      return res;
    }
    return applyVoteResolution(game, ps, head.targetId!);
  });
}

export async function hunterShoot(targetId: string | null): Promise<void> {
  await gameTx((game, players, g) => {
    const head = (game.pending || [])[0];
    if (!head || head.type !== 'cazador') return null;
    if (myPid() !== head.pid && myPid() !== g.masterId) return null;
    const ps = inGamePlayers(players);
    const hunter = ps.find((p) => p.id === head.pid);
    game.pending = game.pending.slice(1);
    if (!targetId) {
      game.log!.push({ kind: 'evento', txt: `🏹 ${hunter?.name || 'El Cazador'} decide no disparar su última flecha.` });
      const w = checkWinner(ps);
      if (w) { game.winner = w; game.phase = 'end'; }
      return { game };
    }
    const copy = ps.map((p) => ({ ...p, powers: { ...(p.powers || {}) } }));
    const byId = Object.fromEntries(copy.map((p) => [p.id, p]));
    game.log!.push({ kind: 'evento', txt: `🏹 ${hunter!.name} dispara su última flecha…` });
    const chain = applyDeathsChain(copy, [{ pid: targetId, cause: 'flecha' }], game);
    annotateDeaths(chain.deaths, byId, game.log!, game);
    game.log!.push(...chain.logs);
    // Registra las muertes de la flecha para que la voz las anuncie con su rol
    // (el ocaso/amanecer solo vocaliza el linchamiento; esto añade a la víctima).
    game.lastShot = chain.deaths.map((d) => ({ name: byId[d.pid].name, role: d.role, hideRole: !!d.hideRole }));
    game.shotNonce = (game.shotNonce || 0) + 1;
    game.pending = (chain.pendings || []).concat(game.pending);
    game.powersLost = chain.powersLost;
    game.wolfDeathOccurred = game.wolfDeathOccurred || chain.wolfDeath;
    if (chain.rust) game.caballeroRust = chain.rust;
    const w = checkWinner(copy);
    if (w) { game.winner = w; game.phase = 'end'; }
    return { game, playerPatches: diffPlayers(ps, copy) };
  });
}

export async function pickAlguacil(pid: string): Promise<void> {
  await gameTx((game, players, g) => {
    const head = (game.pending || [])[0];
    if (!head || (head.type !== 'alguacil_elect' && head.type !== 'alguacil_pick')) return null;
    const caller = myPid();
    if (head.type === 'alguacil_pick' && caller !== head.pid && caller !== g.masterId) return null;
    if (head.type === 'alguacil_elect') {
      const voter = players.find((p) => p.id === caller);
      if ((!voter || !voter.alive) && caller !== g.masterId) return null;
    }
    const t = players.find((p) => p.id === pid);
    game.pending = game.pending.slice(1);
    if (t) {
      game.alguacilId = pid;
      game.log!.push({ kind: 'evento', txt: `⭐ ${t.name} es ahora el Alguacil del pueblo: su voz vale por dos.` });
    }
    return { game };
  }, { skipPlayers: true });
}

export async function cabezaPick(pid: string | null): Promise<void> {
  await gameTx((game, players, g) => {
    const head = (game.pending || [])[0];
    if (!head || head.type !== 'cabeza_pick') return null;
    if (myPid() !== head.pid && myPid() !== g.masterId) return null;
    game.pending = game.pending.slice(1);
    if (pid) {
      const t = players.find((p) => p.id === pid);
      game.soloVoteId = pid;
      game.soloVoteName = t ? t.name : null;
      if (t) game.log!.push({ kind: 'evento', txt: `🐐 El Cabeza de Turco decide: mañana solo ${t.name} podrá registrar la decisión del pueblo.` });
    }
    return { game };
  }, { skipPlayers: true });
}

// ——— Pausa global (modo automático) ———

export async function pauseGame(): Promise<void> {
  await gameTx((game, players) => {
    if (game.mode !== 'auto' || game.phase === 'end' || game.paused) return null;
    const who = players.find((p) => p.id === myPid());
    game.paused = { by: myPid(), name: who ? who.name : 'alguien', at: Date.now() };
    game.log!.push({ kind: 'evento', txt: `⏸️ ${who ? who.name : 'Alguien'} ha pausado la partida.` });
    return { game };
  }, { allowPaused: true, skipPlayers: true });
}

export async function resumeGame(): Promise<void> {
  await gameTx((game) => {
    if (!game.paused) return null;
    game.paused = null;
    // La ventana de la Sirvienta no debe expirar durante la pausa.
    const head = (game.pending || [])[0];
    if (head && head.type === 'sirvienta') head.deadline = Date.now() + 25000;
    game.log!.push({ kind: 'evento', txt: '▶️ La partida continúa.' });
    return { game };
  }, { allowPaused: true, skipPlayers: true });
}

// Cualquier jugador puede pedir que el narrador repita la locución actual.
export async function requestRepeat(): Promise<void> {
  await gameTx((game) => {
    game.repeatNonce = (game.repeatNonce || 0) + 1;
    return { game };
  }, { skipPlayers: true, allowPaused: true });
}

// ——— Presencia del narrador (v2): latido para detectar un narrador caído ———

export async function heartbeat(): Promise<void> {
  if (!state.session) return;
  await updateDoc(pref(mySlug(), myPid()), { heartbeatAt: Date.now() });
}

// ——— Repaso de roles: si alguien se atasca 2 minutos, todo el pueblo revisa ———

export async function startRoleRefresh(): Promise<void> {
  await gameTx((game) => {
    if (game.phase !== 'night' || game.roleRefresh) return null;
    game.roleRefresh = { confirmed: {}, startedAt: Date.now() };
    game.log!.push({ kind: 'evento', txt: '👁️ Pausa: todo el pueblo revisa su rol y su palabra clave.' });
    return { game };
  }, { skipPlayers: true });
}

// Fin de la fase de cierre tras el repaso: la noche sigue donde estaba.
export async function finishRoleRefreshClose(): Promise<void> {
  await gameTx((game) => {
    if (!game.roleRefresh || !game.roleRefresh.closing) return null;
    game.roleRefresh = null;
    game.refreshNonce = (game.refreshNonce || 0) + 1; // el paso pendiente se re-anuncia
    game.log!.push({ kind: 'evento', txt: '👁️ Roles repasados: la noche continúa donde estaba.' });
    return { game };
  }, { skipPlayers: true });
}

export async function confirmRoleRefresh(): Promise<void> {
  await gameTx((game, players) => {
    if (!game.roleRefresh) return null;
    const myId = myPid();
    const alive = inGamePlayers(players).filter((p) => p.alive);
    if (!alive.some((p) => p.id === myId)) return null;
    game.roleRefresh.confirmed = { ...(game.roleRefresh.confirmed || {}), [myId]: true };
    if (alive.every((p) => game.roleRefresh!.confirmed![p.id])) {
      // Antes de continuar, todos vuelven a cerrar los ojos (fase de cierre).
      game.roleRefresh = { closing: true, at: Date.now() };
    }
    return { game };
  });
}

// ——— Herramientas del máster (modo automático) ———

const STEP_SKIP_DEFAULTS: Partial<Record<StepId, (g: GameState, ps: PlayerDoc[]) => void>> = {
  ladron: (g) => { g.acts.ladronDone = true; },
  cupido: (g) => { g.acts.cupidoPair = [] as unknown as [string, string]; },
  enamorados: (g, ps) => {
    g.acts.loversSeen = Object.fromEntries(ps.filter((p) => p.lover).map((p) => [p.id, true]));
  },
  lobos_reconocen: (g, ps) => {
    g.acts.lobosSeen = Object.fromEntries(ps.filter((p) => p.alive && isWolfSide(p)).map((p) => [p.id, true]));
    g.wolvesKnown = true;
  },
  encantados: (g) => {
    g.acts.encantadosSeen = Object.fromEntries((g.acts.gaiteroTargets || []).map((id) => [id, true]));
  },
  actor: (g) => { g.acts.actor = { power: null as unknown as 'vidente', target: null }; g.acts.actorSeen = true; },
  defensor: (g) => { g.acts.defensorTarget = null; },
  vidente: (g) => { g.acts.videnteTarget = null; g.acts.videnteSeen = true; },
  zorro: (g) => { g.acts.zorroTarget = null; g.acts.zorroSeen = true; },
  cuervo: (g) => { g.acts.cuervoTarget = null; },
  lobos: (g) => { g.acts.wolfVictim = null; },
  infecto_decision: (g) => { g.acts.infectoDecided = true; },
  lobo_feroz: (g) => { g.acts.ferozVictim = null; },
  lobo_albino: (g) => { g.acts.albinoVictim = null; },
  bruja: (g) => { g.acts.brujaDone = true; },
  gaitero: (g) => { g.acts.gaiteroTargets = []; },
  gitana: (g) => { g.acts.gitanaDone = true; },
};

export async function forceAdvance(): Promise<void> {
  function applyAfterSirvientaSkip(game: GameState, ps: PlayerDoc[]): GameTxResult | null {
    const head = game.pending[0];
    game.pending = game.pending.slice(1);
    return applyVoteResolution(game, ps, head.targetId!);
  }

  await gameTx((game, players) => {
    const ps = inGamePlayers(players);
    if (game.phase === 'reveal') {
      const patches: Record<string, Partial<PlayerDoc>> = {};
      ps.filter((p) => !p.roleSeen).forEach((p) => { patches[p.id] = { roleSeen: true }; });
      return { game, playerPatches: patches };
    }
    if (game.phase === 'night') {
      if (game.roleRefresh) {
        game.roleRefresh = null;
        game.refreshNonce = (game.refreshNonce || 0) + 1;
        game.log!.push({ kind: 'evento', txt: '⏭️ El máster da por terminado el repaso de roles.' });
        return { game };
      }
      const stepId = game.steps[game.stepIdx];
      if (stepId === 'amanecer') return null; // lo resuelve el conductor
      const actorsNow = stepActors(stepId, game, ps);
      if (!actorsNow || !actorsNow.length) { game.stepIdx += 1; return { game }; }
      const skip = STEP_SKIP_DEFAULTS[stepId];
      if (skip) skip(game, ps);
      else if (stepId === 'nino_salvaje' || stepId === 'perro_lobo' || stepId === 'dos_hermanas' || stepId === 'tres_hermanos') {
        const patches: Record<string, Partial<PlayerDoc>> = {};
        if (stepId === 'nino_salvaje') ps.filter((p) => p.role === 'nino_salvaje' && p.alive && !p.modelId).forEach((p) => { patches[p.id] = { modelId: 'nadie' }; });
        if (stepId === 'perro_lobo') ps.filter((p) => p.role === 'perro_lobo' && p.alive && p.wolfSide == null).forEach((p) => { patches[p.id] = { wolfSide: false }; });
        if (stepId === 'dos_hermanas') { game.acts.hermanasSeen = Object.fromEntries(ps.filter((p) => p.role === 'dos_hermanas').map((p) => [p.id, true])); game.hermanasKnown = true; }
        if (stepId === 'tres_hermanos') { game.acts.hermanosSeen = Object.fromEntries(ps.filter((p) => p.role === 'tres_hermanos').map((p) => [p.id, true])); game.hermanosKnown = true; }
        game.stepIdx += 1;
        return { game, playerPatches: patches };
      }
      game.stepIdx += 1;
      game.log!.push({ kind: 'evento', txt: '⏭️ El máster ha saltado un paso de la noche.' });
      return { game };
    }
    if (game.phase === 'day') {
      if (game.pending.length) {
        const head = game.pending[0];
        if (head.type === 'sirvienta') return applyAfterSirvientaSkip(game, ps);
        game.pending = game.pending.slice(1);
        game.log!.push({ kind: 'evento', txt: '⏭️ El máster ha resuelto un paso pendiente sin acción.' });
        return { game };
      }
      if ((game.votesLeft || 0) > 0) {
        game.votesLeft = 0;
        game.log!.push({ kind: 'dia', txt: '⏭️ El máster cierra el día sin más votaciones.' });
        return { game };
      }
    }
    return null;
  });
}

// ——— Modo manual: el máster dirige ———

export async function manualToggleDead(pid: string): Promise<void> {
  await gameTx((game, players) => {
    const p = players.find((x) => x.id === pid);
    if (!p || !p.inGame) return null;
    if (p.alive) {
      const def = p.role ? ROLES[p.role] : null;
      const reveal = game.revealDead ? ` Era ${def?.emoji || ''} ${def?.name || ''}.` : '';
      game.log!.push({ kind: 'muerte', txt: `💀 ${p.name} ha muerto.${reveal}` });
      return { game, playerPatches: { [pid]: { alive: false } } };
    }
    game.log!.push({ kind: 'evento', txt: `✨ ${p.name} vuelve a la vida.` });
    return { game, playerPatches: { [pid]: { alive: true, causeOfDeath: null } } };
  });
}

// Marca u olvida un enamoramiento (solo seguimiento, sin anuncio público).
export async function manualToggleLover(pid: string): Promise<void> {
  await gameTx((game, players) => {
    const p = players.find((x) => x.id === pid);
    if (!p || !p.inGame) return null;
    return { game, playerPatches: { [pid]: { lover: !p.lover } } };
  });
}

// El Ladrón cambia (o no) su carta por una del centro; el máster lo registra.
export async function manualSwapRole(pid: string, centerIdx: number): Promise<void> {
  await gameTx((game, players) => {
    const p = players.find((x) => x.id === pid);
    const card = (game.centerCards || [])[centerIdx];
    if (!p || !card) return null;
    game.centerCards![centerIdx] = p.role ?? null;
    game.log!.push({ kind: 'evento', txt: '🃏 El Ladrón ha tomado su decisión.' });
    return { game, playerPatches: { [pid]: { role: card } } };
  });
}
