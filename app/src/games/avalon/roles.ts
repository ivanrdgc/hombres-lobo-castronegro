// Catálogo de roles de «Ávalon» (The Resistance: Avalon), reparto por número de
// jugadores y cálculo del CONOCIMIENTO nocturno cruzado. Módulo puro (testeable
// en Node): sin navegador ni Firebase. La gracia de llevarlo en la app es que
// todo esto —lealtades, quién ve a quién, el mazo de propuestas— lo gestiona la
// app EN OCULTO, sin el frágil ritual de «cerrad los ojos» ni recuentos a mano.

export type Team = 'good' | 'evil';

export type RoleId =
  | 'merlin' // 🧙 Merlín: conoce a los esbirros del Mal… menos a Mordred. Si el Mal lo descubre al final, pierde.
  | 'percival' // 🛡️ Percival: sabe quiénes son Merlín y Morgana… pero no cuál es cuál.
  | 'servant' // 🤴 Leal Servidor de Arturo: sin información; su arma es la deducción.
  | 'assassin' // 🗡️ Asesino: si el Bien gana 3 misiones, señala a quien crea Merlín; si acierta, gana el Mal.
  | 'morgana' // 🧟‍♀️ Morgana: se le aparece a Percival como si fuera Merlín.
  | 'mordred' // 👑 Mordred: oculto para Merlín (Merlín no lo ve).
  | 'oberon' // 👁️ Oberón: malvado en solitario — ni conoce a los suyos ni ellos a él.
  | 'minion'; // 😈 Esbirro de Mordred: malvado corriente, conoce a los suyos.

export interface RoleDef {
  id: RoleId;
  name: string;
  emoji: string;
  team: Team;
  desc: string;
  /** Rol opcional (se activa en el lobby). Merlín y Asesino son fijos. */
  optional?: boolean;
}

export const ROLES: Record<RoleId, RoleDef> = {
  merlin: {
    id: 'merlin', name: 'Merlín', emoji: '🧙', team: 'good',
    desc: 'Conoces a los esbirros del Mal (todos menos Mordred), pero debes guiar al Bien SIN delatarte: si el Mal gana tres misiones, el Asesino intentará señalarte, y si te encuentra, ganan ellos.',
  },
  percival: {
    id: 'percival', name: 'Percival', emoji: '🛡️', team: 'good', optional: true,
    desc: 'Sabes quiénes son Merlín y Morgana… pero no cuál es cuál. Protege al verdadero Merlín y desconfía de la falsa.',
  },
  servant: {
    id: 'servant', name: 'Leal Servidor de Arturo', emoji: '🤴', team: 'good',
    desc: 'No tienes información secreta. Tu voz, tu voto y tu olfato para las misiones son tu única arma.',
  },
  assassin: {
    id: 'assassin', name: 'El Asesino', emoji: '🗡️', team: 'evil',
    desc: 'Cazas con el Mal. Si el Bien logra tres misiones con éxito, tendrás una última bala: señala a quien creas que es Merlín. Si aciertas, el Mal gana la partida.',
  },
  morgana: {
    id: 'morgana', name: 'Morgana', emoji: '🧟‍♀️', team: 'evil', optional: true,
    desc: 'Malvada. Ante los ojos de Percival APARECES como Merlín: siémbrale la duda.',
  },
  mordred: {
    id: 'mordred', name: 'Mordred', emoji: '👑', team: 'evil', optional: true,
    desc: 'Malvado y OCULTO para Merlín: él no sabe que existes. El arma secreta del Mal.',
  },
  oberon: {
    id: 'oberon', name: 'Oberón', emoji: '👁️', team: 'evil', optional: true,
    desc: 'Malvado en solitario: no conoces a los demás esbirros y ellos no te conocen a ti. Merlín, en cambio, SÍ te ve.',
  },
  minion: {
    id: 'minion', name: 'Esbirro de Mordred', emoji: '😈', team: 'evil',
    desc: 'Malvado corriente. Conoces a tus compañeros del Mal (salvo Oberón) y saboteáis las misiones sin que os pillen.',
  },
};

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

/** Roles opcionales que se pueden activar en el lobby (Merlín y Asesino son fijos). */
export const OPTIONAL_ROLES: RoleId[] = ['percival', 'morgana', 'mordred', 'oberon'];

export function isEvil(r: RoleId): boolean {
  return ROLES[r].team === 'evil';
}
export function teamOf(r: RoleId): Team {
  return ROLES[r].team;
}

/** Número de malvados según las reglas oficiales (el resto son del Bien). */
export function evilCountFor(n: number): number {
  if (n <= 6) return 2;
  if (n <= 9) return 3;
  return 4;
}

/** Tamaño del equipo de cada misión [misión1..5] por número de jugadores. */
const TEAM_SIZES: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

/** Jugadores que van en la misión `quest` (1..5) con `n` jugadores. */
export function teamSize(n: number, quest: number): number {
  const row = TEAM_SIZES[Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n))];
  return row[Math.max(0, Math.min(4, quest - 1))];
}

/** Sabotajes necesarios para que FRACASE la misión (la 4.ª pide 2 con 7+). */
export function requiredFails(n: number, quest: number): number {
  return quest === 4 && n >= 7 ? 2 : 1;
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

export interface DealResult {
  roles: Record<string, RoleId>;
  dropped: RoleId[];
}

/**
 * Reparte lealtades: Merlín y Asesino SIEMPRE; los opcionales activados entran
 * si caben en su bando; el resto se rellena con Leales / Esbirros. Devuelve
 * también los opcionales que no cupieron (para avisar, como en Los HL).
 */
export function dealRoles(
  players: { id: string; order?: number }[],
  enabled: RoleId[],
  seed: number,
): DealResult {
  const rnd = mulberry32(seed);
  const n = players.length;
  const evil = evilCountFor(n);
  const good = n - evil;
  const dropped: RoleId[] = [];

  // Bien: Merlín fijo + Percival si se activó; relleno con Leales.
  const goodDeck: RoleId[] = ['merlin'];
  if (enabled.includes('percival')) {
    if (goodDeck.length < good) goodDeck.push('percival');
    else dropped.push('percival');
  }
  while (goodDeck.length < good) goodDeck.push('servant');

  // Mal: Asesino fijo + opcionales activados; relleno con Esbirros.
  const evilDeck: RoleId[] = ['assassin'];
  for (const r of ['morgana', 'mordred', 'oberon'] as RoleId[]) {
    if (!enabled.includes(r)) continue;
    if (evilDeck.length < evil) evilDeck.push(r);
    else dropped.push(r);
  }
  while (evilDeck.length < evil) evilDeck.push('minion');

  const deck = shuffled(goodDeck.concat(evilDeck), rnd);
  const seated = players.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const roles: Record<string, RoleId> = {};
  seated.forEach((p, i) => { roles[p.id] = deck[i]; });
  return { roles, dropped };
}

/** Lo que un jugador VE en su carta (lo calcula la app en oculto). */
export type Knowledge =
  | { kind: 'evil-allies'; pids: string[] } // esbirro/asesino/morgana/mordred: sus compañeros (sin Oberón)
  | { kind: 'oberon' } // malvado solitario: no ve a nadie
  | { kind: 'merlin'; pids: string[] } // Merlín: los malvados salvo Mordred
  | { kind: 'percival'; pids: string[]; ambiguous: boolean } // Percival: Merlín (+ Morgana si está)
  | { kind: 'none' }; // leal servidor

export interface RoleKnowledge {
  role: RoleId;
  team: Team;
  knows: Knowledge;
}

/** El conocimiento secreto de `pid` (lo que su carta le revela). */
export function knowledgeOf(roles: Record<string, RoleId>, playerIds: string[], pid: string): RoleKnowledge {
  const role = roles[pid];
  const team = teamOf(role);
  const evilVisible = playerIds.filter((p) => p !== pid && isEvil(roles[p]) && roles[p] !== 'oberon');
  let knows: Knowledge;
  if (role === 'oberon') knows = { kind: 'oberon' };
  else if (isEvil(role)) knows = { kind: 'evil-allies', pids: evilVisible };
  else if (role === 'merlin') knows = { kind: 'merlin', pids: playerIds.filter((p) => isEvil(roles[p]) && roles[p] !== 'mordred') };
  else if (role === 'percival') {
    const pids = playerIds.filter((p) => roles[p] === 'merlin' || roles[p] === 'morgana');
    knows = { kind: 'percival', pids, ambiguous: pids.length > 1 };
  } else knows = { kind: 'none' };
  return { role, team, knows };
}
