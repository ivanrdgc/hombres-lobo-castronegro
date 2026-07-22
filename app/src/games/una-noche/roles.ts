// Catálogo de roles de «Una Noche en Castronegro» y reparto del mazo.
// Módulo puro (testeable en Node). Cada partida usa EXACTAMENTE n+3 cartas
// (n jugadores + 3 al centro): el mazo se elige en el lobby y el motor reparte.
import type { Composition, RoleId, StepId, Team } from './types';

export interface RoleDef {
  id: RoleId;
  name: string;
  emoji: string;
  team: Team;
  desc: string;
  /** Nº de copias por defecto en el mazo recomendado (0 = opcional suelto). */
  multi?: number;
  /** Orden en que la voz lo llama de noche (undefined = no actúa de noche). */
  wake?: number;
}

// Orden de despertar oficial (los que no aparecen no actúan de noche).
export const ROLES: Record<RoleId, RoleDef> = {
  doble: {
    id: 'doble', name: 'El Doble', emoji: '👯', team: 'pueblo', wake: 0,
    desc: 'Miras la carta de otro jugador y te conviertes en ese rol para el resto de la partida. Si el rol copiado actúa de noche, lo haces también.',
  },
  lobo: {
    id: 'lobo', name: 'Hombre Lobo', emoji: '🐺', team: 'lobos', multi: 2, wake: 1,
    desc: 'Abrís los ojos y os reconocéis. Si eres el único lobo, puedes mirar una carta del centro.',
  },
  esbirro: {
    id: 'esbirro', name: 'El Esbirro', emoji: '😈', team: 'lobos', wake: 2,
    desc: 'Ves quiénes son los lobos (ellos no te ven). Ganas con ellos; si mueres tú, a ellos les da igual.',
  },
  mason: {
    id: 'mason', name: 'El Masón', emoji: '🧱', team: 'pueblo', multi: 2, wake: 3,
    desc: 'Los masones abrís los ojos y os reconocéis entre vosotros.',
  },
  vidente: {
    id: 'vidente', name: 'La Vidente', emoji: '🔮', team: 'pueblo', wake: 4,
    desc: 'Miras la carta de otro jugador, o dos cartas del centro.',
  },
  ladron: {
    id: 'ladron', name: 'El Ladrón', emoji: '🃏', team: 'pueblo', wake: 5,
    desc: 'Cambias tu carta por la de otro jugador y miras tu nueva carta: pasas a ser ese rol.',
  },
  alborotadora: {
    id: 'alborotadora', name: 'La Alborotadora', emoji: '🌀', team: 'pueblo', wake: 6,
    desc: 'Intercambias las cartas de otros dos jugadores, sin mirarlas. Ellos no lo saben.',
  },
  borracho: {
    id: 'borracho', name: 'El Borracho', emoji: '🍺', team: 'pueblo', wake: 7,
    desc: 'Cambias tu carta por una del centro… sin mirarla. Ni tú sabes en qué te has convertido.',
  },
  insomne: {
    id: 'insomne', name: 'La Insomne', emoji: '😴', team: 'pueblo', wake: 8,
    desc: 'Al final de la noche miras tu propia carta, para ver si alguien te la ha cambiado.',
  },
  aldeano: {
    id: 'aldeano', name: 'Aldeano', emoji: '🧑‍🌾', team: 'pueblo', multi: 3,
    desc: 'Sin poderes. Tu voz y tu voto son tu única arma de día.',
  },
  cazador: {
    id: 'cazador', name: 'El Cazador', emoji: '🏹', team: 'pueblo',
    desc: 'Si mueres en la votación, también muere el jugador al que tú votaste.',
  },
  tanner: {
    id: 'tanner', name: 'El Curtidor', emoji: '🪢', team: 'tanner',
    desc: 'Odias tu trabajo y tu vida. Ganas SOLO si te matan en la votación. Ni pueblo ni lobos.',
  },
};

/** Roles que actúan de noche, en orden de llamada. */
export const ACTION_ROLES: RoleId[] = (Object.values(ROLES) as RoleDef[])
  .filter((r) => r.wake !== undefined)
  .sort((a, b) => (a.wake! - b.wake!))
  .map((r) => r.id);

/** El paso de noche asociado a un rol de acción. */
export const STEP_OF: Partial<Record<RoleId, StepId>> = {
  doble: 'doble', lobo: 'lobos', esbirro: 'esbirro', mason: 'masones', vidente: 'vidente',
  ladron: 'ladron', alborotadora: 'alborotadora', borracho: 'borracho', insomne: 'insomne',
};

/** Roles que El Doble, al copiarlos, ejecuta EN SU PROPIO turno (no despierta luego). */
export const DOBLE_INSTANT_ROLES: RoleId[] = ['vidente', 'ladron', 'alborotadora', 'borracho'];
/** Roles que El Doble, al copiarlos, ejecuta despertando con ellos / al final. */
export const DOBLE_JOIN_ROLES: RoleId[] = ['lobo', 'mason', 'esbirro', 'insomne'];

export const ROLE_OF_STEP: Partial<Record<StepId, RoleId>> = Object.fromEntries(
  Object.entries(STEP_OF).map(([role, step]) => [step, role as RoleId]),
) as Partial<Record<StepId, RoleId>>;

export const CENTER_COUNT = 3;
export const MIN_PLAYERS = 3; // Una Noche se juega desde 3 (n+3 cartas)
export const MAX_PLAYERS = 10;

export function isWolfRole(r: RoleId | null | undefined): boolean {
  return r === 'lobo';
}

/** Bando efectivo de una carta (para la victoria). */
export function teamOf(r: RoleId): Team {
  return ROLES[r].team;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Mazo recomendado para n jugadores: 2 lobos, Vidente, Ladrón, Alborotadora y
 * relleno de Aldeanos hasta llegar a n+3 cartas. Sirve de punto de partida en
 * el lobby (el usuario puede añadir/quitar roles mientras el total sea n+3).
 */
export function recommendedComposition(n: number): Composition {
  const total = n + CENTER_COUNT;
  const comp: Composition = { lobo: 2, vidente: 1, ladron: 1, alborotadora: 1 };
  const sum = () => Object.values(comp).reduce((a, c) => a + (c || 0), 0);
  // Extras que enriquecen, en orden de preferencia, sin pasarnos de total.
  for (const r of ['insomne', 'cazador', 'esbirro', 'borracho', 'tanner'] as RoleId[]) {
    if (sum() >= total) break;
    comp[r] = 1;
  }
  comp.aldeano = Math.max(0, total - sum());
  if (!comp.aldeano) delete comp.aldeano;
  return comp;
}

export function compositionSize(comp: Composition): number {
  return Object.values(comp).reduce((a, c) => a + (c || 0), 0);
}

export interface DealResult {
  originalRole: Record<string, RoleId>;
  slots: Record<string, RoleId>;
  center: RoleId[];
}

/**
 * Reparte el mazo (comp, que DEBE sumar n+3) entre los jugadores (por orden de
 * asiento) y las 3 cartas del centro, barajado por semilla. `slots` arranca
 * igual que `originalRole`; los intercambios de la noche solo tocan `slots`.
 */
export function dealOneNight(
  players: { id: string; order?: number }[],
  comp: Composition,
  seed: number,
): DealResult {
  const rnd = mulberry32(seed);
  const pool: RoleId[] = [];
  for (const [r, n] of Object.entries(comp) as [RoleId, number][]) {
    for (let i = 0; i < (n || 0); i++) pool.push(r);
  }
  const deck = shuffled(pool, rnd);
  const seated = players.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const originalRole: Record<string, RoleId> = {};
  seated.forEach((p, i) => { originalRole[p.id] = deck[i]; });
  const center = deck.slice(seated.length, seated.length + CENTER_COUNT);
  return { originalRole, slots: { ...originalRole }, center };
}
