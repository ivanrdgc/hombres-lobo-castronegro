// Motor PURO de El Espía: reparto, votaciones y puntuación oficial de Spyfall.
// Sin Firestore ni UI: todo testeable en frío.
import { LOCATIONS, locationById } from './locations';
import type { EspiaOutcome, EspiaState, EspiaVote } from './types';

export const ESPIA_MIN_PLAYERS = 3;
export const ESPIA_MAX_PLAYERS = 8; // 7 papeles + 1 espía (tope oficial)
export const ESPIA_DURATIONS_MIN = [5, 8, 10]; // oficial: 8 minutos
export const ESPIA_DEFAULT_MIN = 8;

// PRNG determinista (mismo algoritmo que el reparto de Hombres Lobo).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Localización de la ronda: sin repetir hasta agotar el mazo; luego se rebaraja. */
export function pickLocation(usedLocations: string[], rnd: () => number): string {
  let pool = LOCATIONS.filter((l) => !usedLocations.includes(l.id));
  if (!pool.length) {
    const last = usedLocations[usedLocations.length - 1];
    pool = LOCATIONS.filter((l) => l.id !== last); // mazo agotado: rebarajar (sin repetir la última)
  }
  return pool[Math.floor(rnd() * pool.length)].id;
}

export interface DealResult {
  dealerId: string;
  spyId: string;
  locationId: string;
  roles: Record<string, string>;
}

/** Reparto de una ronda: 1 espía, papeles únicos de la localización al resto. */
export function dealRound(playerIds: string[], round: number, usedLocations: string[], seed: number): DealResult {
  const rnd = mulberry32(seed);
  const dealerId = playerIds[(round - 1) % playerIds.length];
  const locationId = pickLocation(usedLocations, rnd);
  const spyId = playerIds[Math.floor(rnd() * playerIds.length)];
  const loc = locationById(locationId)!;
  const pool = shuffled(loc.roles, rnd);
  const roles: Record<string, string> = {};
  let i = 0;
  for (const pid of playerIds) {
    if (pid === spyId) continue;
    roles[pid] = pool[i++];
  }
  return { dealerId, spyId, locationId, roles };
}

/** Quiénes votan una acusación: todos menos acusador (sí implícito) y acusado. */
export function voters(playerIds: string[], vote: EspiaVote): string[] {
  return playerIds.filter((id) => id !== vote.accuserId && id !== vote.accusedId);
}

export interface VoteTally {
  pending: string[];
  anyNo: boolean;
  allYes: boolean;
}

export function tallyVote(playerIds: string[], vote: EspiaVote): VoteTally {
  const vs = voters(playerIds, vote);
  const pending = vs.filter((id) => vote.votes[id] === undefined);
  const anyNo = vs.some((id) => vote.votes[id] === false);
  const allYes = vs.length > 0 && vs.every((id) => vote.votes[id] === true);
  // Con 3 jugadores hay un único votante; con menos (imposible) sería unánime.
  return { pending, anyNo, allYes: vs.length ? allYes : true };
}

const nameOf = (s: Pick<EspiaState, 'names'>, pid: string | undefined): string =>
  (pid && s.names[pid]) || '¿?';

const locName = (id: string): string => {
  const l = locationById(id);
  return l ? `${l.emoji} ${l.name}` : id;
};

// ——— Desenlaces (puntuación oficial de Spyfall) ———
//  espía: +2 nadie condenado · +4 condena a un inocente · +4 acierta el lugar
//  agentes: +1 cada uno · +1 extra a quien inició la acusación acertada

function agentsDelta(s: EspiaState, extraTo?: string): Record<string, number> {
  const delta: Record<string, number> = {};
  for (const pid of s.playerIds) if (pid !== s.spyId) delta[pid] = 1;
  if (extraTo && delta[extraTo] !== undefined) delta[extraTo] += 1;
  return delta;
}

/** Voto unánime: se revela la carta del acusado y la ronda termina. */
export function resolveConviction(s: EspiaState, accusedId: string, initiatorId: string): EspiaOutcome {
  if (accusedId === s.spyId) {
    return {
      type: 'spy_caught', spyId: s.spyId, locationId: s.locationId, accusedId, initiatorId,
      delta: agentsDelta(s, initiatorId),
      txt: `🕵️ ¡${nameOf(s, accusedId)} era el espía! Los agentes ganan la ronda (+1; ${nameOf(s, initiatorId)} inició la acusación: +2). El lugar era ${locName(s.locationId)}.`,
    };
  }
  return {
    type: 'wrong_accusation', spyId: s.spyId, locationId: s.locationId, accusedId, initiatorId,
    delta: { [s.spyId]: 4 },
    txt: `😱 ${nameOf(s, accusedId)} era inocente (${s.roles[accusedId] || 'agente'}). El espía era ${nameOf(s, s.spyId)} y gana la ronda (+4). El lugar era ${locName(s.locationId)}.`,
  };
}

/** El espía se revela y señala una localización. */
export function resolveGuess(s: EspiaState, guessId: string): EspiaOutcome {
  if (guessId === s.locationId) {
    return {
      type: 'spy_guessed', spyId: s.spyId, locationId: s.locationId, guessId,
      delta: { [s.spyId]: 4 },
      txt: `🎭 ${nameOf(s, s.spyId)} se revela como espía y ACIERTA el lugar: ${locName(s.locationId)}. Gana la ronda (+4).`,
    };
  }
  return {
    type: 'spy_wrong', spyId: s.spyId, locationId: s.locationId, guessId,
    delta: agentsDelta(s),
    txt: `🎭 ${nameOf(s, s.spyId)} se revela como espía… y falla: señaló ${locName(guessId)}, pero el lugar era ${locName(s.locationId)}. Los agentes ganan la ronda (+1).`,
  };
}

/** Turnos agotados sin condena: el espía sobrevive escondido. */
export function resolveTimeout(s: EspiaState): EspiaOutcome {
  return {
    type: 'spy_survived', spyId: s.spyId, locationId: s.locationId,
    delta: { [s.spyId]: 2 },
    txt: `🕵️ Nadie fue condenado: el espía era ${nameOf(s, s.spyId)} y se marcha de rositas (+2). El lugar era ${locName(s.locationId)}.`,
  };
}

/** Sin quórum (quedan menos de ESPIA_MIN_PLAYERS): la ronda no cuenta.
 *  No es una victoria del espía: nadie llegó a jugarla entera, así que ni
 *  puntos ni «gana el espía» (que era lo que la pantalla final insinuaba). */
export function resolveVoid(s: EspiaState): EspiaOutcome {
  return {
    type: 'round_void', spyId: s.spyId, locationId: s.locationId,
    delta: {},
    txt: `🚪 Quedan menos de ${ESPIA_MIN_PLAYERS} jugadores: ronda ANULADA, sin puntos para nadie. El espía era ${nameOf(s, s.spyId)} y el lugar, ${locName(s.locationId)}.`,
  };
}

/** El espía abandona la ronda: los agentes se apuntan la victoria. */
export function resolveSpyLeft(s: EspiaState): EspiaOutcome {
  return {
    type: 'spy_left', spyId: s.spyId, locationId: s.locationId,
    delta: agentsDelta(s),
    txt: `🚪 El espía (${nameOf(s, s.spyId)}) abandona la ronda: los agentes ganan (+1). El lugar era ${locName(s.locationId)}.`,
  };
}

/** Aplica el delta del desenlace al marcador acumulado. */
export function applyDelta(scores: Record<string, number>, delta: Record<string, number>): Record<string, number> {
  const out = { ...scores };
  for (const [pid, d] of Object.entries(delta)) out[pid] = (out[pid] || 0) + d;
  return out;
}

/** Orden de turnos tras el tiempo: desde el repartidor, en orden de mesa. */
export function timeupOrder(s: Pick<EspiaState, 'playerIds' | 'dealerId'>): string[] {
  const i = Math.max(0, s.playerIds.indexOf(s.dealerId));
  return s.playerIds.slice(i).concat(s.playerIds.slice(0, i));
}
