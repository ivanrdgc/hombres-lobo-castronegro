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

export const charName = (c: Character): string => CHARACTERS[c].name;
export const charEmoji = (c: Character): string => CHARACTERS[c].emoji;
export const charLabel = (c: Character): string => `${CHARACTERS[c].emoji} ${CHARACTERS[c].name}`;

export interface ActionInfo {
  id: ActionType;
  emoji: string;
  name: string;
  /** Personaje reclamado (null = acción general, sin desafío). */
  claim: Character | null;
  needsTarget: boolean;
  cost: number;
  short: string;
}

export const ACTIONS: Record<ActionType, ActionInfo> = {
  renta: { id: 'renta', emoji: '🪙', name: 'Renta', claim: null, needsTarget: false, cost: 0, short: 'Coge 1 moneda. Nadie puede impedirlo.' },
  ayuda: { id: 'ayuda', emoji: '🤝', name: 'Ayuda exterior', claim: null, needsTarget: false, cost: 0, short: 'Coge 2 monedas. El Duque puede bloquearla.' },
  golpe: { id: 'golpe', emoji: '💥', name: 'Golpe de Estado', claim: null, needsTarget: true, cost: 7, short: 'Paga 7: la víctima pierde una influencia. Imparable.' },
  impuestos: { id: 'impuestos', emoji: '🎩', name: 'Impuestos', claim: 'duque', needsTarget: false, cost: 0, short: 'Duque: coge 3 monedas.' },
  asesinar: { id: 'asesinar', emoji: '🗡️', name: 'Asesinar', claim: 'asesino', needsTarget: true, cost: 3, short: 'Asesino: paga 3, la víctima pierde una influencia. La Condesa lo bloquea.' },
  robar: { id: 'robar', emoji: '⚓', name: 'Robar', claim: 'capitan', needsTarget: true, cost: 0, short: 'Capitán: roba 2 monedas. Capitán o Embajador lo bloquean.' },
  intercambiar: { id: 'intercambiar', emoji: '🎭', name: 'Intercambiar', claim: 'embajador', needsTarget: false, cost: 0, short: 'Embajador: roba 2 cartas de la corte y devuelve las que no quieras.' },
};

export const actionName = (a: ActionType): string => ACTIONS[a].name;
export const actionLabel = (a: ActionType): string => `${ACTIONS[a].emoji} ${ACTIONS[a].name}`;

/** Qué personajes pueden BLOQUEAR una acción (y, por tanto, quién reclama qué). */
export function blockersFor(a: ActionType): Character[] {
  if (a === 'ayuda') return ['duque'];
  if (a === 'asesinar') return ['condesa'];
  if (a === 'robar') return ['capitan', 'embajador'];
  return [];
}
