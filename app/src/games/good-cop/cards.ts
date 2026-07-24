// Cartas de integridad de «Good Cop Bad Cop». Cada jugador tiene 3, boca abajo.
// Tu BANDO es la mayoría de tus 3 cartas. Dos cartas especiales marcan a los
// líderes: el Agente (honesto) y el Jefe (corrupto).
export type Kind = 'honest' | 'crook';
export type Role = 'agent' | 'kingpin' | null;

export interface Card {
  kind: Kind;
  role: Role;
  up: boolean; // boca arriba (pública) tras morir o al voltearse
}

export const KIND_LABEL: Record<Kind, string> = { honest: '👮 Honesto', crook: '🦹 Corrupto' };
export const ROLE_LABEL: Record<'agent' | 'kingpin', string> = { agent: '🕵️ Agente', kingpin: '👑 Jefe' };

export function cardLabel(c: Card): string {
  if (c.role) return ROLE_LABEL[c.role];
  return KIND_LABEL[c.kind];
}
