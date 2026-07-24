// Catálogo de personajes y acciones de «Coup». Metadatos para las pantallas,
// la ayuda y la voz. La lógica pura vive en engine.ts.
import type { Character, ActionType } from './types';

export interface CharInfo {
  id: Character;
  emoji: string;
  name: string;
  /** Qué permite hacer (acción) o impedir (bloqueo). */
  power: string;
}

export const CHARACTERS: Record<Character, CharInfo> = {
  duque: { id: 'duque', emoji: '🎩', name: 'Duque', power: 'Cobra Impuestos (+3). Bloquea la Ayuda exterior.' },
  asesino: { id: 'asesino', emoji: '🗡️', name: 'Asesino', power: 'Asesina (paga 3): la víctima pierde una influencia.' },
  capitan: { id: 'capitan', emoji: '⚓', name: 'Capitán', power: 'Roba 2 monedas. Bloquea el robo.' },
  embajador: { id: 'embajador', emoji: '🎭', name: 'Embajador', power: 'Intercambia cartas con la corte. Bloquea el robo.' },
  condesa: { id: 'condesa', emoji: '👑', name: 'Condesa', power: 'Bloquea el asesinato.' },
};

export const CHAR_ORDER: Character[] = ['duque', 'asesino', 'capitan', 'embajador', 'condesa'];

/** Copias de cada personaje en la corte (5 × 3 = 15 cartas). */
export const COPIES = 3;

export const charName = (c: Character): string => CHARACTERS[c].name;
export const charEmoji = (c: Character): string => CHARACTERS[c].emoji;
export const charLabel = (c: Character): string => `${CHARACTERS[c].emoji} ${CHARACTERS[c].name}`;

/** Qué pierdes al descubrir esa carta (para elegir cuál destapas). */
export const CHAR_LOSS: Record<Character, string> = {
  duque: 'te quedas sin Impuestos «de verdad» y sin cortar la ayuda exterior, y todos verán que ese Duque ya salió.',
  asesino: 'te quedas sin asesinar «de verdad»: si vuelves a declararlo, es puro farol.',
  capitan: 'te quedas sin robar «de verdad» y sin frenar el robo con el Capitán.',
  embajador: 'te quedas sin intercambiar «de verdad» y sin frenar el robo con el Embajador.',
  condesa: 'te quedas sin el escudo contra el asesinato: el siguiente 🗡️ te lo comes o faroleas.',
};

export interface ActionInfo {
  id: ActionType;
  emoji: string;
  name: string;
  /** Personaje reclamado (null = acción general, sin desafío). */
  claim: Character | null;
  needsTarget: boolean;
  cost: number;
  short: string;
  /** Qué va a pasar, ya elegida la acción (2ª persona). */
  plan: string;
  /** Pregunta del paso «¿a quién?» (solo si lleva objetivo). */
  ask: string;
}

export const ACTIONS: Record<ActionType, ActionInfo> = {
  renta: {
    id: 'renta', emoji: '🪙', name: 'Renta', claim: null, needsTarget: false, cost: 0,
    short: 'Coges 1 moneda del banco.',
    plan: 'Coges 1 moneda del banco. Se resuelve al instante y el turno pasa.',
    ask: '',
  },
  ayuda: {
    id: 'ayuda', emoji: '🤝', name: 'Ayuda exterior', claim: null, needsTarget: false, cost: 0,
    short: 'Coges 2 monedas del banco.',
    plan: 'Pides 2 monedas al banco. Aquí el riesgo no es que te desafíen (no dices ser nadie): es que alguien la corte.',
    ask: '',
  },
  golpe: {
    id: 'golpe', emoji: '💥', name: 'Golpe de Estado', claim: null, needsTarget: true, cost: 7,
    short: 'Pagas 7 y tu víctima descubre una influencia.',
    plan: 'Pagas 7 monedas y tu víctima descubre una influencia SÍ O SÍ. Se resuelve al instante.',
    ask: '¿A quién das el golpe? Pierde una influencia seguro.',
  },
  impuestos: {
    id: 'impuestos', emoji: '🎩', name: 'Impuestos', claim: 'duque', needsTarget: false, cost: 0,
    short: 'Cobras 3 monedas del banco.',
    plan: 'Cobras 3 monedas del banco. Si nadie te desafía, entran directas.',
    ask: '',
  },
  asesinar: {
    id: 'asesinar', emoji: '🗡️', name: 'Asesinar', claim: 'asesino', needsTarget: true, cost: 3,
    short: 'Pagas 3 y tu víctima descubre una influencia.',
    plan: 'Pagas 3 monedas AHORA (no vuelven, ni aunque te lo corten) y tu víctima descubre una influencia.',
    ask: '¿A quién intentas asesinar? Pagas 3 monedas al declararlo.',
  },
  robar: {
    id: 'robar', emoji: '⚓', name: 'Robar', claim: 'capitan', needsTarget: true, cost: 0,
    short: 'Le quitas hasta 2 monedas a quien elijas.',
    plan: 'Le quitas 2 monedas (o la única que tenga) y pasan a tu montón.',
    ask: '¿A quién robas? Te llevas hasta 2 de sus monedas.',
  },
  intercambiar: {
    id: 'intercambiar', emoji: '🎭', name: 'Intercambiar', claim: 'embajador', needsTarget: false, cost: 0,
    short: 'Robas 2 cartas de la corte y te quedas con las que quieras.',
    plan: 'Robas 2 cartas de la corte y eliges con cuáles te quedas; el resto vuelve barajado. Sirve para cambiar de personaje… o para tapar un farol.',
    ask: '',
  },
};

export const actionName = (a: ActionType): string => ACTIONS[a].name;
export const actionLabel = (a: ActionType): string => `${ACTIONS[a].emoji} ${ACTIONS[a].name}`;

/** Orden en que se ofrecen las acciones en pantalla (el mismo del motor). */
export const ACTION_ORDER: ActionType[] = ['renta', 'ayuda', 'impuestos', 'robar', 'asesinar', 'intercambiar', 'golpe'];

/** Qué personajes pueden BLOQUEAR una acción (y, por tanto, quién reclama qué). */
export function blockersFor(a: ActionType): Character[] {
  if (a === 'ayuda') return ['duque'];
  if (a === 'asesinar') return ['condesa'];
  if (a === 'robar') return ['capitan', 'embajador'];
  return [];
}

/** «Qué personaje dices tener» — lo que te pueden desafiar. */
export function claimLine(a: ActionType): string {
  const c = ACTIONS[a].claim;
  return c
    ? `🗣️ Dices ser ${charLabel(c)} · te lo pueden desafiar`
    : '🗣️ No dices tener ningún personaje · nadie puede desafiarla';
}

/** «Quién puede impedirla» — bloqueos posibles. */
export function blockLine(a: ActionType): string {
  const b = blockersFor(a);
  if (b.length) {
    const who = a === 'ayuda' ? 'Cualquiera' : 'Tu víctima';
    return `🛡️ ${who} puede bloquearla con ${b.map(charLabel).join(' o ')}`;
  }
  return a === 'golpe' || a === 'renta' ? '🚫 Nadie puede bloquearla' : '🛡️ No se puede bloquear';
}
