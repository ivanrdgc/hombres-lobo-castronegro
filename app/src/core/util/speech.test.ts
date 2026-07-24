import { describe, expect, it } from 'vitest';
import { cleanForSpeech } from './speech';

describe('cleanForSpeech', () => {
  it('quita emojis en cualquier posición', () => {
    expect(cleanForSpeech('🎯 De qué va')).toBe('De qué va');
    expect(cleanForSpeech('Gana 🐷 el bando fascista')).toBe('Gana el bando fascista');
  });

  it('recompone la puntuación que deja el emoji al irse (B23)', () => {
    expect(cleanForSpeech('un «transeúnte» ⬜), el turno pasa')).toBe('un transeúnte), el turno pasa');
    expect(cleanForSpeech('3 FLORES 🌸 y 1 CALAVERA 💀. Es de farol.')).toBe('3 FLORES y 1 CALAVERA. Es de farol.');
    expect(cleanForSpeech('el favor 💌 . Y ya')).toBe('el favor. Y ya');
    expect(cleanForSpeech('(🔊) hola')).toBe('hola');
  });

  it('traduce la flecha en vez de comérsela', () => {
    expect(cleanForSpeech('G3→F3→E3')).toBe('G3, F3, E3');
    expect(cleanForSpeech('→ eres HONESTO')).toBe('eres HONESTO');
  });

  it('lee las multiplicaciones entre dígitos', () => {
    expect(cleanForSpeech('un mapa de 8×8 con islas')).toBe('un mapa de 8 por 8 con islas');
  });

  it('mantiene las expansiones de B20', () => {
    expect(cleanForSpeech('dura 3 min')).toBe('dura 3 minutos');
    expect(cleanForSpeech('dura 1 min')).toBe('dura 1 minuto');
    expect(cleanForSpeech('p. ej. así')).toBe('por ejemplo así');
    expect(cleanForSpeech('marcador 4-2-1')).toBe('marcador 4, 2, 1');
    expect(cleanForSpeech('lleva 3/5')).toBe('lleva 3 de 5');
    expect(cleanForSpeech('gana +2')).toBe('gana más 2');
    expect(cleanForSpeech('🐷 2 · 🕊️ 3')).toBe('2, 3');
  });
});
