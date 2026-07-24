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

/** El reparto es PÚBLICO (como en el juego de mesa): lo secreto es quién es
 *  quién, no cuántos hay de cada bando. Se pinta en el tablero y en el 🎴 para
 *  que una mesa novata no tenga que preguntarlo. */
export function factionSummary(n: number): string {
  const c = factionCounts(n);
  const neutral = c.neutral === 0 ? 'ningún neutral'
    : c.neutral === 1 ? '1 🧭 neutral' : `${c.neutral} 🧭 neutrales`;
  return `Sois ${n}: ${c.hunter} 🏹 Cazadores, ${c.shadow} 🌑 Sombras y ${neutral}.`;
}

export const HUNTERS = ['georg', 'franklin', 'fuka'];
export const SHADOWS = ['vampiro', 'licantropo', 'valquiria'];
export const NEUTRALS = ['allie', 'bob'];

export const FACTION_LABEL: Record<Faction, string> = {
  hunter: '🏹 los Cazadores', shadow: '🌑 las Sombras', neutral: '🧭 neutral',
};

/** Etiqueta corta para las pastillas del tablero: «🧛 Vampiro · 🌑 Sombra».
 *  Sin ella había que recordar de memoria a qué bando pertenece cada uno de los
 *  ocho personajes, que es justo la información por la que se juega. */
export const FACTION_SHORT: Record<Faction, string> = {
  hunter: '🏹 Cazador', shadow: '🌑 Sombra', neutral: '🧭 Neutral',
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

/** Filas «emoji · nombre · nota · efecto» para la referencia (B21). Se usan en
 *  el modal 🎴 y, plegadas, DENTRO del panel de acción: nadie debería salir de
 *  la pantalla en la que está decidiendo para consultar la chuleta. */
export interface RefRowData { emoji: string; name: string; note?: string; desc: string }

/** El poder SIN el «Al revelarte:» de cabecera, para incrustarlo en una frase
 *  («…usas TU poder, de un solo uso: 2 de daño a quien elijas»). */
export function powerEffect(ch: CharDef): string {
  return ch.power.replace(/^Al revelarte:\s*/i, '');
}

export function charRefRows(): RefRowData[] {
  return Object.values(CHARS).map((ch) => ({
    emoji: ch.emoji,
    name: ch.name,
    note: FACTION_SHORT[ch.faction],
    desc: ch.power + (ch.goal ? ` Objetivo: ${ch.goal}` : ''),
  }));
}

export function pistaRefRows(): RefRowData[] {
  return PISTAS.map((p) => {
    const [cond, eff] = p.text.split(/,\s*/);
    return {
      emoji: p.effect === 'damage1' ? '💥' : '💚',
      name: cond,
      desc: eff ? eff.charAt(0).toUpperCase() + eff.slice(1) : p.text,
    };
  });
}
