// Acciones de PARTIDA de Los Hombres Lobo sobre Firestore (modo automático y
// manual). Port literal de public/js/actions.js con tipos; misma semántica de
// transacciones «primero gana» y mismos documentos. Las acciones de GRUPO
// (crear/unirse/asientos/ajustes/narrador/latido…) viven en
// core/sync/group-actions y aquí se re-exportan por compatibilidad.
import { db, getDoc, updateDoc, writeBatch } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, pref, mref, mySlug, myPid, DEFAULT_SETTINGS, DEFAULT_EXTRA_ROLES,
  assertFree, ctxMatchId, newMatchId, registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc, PlayerDoc } from '../../core/sync/schema';
import { dealRoles, ROLES, isWolfSide, isWolfTeamRole, OFFICIAL_MIN_PLAYERS, CASUAL_MIN_PLAYERS, generateKeywords } from './roles';
import type { RoleDef, RoleId } from './roles';
import {
  computeNightSteps, stepActors, resolveDawn, resolveVote, applyDeathsChain,
  checkWinner, annotateDeaths, rotateKeyword, GITANA_QUESTIONS,
} from './engine';
import type { GameState, StepId, WinnerId } from './types';

// Re-export de las acciones de grupo: el código del juego (y cualquier import
// antiguo) sigue funcionando con `import * as A from './actions'`.
export {
  DEFAULT_SETTINGS, DEFAULT_EXTRA_ROLES, selectGame, setNarratorDevice, createGroup, joinGroup,
  takeOverPlayer, joinExistingGroup, setPlayerActive, leaveGroup, kickPlayer, deleteGroup,
  setSeating, setSettings, makeMaster, heartbeat,
} from '../../core/sync/group-actions';

// ——— Configuración propia del juego ———

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
  const mid = newMatchId();
  const ids = state.players.map((p) => p.id);
  await txWithRetry(async (tx) => {
    const gsnap = await tx.get(gref(slug));
    const g = gsnap.data() as GroupDoc | undefined;
    if (!g) throw new Error('El grupo ya no existe');
    const masterId = (mode === 'auto' ? narratorId : myPid()) || myPid();
    // Nadie puede estar en dos partidas: se revalida contra los members frescos.
    await assertFree(tx, slug, [...new Set([...playerIds, masterId])]);
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
      if (!roleId) {
        // Solo se resetean los docs de MIEMBROS sin carta (máster narrador):
        // los demás dispositivos pueden estar en otra partida y no se tocan.
        if (p.id === masterId) {
          tx.update(pref(slug, p.id), sanitize({
            inGame: false, role: null, alive: null, roleSeen: true,
          }));
        }
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

    // La partida nace como doc propio: la mesa admite varias a la vez.
    tx.update(gref(slug), sanitize({
      lastNarratorId: masterId, // recordado para partidas sucesivas
      seating: seatOrder, // orden de mesa normalizado (recordado)
    }));
    tx.set(mref(slug, mid), sanitize({
      gameId: 'hombres_lobo',
      createdAt: Date.now(),
      members: [...new Set([...eligible.map((p) => p.id), masterId])],
      masterId,
      lastNarratorId: masterId,
      settings: settings0, // foto de los ajustes al arrancar
      extraRoles: g.extraRoles || [],
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

export async function backToLobby(mid?: string): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('hombres_lobo');
  if (!id) return;
  const snap = await getDoc(mref(slug, id));
  if (!snap.exists()) return;
  // Se limpian SOLO los docs de los miembros de esta partida (otros
  // dispositivos pueden estar jugando otra) y el doc de la partida se borra:
  // sus miembros quedan libres para la siguiente.
  const members: string[] = (snap.data() as { members?: string[] }).members || [];
  const batch = writeBatch(db);
  for (const pid of members) {
    if (!state.players.some((p) => p.id === pid)) continue;
    batch.update(pref(slug, pid), sanitize({
      inGame: false, role: null, alive: null, roleSeen: false, lover: false,
      charmed: false, infected: false, transformed: false, revealedTonto: false,
      ancianoHit: false, protectedLast: null, modelId: null, wolfSide: null,
      sect: null, keyword: null, causeOfDeath: null, deathAt: null, actorPower: null, powers: null, videnteLog: null,
    }));
  }
  batch.delete(mref(slug, id));
  await batch.commit();
}

// Abandonar la partida en curso (salida administrativa): el rol se revela a
// todos y el jugador queda fuera AL INSTANTE, sin efectos de última hora (ni
// flecha del Cazador, ni muerte de pena del enamorado, ni sucesión del
// Alguacil). Si su marcha decide el ganador, la partida se cierra sola
// (en manual no: allí manda el narrador). Sirve también para SACAR a otro
// desde la mesa (targetPid): quien sale deja de ser miembro y queda libre
// para otra partida.
export async function leaveGame(targetPid?: string, mid?: string): Promise<void> {
  const outId = targetPid || myPid();
  await gameTx((game, players, g, members) => {
    const dropMembers = members.filter((x) => x !== outId);
    const ps = inGamePlayers(players);
    const meP = ps.find((p) => p.id === outId);
    // Miembro sin carta viva (narrador-altavoz, muerto, o fin de partida):
    // sale de la partida sin drama y queda libre. Si era la voz, el mando
    // pasa a otro miembro para que la partida no se quede muda.
    if (game.phase === 'end' || !meP || meP.alive === false) {
      if (!members.includes(outId)) return null;
      const res: GameTxResult = { game, members: dropMembers };
      if (g.masterId === outId && game.phase !== 'end') {
        res.masterPatch = dropMembers[0] || null;
        game.log!.push({ kind: 'evento', txt: '🔊 La narración cambia de dispositivo.' });
      }
      return res;
    }
    // Un jugador vivo que abandona muere administrativamente. Si además ponía
    // la voz, su dispositivo SIGUE siendo miembro (narrando de cuerpo
    // presente); podrá salir del todo después, ya muerto, y traspasar la voz.
    const keepAsVoice = g.masterId === outId;
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
      const w = checkWinner(ps, game);
      if (w) {
        game.winner = w;
        game.phase = 'end';
        game.paused = null;
      }
    }
    return {
      game,
      members: keepAsVoice ? members : dropMembers,
      playerPatches: { [meP.id]: { alive: false, causeOfDeath: 'abandono', deathAt: meP.deathAt, roleSeen: true } },
    };
  }, { allowPaused: true, mid });
}

export async function endGameNow(winner: WinnerId | null, mid?: string): Promise<void> {
  await gameTx((game, players) => {
    game.winner = winner || checkWinner(players.filter((p) => p.inGame), game) || 'nadie';
    game.phase = 'end';
    game.paused = null;
    game.log!.push({ kind: 'evento', txt: '🏁 La partida se da por terminada: se revelan todos los roles.' });
    return { game };
  }, { allowPaused: true, mid });
}

// La mesa puede sacar a un miembro o terminar una partida desde fuera.
registerMatchTools('hombres_lobo', {
  leave: (mid, pid) => leaveGame(pid, mid),
  end: async (mid) => {
    const m = state.matches.find((x) => x.id === mid);
    // Con la partida ya en su pantalla final, «terminar» = cerrarla del todo.
    if (m?.game?.phase === 'end') await backToLobby(mid);
    else await endGameNow(null, mid);
  },
});

// ——— Utilidades de transacción ———

interface GameTxResult {
  game?: GameState;
  playerPatches?: Record<string, Partial<PlayerDoc>>;
  /** Cambia la lista de miembros de la partida (salidas administrativas). */
  members?: string[];
  /** Traspasa la voz/mando de la partida (null = sin narrador). */
  masterPatch?: string | null;
}

type GameTxFn = (game: GameState, players: PlayerDoc[], g: GroupDoc, members: string[]) => GameTxResult | null | undefined;

// Lee la PARTIDA en contexto + todos los jugadores, ejecuta fn(gameCopy, players)
// => {game, playerPatches} y escribe el resultado en el doc de la partida.
// fn puede devolver null para abortar sin cambios.
async function gameTx(fn: GameTxFn, opts: { allowPaused?: boolean; skipPlayers?: boolean; mid?: string } = {}): Promise<void> {
  const slug = mySlug();
  const mid = opts.mid ?? ctxMatchId('hombres_lobo');
  if (!mid) return; // sin partida de este juego en contexto
  const ids = state.players.map((p) => p.id);
  await txWithRetry(async (tx) => {
    const msnap = await tx.get(mref(slug, mid));
    if (!msnap.exists()) return; // la partida terminó mientras tanto
    const m = { id: msnap.id, ...msnap.data() } as MatchDoc;
    if (!m.game) return;
    if (m.game.paused && !opts.allowPaused) return; // partida en pausa: todo congelado
    // La vista con forma de grupo que las reglas del juego siempre han leído.
    const g: GroupDoc = {
      id: slug, name: '', createdAt: m.createdAt, status: 'playing',
      currentGame: m.gameId, masterId: m.masterId, lastNarratorId: m.lastNarratorId,
      settings: m.settings || {}, extraRoles: m.extraRoles || [], game: m.game,
    };
    // skipPlayers: transacciones que solo tocan el doc de la partida ahorran N
    // lecturas (usan la caché local de jugadores para nombres/estados).
    const players = opts.skipPlayers
      ? state.players.map((p) => ({ ...p }))
      : (await Promise.all(ids.map((id) => tx.get(pref(slug, id)))))
        .filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }) as PlayerDoc);
    const game = JSON.parse(JSON.stringify(m.game)) as GameState;
    const res = fn(game, players, g, m.members || []);
    if (!res) return;
    if (res.playerPatches) {
      for (const [pid, patch] of Object.entries(res.playerPatches)) {
        if (patch && Object.keys(patch).length) tx.update(pref(slug, pid), sanitize(patch));
      }
    }
    const patch: Record<string, unknown> = { game: sanitize(res.game || game) };
    if (res.members) patch.members = sanitize(res.members);
    if (res.masterPatch !== undefined) patch.masterId = res.masterPatch;
    tx.update(mref(slug, mid), patch);
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
    if (!winner) winner = checkWinner(res.players, game);

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
  // Los encantados se despiertan TODAS las noches que el Gaitero actúa (como
  // en el juego de mesa): su palabra acaba de sonar y volverá a hacer falta,
  // así que rota desde la reserva (política de palabras de un solo uso).
  return { playerPatches: rotateKeyword(game, ps, myId) };
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
      const w = checkWinner(ps, game);
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
    const w = checkWinner(copy, game);
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
  encantados: (g, ps) => {
    // Se despiertan todos los encantados vivos (viejos y nuevos): el salto
    // los da a todos por confirmados.
    g.acts.encantadosSeen = Object.fromEntries(ps.filter((p) => p.alive && p.charmed).map((p) => [p.id, true]));
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
