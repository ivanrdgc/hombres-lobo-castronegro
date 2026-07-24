// Las 8 cartas de «Love Letter» (Carta de Amor). El valor es su fuerza (y lo
// que el Guardia adivina). El mazo lleva 16 cartas.
export type Card = 'guard' | 'priest' | 'baron' | 'handmaid' | 'prince' | 'king' | 'countess' | 'princess';

export const VALUE: Record<Card, number> = {
  guard: 1, priest: 2, baron: 3, handmaid: 4, prince: 5, king: 6, countess: 7, princess: 8,
};

export const CARD_INFO: Record<Card, { emoji: string; name: string; count: number; short: string }> = {
  guard: { emoji: '💂', name: 'Guardia', count: 5, short: 'Adivina la carta de otro (no Guardia); si aciertas, queda fuera.' },
  priest: { emoji: '⛪', name: 'Sacerdote', count: 2, short: 'Miras en secreto la mano de otro jugador.' },
  baron: { emoji: '🎩', name: 'Barón', count: 2, short: 'Comparas tu otra carta con la de otro; el menor queda fuera.' },
  handmaid: { emoji: '🛡️', name: 'Doncella', count: 2, short: 'Quedas protegido hasta tu próximo turno.' },
  prince: { emoji: '🤴', name: 'Príncipe', count: 2, short: 'Alguien (o tú) descarta su mano y roba otra.' },
  king: { emoji: '👑', name: 'Rey', count: 1, short: 'Intercambias tu mano con la de otro jugador.' },
  countess: { emoji: '👸', name: 'Condesa', count: 1, short: 'Sin efecto; pero debes descartarla si tienes el Rey o el Príncipe.' },
  princess: { emoji: '💗', name: 'Princesa', count: 1, short: 'Si la descartas por lo que sea, quedas fuera de la ronda.' },
};

export function fullDeck(): Card[] {
  const deck: Card[] = [];
  for (const c of Object.keys(CARD_INFO) as Card[]) {
    for (let i = 0; i < CARD_INFO[c].count; i++) deck.push(c);
  }
  return deck; // 16 cartas
}

export const cardName = (c: Card): string => `${CARD_INFO[c].emoji} ${CARD_INFO[c].name}`;

/** Cartas cuyo efecto apunta a otro jugador. */
export const NEEDS_TARGET: Record<Card, boolean> = {
  guard: true, priest: true, baron: true, handmaid: false, prince: true, king: true, countess: false, princess: false,
};
