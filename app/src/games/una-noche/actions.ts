// Acciones de «Una Noche en Castronegro» sobre Firestore. Todo el estado vive
// en el doc de SU partida (groups/<mesa>/matches/<mid>), como El Espía; los
// docs de jugador no se tocan. Transacciones «primero gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools, setSettings,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import {
  MIN_PLAYERS, MAX_PLAYERS, CENTER_COUNT, compositionSize, dealOneNight,
} from './roles';
import {
  computeNightSteps, stepActors, playersOf, finalRolesOf, checkWinner,
  robberSwap, troublemakerSwap, drunkSwap, seerViewPlayer, seerViewCenter, dobleId,
} from './engine';
import type { Composition, GameState, RoleId } from './types';

/** El estado de Una Noche, si la partida de la vista es de este juego. */
export function unaNocheGame(g: GroupDoc | null): GameState | null {
  const game = g?.game as unknown as GameState | null;
  return game && game.unaNoche ? game : null;
}

interface TxExtra { game: GameState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: GameState, m: MatchDoc) => GameState | TxExtra | null | undefined;

// Transacción sobre el doc de la partida: lee, aplica fn sobre una copia y
// escribe. fn devuelve null para abortar (otro se adelantó).
async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('una_noche');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as GameState | null;
    if (!game || !game.unaNoche) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as GameState;
    const res = fn(copy, m);
    if (!res) return;
    const extra = ('game' in res ? res : { game: res }) as TxExtra;
    const patch: Record<string, unknown> = { game: sanitize(extra.game) };
    if (extra.members) patch.members = sanitize(extra.members);
    if (extra.masterPatch !== undefined) patch.masterId = extra.masterPatch;
    t.update(mref(slug, id), patch);
  });
}

const nameOf = (g: GameState, pid: string | null | undefined) => (pid && g.names[pid]) || '¿?';

// ——— Inicio ———

export async function startUnaNoche(
  playerIds: string[],
  narratorId: string | null,
  comp: Composition,
): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Una Noche necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Una Noche admite ${MAX_PLAYERS} jugadores como mucho.`);
  const need = playerIds.length + CENTER_COUNT;
  if (compositionSize(comp) !== need) {
    throw new Error(`El mazo debe tener exactamente ${need} cartas (${playerIds.length} jugadores + ${CENTER_COUNT} en el centro).`);
  }
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const players = playerIds.map((id, i) => ({ id, order: i }));
  const { originalRole, slots, center } = dealOneNight(players, comp, seed);
  const selectedRoles = (Object.keys(comp) as RoleId[]).filter((r) => (comp[r] || 0) > 0);
  const game: GameState = {
    unaNoche: true, mode: 'auto', phase: 'reveal', startedAt: now, seed,
    playerIds, names,
    steps: [], stepIdx: 0, acts: {},
    originalRole, slots, center, composition: comp, selectedRoles,
    seen: {}, lynched: null, pendingHunter: null, deaths: [], winner: null, winners: [],
    discussionEndsAt: null, paused: null, repeatNonce: 0,
    log: [{ kind: 'evento', txt: `🌙 Comienza Una Noche en Castronegro con ${playerIds.length} jugadores y ${CENTER_COUNT} cartas en el centro.` }],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'una_noche', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker,
      settings: {}, extraRoles: [], game,
    }));
  });
  // Recuerda el mazo elegido para la próxima partida.
  await setSettings({ unaNoche: comp as Record<string, number> }).catch(() => { /* mejor esfuerzo */ });
}

// ——— Reparto (reveal) ———

export async function confirmSeen(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'reveal' || !game.playerIds.includes(me)) return null;
    game.seen = { ...(game.seen || {}), [me]: true };
    return game;
  });
}

/** Cuando todos han visto su carta, cualquiera comienza la noche. */
export async function beginNight(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'reveal') return null;
    if (!game.playerIds.every((pid) => (game.seen || {})[pid])) return null;
    game.phase = 'night';
    game.steps = computeNightSteps(game.composition);
    game.stepIdx = 0;
    game.log!.push({ kind: 'noche', txt: '🌙 Castronegro cierra los ojos. Empieza la noche…' });
    return game;
  });
}

// ——— Utilidad: ¿me toca actuar en este paso? ———

function actorHere(game: GameState, step: string, me: string): boolean {
  const a = stepActors(step as GameState['steps'][number], game, playersOf(game));
  return !!a && a.includes(me);
}

// Acción nocturna genérica: valida fase + paso + actor y aplica.
async function night(step: string, apply: (game: GameState, me: string) => GameState | null): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'night' || game.steps[game.stepIdx] !== step) return null;
    if (!actorHere(game, step, me)) return null;
    return apply(game, me);
  });
}

// ——— El Doble ———

export const dobleCopy = (targetId: string) => night('doble', (game, me) => {
  if (game.acts.dobleRole) return null;
  const role = game.slots[targetId];
  if (!role || targetId === me) return null;
  game.acts.dobleTarget = targetId;
  game.acts.dobleRole = role;
  // Roles sin acción propia en el turno del Doble (grupo/al final o pasivos):
  // quedan listos; los de grupo/al final actúan luego en su paso.
  const instant = ['vidente', 'ladron', 'alborotadora', 'borracho'].includes(role);
  if (!instant) game.acts.dobleActionDone = true;
  game.log!.push({ kind: 'evento', txt: '👯 El Doble ha copiado a alguien.' });
  return game;
});

// Las acciones copiadas por El Doble guardan su resultado pero NO cierran el
// paso: el jugador confirma con dobleConfirm() cuando ha leído lo que vio.
export const dobleSeePlayer = (pid: string) => night('doble', (game) => {
  if (game.acts.dobleRole !== 'vidente' || game.acts.dobleView) return null;
  game.acts.dobleView = seerViewPlayer(game, pid);
  return game;
});

export const dobleSeeCenter = (idxs: number[]) => night('doble', (game) => {
  if (game.acts.dobleRole !== 'vidente' || game.acts.dobleView) return null;
  game.acts.dobleView = seerViewCenter(game, idxs.slice(0, 2));
  return game;
});

export const dobleRob = (targetId: string) => night('doble', (game, me) => {
  if (game.acts.dobleRole !== 'ladron' || game.acts.dobleCard) return null;
  if (targetId === me) return null;
  game.acts.dobleCard = robberSwap(game, me, targetId);
  return game;
});

export const dobleTrouble = (a: string, b: string) => night('doble', (game, me) => {
  if (game.acts.dobleRole !== 'alborotadora' || game.acts.dobleActed) return null;
  if (a === me || b === me || a === b) return null;
  troublemakerSwap(game, a, b);
  game.acts.dobleActed = true;
  return game;
});

export const dobleDrink = (idx: number) => night('doble', (game, me) => {
  if (game.acts.dobleRole !== 'borracho' || game.acts.dobleActed) return null;
  drunkSwap(game, me, idx);
  game.acts.dobleActed = true;
  return game;
});

export const dobleConfirm = () => night('doble', (game) => {
  game.acts.dobleActionDone = true;
  return game;
});

// ——— Reconocimientos ———

export const wolvesSeen = () => night('lobos', (game, me) => {
  game.acts.lobosSeen = { ...(game.acts.lobosSeen || {}), [me]: true };
  return game;
});

export const loneWolfPeek = (idx: number) => night('lobos', (game) => {
  if (game.acts.loneWolfPeek != null) return null;
  game.acts.loneWolfPeek = idx;
  game.acts.loneWolfCard = game.center[idx];
  return game;
});

export const minionSeen = () => night('esbirro', (game, me) => {
  game.acts.esbirroSeen = { ...(game.acts.esbirroSeen || {}), [me]: true };
  return game;
});

export const masonSeen = () => night('masones', (game, me) => {
  game.acts.masonesSeen = { ...(game.acts.masonesSeen || {}), [me]: true };
  return game;
});

// ——— Vidente ———

export const seerPlayer = (pid: string) => night('vidente', (game) => {
  if (game.acts.videnteDone) return null;
  game.acts.videnteView = seerViewPlayer(game, pid);
  game.acts.videnteDone = true;
  return game;
});

export const seerCenter = (idxs: number[]) => night('vidente', (game) => {
  if (game.acts.videnteDone) return null;
  game.acts.videnteView = seerViewCenter(game, idxs.slice(0, 2));
  game.acts.videnteDone = true;
  return game;
});

export const seerConfirm = () => night('vidente', (game) => {
  game.acts.videnteSeen = true;
  return game;
});

// ——— Ladrón ———

export const robberRob = (targetId: string) => night('ladron', (game, me) => {
  if (game.acts.ladronDone) return null;
  game.acts.ladronTarget = targetId;
  game.acts.ladronCard = robberSwap(game, me, targetId);
  game.acts.ladronDone = true;
  return game;
});

export const robberSkip = () => night('ladron', (game) => {
  if (game.acts.ladronDone) return null;
  game.acts.ladronDone = true;
  game.acts.ladronTarget = null;
  game.acts.ladronSeen = true; // nada que mirar
  return game;
});

export const robberConfirm = () => night('ladron', (game) => {
  game.acts.ladronSeen = true;
  return game;
});

// ——— Alborotadora ———

export const troublemakerSwap2 = (a: string, b: string) => night('alborotadora', (game) => {
  if (game.acts.alborotadoraDone) return null;
  if (a === b) return null;
  troublemakerSwap(game, a, b);
  game.acts.alborotadoraDone = true;
  game.acts.alborotadoraPair = [a, b];
  return game;
});

export const troublemakerSkip = () => night('alborotadora', (game) => {
  if (game.acts.alborotadoraDone) return null;
  game.acts.alborotadoraDone = true;
  game.acts.alborotadoraPair = null;
  return game;
});

// ——— Borracho (obligatorio) ———

export const drunkTake = (idx: number) => night('borracho', (game, me) => {
  if (game.acts.borrachoDone) return null;
  drunkSwap(game, me, idx);
  game.acts.borrachoDone = true;
  game.acts.borrachoCenter = idx;
  return game;
});

// ——— Insomne ———

export const insomniacLook = () => night('insomne', (game, me) => {
  if ((game.acts.insomneCard || {})[me]) return null;
  game.acts.insomneCard = { ...(game.acts.insomneCard || {}), [me]: game.slots[me] };
  return game;
});

export const insomniacDone = () => night('insomne', (game, me) => {
  game.acts.insomneSeen = { ...(game.acts.insomneSeen || {}), [me]: true };
  return game;
});

// ——— Avance de pasos (lo llama el narrador tras las pausas de disimulo) ———

export async function advanceGhostStep(expectedIdx: number): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'night' || game.stepIdx !== expectedIdx) return null;
    if (game.steps[game.stepIdx] === 'amanecer') return null;
    game.stepIdx += 1;
    return game;
  });
}

/** Amanece: se abren los ojos y empieza el día (debate + votación). */
export async function wakeUp(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'night' || game.steps[game.stepIdx] !== 'amanecer') return null;
    game.phase = 'day';
    game.lynched = null;
    game.pendingHunter = null;
    game.deaths = [];
    game.log!.push({ kind: 'dia', txt: '☀️ Amanece. Debatid y, cuando el pueblo decida, que alguien registre a quién condena (o si perdona).' });
    return game;
  });
}

// ——— Día: una persona registra la decisión del pueblo (como Los Hombres Lobo) ———

// choice: pid condenado | 'nadie'. Cualquiera en juego lo registra.
export async function castVote(choice: string): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'day' || game.pendingHunter || game.lynched != null) return null;
    if (!game.playerIds.includes(me)) return null;
    if (choice !== 'nadie' && !game.playerIds.includes(choice)) return null;
    game.lynched = choice;
    if (choice === 'nadie') {
      game.log!.push({ kind: 'dia', txt: `🕊️ ${nameOf(game, me)} registra: el pueblo perdona, no se condena a nadie.` });
    } else {
      game.log!.push({ kind: 'dia', txt: `⚖️ ${nameOf(game, me)} registra la condena del pueblo: ${nameOf(game, choice)}.` });
    }
    return resolveDeaths(game, choice === 'nadie' ? [] : [choice]);
  });
}

// La flecha del Cazador (por carta FINAL): tras el linchamiento, dispara a
// quien la mesa decida (lo registra el propio Cazador o el narrador).
export async function hunterShoot(targetId: string | null): Promise<void> {
  await tx((game, m) => {
    if (!game.pendingHunter) return null;
    if (myPid() !== game.pendingHunter && myPid() !== m.masterId) return null;
    const hunter = game.pendingHunter;
    game.pendingHunter = null;
    const deaths = (game.deaths || []).slice();
    if (targetId && game.playerIds.includes(targetId) && !deaths.includes(targetId)) {
      deaths.push(targetId);
      game.log!.push({ kind: 'dia', txt: `🏹 ${nameOf(game, hunter)}, que era el Cazador, se lleva consigo a ${nameOf(game, targetId)}.` });
    } else {
      game.log!.push({ kind: 'dia', txt: `🏹 ${nameOf(game, hunter)}, el Cazador, no dispara.` });
    }
    return resolveDeaths(game, deaths);
  });
}

// Aplica las muertes del día. Si un Cazador (por carta FINAL) cae y aún no ha
// disparado, abre su flecha como pendiente (como en Los Hombres Lobo); si no,
// cierra la partida con el/los ganador(es).
function resolveDeaths(game: GameState, deaths: string[]): GameState {
  game.deaths = deaths;
  const players = playersOf(game);
  const finals = finalRolesOf(game, players);
  const shot = game.huntersShot || [];
  const hunter = deaths.find((pid) => finals[pid] === 'cazador' && !shot.includes(pid));
  if (hunter) {
    game.huntersShot = [...shot, hunter];
    game.pendingHunter = hunter;
    return game; // sigue en 'day' hasta que dispare
  }
  const pids = players.map((p) => p.id);
  const winners = checkWinner(finals, deaths, pids);
  game.winners = winners;
  game.winner = winners[0] || 'nadie';
  game.phase = 'end';
  game.log!.push({ kind: 'dia', txt: deaths.length ? `💀 Cae: ${deaths.map((pid) => nameOf(game, pid)).join(', ')}.` : '🕊️ No muere nadie hoy.' });
  return game;
}

// ——— Revancha / fin ———

/** Otra partida con los mismos jugadores y mazo (nuevo reparto). */
export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    const players = game.playerIds.map((id, i) => ({ id, order: i }));
    const seed = (game.seed || 0) + 101;
    const { originalRole, slots, center } = dealOneNight(players, game.composition, seed);
    game.seed = seed;
    game.phase = 'reveal';
    game.steps = [];
    game.stepIdx = 0;
    game.acts = {};
    game.originalRole = originalRole;
    game.slots = slots;
    game.center = center;
    game.seen = {};
    game.lynched = null;
    game.pendingHunter = null;
    game.huntersShot = [];
    game.deaths = [];
    game.winners = [];
    game.winner = null;
    game.log!.push({ kind: 'evento', txt: '🔁 Nueva noche: cartas repartidas de nuevo.' });
    return game;
  });
}

/** Terminar la partida: sus miembros quedan libres y vuelven al lobby. */
export async function endUnaNoche(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('una_noche');
  if (!id) return;
  await deleteDoc(mref(mySlug(), id));
}

// ——— Pausa / repetir (narrador automático) ———

export async function pauseGame(): Promise<void> {
  await tx((game) => {
    if (game.phase === 'end' || game.paused) return null;
    const who = state.players.find((p) => p.id === myPid());
    game.paused = { by: myPid(), name: who?.name || 'alguien', at: Date.now() };
    return game;
  }, undefined, { allowPaused: true });
}

export async function resumeGame(): Promise<void> {
  await tx((game) => {
    if (!game.paused) return null;
    game.paused = null;
    return game;
  }, undefined, { allowPaused: true });
}

export async function requestRepeat(): Promise<void> {
  await tx((game) => {
    game.repeatNonce = (game.repeatNonce || 0) + 1;
    return game;
  }, undefined, { allowPaused: true });
}

// ——— Herramientas de la mesa ———
// Una partida de Una Noche es breve y de una sola noche: sacar a un jugador (o
// que el narrador se vaya) invalida el reparto, así que ambos casos terminan la
// partida y liberan a todos (pueden empezar otra al instante).
registerMatchTools('una_noche', {
  leave: (mid) => endUnaNoche(mid),
  end: (mid) => endUnaNoche(mid),
});

/** El pid de El Doble en la partida en curso (para la UI). */
export function currentDobleId(game: GameState): string | null {
  return dobleId(game, playersOf(game));
}
