// Corpus de «Decrypto»: intro del lobby (▶️), «cómo se juega» y voz del
// narrador. Las palabras clave y el código NO se dicen jamás; la voz relata lo
// público (a quién le toca, si se interceptó o hubo error), que va al diario.
import { cleanForSpeech } from '../../core/util/speech';
import { MAX_PLAYERS, MAX_ROUNDS, MIN_PLAYERS } from './engine';
import type { DecryptoState } from './types';

export const INTRO_LOBBY: string[] = [
  'Decrypto: dos equipos, y cada uno tiene 4 palabras clave que solo conocen los suyos. Cada ronda, un miembro recibe un código secreto de tres cifras (por ejemplo 4-2-1) y da tres pistas —una por cifra— para que SU equipo adivine el orden.',
  'Lo difícil: el equipo rival escucha todas las pistas e intenta INTERCEPTAR el código. Si te interceptan dos veces, pierdes; si tu propio equipo se lía dos veces, también. Ganar es comunicarte con los tuyos… sin que el enemigo te descifre.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      `De ${MIN_PLAYERS} a ${MAX_PLAYERS} jugadores en dos equipos, rojo y azul. La app los reparte AL AZAR; si sois impares, un equipo tendrá uno más (por ejemplo 3 contra 2), lo cual no da ventaja: quien descifra es el equipo entero.`,
      'Cada equipo tiene 4 PALABRAS CLAVE numeradas del 1 al 4 que solo ven los de ese equipo. No hay que memorizarlas: están siempre en vuestra pantalla, en la tarjeta «Vuestras 4 palabras», así que el móvil se sujeta hacia los vuestros y de espaldas al rival.',
      'El objetivo es transmitir códigos a los tuyos sin que el rival los descifre. Ganas si logras interceptar DOS códigos del rival; pierdes si tu propio equipo falla DOS veces al descifrar el suyo.',
    ],
  },
  {
    heading: '🔐 La transmisión',
    items: [
      'Por turnos, un equipo transmite. La app da a su ENCRIPTADOR (rota cada ronda) un código secreto de 3 cifras distintas del 1 al 4, por ejemplo 4-2-1. Nunca repite un código que ese equipo ya haya transmitido.',
      'El encriptador dice EN VOZ ALTA tres pistas, una por cifra y en ese orden: una para su palabra 4, otra para la 2 y otra para la 1. Las pistas son públicas: las oyen los dos equipos.',
      'Regla clásica: la pista NO puede ser la palabra clave ni un derivado suyo (para «Mar» no valen «mar» ni «marino»), ni referirse a dónde está escrita. Tampoco vale señalar, gesticular ni corregir después.',
    ],
  },
  {
    heading: '🕵️ Interceptar (el rival)',
    items: [
      'A partir de la segunda transmisión de un equipo, el rival puede INTERCEPTAR: con las pistas de hoy y las de rondas anteriores, intenta adivinar el orden del código (qué cifra va con cada pista).',
      'Un miembro del equipo rival registra el intento en la app. Si acierta el código completo, se lleva una ficha de INTERCEPCIÓN.',
    ],
  },
  {
    heading: '🔓 Descifrar (tu equipo)',
    items: [
      'Después, tu propio equipo (todos menos el encriptador) adivina su código: uno registra el orden en la app.',
      'Si tu equipo NO acierta su propio código, os lleváis una ficha de ERROR de comunicación: son tan peligrosas como que os intercepten.',
    ],
  },
  {
    heading: '📻 La hoja de pistas',
    items: [
      'Todas las pistas dichas quedan a la vista, ordenadas por número de palabra: cuatro filas por equipo. Ahí es donde se gana.',
      'Interceptar casi nunca sale a la primera: sale acumulando. Si el rojo dijo «gaviota» para su 4 en la ronda 1 y «marea» para la 4 en la 2, su palabra 4 va de mar. Por eso, al encriptar, conviene cambiar de campo semántico cada vez.',
    ],
  },
  {
    heading: '🏆 Ganar y perder',
    items: [
      'La app destapa el código real, reparte las fichas y pasa el turno al otro equipo. Cada ronda cada equipo transmite una vez.',
      'Ganas con 2 INTERCEPCIONES; pierdes con 2 ERRORES. La clave está en dar pistas que los tuyos pillen al vuelo… pero que despisten al rival, que cada ronda te conoce mejor.',
      `La partida dura como mucho ${MAX_ROUNDS} rondas. Si al acabarlas nadie ha llegado a 2 fichas, gana quien haya interceptado más veces; si eso empata, quien menos errores cometió; y si todo empata, son tablas y no gana nadie.`,
      'Cada partida ganada suma 1 punto a todos los del equipo vencedor: el marcador de la mesa se ve al final y se conserva entre revanchas.',
    ],
  },
];

// ——— Voz del narrador ———

export const DE_INTRO =
  'Decrypto. Dos equipos, cuatro palabras clave secretas cada uno. Transmitid vuestros códigos de tres cifras con pistas ingeniosas… pero cuidado: el rival escucha e intenta interceptaros. Dos intercepciones ganan; dos errores, pierden.';

export const TEAM_ES = (t: 'red' | 'blue'): string => (t === 'red' ? 'rojo' : 'azul');

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allDecryptoStaticPieces(): string[] {
  return [DE_INTRO, ...helpPieces()];
}

export function lastLogLine(game: DecryptoState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
