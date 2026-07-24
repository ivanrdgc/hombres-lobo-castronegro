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

/** Construye la lista de jugadores (en orden de asiento) desde el estado. */
export function playersOf(game: GameState): Player[] {
  return (game.playerIds || []).map((id, i) => ({
    id, name: game.names?.[id] || id, order: i, inGame: true,
  }));
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
  // Escape del narrador: si SALTÓ este paso (alguien no actuaba y la noche se
  // colgaba), ya no espera a nadie —se cierra como un paso fantasma más—.
  if (game.steps?.[game.stepIdx] === step && (game.skippedSteps || []).includes(game.stepIdx)) return null;
  switch (step) {
    case 'doble': {
      const d = dobleId(game, players);
      if (!d) return null;
      // Sigue siendo el actor hasta que CIERRA su turno (dobleConfirm): así ve
      // qué copió —y el resultado de la acción copiada— antes de que el panel
      // desaparezca. Los roles de grupo/al final los hará luego, en su paso.
      return acts.dobleActionDone ? null : [d];
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
 *  - la carta «doble», una vez copiada, ES el rol copiado para TODO EL MUNDO
 *    (regla oficial de One Night): si un intercambio se la lleva a otra silla,
 *    quien acabe con ella muere y gana como ese rol, aunque no lo sepa;
 *  - una carta «doble» que nunca copió nada (estaba en el centro y el Borracho
 *    la pescó) cuenta como Aldeano.
 */
export function finalRoleOf(game: GameState, pid: string): RoleId {
  const card = game.slots[pid];
  if (card !== 'doble') return card;
  return game.acts?.dobleRole || 'aldeano';
}

export function finalRolesOf(game: GameState, players: Player[]): Record<string, RoleId> {
  const out: Record<string, RoleId> = {};
  for (const p of players) if (p.inGame) out[p.id] = finalRoleOf(game, p.id);
  return out;
}

// ——— Día: muertes y victoria (una persona registra la decisión del pueblo) ———

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
      // Regla oficial del Esbirro sin lobos: gana si muere alguien QUE NO SEA
      // esbirro; si los únicos caídos son esbirros, el pueblo cazó bien y gana.
      const nonMinionDied = pids.some((p) => dead.has(p) && roleOf(p) !== 'esbirro');
      winners.push(nonMinionDied ? 'lobos' : 'pueblo');
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

/** Sanea acts a un objeto vacío al empezar una partida nueva. */
export function emptyActs(): Acts {
  return {};
}
