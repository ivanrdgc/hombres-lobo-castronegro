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

/** Cuántas copias TRAE el mazo de esta carta. Va impreso en la caja y no depende
 *  de lo que haya pasado en la ronda, así que se dice siempre, también en el
 *  modo difícil. */
export function deckNote(c: Card): string {
  const total = CARD_INFO[c].count;
  return total === 1 ? 'única en el mazo' : `${total} en el mazo`;
}

/** Nota de conteo que acompaña a una carta en pantalla: «5 en el mazo · quedan 3
 *  por salir». `out` son las copias ya descartadas (públicas). Contar es media
 *  partida, así que la cuenta va hecha allí donde se decide… salvo que la mesa
 *  juegue en MODO DIFÍCIL (`track = false`, B33): entonces la app se calla lo que
 *  ha salido y contar vuelve a ser cosa vuestra. */
export function copiesNote(c: Card, out: number, track = true): string {
  if (!track) return deckNote(c);
  const left = CARD_INFO[c].count - out;
  const cuantas = left === 0 ? 'ya han salido todas' : left === 1 ? 'queda 1 por salir' : `quedan ${left} por salir`;
  return `${deckNote(c)} · ${cuantas}`;
}

/** Cartas cuyo efecto apunta a otro jugador. */
export const NEEDS_TARGET: Record<Card, boolean> = {
  guard: true, priest: true, baron: true, handmaid: false, prince: true, king: true, countess: false, princess: false,
};

/** Qué VA A PASAR si juegas esta carta, en futuro y sin objetivo aún elegido.
 *  Se enseña antes de señalar a nadie: nadie debería tener que recordar las
 *  reglas de memoria para decidir. */
export const PLAN: Record<Card, string> = {
  guard: 'Señalas a alguien y dices qué carta crees que tiene (no vale «Guardia»). Si aciertas, queda fuera de la ronda; si fallas, no pasa nada.',
  priest: 'Verás en secreto la carta de quien elijas. Solo la ves tú: no sale en el diario.',
  baron: 'Comparas en secreto tu OTRA carta con la de quien elijas: el de valor menor queda fuera de la ronda (si empatáis, no cae nadie). Solo se destapa la carta del perdedor.',
  handmaid: 'No elige objetivo: quedas protegido y nadie podrá señalarte hasta tu próximo turno.',
  prince: 'Quien elijas —puedes ser tú— descarta su carta y roba otra. Si lo que descarta es la Princesa, queda fuera de la ronda.',
  king: 'Intercambias tu OTRA carta con la de quien elijas. Los dos os quedáis con la del otro.',
  countess: 'No elige objetivo y no hace nada: solo se descarta. Obligatoria si tienes el Rey o el Príncipe en la mano.',
  princess: 'No elige objetivo y no hace nada… salvo dejarte FUERA de la ronda por descartarla. Casi nunca quieres jugarla.',
};

/** La pregunta del paso «¿a quién?», con el verbo de cada carta. */
export const ASK_TARGET: Record<Card, string> = {
  guard: '¿A quién señalas?',
  priest: '¿A quién le miras la carta?',
  baron: '¿Con quién te bates en duelo?',
  handmaid: '',
  prince: '¿Quién descarta y roba? (puedes elegirte a ti)',
  king: '¿Con quién intercambias la carta?',
  countess: '',
  princess: '',
};
