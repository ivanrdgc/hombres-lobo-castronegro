// Personajes y cartas de pista de «Shadow Hunters» (adaptación digital).
// Tres facciones: Cazadores, Sombras y Neutrales (con objetivo propio).
export type Faction = 'hunter' | 'shadow' | 'neutral';

export interface CharDef {
  id: string;
  emoji: string;
  name: string;
  faction: Faction;
  /** Poder de un solo uso al REVELARTE (elige objetivo si lo pide). */
  power: string;
  powerTarget: boolean;
  /** Objetivo propio (solo neutrales). */
  goal?: string;
}

export const CHARS: Record<string, CharDef> = {
  georg: { id: 'georg', emoji: '🏹', name: 'Georg', faction: 'hunter', power: 'Al revelarte: 2 de daño a quien elijas.', powerTarget: true },
  franklin: { id: 'franklin', emoji: '⚡', name: 'Franklin', faction: 'hunter', power: 'Al revelarte: un dado de daño (1-4) a quien elijas.', powerTarget: true },
  fuka: { id: 'fuka', emoji: '💉', name: 'Fuka', faction: 'hunter', power: 'Al revelarte: curas 3 puntos a quien elijas (también a ti).', powerTarget: true },
  vampiro: { id: 'vampiro', emoji: '🧛', name: 'Vampiro', faction: 'shadow', power: 'Al revelarte: robas 2 puntos de vida a quien elijas.', powerTarget: true },
  licantropo: { id: 'licantropo', emoji: '🐺', name: 'Licántropo', faction: 'shadow', power: 'Al revelarte: te curas 3 puntos.', powerTarget: false },
  valquiria: { id: 'valquiria', emoji: '🌑', name: 'Valquiria', faction: 'shadow', power: 'Al revelarte: 1 de daño a TODOS los demás vivos.', powerTarget: false },
  allie: { id: 'allie', emoji: '🧸', name: 'Allie', faction: 'neutral', power: 'Al revelarte: te curas del todo.', powerTarget: false, goal: 'Seguir VIVA cuando la partida termine.' },
  bob: { id: 'bob', emoji: '💰', name: 'Bob', faction: 'neutral', power: 'Al revelarte: 2 de daño a quien elijas.', powerTarget: true, goal: 'Dar TÚ el golpe de gracia a cualquier jugador.' },
};

/** Personajes por facción según el nº de jugadores (tabla 2H/2S y neutrales). */
export function factionCounts(n: number): { hunter: number; shadow: number; neutral: number } {
  if (n <= 4) return { hunter: 2, shadow: 2, neutral: 0 };
  if (n === 5) return { hunter: 2, shadow: 2, neutral: 1 };
  if (n === 6) return { hunter: 2, shadow: 2, neutral: 2 };
  if (n === 7) return { hunter: 3, shadow: 3, neutral: 1 };
  return { hunter: 3, shadow: 3, neutral: 2 };
}

export const HUNTERS = ['georg', 'franklin', 'fuka'];
export const SHADOWS = ['vampiro', 'licantropo', 'valquiria'];
export const NEUTRALS = ['allie', 'bob'];

export const FACTION_LABEL: Record<Faction, string> = {
  hunter: '🏹 los Cazadores', shadow: '🌑 las Sombras', neutral: '🧭 neutral',
};

export interface PistaDef {
  text: string;
  cond: Faction | 'not-hunter' | 'not-shadow';
  effect: 'damage1' | 'heal1';
}

/** Cartas de pista del Ermitaño: quien la recibe la aplica EN SECRETO; la mesa
 *  solo ve el resultado (pierde/gana vida o nada). */
export const PISTAS: PistaDef[] = [
  { text: 'Si eres Sombra, pierdes 1 punto de vida.', cond: 'shadow', effect: 'damage1' },
  { text: 'Si eres Cazador, pierdes 1 punto de vida.', cond: 'hunter', effect: 'damage1' },
  { text: 'Si NO eres Cazador, pierdes 1 punto de vida.', cond: 'not-hunter', effect: 'damage1' },
  { text: 'Si NO eres Sombra, pierdes 1 punto de vida.', cond: 'not-shadow', effect: 'damage1' },
  { text: 'Si eres Sombra, te curas 1 punto de vida.', cond: 'shadow', effect: 'heal1' },
  { text: 'Si eres Cazador, te curas 1 punto de vida.', cond: 'hunter', effect: 'heal1' },
  { text: 'Si eres Neutral, te curas 1 punto de vida.', cond: 'neutral', effect: 'heal1' },
  { text: 'Si eres Neutral, pierdes 1 punto de vida.', cond: 'neutral', effect: 'damage1' },
];

export function pistaApplies(p: PistaDef, f: Faction): boolean {
  if (p.cond === 'not-hunter') return f !== 'hunter';
  if (p.cond === 'not-shadow') return f !== 'shadow';
  return p.cond === f;
}
