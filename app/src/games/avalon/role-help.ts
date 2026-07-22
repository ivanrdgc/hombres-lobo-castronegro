// Ayuda estructurada de cada rol de Ávalon (when + steps + tip), mismo formato
// que los otros juegos. Material de INTERFAZ (la voz no lo lee).
import type { RoleId } from './roles';

export interface RoleHelp { when: string; steps: string[]; tip?: string }

export const ROLE_HELP: Record<RoleId, RoleHelp> = {
  merlin: {
    when: 'Bando del Bien · lo sabe todo',
    steps: [
      'La app te muestra quiénes son los esbirros del Mal (todos menos Mordred, si está en juego).',
      'Guía a tus compañeros hacia equipos limpios y desconfía en voz alta… pero sin cantar que eres Merlín.',
      'Si el Bien completa tres misiones, el Asesino intentará señalarte: si te descubre, ganáis por los pelos… o lo perdéis todo.',
    ],
    tip: 'Tu poder es enorme, pero tu vida pende de un hilo: insinúa, no señales.',
  },
  percival: {
    when: 'Bando del Bien · guardián de Merlín',
    steps: [
      'La app te muestra a Merlín y a Morgana… pero no cuál es cuál (si Morgana no está, ves a Merlín exacto).',
      'Averigua cuál es el verdadero Merlín por cómo juega y protégelo del Asesino.',
    ],
    tip: 'Si finges NO saber nada, despistas al Mal sobre quién es Merlín.',
  },
  servant: {
    when: 'Bando del Bien · sin información',
    steps: [
      'No sabes nada de nadie: deduce por las propuestas, los votos y los sabotajes quién es de fiar.',
      'Vota en contra de los equipos sospechosos y a favor de los limpios.',
    ],
  },
  assassin: {
    when: 'Bando del Mal · la última bala',
    steps: [
      'Cazas con el Mal: sabotea misiones y reconoce a tus compañeros (la app te los muestra, salvo Oberón).',
      'Si el Bien completa tres misiones, tendrás una última oportunidad: la app te pedirá que señales a quien creas que es Merlín. Si aciertas, ¡gana el Mal!',
    ],
    tip: 'Durante la partida, fíjate en quién guía al Bien con demasiado acierto: ese suele ser Merlín.',
  },
  morgana: {
    when: 'Bando del Mal · la falsa Merlín',
    steps: [
      'Eres malvada y conoces a tus compañeros (salvo Oberón).',
      'Ante Percival APARECES como si fueras Merlín: haz que dude y proteja a quien no debe.',
    ],
  },
  mordred: {
    when: 'Bando del Mal · oculto para Merlín',
    steps: [
      'Eres malvado y conoces a tus compañeros, pero Merlín NO te ve: eres su punto ciego.',
      'Aprovéchalo para colarte en equipos que Merlín creería limpios.',
    ],
  },
  oberon: {
    when: 'Bando del Mal · en solitario',
    steps: [
      'Eres malvado, pero no conoces a los demás esbirros y ellos no te conocen a ti: jugáis a ciegas entre vosotros.',
      'Merlín, en cambio, SÍ te ve como malvado.',
    ],
    tip: 'Coordinar los sabotajes sin conocer a los tuyos es un arte: no os piséis fallando la misma misión.',
  },
  minion: {
    when: 'Bando del Mal · esbirro',
    steps: [
      'La app te muestra a tus compañeros del Mal (salvo Oberón).',
      'Cuela sabotajes en las misiones sin que el Bien te señale, y aprueba equipos con los tuyos dentro.',
    ],
  },
};
