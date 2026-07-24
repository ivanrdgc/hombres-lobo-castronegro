// Motor puro de «Secret Hitler»: rotación de la presidencia, elegibilidad
// del Canciller (límites de mandato), recuento de la elección, mazo de decretos
// (reparto y rebaraja), promulgación, poderes y condiciones de victoria.
import {
  seededShuffle, powerFor, factionOf, LIBERAL_TRACK, FASCIST_TRACK, VETO_AT,
} from './roles';
import type { Faction, PolicyId, PowerType } from './roles';
import type { SHState } from './types';

export interface Player { id: string; name?: string; order?: number; alive?: boolean }

export function playersOf(game: SHState): Player[] {
  return (game.playerIds || []).map((id, i) => ({ id, name: game.names?.[id] || id, order: i, alive: !!game.alive[id] }));
}

export const aliveIds = (game: SHState): string[] => game.playerIds.filter((pid) => game.alive[pid]);
export const aliveCount = (game: SHState): number => aliveIds(game).length;

/** El Presidente actual (el de la elección especial manda sobre la rotación). */
export function presidentId(game: SHState): string {
  return game.specialPresident || game.playerIds[game.presidentIdx % game.playerIds.length];
}

/** Índice del siguiente jugador VIVO tras `fromIdx` (rotación horaria). */
export function nextAliveIdx(game: SHState, fromIdx: number): number {
  const n = game.playerIds.length;
  for (let d = 1; d <= n; d++) {
    const idx = (fromIdx + d) % n;
    if (game.alive[game.playerIds[idx]]) return idx;
  }
  return fromIdx;
}

/**
 * Pasa la presidencia. La rotación regular SIEMPRE avanza al siguiente vivo
 * desde el presidente que la convocó (`presidentIdx`): si hubo una elección
 * especial, se consume y la rotación reanuda a la izquierda de quien la llamó.
 */
export function advancePresidency(game: SHState): void {
  game.specialPresident = null;
  game.presidentIdx = nextAliveIdx(game, game.presidentIdx);
}

/**
 * Cancilleres elegibles: vivos, ni el Presidente ni el último Canciller electo;
 * y, con más de 5 vivos, tampoco el último Presidente electo (límites de mandato).
 */
export function eligibleChancellors(game: SHState): string[] {
  const pres = presidentId(game);
  const alive = aliveCount(game);
  return aliveIds(game).filter((pid) => {
    if (pid === pres) return false;
    if (pid === game.lastChancellor) return false;
    if (alive > 5 && pid === game.lastPresident) return false;
    return true;
  });
}

export interface Tally { ja: string[]; nein: string[]; passed: boolean }

/** Recuento de la elección: aprueba con MAYORÍA ESTRICTA de los vivos (empate = no). */
export function tallyElection(game: SHState): Tally {
  const alive = aliveIds(game);
  const ja = alive.filter((pid) => game.votes[pid] === true);
  const nein = alive.filter((pid) => game.votes[pid] === false);
  return { ja, nein, passed: ja.length > alive.length / 2 };
}

/** Rebaraja los descartes en el mazo cuando quedan menos de 3 cartas. */
export function refillIfNeeded(game: SHState): void {
  if (game.draw.length >= 3) return;
  game.reshuffles += 1;
  const pool = game.draw.concat(game.discard);
  game.draw = seededShuffle(pool, game.seed + 7919 * game.reshuffles);
  game.discard = [];
}

/** MIRA las `k` primeras cartas del mazo sin sacarlas (rebaraja antes si hace falta). */
export function drawTop(game: SHState, k: number): PolicyId[] {
  refillIfNeeded(game);
  return game.draw.slice(0, k);
}

/** SACA las `k` primeras cartas del mazo (rebaraja antes si hace falta). */
export function takeTop(game: SHState, k: number): PolicyId[] {
  refillIfNeeded(game);
  const taken = game.draw.slice(0, k);
  game.draw = game.draw.slice(k);
  return taken;
}

/** Promulga un decreto: sube el marcador y devuelve el poder que dispara (fascista). */
export function enactPolicy(game: SHState, policy: PolicyId): PowerType | null {
  game.lastEnacted = policy;
  if (policy === 'liberal') { game.liberalPolicies += 1; return null; }
  game.fascistPolicies += 1;
  if (game.fascistPolicies >= VETO_AT) game.vetoUnlocked = true;
  return powerFor(game.playerIds.length, game.fascistPolicies);
}

export interface WinCheck { winner: Faction | null; reason: string | null }

/** Victoria por marcador de decretos (5 liberales o 6 fascistas). */
export function checkPolicyWin(game: SHState): WinCheck {
  if (game.liberalPolicies >= LIBERAL_TRACK) return { winner: 'liberal', reason: 'Cinco decretos liberales: la República se salva.' };
  if (game.fascistPolicies >= FASCIST_TRACK) return { winner: 'fascist', reason: 'Seis decretos fascistas: los fascistas se hacen con el poder.' };
  return { winner: null, reason: null };
}

/** ¿Elegir a Hitler Canciller con 3+ decretos fascistas hace ganar a los fascistas? */
export function hitlerChancellorWin(game: SHState, chancellor: string): boolean {
  return game.fascistPolicies >= 3 && game.roles[chancellor] === 'hitler';
}

export const factionLabel = (f: Faction): string => (f === 'liberal' ? 'liberal' : 'fascista');

// ——— Caos y veto (pasos puros: actions.ts solo escribe la crónica) ———

export interface ChaosOutcome { policy: PolicyId; win: WinCheck }

/**
 * Caos: tres gobiernos caídos → se promulga a ciegas el decreto de arriba SIN
 * disparar su poder y BORRANDO los límites de mandato (regla oficial: el
 * siguiente gobierno puede repetir cargos).
 */
export function applyChaos(game: SHState): ChaosOutcome {
  const [policy] = takeTop(game, 1);
  enactPolicy(game, policy); // el poder que devuelva se ignora: el caos no lo activa
  game.chaosCount = (game.chaosCount || 0) + 1;
  game.electionTracker = 0;
  game.lastPresident = null;
  game.lastChancellor = null;
  game.nominatedChancellor = null;
  const win = checkPolicyWin(game);
  if (win.winner) {
    game.winner = win.winner;
    game.winReason = win.reason;
    game.phase = 'end';
    return { policy, win };
  }
  advancePresidency(game);
  game.phase = 'nominate';
  return { policy, win };
}

export interface VetoOutcome { chaos: ChaosOutcome | null }

/** ¿Puede el Canciller proponer veto? (desbloqueado y sin haberlo pedido ya). */
export function canVeto(game: SHState): boolean {
  return !!game.vetoUnlocked && !game.vetoRefused;
}

/**
 * Veto ACEPTADO: la agenda entera se descarta, no se promulga nada y cuenta
 * como gobierno caído (puede desembocar en caos).
 */
export function applyVetoAccept(game: SHState): VetoOutcome {
  for (const c of game.chancellorDraw || []) game.discard.push(c);
  game.chancellorDraw = null;
  game.vetoRequested = false;
  game.electionTracker += 1;
  if (game.electionTracker >= 3) return { chaos: applyChaos(game) };
  advancePresidency(game);
  game.phase = 'nominate';
  game.nominatedChancellor = null;
  return { chaos: null };
}

/** Veto RECHAZADO: el Canciller vuelve a su agenda y ya no puede re-vetar. */
export function applyVetoRefuse(game: SHState): void {
  game.vetoRequested = false;
  game.vetoRefused = true;
  game.phase = 'legislativeChancellor';
}

/** ¿Quién debe actuar ahora? (para resaltar en la UI). */
export function pendingActors(game: SHState): string[] {
  switch (game.phase) {
    case 'reveal': return game.playerIds.filter((pid) => !game.seen[pid]);
    case 'nominate': return [presidentId(game)];
    case 'election': return aliveIds(game).filter((pid) => game.votes[pid] === undefined);
    case 'legislativePresident': return [presidentId(game)];
    case 'legislativeChancellor': return game.nominatedChancellor ? [game.nominatedChancellor] : [];
    case 'vetoDecision': return [presidentId(game)];
    case 'power': return game.power ? [game.power.by] : [];
    default: return [];
  }
}

export { factionOf, powerFor };

export const WIN_LABELS: Record<Faction, string> = {
  liberal: '🕊️ ¡Ganan los Liberales! La República de Castronegro resiste.',
  fascist: '🐷 ¡Ganan los Fascistas! Las botas resuenan en Castronegro.',
};

export const POWER_LABEL: Record<PowerType, string> = {
  peek: '🔮 Mirar los tres decretos de arriba',
  investigate: '🔎 Investigar la lealtad de un jugador',
  special: '🗳️ Convocar una elección especial',
  execution: '💀 Ejecutar a un jugador',
};
