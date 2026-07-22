// Motor puro de «Una Noche en Castronegro»: pasos de la noche, quién actúa,
// intercambios de cartas, recuento del voto simultáneo y condiciones de
// victoria. Sin dependencias de navegador ni Firebase (testeable en Node).
import { ACTION_ROLES, DOBLE_JOIN_ROLES, ROLES, STEP_OF, isWolfRole } from './roles';
import type { RoleId, StepId, Team } from './types';
import type { Acts, Composition, GameState, VidenteView, WinnerId } from './types';

/** Jugador mínimo que el motor necesita. */
export interface Player {
  id: string;
  name?: string;
  order?: number;
  inGame?: boolean;
}

// ——— Pasos de la noche ———

/**
 * Pasos que compone la noche: cada rol de ACCIÓN presente en el mazo se llama,
 * esté repartido o en el centro (para no delatar qué hay en el centro por el
 * mero hecho de llamarlo o no). Los roles sin acción (aldeano, cazador,
 * curtidor) no tienen paso.
 */
export function computeNightSteps(comp: Composition): StepId[] {
  const steps: StepId[] = ['durmiendo'];
  for (const r of ACTION_ROLES) {
    if ((comp[r] || 0) > 0) steps.push(STEP_OF[r]!);
  }
  steps.push('amanecer');
  return steps;
}

const withOriginal = (game: GameState, role: RoleId, players: Player[]): Player[] =>
  players.filter((p) => p.inGame && game.originalRole[p.id] === role);

const ids = (arr: Player[]): string[] | null => (arr.length ? arr.map((p) => p.id) : null);

/** El pid de El Doble (si está repartido). */
export function dobleId(game: GameState, players: Player[]): string | null {
  return players.find((p) => p.inGame && game.originalRole[p.id] === 'doble')?.id ?? null;
}

/**
 * ¿La identidad NOCTURNA de `pid` es `role`? Cuenta su carta repartida y, para
 * los roles «de grupo/al final» (lobo, masón, esbirro, insomne), también a El
 * Doble que los copió (despierta con ellos). Los roles instantáneos que El
 * Doble copia (vidente, ladrón…) los hace en su propio turno, no aquí.
 */
export function nightIs(game: GameState, pid: string, role: RoleId): boolean {
  if (game.originalRole[pid] === role) return true;
  return DOBLE_JOIN_ROLES.includes(role)
    && game.originalRole[pid] === 'doble'
    && game.acts?.dobleRole === role;
}

const withNightRole = (game: GameState, role: RoleId, players: Player[]): Player[] =>
  players.filter((p) => p.inGame && nightIs(game, p.id, role));

/**
 * ¿Quién debe actuar en este paso? Se decide por la carta REPARTIDA
 * (originalRole): tu acción nocturna es la de tu carta inicial, aunque luego te
 * la cambien. null → paso «fantasma» (el rol está en el centro): la voz llama
 * igual y nadie abre los ojos.
 */
export function stepActors(step: StepId, game: GameState, players: Player[]): string[] | null {
  const acts = game.acts || {};
  switch (step) {
    case 'doble': {
      const d = dobleId(game, players);
      if (!d) return null;
      if (!acts.dobleRole) return [d]; // aún no ha copiado
      // Copió un rol instantáneo (vidente/ladrón/alborotadora/borracho): sigue
      // actuando hasta completarlo. Los de grupo/al final los hará en su paso.
      const instant = ['vidente', 'ladron', 'alborotadora', 'borracho'].includes(acts.dobleRole);
      return instant && !acts.dobleActionDone ? [d] : null;
    }
    case 'lobos': {
      const wolves = withNightRole(game, 'lobo', players);
      const pend = wolves.filter((p) => !(acts.lobosSeen || {})[p.id]);
      return ids(pend);
    }
    case 'esbirro': {
      const minions = withNightRole(game, 'esbirro', players);
      const pend = minions.filter((p) => !(acts.esbirroSeen || {})[p.id]);
      return ids(pend);
    }
    case 'masones': {
      const masons = withNightRole(game, 'mason', players);
      const pend = masons.filter((p) => !(acts.masonesSeen || {})[p.id]);
      return ids(pend);
    }
    case 'vidente': {
      const seer = withOriginal(game, 'vidente', players);
      if (!seer.length) return null;
      if (!acts.videnteDone) return ids(seer);
      return acts.videnteSeen ? null : ids(seer); // confirmando lo visto
    }
    case 'ladron': {
      const robber = withOriginal(game, 'ladron', players);
      if (!robber.length) return null;
      if (!acts.ladronDone) return ids(robber);
      return acts.ladronSeen ? null : ids(robber);
    }
    case 'alborotadora':
      return acts.alborotadoraDone ? null : ids(withOriginal(game, 'alborotadora', players));
    case 'borracho':
      return acts.borrachoDone ? null : ids(withOriginal(game, 'borracho', players));
    case 'insomne': {
      const sleepless = withNightRole(game, 'insomne', players);
      const pend = sleepless.filter((p) => !(acts.insomneSeen || {})[p.id]);
      return ids(pend);
    }
    case 'durmiendo':
    case 'amanecer':
    default:
      return null;
  }
}

/**
 * Compañeros que un jugador reconoce de noche (por identidad nocturna, así que
 * un Doble que copió Lobo/Masón entra en el reconocimiento). El Esbirro no es
 * lobo: no lo ven, aunque él sí los vea.
 */
export function packmates(game: GameState, players: Player[], role: RoleId, selfId: string): Player[] {
  return withNightRole(game, role, players).filter((p) => p.id !== selfId);
}

// ——— Intercambios y vistas de la noche (mutan game.slots / leen fotos) ———

/** Ladrón: cambia su carta por la de `target` y devuelve su NUEVA carta. */
export function robberSwap(game: GameState, robberId: string, targetId: string): RoleId {
  const s = game.slots;
  [s[robberId], s[targetId]] = [s[targetId], s[robberId]];
  return s[robberId];
}

/** Alborotadora: intercambia las cartas de `a` y `b` (sin mirar). */
export function troublemakerSwap(game: GameState, a: string, b: string): void {
  const s = game.slots;
  [s[a], s[b]] = [s[b], s[a]];
}

/** Borracho: cambia su carta por la del centro `idx` (sin mirar). */
export function drunkSwap(game: GameState, drunkId: string, idx: number): void {
  const tmp = game.slots[drunkId];
  game.slots[drunkId] = game.center[idx];
  game.center[idx] = tmp;
}

export function seerViewPlayer(game: GameState, pid: string): VidenteView {
  return { kind: 'player', pid, role: game.slots[pid] };
}

export function seerViewCenter(game: GameState, idxs: number[]): VidenteView {
  return { kind: 'center', idx: idxs.slice(), roles: idxs.map((i) => game.center[i]) };
}

// ——— Identidad final (regla única de El Doble) ———

/**
 * Rol FINAL de un jugador para muerte y victoria:
 *  - si su carta final es un rol normal → ese rol (cubre a El Doble que robó o
 *    bebió y acabó con una carta real, y a quien reciba una carta por swap);
 *  - si conserva la carta «doble» → el rol que copió (regla de la casa: «eres
 *    ese rol el resto de la partida»);
 *  - una carta «doble» HUÉRFANA (que le cayó a otro por un intercambio) cuenta
 *    como Aldeano (nunca copió nada).
 */
export function finalRoleOf(game: GameState, players: Player[], pid: string): RoleId {
  const card = game.slots[pid];
  if (card !== 'doble') return card;
  return pid === dobleId(game, players) ? (game.acts?.dobleRole || 'aldeano') : 'aldeano';
}

export function finalRolesOf(game: GameState, players: Player[]): Record<string, RoleId> {
  const out: Record<string, RoleId> = {};
  for (const p of players) if (p.inGame) out[p.id] = finalRoleOf(game, players, p.id);
  return out;
}

// ——— Día: voto simultáneo, muertes y victoria ———

/** ¿Han votado ya todos los jugadores en juego? */
export function allVoted(game: GameState, players: Player[]): boolean {
  const inGame = players.filter((p) => p.inGame);
  return inGame.length > 0 && inGame.every((p) => game.votes[p.id]);
}

/**
 * Muertes de la votación (por carta FINAL para el Cazador):
 *  - muere el más votado; empate → mueren todos los empatados;
 *  - si NADIE recibe más de un voto, no muere nadie (el pueblo no se puso de acuerdo);
 *  - si un Cazador muere, también muere aquel a quien votó.
 */
export function tallyDeaths(
  votes: Record<string, string>,
  finalRoles: Record<string, RoleId>,
  pids: string[],
): string[] {
  const count: Record<string, number> = {};
  for (const voter of pids) {
    const t = votes[voter];
    if (t && pids.includes(t)) count[t] = (count[t] || 0) + 1;
  }
  const max = Math.max(0, ...Object.values(count));
  if (max <= 1) return []; // nadie con más de un voto → nadie muere
  const dead = new Set(pids.filter((p) => (count[p] || 0) === max));
  // Cazador: arrastra a su objetivo (por carta final).
  for (const pid of [...dead]) {
    if (finalRoles[pid] === 'cazador') {
      const t = votes[pid];
      if (t && pids.includes(t)) dead.add(t);
    }
  }
  return [...dead];
}

export const WIN_LABELS: Record<WinnerId, string> = {
  pueblo: '🏡 ¡Gana el Pueblo! Ha caído al menos un hombre lobo (o no había ninguno y nadie murió).',
  lobos: '🐺 ¡Ganan los Hombres Lobo! Ningún lobo ha caído.',
  tanner: '🪢 ¡Gana el Curtidor! Por fin descansa: el pueblo lo mandó al otro barrio.',
  nadie: '🤷 Nadie gana: murió un aldeano y no había lobos que atrapar.',
};

/**
 * Condiciones de victoria de Una Noche (por carta FINAL). Admite varios
 * ganadores a la vez (p. ej. Curtidor + Pueblo si mueren el Curtidor y un lobo).
 */
export function checkWinner(
  finalRoles: Record<string, RoleId>,
  deaths: string[],
  pids: string[],
): WinnerId[] {
  const dead = new Set(deaths);
  const roleOf = (p: string) => finalRoles[p];
  const anyWolfInPlay = pids.some((p) => isWolfRole(roleOf(p)));
  const wolfDied = pids.some((p) => dead.has(p) && isWolfRole(roleOf(p)));
  const tannerDied = pids.some((p) => dead.has(p) && roleOf(p) === 'tanner');
  const minionInPlay = pids.some((p) => roleOf(p) === 'esbirro');
  const anyoneDied = deaths.length > 0;

  const winners: WinnerId[] = [];
  if (tannerDied) winners.push('tanner');
  if (wolfDied) winners.push('pueblo');

  if (!wolfDied && !tannerDied) {
    if (anyWolfInPlay) {
      winners.push('lobos'); // los lobos sobrevivieron
    } else if (!anyoneDied) {
      winners.push('pueblo'); // sin lobos y sin muertes: el pueblo acertó
    } else if (minionInPlay) {
      winners.push('lobos'); // sin lobos, murió un aldeano y hay Esbirro → gana el bando lobo
    } else {
      winners.push('nadie'); // murió un aldeano sin lobos ni esbirro: nadie gana
    }
  }
  return winners.length ? [...new Set(winners)] : ['nadie'];
}

/** Bando de cada carta (para pintar el final). */
export function teamOfRole(r: RoleId): Team {
  return ROLES[r].team;
}

export interface DayResult {
  finalRoles: Record<string, RoleId>;
  deaths: string[];
  winners: WinnerId[];
}

/** Resuelve el día completo desde los votos: identidad final → muertes → victoria. */
export function resolveDay(game: GameState, players: Player[]): DayResult {
  const inGame = players.filter((p) => p.inGame);
  const pids = inGame.map((p) => p.id);
  const finalRoles = finalRolesOf(game, players);
  const deaths = tallyDeaths(game.votes || {}, finalRoles, pids);
  const winners = checkWinner(finalRoles, deaths, pids);
  return { finalRoles, deaths, winners };
}

/** Sanea acts a un objeto vacío al empezar una partida nueva. */
export function emptyActs(): Acts {
  return {};
}
