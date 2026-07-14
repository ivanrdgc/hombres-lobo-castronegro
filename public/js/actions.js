// Acciones sobre Firestore: lobby, configuración y partida (modo automático y manual).
import {
  db, doc, getDoc, setDoc, updateDoc, deleteDoc, runTransaction, writeBatch, getDocs, collection,
} from './fb.js';
import { state, slugify, randomId, saveSession, clearSession, navigate } from './store.js';
import { dealRoles, ROLES, isWolfSide, isWolfTeamRole, OFFICIAL_MIN_PLAYERS, CASUAL_MIN_PLAYERS, generateKeywords } from './roles.js';
import {
  computeNightSteps, stepActors, resolveDawn, resolveVote, applyDeathsChain,
  checkWinner, annotateDeaths, GITANA_QUESTIONS,
} from './engine.js';

const sanitize = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
const gref = (slug) => doc(db, 'groups', slug);
const pref = (slug, pid) => doc(db, 'groups', slug, 'players', pid);

// Composición recomendada por el reglamento para una primera partida.
export const DEFAULT_EXTRA_ROLES = ['vidente', 'bruja', 'cazador', 'cupido'];

export const DEFAULT_SETTINGS = {
  revealDead: true, showComposition: true, alguacil: false, casual: false,
  primeraNocheTranquila: false, wolvesCount: null, // null = tabla oficial
  videnteSoloBando: false, // la vidente solo ve si es lobo o no
  ocultarCausas: false, // no anunciar la causa de las muertes nocturnas
};

// ——— Lobby ———

export async function createGroup(userName, groupName) {
  const slug = slugify(groupName);
  if (!slug) throw new Error('Nombre de grupo no válido.');
  const pid = playerIdFor(userName);
  if (!pid) throw new Error('Nombre de jugador no válido.');
  const token = randomId('t');
  await runTransaction(db, async (tx) => {
    const g = await tx.get(gref(slug));
    if (g.exists()) { const e = new Error('taken'); e.code = 'group-taken'; throw e; }
    tx.set(gref(slug), {
      name: groupName.trim(),
      createdAt: Date.now(),
      masterId: pid,
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

export async function joinGroup(slug, userName) {
  const pid = playerIdFor(userName);
  if (!pid) throw new Error('Nombre de jugador no válido.');
  const token = randomId('t');
  await runTransaction(db, async (tx) => {
    const g = await tx.get(gref(slug));
    if (!g.exists()) { const e = new Error('no'); e.code = 'no-group'; throw e; }
    const p = await tx.get(pref(slug, pid));
    if (p.exists()) { const e = new Error('name'); e.code = 'name-taken'; e.pid = pid; throw e; }
    if (g.data().status === 'playing') { const e = new Error('playing'); e.code = 'playing'; throw e; }
    tx.set(pref(slug, pid), basePlayer(userName, token));
  });
  saveSession(slug, { pid, token, name: userName.trim() });
}

// Reconectar como un jugador existente (desconecta el dispositivo anterior).
export async function takeOverPlayer(slug, userName) {
  const pid = playerIdFor(userName);
  if (!pid) { const e = new Error('no'); e.code = 'no-player'; throw e; }
  const token = randomId('t');
  const snap = await getDoc(pref(slug, pid));
  if (!snap.exists()) { const e = new Error('no'); e.code = 'no-player'; throw e; }
  await updateDoc(pref(slug, pid), { deviceToken: token });
  saveSession(slug, { pid, token, name: snap.data().name });
}

// Entrar en un grupo que ya existe desde la portada: como jugador o reclamando
// el rol de máster (el máster anterior pasa a ser un jugador más). Si el nombre
// ya está en uso dentro del grupo, se reconecta como ese jugador.
export async function joinExistingGroup(groupName, userName, claimMaster) {
  const slug = slugify(groupName);
  const pid = playerIdFor(userName);
  if (!slug || !pid) throw new Error('Nombre no válido.');
  const token = randomId('t');
  let joinedName = userName.trim();
  await runTransaction(db, async (tx) => {
    const g = await tx.get(gref(slug));
    if (!g.exists()) { const e = new Error('no'); e.code = 'no-group'; throw e; }
    const p = await tx.get(pref(slug, pid));
    if (p.exists()) {
      joinedName = p.data().name;
      tx.update(pref(slug, pid), { deviceToken: token });
    } else {
      if (g.data().status === 'playing') { const e = new Error('playing'); e.code = 'playing'; throw e; }
      tx.set(pref(slug, pid), basePlayer(userName, token));
    }
    if (claimMaster) tx.update(gref(slug), { masterId: pid });
  });
  saveSession(slug, { pid, token, name: joinedName });
  navigate('/g/' + slug);
}

function playerIdFor(name) {
  const s = slugify(name || '');
  return s ? 'p-' + s : null;
}

function basePlayer(name, token) {
  return {
    name: name.trim(), deviceToken: token, order: Date.now(),
    role: null, alive: null, inGame: false,
  };
}

export async function leaveGroup() {
  const slug = state.route.slug;
  const myId = state.session?.pid;
  if (!slug || !myId) return;
  await runTransaction(db, async (tx) => {
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

export async function kickPlayer(pid) {
  const slug = state.route.slug;
  await deleteDoc(pref(slug, pid));
}

export async function deleteGroup() {
  const slug = state.route.slug;
  const ps = await getDocs(collection(db, 'groups', slug, 'players'));
  const batch = writeBatch(db);
  ps.forEach((d) => batch.delete(d.ref));
  batch.delete(gref(slug));
  await batch.commit();
  clearSession(slug);
  navigate('/');
}

export async function setExtraRoles(roles) {
  await updateDoc(gref(state.route.slug), { extraRoles: roles });
}

// Restaura la composición recomendada (roles, lobos en auto, sin alguacil).
export async function resetRolesConfig() {
  const s = { ...DEFAULT_SETTINGS, ...(state.group.settings || {}), wolvesCount: null, alguacil: false };
  await updateDoc(gref(state.route.slug), { extraRoles: DEFAULT_EXTRA_ROLES, settings: s });
}

// Restaura los ajustes de partida (sin tocar la composición del menú de roles).
export async function resetGameSettings() {
  const cur = state.group.settings || {};
  const s = { ...DEFAULT_SETTINGS, wolvesCount: cur.wolvesCount ?? null, alguacil: !!cur.alguacil };
  await updateDoc(gref(state.route.slug), { settings: s });
}

export async function setSettings(patch) {
  // Escritura atómica por campo: dos cambios seguidos nunca se pisan entre sí
  // (antes se escribía el mapa completo leído de la caché y podía perderse
  // un cambio reciente, p. ej. justo después de «Restaurar»).
  const updates = {};
  for (const [k, v] of Object.entries(patch)) updates['settings.' + k] = v === undefined ? null : v;
  await updateDoc(gref(state.route.slug), updates);
}

export async function makeMaster(pid) {
  await updateDoc(gref(state.route.slug), { masterId: pid });
}

// ——— Inicio y fin de partida ———

export async function startGame(mode) {
  const slug = state.route.slug;
  const ids = state.players.map((p) => p.id);
  await runTransaction(db, async (tx) => {
    const gsnap = await tx.get(gref(slug));
    const g = gsnap.data();
    if (!g || g.status !== 'lobby') throw new Error('Estado no válido');
    const snaps = await Promise.all(ids.map((id) => tx.get(pref(slug, id))));
    const players = snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }));
    // El máster nunca juega: en manual narra él y en automático narra su dispositivo.
    const eligible = players.filter((p) => p.id !== g.masterId);
    const settings0 = g.settings || DEFAULT_SETTINGS;
    // Reglas oficiales: de 8 a 18 jugadores además del narrador.
    const minP = settings0.casual ? CASUAL_MIN_PLAYERS : OFFICIAL_MIN_PLAYERS;
    if (eligible.length < minP) {
      throw new Error(settings0.casual
        ? `Hacen falta al menos ${CASUAL_MIN_PLAYERS} jugadores además del máster (que hace de narrador).`
        : `Las reglas oficiales piden al menos ${OFFICIAL_MIN_PLAYERS} jugadores además del máster. Puedes activar el «modo casual» en los ajustes para jugar desde ${CASUAL_MIN_PLAYERS}.`);
    }

    const seed = Math.floor(Date.now() % 2147483647);
    const { assignments, center, composition, dropped } = dealRoles(
      eligible, g.extraRoles || [], seed, settings0.wolvesCount || null);

    // Palabras clave: solo hacen falta si hay roles que designan jugadores en
    // secreto durante la noche (enamorados de Cupido, encantados del Gaitero).
    const keywordsActive = mode === 'auto' && !!(composition.cupido || composition.gaitero);
    const kws = keywordsActive ? generateKeywords(eligible.length, seed + 7) : [];
    const kwOf = {};
    eligible.forEach((p, i) => { kwOf[p.id] = kws[i] || null; });

    // Mitades de la mesa para el Abominable Sectario.
    const sorted = eligible.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const half = Math.ceil(sorted.length / 2);
    const sectOf = {};
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
        inGame: true, role: roleId, alive: true, roleSeen: false,
        lover: false, charmed: false, infected: false, transformed: false,
        revealedTonto: false, ancianoHit: false, protectedLast: null,
        modelId: null, wolfSide: null, sect: sectOf[p.id], keyword: kwOf[p.id] || null,
        causeOfDeath: null, deathAt: null, actorPower: null, videnteLog: [],
        powers: { heal: true, poison: true, infect: true, zorro: true, juez: true },
      }));
    }

    const settings = g.settings || DEFAULT_SETTINGS;
    const modeName = { auto: 'automático', manual: 'manual', guiado: 'guiado' }[mode] || mode;
    const log = [{ kind: 'evento', txt: `🌑 Comienza la partida en modo ${modeName} con ${eligible.length} jugadores.` }];
    if (settings.showComposition) {
      const compTxt = Object.entries(composition)
        .map(([r, n]) => `${ROLES[r].emoji} ${ROLES[r].name}${n > 1 ? ' ×' + n : ''}`).join(', ');
      log.push({ kind: 'evento', txt: `🎴 Cartas en juego: ${compTxt}.${center.length ? ' (2 de ellas quedan en el centro para el Ladrón.)' : ''}` });
    } else {
      log.push({ kind: 'evento', txt: '🎴 La composición de roles permanece en secreto.' });
    }
    if (dropped.length) {
      const droppedTxt = dropped.map((d) => `${ROLES[d.id].name} (${d.reason === 'min' ? `pide ≥${ROLES[d.id].minPlayers} jugadores` : 'sin sitio en la mesa'})`).join(', ');
      log.push({ kind: 'evento', txt: `ℹ️ Roles activados pero no repartidos: ${droppedTxt}.` });
    }

    tx.update(gref(slug), sanitize({
      status: 'playing',
      game: {
        mode, startedAt: Date.now(), seed,
        night: 0, dayNum: 0,
        phase: mode === 'manual' ? 'manual' : 'reveal',
        stepIdx: 0, steps: [], acts: {},
        vote: null, votesLeft: 0, pending: [], winner: null, keywordsActive,
        wolvesKnown: false, hermanasKnown: false, hermanosKnown: false,
        alguacilId: null, soloVoteId: null, juezArmed: null,
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

export async function confirmRoleSeen() {
  await updateDoc(pref(state.route.slug, state.session.pid), { roleSeen: true });
}

export async function backToLobby() {
  const slug = state.route.slug;
  const batch = writeBatch(db);
  for (const p of state.players) {
    batch.update(pref(slug, p.id), sanitize({
      inGame: false, role: null, alive: null, roleSeen: false, lover: false,
      charmed: false, infected: false, transformed: false, revealedTonto: false,
      ancianoHit: false, protectedLast: null, modelId: null, wolfSide: null,
      sect: null, keyword: null, causeOfDeath: null, deathAt: null, actorPower: null, powers: null, videnteLog: null,
    }));
  }
  batch.update(gref(slug), { status: 'lobby', game: null });
  await batch.commit();
}

export async function endGameNow(winner) {
  await gameTx((game, players) => {
    game.winner = winner || checkWinner(players.filter((p) => p.inGame)) || 'nadie';
    game.phase = 'end';
    game.paused = null;
    game.log.push({ kind: 'evento', txt: '🏁 El máster ha dado por terminada la partida.' });
    return { game };
  }, { allowPaused: true });
}

// ——— Utilidades de transacción ———

// Lee grupo + todos los jugadores, ejecuta fn(gameCopy, players) => {game, playerPatches}
// y escribe el resultado. fn puede devolver null para abortar sin cambios.
async function gameTx(fn, opts = {}) {
  const slug = state.route.slug;
  const ids = state.players.map((p) => p.id);
  await runTransaction(db, async (tx) => {
    const gsnap = await tx.get(gref(slug));
    if (!gsnap.exists()) throw new Error('El grupo ya no existe');
    const g = gsnap.data();
    if (!g.game) throw new Error('No hay partida en curso');
    if (g.game.paused && !opts.allowPaused) return; // partida en pausa: todo congelado
    // skipPlayers: transacciones que solo tocan el doc del grupo ahorran N lecturas
    // (usan la caché local de jugadores solo para leer nombres/estados).
    const players = opts.skipPlayers
      ? state.players.map((p) => ({ ...p }))
      : (await Promise.all(ids.map((id) => tx.get(pref(slug, id)))))
        .filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }));
    const game = JSON.parse(JSON.stringify(g.game));
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
  'transformed', 'revealedTonto', 'powers', 'role', 'lover', 'modelId', 'wolfSide', 'protectedLast', 'actorPower'];
function diffPlayers(before, after) {
  const patches = {};
  const byId = Object.fromEntries(before.map((p) => [p.id, p]));
  for (const p of after) {
    const orig = byId[p.id];
    if (!orig) continue;
    const patch = {};
    for (const k of VOLATILE) {
      if (JSON.stringify(p[k] ?? null) !== JSON.stringify(orig[k] ?? null)) patch[k] = p[k] ?? null;
    }
    if (Object.keys(patch).length) patches[p.id] = patch;
  }
  return patches;
}

function inGamePlayers(players) { return players.filter((p) => p.inGame); }

// ——— Transiciones del conductor (modo automático) ———

export async function startFirstNight() {
  await gameTx((game, players) => {
    if (game.phase !== 'reveal') return null;
    const ps = inGamePlayers(players);
    if (!ps.every((p) => p.roleSeen)) return null;
    game.phase = 'night'; game.night = 1;
    game.steps = computeNightSteps(game, ps);
    game.stepIdx = 0; game.acts = {};
    game.log.push({ kind: 'noche', txt: '🌙 Noche 1: Castronegro duerme…' });
    return { game };
  });
}

export async function advanceGhostStep(expectedIdx) {
  await gameTx((game) => {
    if (game.phase !== 'night' || game.stepIdx !== expectedIdx) return null;
    if (game.steps[game.stepIdx] === 'amanecer') return null;
    game.stepIdx += 1;
    return { game };
  }, { skipPlayers: true });
}

export async function runDawn() {
  await gameTx((game, players, g) => {
    if (game.phase !== 'night' || game.steps[game.stepIdx] !== 'amanecer') return null;
    const ps = inGamePlayers(players);
    const res = resolveDawn(game, ps);
    Object.assign(game, res.gameUpdates);

    const byId = Object.fromEntries(res.players.map((p) => [p.id, p]));
    const logs = [];
    annotateDeaths(res.deaths, byId, logs, game);
    game.dayNum += 1;
    game.log.push({ kind: 'dia', txt: `☀️ Amanece en Castronegro (día ${game.dayNum}).` });
    game.log.push(...logs, ...res.logs);

    // ¿Ganó el Ángel muriendo la primera noche?
    let winner = null;
    if (game.night === 1 && res.deaths.some((d) => d.role === 'angel')) winner = 'angel';
    if (!winner) winner = checkWinner(res.players);

    game.pending = res.pendings || [];
    if ((g.settings || {}).alguacil && game.dayNum === 1) {
      game.pending.push({ type: 'alguacil_elect' });
    }
    game.gitanaQ = res.gitanaQ || null;
    game.vote = null;
    game.votesLeft = 1;
    game.lastDawn = {
      deaths: res.deaths.map((d) => ({ name: byId[d.pid].name, role: game.revealDead ? ROLES[d.role]?.name : null })),
      events: [...logs, ...res.logs].map((l) => l.txt),
    };
    if (winner) { game.phase = 'end'; game.winner = winner; }
    else game.phase = 'day';
    return { game, playerPatches: diffPlayers(ps, res.players) };
  });
}

export async function startNextNight() {
  await gameTx((game, players) => {
    if (game.phase !== 'day' || game.pending.length || game.votesLeft > 0 || game.winner) return null;
    const ps = inGamePlayers(players);
    game.night += 1;
    game.phase = 'night';
    game.steps = computeNightSteps(game, ps);
    game.stepIdx = 0;
    game.acts = {};
    game.gitanaQ = null;
    game.lastDawn = null;
    game.juezSecondActive = false;
    game.log.push({ kind: 'noche', txt: `🌙 Cae la noche ${game.night} sobre Castronegro…` });
    return { game };
  });
}

// ——— Acciones nocturnas de los jugadores ———

// Acción genérica: valida paso + actor y aplica cambios; avanza si el paso queda completo.
async function nightAction(stepId, apply) {
  await gameTx((game, players, g) => {
    if (game.phase !== 'night' || game.steps[game.stepIdx] !== stepId) return null;
    const ps = inGamePlayers(players);
    const actors = stepActors(stepId, game, ps);
    let myId = state.session.pid;
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
      const flag = { lobos_reconocen: 'wolvesKnown', dos_hermanas: 'hermanasKnown', tres_hermanos: 'hermanosKnown' }[stepId];
      if (flag) game[flag] = true;
      // En guiado no hay pausas de disimulo (solo actúa el móvil del máster):
      // el paso completado avanza al instante y el máster marca el ritmo.
      if (game.mode === 'guiado') game.stepIdx += 1;
    }
    return { game, playerPatches: res.playerPatches };
  });
}

export const actLadron = (roleIdx) => nightAction('ladron', (game, ps, myId) => {
  game.acts.ladronDone = true;
  if (roleIdx === null || roleIdx === undefined) return {};
  const chosen = game.centerCards[roleIdx];
  if (!chosen) return {};
  game.centerCards[roleIdx] = 'ladron';
  // Con la nueva carta pueden aparecer pasos nuevos esta misma noche.
  const psAfter = ps.map((p) => (p.id === myId ? { ...p, role: chosen } : p));
  game.steps = computeNightSteps(game, psAfter);
  return { playerPatches: { [myId]: { role: chosen } } };
});

export const actCupido = (a, b) => nightAction('cupido', (game) => {
  game.acts.cupidoPair = [a, b];
  return { playerPatches: { [a]: { lover: true }, [b]: { lover: true } } };
});

export const confirmLover = () => nightAction('enamorados', (game, ps, myId) => {
  game.acts.loversSeen = { ...(game.acts.loversSeen || {}), [myId]: true };
  return {};
});

export const actNinoSalvaje = (pid) => nightAction('nino_salvaje', (game, ps, myId) => ({
  playerPatches: { [myId]: { modelId: pid || 'nadie' } },
}));

export const actPerroLobo = (wolf) => nightAction('perro_lobo', (game, ps, myId) => ({
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

export const actActor = (power, target) => nightAction('actor', (game, ps, myId) => {
  game.acts.actor = { power: power || null, target: target || null };
  const patch = { actorPower: power || null };
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

export const actDefensor = (pid) => nightAction('defensor', (game, ps, myId) => {
  game.acts.defensorTarget = pid || null;
  return { playerPatches: { [myId]: { protectedLast: pid || null } } };
});

export const actVidente = (pid) => nightAction('vidente', (game, ps, myId) => {
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

export const actZorro = (pid, foundWolf) => nightAction('zorro', (game, ps, myId) => {
  game.acts.zorroTarget = pid || null;
  if (pid) {
    game.acts.zorroResult = !!foundWolf;
    if (!foundWolf) return { playerPatches: { [myId]: { powers: { ...(ps.find((p) => p.id === myId).powers || {}), zorro: false } } } };
  }
  return {};
});

export const actCuervo = (pid) => nightAction('cuervo', (game) => {
  game.acts.cuervoTarget = pid || null;
  return {};
});

export const confirmLoboReconocido = () => nightAction('lobos_reconocen', (game, ps, myId) => {
  game.acts.lobosSeen = { ...(game.acts.lobosSeen || {}), [myId]: true };
  return {};
});

export const actLobos = (pid) => nightAction('lobos', (game, ps, myId) => {
  if (game.acts.wolfVictim !== undefined) return {};
  game.acts.wolfVictim = pid || null;
  game.acts.wolfBy = myId;
  return {};
});

export const actInfecto = (use) => nightAction('infecto_decision', (game, ps, myId) => {
  game.acts.infectoDecided = true;
  if (use) {
    game.acts.infectoUsed = true;
    const p = ps.find((x) => x.id === myId);
    return { playerPatches: { [myId]: { powers: { ...(p.powers || {}), infect: false } } } };
  }
  return {};
});

export const actFeroz = (pid) => nightAction('lobo_feroz', (game) => {
  game.acts.ferozVictim = pid || null;
  return {};
});

export const actAlbino = (pid) => nightAction('lobo_albino', (game) => {
  game.acts.albinoVictim = pid || null;
  return {};
});

export const actBruja = (healPid, poisonPid) => nightAction('bruja', (game, ps, myId) => {
  const meP = ps.find((p) => p.id === myId);
  const powers = { ...(meP.powers || {}) };
  game.acts.brujaDone = true;
  if (healPid && powers.heal !== false) { game.acts.brujaHeal = healPid; powers.heal = false; }
  if (poisonPid && powers.poison !== false) { game.acts.brujaPoison = poisonPid; powers.poison = false; }
  return { playerPatches: { [myId]: { powers } } };
});

export const actGaitero = (targets) => nightAction('gaitero', (game) => {
  game.acts.gaiteroTargets = targets || [];
  // Los encantados lo son desde ya: el paso siguiente los "despierta" por sus palabras clave.
  const patches = {};
  for (const pid of targets || []) patches[pid] = { charmed: true };
  return { playerPatches: patches };
});

export const actGitana = (qIdx) => nightAction('gitana', (game) => {
  game.acts.gitanaDone = true;
  if (qIdx !== null && qIdx !== undefined) game.acts.gitanaQIdx = qIdx;
  return {};
});

// ——— Día: votación y resoluciones pendientes ———

export async function castVote(choice) {
  await gameTx((game, players, g) => {
    if (game.phase !== 'day' || game.pending.length || game.votesLeft <= 0 || game.vote) return null;
    const ps = inGamePlayers(players);
    const myId = state.session.pid;
    const guidedMaster = game.mode === 'guiado' && myId === g.masterId;
    const voter = ps.find((p) => p.id === myId);
    if (!guidedMaster) {
      if (!voter || !voter.alive || voter.revealedTonto) return null;
      if (game.soloVoteId && game.soloVoteId !== myId) return null;
    }
    if (choice !== 'nadie' && choice !== 'empate') {
      const t = ps.find((p) => p.id === choice);
      if (!t || !t.alive) return null;
    }
    game.log.push({ kind: 'dia', txt: `🗳️ ${voter ? voter.name : 'El narrador'} registra la decisión del pueblo.` });

    // ¿Debe intervenir la sirvienta antes de revelar la carta?
    const sirvienta = ps.find((p) => p.alive && p.role === 'sirvienta' && !p.lover);
    const target = (choice !== 'nadie' && choice !== 'empate') ? ps.find((p) => p.id === choice) : null;
    const normalDeath = target && !(target.role === 'tonto' && !target.revealedTonto) && !(target.role === 'angel' && game.dayNum === 1);
    if (normalDeath && sirvienta && sirvienta.id !== target.id) {
      game.vote = { target: choice, by: myId };
      game.pending = [{ type: 'sirvienta', targetId: choice, deadline: Date.now() + 25000 }];
      return { game };
    }
    return applyVoteResolution(game, ps, players, choice);
  });
}

function applyVoteResolution(game, ps, allPlayers, choice) {
  const res = resolveVote(game, ps, choice);
  if (!res) return null;
  Object.assign(game, res.gameUpdates);
  game.log.push(...res.logs);
  game.pending = (game.pending || []).concat(res.pendings || []);
  game.vote = null;
  game.votesLeft -= 1;
  game.soloVoteId = null;
  if (res.winner) { game.winner = res.winner; game.phase = 'end'; }
  else if (game.juezArmed && game.votesLeft <= 0) {
    game.votesLeft = 1;
    game.juezArmed = null;
    game.log.push({ kind: 'dia', txt: '⚖️ ¡El Juez Tartamudo exige una segunda votación inmediata!' });
    game.juezSecondActive = true;
  }
  return { game, playerPatches: diffPlayers(ps, res.players) };
}

export async function armJuez() {
  await gameTx((game, players) => {
    if (game.phase !== 'day' || game.winner) return null;
    const meP = players.find((p) => p.id === state.session.pid);
    if (!meP || !meP.alive || meP.role !== 'juez' || (meP.powers || {}).juez === false) return null;
    game.juezArmed = meP.id;
    return { game, playerPatches: { [meP.id]: { powers: { ...(meP.powers || {}), juez: false } } } };
  });
}

export async function resolveSirvienta(accept) {
  await gameTx((game, players, g) => {
    const head = (game.pending || [])[0];
    if (!head || head.type !== 'sirvienta') return null;
    const ps = inGamePlayers(players);
    const caller = state.session.pid;
    const sv = ps.find((p) => p.alive && p.role === 'sirvienta');
    if (caller !== (sv && sv.id) && caller !== g.masterId) return null;
    const target = ps.find((p) => p.id === head.targetId);
    const sirvienta = ps.find((p) => p.alive && p.role === 'sirvienta' && !p.lover);
    game.pending = game.pending.slice(1);
    if (accept && sirvienta && target) {
      const stolenRole = target.role;
      target.role = 'sirvienta';
      sirvienta.role = stolenRole;
      game.log.push({ kind: 'dia', txt: `🧹 ¡${sirvienta.name} revela que es la Abnegada Sirvienta y asume en secreto el rol del condenado!` });
      const patches = {
        [sirvienta.id]: {
          role: stolenRole, ancianoHit: false, revealedTonto: false, actorPower: null,
          protectedLast: null, modelId: null, wolfSide: null,
          powers: { heal: true, poison: true, infect: true, zorro: true, juez: true },
        },
        [target.id]: { role: 'sirvienta' },
      };
      const res = applyVoteResolution(game, ps, players, head.targetId);
      if (!res) return null;
      // Combinar parches (la resolución añade la muerte del condenado).
      for (const [pid, patch] of Object.entries(patches)) {
        res.playerPatches[pid] = { ...(res.playerPatches[pid] || {}), ...patch };
      }
      return res;
    }
    return applyVoteResolution(game, ps, players, head.targetId);
  });
}

export async function hunterShoot(targetId) {
  await gameTx((game, players, g) => {
    const head = (game.pending || [])[0];
    if (!head || head.type !== 'cazador') return null;
    if (state.session.pid !== head.pid && state.session.pid !== g.masterId) return null;
    const ps = inGamePlayers(players);
    const hunter = ps.find((p) => p.id === head.pid);
    game.pending = game.pending.slice(1);
    if (!targetId) {
      game.log.push({ kind: 'evento', txt: `🏹 ${hunter?.name || 'El Cazador'} decide no disparar su última flecha.` });
      const w = checkWinner(ps);
      if (w) { game.winner = w; game.phase = 'end'; }
      return { game };
    }
    const copy = ps.map((p) => ({ ...p, powers: { ...(p.powers || {}) } }));
    const byId = Object.fromEntries(copy.map((p) => [p.id, p]));
    game.log.push({ kind: 'evento', txt: `🏹 ${hunter.name} dispara su última flecha…` });
    const chain = applyDeathsChain(copy, [{ pid: targetId, cause: 'flecha' }], game);
    annotateDeaths(chain.deaths, byId, game.log, game);
    game.log.push(...chain.logs);
    game.pending = (chain.pendings || []).concat(game.pending);
    game.powersLost = chain.powersLost;
    game.wolfDeathOccurred = game.wolfDeathOccurred || chain.wolfDeath;
    if (chain.rust) game.caballeroRust = chain.rust;
    const w = checkWinner(copy);
    if (w) { game.winner = w; game.phase = 'end'; }
    return { game, playerPatches: diffPlayers(ps, copy) };
  });
}

export async function pickAlguacil(pid) {
  await gameTx((game, players, g) => {
    const head = (game.pending || [])[0];
    if (!head || (head.type !== 'alguacil_elect' && head.type !== 'alguacil_pick')) return null;
    const caller = state.session.pid;
    if (head.type === 'alguacil_pick' && caller !== head.pid && caller !== g.masterId) return null;
    if (head.type === 'alguacil_elect') {
      const voter = players.find((p) => p.id === caller);
      if ((!voter || !voter.alive) && caller !== g.masterId) return null;
    }
    const t = players.find((p) => p.id === pid);
    game.pending = game.pending.slice(1);
    if (t) {
      game.alguacilId = pid;
      game.log.push({ kind: 'evento', txt: `⭐ ${t.name} es ahora el Alguacil del pueblo: su voz vale por dos.` });
    }
    return { game };
  }, { skipPlayers: true });
}

export async function cabezaPick(pid) {
  await gameTx((game, players, g) => {
    const head = (game.pending || [])[0];
    if (!head || head.type !== 'cabeza_pick') return null;
    if (state.session.pid !== head.pid && state.session.pid !== g.masterId) return null;
    game.pending = game.pending.slice(1);
    if (pid) {
      const t = players.find((p) => p.id === pid);
      game.soloVoteId = pid;
      if (t) game.log.push({ kind: 'evento', txt: `🐐 El Cabeza de Turco decide: mañana solo ${t.name} podrá registrar la decisión del pueblo.` });
    }
    return { game };
  }, { skipPlayers: true });
}

export async function answerGitana(yes) {
  await gameTx((game, players, g) => {
    if (!game.gitanaQ || game.gitanaQ.answer !== null) return null;
    if (state.session.pid !== game.gitanaQ.mediumId && state.session.pid !== g.masterId) return null;
    game.gitanaQ.answer = !!yes;
    game.log.push({ kind: 'evento', txt: `🔯 Espiritismo — «${game.gitanaQ.q}» El espíritu responde: ${yes ? 'SÍ' : 'NO'}.` });
    game.gitanaQ = null;
    return { game };
  }, { skipPlayers: true });
}

// ——— Pausa global (modo automático) ———

export async function pauseGame() {
  await gameTx((game, players) => {
    if (game.mode !== 'auto' || game.phase === 'end' || game.paused) return null;
    const who = players.find((p) => p.id === state.session.pid);
    game.paused = { by: state.session.pid, name: who ? who.name : 'alguien', at: Date.now() };
    game.log.push({ kind: 'evento', txt: `⏸️ ${who ? who.name : 'Alguien'} ha pausado la partida.` });
    return { game };
  }, { allowPaused: true, skipPlayers: true });
}

export async function resumeGame() {
  await gameTx((game) => {
    if (!game.paused) return null;
    game.paused = null;
    // La ventana de la Sirvienta no debe expirar durante la pausa.
    const head = (game.pending || [])[0];
    if (head && head.type === 'sirvienta') head.deadline = Date.now() + 25000;
    game.log.push({ kind: 'evento', txt: '▶️ La partida continúa.' });
    return { game };
  }, { allowPaused: true, skipPlayers: true });
}

// ——— Repaso de roles: si alguien se atasca 2 minutos, todo el pueblo revisa ———

export async function startRoleRefresh() {
  await gameTx((game) => {
    if (game.phase !== 'night' || game.roleRefresh) return null;
    game.roleRefresh = { confirmed: {}, startedAt: Date.now() };
    game.log.push({ kind: 'evento', txt: '👁️ Pausa: todo el pueblo revisa su rol y su palabra clave.' });
    return { game };
  }, { skipPlayers: true });
}

export async function confirmRoleRefresh() {
  await gameTx((game, players) => {
    if (!game.roleRefresh) return null;
    const myId = state.session.pid;
    const alive = inGamePlayers(players).filter((p) => p.alive);
    if (!alive.some((p) => p.id === myId)) return null;
    game.roleRefresh.confirmed = { ...(game.roleRefresh.confirmed || {}), [myId]: true };
    if (alive.every((p) => game.roleRefresh.confirmed[p.id])) {
      game.roleRefresh = null;
      game.refreshNonce = (game.refreshNonce || 0) + 1; // el paso pendiente se vuelve a anunciar
      game.log.push({ kind: 'evento', txt: '👁️ Roles repasados: la noche continúa donde estaba.' });
    }
    return { game };
  });
}

// ——— Herramientas del máster (modo automático) ———

const STEP_SKIP_DEFAULTS = {
  ladron: (g) => { g.acts.ladronDone = true; },
  cupido: (g) => { g.acts.cupidoPair = []; },
  enamorados: (g, ps) => {
    g.acts.loversSeen = Object.fromEntries(ps.filter((p) => p.lover).map((p) => [p.id, true]));
  },
  lobos_reconocen: (g, ps) => {
    g.acts.lobosSeen = Object.fromEntries(ps.filter((p) => p.alive && isWolfSide(p)).map((p) => [p.id, true]));
    g.wolvesKnown = true;
  },
  encantados: () => { /* paso informativo: basta con avanzar */ },
  actor: (g) => { g.acts.actor = { power: null, target: null }; g.acts.actorSeen = true; },
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

export async function forceAdvance() {
  await gameTx((game, players) => {
    const ps = inGamePlayers(players);
    if (game.phase === 'reveal') {
      const patches = {};
      ps.filter((p) => !p.roleSeen).forEach((p) => { patches[p.id] = { roleSeen: true }; });
      return { game, playerPatches: patches };
    }
    if (game.phase === 'night') {
      if (game.roleRefresh) {
        game.roleRefresh = null;
        game.refreshNonce = (game.refreshNonce || 0) + 1;
        game.log.push({ kind: 'evento', txt: '⏭️ El máster da por terminado el repaso de roles.' });
        return { game };
      }
      const stepId = game.steps[game.stepIdx];
      if (stepId === 'amanecer') return null; // lo resuelve el conductor
      const actorsNow = stepActors(stepId, game, ps);
      if (!actorsNow || !actorsNow.length) { game.stepIdx += 1; return { game }; }
      const skip = STEP_SKIP_DEFAULTS[stepId];
      if (skip) skip(game, ps);
      else if (stepId === 'nino_salvaje' || stepId === 'perro_lobo' || stepId === 'dos_hermanas' || stepId === 'tres_hermanos') {
        const patches = {};
        if (stepId === 'nino_salvaje') ps.filter((p) => p.role === 'nino_salvaje' && p.alive && !p.modelId).forEach((p) => { patches[p.id] = { modelId: 'nadie' }; });
        if (stepId === 'perro_lobo') ps.filter((p) => p.role === 'perro_lobo' && p.alive && p.wolfSide == null).forEach((p) => { patches[p.id] = { wolfSide: false }; });
        if (stepId === 'dos_hermanas') { game.acts.hermanasSeen = Object.fromEntries(ps.filter((p) => p.role === 'dos_hermanas').map((p) => [p.id, true])); game.hermanasKnown = true; }
        if (stepId === 'tres_hermanos') { game.acts.hermanosSeen = Object.fromEntries(ps.filter((p) => p.role === 'tres_hermanos').map((p) => [p.id, true])); game.hermanosKnown = true; }
        game.stepIdx += 1;
        return { game, playerPatches: patches };
      }
      game.stepIdx += 1;
      game.log.push({ kind: 'evento', txt: '⏭️ El máster ha saltado un paso de la noche.' });
      return { game };
    }
    if (game.phase === 'day') {
      if (game.pending.length) {
        const head = game.pending[0];
        if (head.type === 'sirvienta') return applyAfterSirvientaSkip(game, ps, players);
        game.pending = game.pending.slice(1);
        game.log.push({ kind: 'evento', txt: '⏭️ El máster ha resuelto un paso pendiente sin acción.' });
        return { game };
      }
      if (game.votesLeft > 0) {
        game.votesLeft = 0;
        game.log.push({ kind: 'dia', txt: '⏭️ El máster cierra el día sin más votaciones.' });
        return { game };
      }
    }
    return null;
  });

  function applyAfterSirvientaSkip(game, ps, players) {
    const head = game.pending[0];
    game.pending = game.pending.slice(1);
    return applyVoteResolution(game, ps, players, head.targetId);
  }
}

// ——— Modo manual: el máster dirige ———

export async function manualToggleDead(pid) {
  await gameTx((game, players) => {
    const p = players.find((x) => x.id === pid);
    if (!p || !p.inGame) return null;
    if (p.alive) {
      const reveal = game.revealDead ? ` Era ${ROLES[p.role]?.emoji || ''} ${ROLES[p.role]?.name || ''}.` : '';
      game.log.push({ kind: 'muerte', txt: `💀 ${p.name} ha muerto.${reveal}` });
      return { game, playerPatches: { [pid]: { alive: false } } };
    }
    game.log.push({ kind: 'evento', txt: `✨ ${p.name} vuelve a la vida.` });
    return { game, playerPatches: { [pid]: { alive: true, causeOfDeath: null } } };
  });
}

// Marca u olvida un enamoramiento (solo seguimiento, sin anuncio público).
export async function manualToggleLover(pid) {
  await gameTx((game, players) => {
    const p = players.find((x) => x.id === pid);
    if (!p || !p.inGame) return null;
    return { game, playerPatches: { [pid]: { lover: !p.lover } } };
  });
}

// El Ladrón cambia (o no) su carta por una del centro; el máster lo registra.
export async function manualSwapRole(pid, centerIdx) {
  await gameTx((game, players) => {
    const p = players.find((x) => x.id === pid);
    const card = (game.centerCards || [])[centerIdx];
    if (!p || !card) return null;
    game.centerCards[centerIdx] = p.role;
    game.log.push({ kind: 'evento', txt: '🃏 El Ladrón ha tomado su decisión.' });
    return { game, playerPatches: { [pid]: { role: card } } };
  });
}
