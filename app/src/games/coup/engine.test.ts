import { describe, it, expect } from 'vitest';
import {
  dealGame, newDeck, legalActionTypes, mustCoup, declareAction, doPass, doChallenge,
  doBlock, chooseLoss, exchangeKeep, beginPlay, influenceCount, isAlive, aliveIds,
  reactorsOf, pendingReactors, passForAbsent, resetForRematch, targetsFor, MIN_PLAYERS, MAX_PLAYERS,
} from './engine';
import type { CoupState, Character } from './types';

const IDS = ['p-a', 'p-b', 'p-c', 'p-d'];
const c = (char: Character) => ({ char, lost: false });

function mk(over: Partial<CoupState> = {}): CoupState {
  return {
    coup: true, phase: 'turn', startedAt: 0, seed: 1, round: 1,
    playerIds: IDS.slice(), names: { 'p-a': 'A', 'p-b': 'B', 'p-c': 'C', 'p-d': 'D' },
    hands: {
      'p-a': [c('duque'), c('asesino')],
      'p-b': [c('capitan'), c('condesa')],
      'p-c': [c('embajador'), c('embajador')],
      'p-d': [c('duque'), c('capitan')],
    },
    coins: { 'p-a': 2, 'p-b': 2, 'p-c': 2, 'p-d': 2 },
    seen: {}, deck: ['condesa', 'duque', 'capitan', 'asesino', 'embajador', 'duque', 'capitan'],
    shuffles: 0, turnIdx: 0, pending: null, block: null, reactions: {},
    losing: [], resume: null, exchange: null, winner: null, scores: {}, log: [],
    ...over,
  };
}

// Pasa a TODOS los reactores de la ventana actual (el último dispara el avance).
function passWindow(g: CoupState): void {
  for (const pid of reactorsOf(g).slice()) doPass(g, pid);
}

describe('reparto', () => {
  it('reparte 2 influencias y 2 monedas; la corte es lo que sobra de 15', () => {
    const d = dealGame(IDS, 42);
    expect(newDeck()).toHaveLength(15);
    for (const pid of IDS) {
      expect(d.hands[pid]).toHaveLength(2);
      expect(d.coins[pid]).toBe(2);
    }
    expect(d.deck).toHaveLength(15 - 2 * IDS.length);
  });
});

describe('acciones legales', () => {
  it('con 10+ monedas SOLO se puede dar un golpe', () => {
    const g = mk({ coins: { 'p-a': 10, 'p-b': 2, 'p-c': 2, 'p-d': 2 } });
    expect(mustCoup(g, 'p-a')).toBe(true);
    expect(legalActionTypes(g, 'p-a')).toEqual(['golpe']);
    expect(declareAction(g, 'p-a', 'impuestos', null)).toBe(false);
  });
  it('asesinar exige 3 monedas y golpe 7', () => {
    const g = mk({ coins: { 'p-a': 3, 'p-b': 2, 'p-c': 2, 'p-d': 2 } });
    expect(legalActionTypes(g, 'p-a')).toContain('asesinar');
    expect(legalActionTypes(g, 'p-a')).not.toContain('golpe');
  });
});

describe('renta y golpe', () => {
  it('renta da 1 moneda y pasa turno', () => {
    const g = mk();
    expect(declareAction(g, 'p-a', 'renta', null)).toBe(true);
    expect(g.coins['p-a']).toBe(3);
    expect(g.phase).toBe('turn');
    expect(g.playerIds[g.turnIdx]).toBe('p-b');
  });
  it('golpe paga 7 y la víctima pierde una influencia (elige si tiene 2)', () => {
    const g = mk({ coins: { 'p-a': 7, 'p-b': 2, 'p-c': 2, 'p-d': 2 } });
    expect(declareAction(g, 'p-a', 'golpe', 'p-b')).toBe(true);
    expect(g.coins['p-a']).toBe(0);
    expect(g.phase).toBe('loseInfluence');
    expect(g.losing[0]).toEqual({ pid: 'p-b', reason: 'golpe' });
    expect(chooseLoss(g, 'p-b', 0)).toBe(true);
    expect(influenceCount(g, 'p-b')).toBe(1);
    expect(g.phase).toBe('turn');
  });
  it('golpe a quien tiene 1 sola carta lo elimina automáticamente', () => {
    const g = mk({
      coins: { 'p-a': 7, 'p-b': 2, 'p-c': 2, 'p-d': 2 },
      hands: { ...mk().hands, 'p-b': [{ char: 'capitan', lost: true }, c('condesa')] },
    });
    expect(declareAction(g, 'p-a', 'golpe', 'p-b')).toBe(true);
    expect(isAlive(g, 'p-b')).toBe(false);
    expect(g.phase).toBe('turn'); // sin pausa de elección
  });
});

describe('impuestos (Duque)', () => {
  it('sin desafío, +3 monedas', () => {
    const g = mk();
    declareAction(g, 'p-a', 'impuestos', null);
    expect(g.phase).toBe('challengeAction');
    passWindow(g);
    expect(g.coins['p-a']).toBe(5);
    expect(g.phase).toBe('turn');
  });
  it('desafío perdido (tenía Duque): el retador pierde influencia y se cobran +3', () => {
    const g = mk();
    declareAction(g, 'p-a', 'impuestos', null);
    expect(doChallenge(g, 'p-b')).toBe(true);
    expect(g.coins['p-a']).toBe(5); // el efecto se aplica igual
    expect(g.phase).toBe('loseInfluence');
    expect(g.losing[0].pid).toBe('p-b');
    chooseLoss(g, 'p-b', 0);
    expect(influenceCount(g, 'p-b')).toBe(1);
    expect(g.phase).toBe('turn');
  });
  it('farol cazado (no tenía Duque): el que mintió pierde y no cobra', () => {
    const g = mk({ turnIdx: 2 }); // p-c: embajador/embajador, no es Duque
    declareAction(g, 'p-c', 'impuestos', null);
    doChallenge(g, 'p-a');
    expect(g.losing[0].pid).toBe('p-c');
    chooseLoss(g, 'p-c', 0);
    expect(g.coins['p-c']).toBe(2); // no cobró
    expect(influenceCount(g, 'p-c')).toBe(1);
  });
});

describe('ayuda exterior', () => {
  it('sin bloqueo, +2', () => {
    const g = mk();
    declareAction(g, 'p-a', 'ayuda', null);
    expect(g.phase).toBe('block');
    passWindow(g);
    expect(g.coins['p-a']).toBe(4);
    expect(g.phase).toBe('turn');
  });
  it('bloqueada con Duque (nadie desafía): no se cobra', () => {
    const g = mk();
    declareAction(g, 'p-a', 'ayuda', null);
    doBlock(g, 'p-d', 'duque'); // p-d tiene Duque
    expect(g.phase).toBe('challengeBlock');
    passWindow(g);
    expect(g.coins['p-a']).toBe(2);
    expect(g.phase).toBe('turn');
  });
  it('bloqueo en falso (sin Duque) y desafiado: el farsante pierde y la ayuda entra', () => {
    const g = mk();
    declareAction(g, 'p-a', 'ayuda', null);
    doBlock(g, 'p-b', 'duque'); // p-b NO tiene Duque
    doChallenge(g, 'p-a');
    expect(g.losing[0].pid).toBe('p-b');
    chooseLoss(g, 'p-b', 0);
    expect(g.coins['p-a']).toBe(4); // la ayuda se cobra al fallar el bloqueo
    expect(g.phase).toBe('turn');
  });
});

describe('robar (Capitán)', () => {
  it('sin reacción, mueve 2 monedas', () => {
    const g = mk();
    declareAction(g, 'p-a', 'robar', 'p-b');
    passWindow(g); // nadie desafía → se abre bloqueo (solo la víctima)
    expect(g.phase).toBe('block');
    doPass(g, 'p-b'); // la víctima no bloquea
    expect(g.coins['p-a']).toBe(4);
    expect(g.coins['p-b']).toBe(0);
    expect(g.phase).toBe('turn');
  });
  it('a quien no tiene monedas no se le puede robar (ni sale en la lista)', () => {
    const g = mk({ coins: { 'p-a': 2, 'p-b': 0, 'p-c': 3, 'p-d': 0 } });
    expect(targetsFor(g, 'p-a', 'robar')).toEqual(['p-c']);
    expect(declareAction(g, 'p-a', 'robar', 'p-b')).toBe(false);
  });
  it('sin nadie con monedas, robar ni se ofrece', () => {
    const g = mk({ coins: { 'p-a': 2, 'p-b': 0, 'p-c': 0, 'p-d': 0 } });
    expect(legalActionTypes(g, 'p-a')).not.toContain('robar');
  });
  it('a quien solo tiene 1 moneda se le roba esa', () => {
    const g = mk({ coins: { 'p-a': 2, 'p-b': 1, 'p-c': 2, 'p-d': 2 } });
    declareAction(g, 'p-a', 'robar', 'p-b');
    passWindow(g);
    doPass(g, 'p-b');
    expect(g.coins['p-a']).toBe(3);
    expect(g.coins['p-b']).toBe(0);
    expect(g.log.some((l) => /roba 1 moneda /.test(l.txt))).toBe(true);
  });
  it('bloqueado por la víctima (Capitán) y aceptado: no se mueven monedas', () => {
    const g = mk();
    declareAction(g, 'p-a', 'robar', 'p-b');
    passWindow(g);
    doBlock(g, 'p-b', 'capitan'); // p-b tiene Capitán
    passWindow(g); // nadie desafía el bloqueo
    expect(g.coins['p-a']).toBe(2);
    expect(g.coins['p-b']).toBe(2);
  });
});

describe('asesinar (Asesino / Condesa)', () => {
  it('sin reacción: la víctima pierde una influencia y el coste no vuelve', () => {
    const g = mk({ coins: { 'p-a': 3, 'p-b': 2, 'p-c': 2, 'p-d': 2 } });
    declareAction(g, 'p-a', 'asesinar', 'p-b');
    expect(g.coins['p-a']).toBe(0);
    passWindow(g); // nadie desafía → bloqueo
    doPass(g, 'p-b'); // la víctima no bloquea
    expect(g.phase).toBe('loseInfluence');
    chooseLoss(g, 'p-b', 0);
    expect(influenceCount(g, 'p-b')).toBe(1);
  });
  it('desafío perdido con retador ≠ víctima: la víctima CONSERVA su bloqueo (regla oficial)', () => {
    const g = mk({ coins: { 'p-a': 3, 'p-b': 2, 'p-c': 2, 'p-d': 2 } });
    declareAction(g, 'p-a', 'asesinar', 'p-b');
    doChallenge(g, 'p-c'); // p-a tiene Asesino → p-c pierde por desafío…
    expect(g.losing.map((l) => l.pid)).toEqual(['p-c']);
    chooseLoss(g, 'p-c', 0);
    expect(g.phase).toBe('block'); // …y la ventana de bloqueo vuelve a la víctima
    doBlock(g, 'p-b', 'condesa'); // la tiene de verdad
    passWindow(g); // nadie desafía el bloqueo
    expect(influenceCount(g, 'p-c')).toBe(1);
    expect(influenceCount(g, 'p-b')).toBe(2); // ilesa: el desafío de un tercero no le roba el bloqueo
    expect(g.phase).toBe('turn');
  });
  it('la víctima desafía, pierde… y aún salva la vida con su Condesa real', () => {
    const g = mk({ coins: { 'p-a': 3, 'p-b': 2, 'p-c': 2, 'p-d': 2 } });
    declareAction(g, 'p-a', 'asesinar', 'p-b');
    doChallenge(g, 'p-b'); // p-a era Asesino: p-b paga el desafío…
    chooseLoss(g, 'p-b', 0); // pierde el Capitán
    expect(g.phase).toBe('block'); // …pero conserva su derecho a bloquear
    doBlock(g, 'p-b', 'condesa'); // la tiene de verdad
    passWindow(g);
    expect(influenceCount(g, 'p-b')).toBe(1); // sobrevive con una carta
    expect(g.phase).toBe('turn');
  });
  it('la víctima desafía, pierde y no bloquea: pierde sus DOS cartas (eliminada)', () => {
    const g = mk({ coins: { 'p-a': 3, 'p-b': 2, 'p-c': 2, 'p-d': 2 } });
    declareAction(g, 'p-a', 'asesinar', 'p-b');
    doChallenge(g, 'p-b');
    chooseLoss(g, 'p-b', 1); // pierde su Condesa (mala idea)
    expect(g.phase).toBe('block');
    doPass(g, 'p-b'); // sin Condesa ya no bloquea
    expect(isAlive(g, 'p-b')).toBe(false); // el asesinato remata (auto: le quedaba una)
    expect(g.phase).toBe('turn');
  });
  it('doble muerte oficial: desafía, pierde, farolea la Condesa y lo cazan', () => {
    const g = mk({ coins: { 'p-a': 3, 'p-b': 2, 'p-c': 2, 'p-d': 2 } });
    declareAction(g, 'p-a', 'asesinar', 'p-b');
    doChallenge(g, 'p-b');
    chooseLoss(g, 'p-b', 1); // pierde su Condesa real: le queda el Capitán
    expect(g.phase).toBe('block');
    doBlock(g, 'p-b', 'condesa'); // farol desesperado
    doChallenge(g, 'p-a');
    expect(isAlive(g, 'p-b')).toBe(false); // cazado: pierde la última
    expect(g.phase).toBe('turn');
  });
  it('bloqueado con Condesa (aceptado): la víctima sobrevive', () => {
    const g = mk({ coins: { 'p-a': 3, 'p-b': 2, 'p-c': 2, 'p-d': 2 } });
    declareAction(g, 'p-a', 'asesinar', 'p-b');
    passWindow(g);
    doBlock(g, 'p-b', 'condesa'); // p-b tiene Condesa
    passWindow(g);
    expect(influenceCount(g, 'p-b')).toBe(2);
    expect(g.coins['p-a']).toBe(0); // pagó igual
  });
  it('bloqueo con Condesa en falso, desafiado: la víctima pierde sus DOS cartas', () => {
    const g = mk({ coins: { 'p-a': 3, 'p-b': 2, 'p-c': 2, 'p-d': 2 } });
    declareAction(g, 'p-a', 'asesinar', 'p-c'); // p-c no tiene Condesa
    passWindow(g);
    doBlock(g, 'p-c', 'condesa'); // farol
    doChallenge(g, 'p-a');
    chooseLoss(g, 'p-c', 0); // por el bloqueo mentiroso
    expect(isAlive(g, 'p-c')).toBe(false); // y el asesinato remata (auto)
  });
});

describe('intercambiar (Embajador)', () => {
  it('sin desafío: ofrece 4 cartas (2 propias + 2 de la corte) y conserva 2', () => {
    const g = mk({ turnIdx: 2 }); // p-c: embajador/embajador
    declareAction(g, 'p-c', 'intercambiar', null);
    passWindow(g);
    expect(g.phase).toBe('exchangeReturn');
    expect(g.exchange?.options).toHaveLength(4);
    expect(g.exchange?.keep).toBe(2);
    expect(exchangeKeep(g, 'p-c', [0, 1])).toBe(true);
    expect(influenceCount(g, 'p-c')).toBe(2);
    expect(g.phase).toBe('turn');
    expect(g.deck).toHaveLength(7); // la corte recupera su tamaño
  });
  it('conservar un número de cartas distinto al debido es inválido', () => {
    const g = mk({ turnIdx: 2 });
    declareAction(g, 'p-c', 'intercambiar', null);
    passWindow(g);
    expect(exchangeKeep(g, 'p-c', [0])).toBe(false); // debe conservar 2
  });
});

describe('fin de partida', () => {
  it('cuando solo queda uno con influencia, gana y suma 1 punto', () => {
    const g = mk({
      turnIdx: 0, coins: { 'p-a': 7, 'p-b': 2, 'p-c': 2, 'p-d': 2 },
      hands: {
        'p-a': [c('duque'), c('asesino')],
        'p-b': [{ char: 'capitan', lost: true }, c('condesa')], // 1 carta
        'p-c': [{ char: 'embajador', lost: true }, { char: 'embajador', lost: true }], // fuera
        'p-d': [{ char: 'duque', lost: true }, { char: 'capitan', lost: true }], // fuera
      },
    });
    expect(aliveIds(g)).toEqual(['p-a', 'p-b']);
    declareAction(g, 'p-a', 'golpe', 'p-b');
    expect(g.winner).toBe('p-a');
    expect(g.phase).toBe('end');
    expect(g.scores['p-a']).toBe(1);
  });
});

describe('ventana atascada y revancha', () => {
  it('pasar por los ausentes cierra la ventana y la jugada sigue', () => {
    const g = mk();
    declareAction(g, 'p-a', 'impuestos', null);
    doPass(g, 'p-b'); // p-c y p-d se han ido al baño
    expect(pendingReactors(g)).toEqual(['p-c', 'p-d']);
    expect(passForAbsent(g)).toBe(true);
    expect(g.coins['p-a']).toBe(5); // los impuestos salen adelante
    expect(g.phase).toBe('turn');
    expect(passForAbsent(g)).toBe(false); // sin ventana abierta, no hace nada
  });
  it('la revancha empieza con el diario limpio', () => {
    const g = mk({ phase: 'end', winner: 'p-a', log: [{ txt: 'a' }, { txt: 'b' }, { txt: 'c' }] });
    resetForRematch(g, 7);
    expect(g.log).toHaveLength(1);
    expect(g.log[0].txt).toMatch(/Nueva partida/);
    expect(g.phase).toBe('reveal');
  });
});

describe('utilidades', () => {
  it('beginPlay exige que todos hayan visto su carta', () => {
    const g = mk({ phase: 'reveal', seen: { 'p-a': true, 'p-b': true } });
    expect(beginPlay(g)).toBe(false);
    g.seen = { 'p-a': true, 'p-b': true, 'p-c': true, 'p-d': true };
    expect(beginPlay(g)).toBe(true);
    expect(g.phase).toBe('turn');
  });
  it('los objetivos de una acción con víctima son los demás vivos', () => {
    const g = mk();
    expect(targetsFor(g, 'p-a', 'golpe').sort()).toEqual(['p-b', 'p-c', 'p-d']);
    expect(targetsFor(g, 'p-a', 'renta')).toEqual([]);
  });
  it('rangos de jugadores', () => {
    expect(MIN_PLAYERS).toBe(2);
    expect(MAX_PLAYERS).toBe(6);
  });
});
