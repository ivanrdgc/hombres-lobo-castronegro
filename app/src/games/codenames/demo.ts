// Tutorial de Codenames: una partida de ejemplo continua, paso a paso, con
// quién actúa en cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'codenames',
  name: 'Codenames',
  emoji: '🕵️',
  steps: [
    {
      icon: '🎯',
      title: 'La partida de ejemplo',
      text: [
        'Jugáis cuatro: TÚ y Bea en el equipo 🔴 rojo, Carlos y David en el 🔵 azul. Sobre la mesa, 25 palabras que todos veis igual.',
        'Cada equipo tiene un JEFE de espías que ve el MAPA secreto (qué palabra es de quién y cuál esconde al 💀 asesino). Gana el equipo que destape todas sus palabras; quien toque al asesino pierde en el acto.',
      ],
      visual: {
        kind: 'chips',
        chips: [
          { name: 'Bea', emoji: '🔴', badge: 'Jefa', hl: true }, { name: 'TÚ', emoji: '🔴', badge: 'agente' },
          { name: 'Carlos', emoji: '🔵', badge: 'Jefe' }, { name: 'David', emoji: '🔵', badge: 'agente' },
        ],
        caption: 'La app reparte equipos y jefes al azar al empezar.',
      },
    },
    {
      icon: '🗺️',
      title: 'El reparto: dos pantallas muy distintas',
      who: { actor: 'Todos miráis vuestro tablero a la vez', others: 'nadie toca nada todavía: cada uno descubre solo lo que le toca ver.' },
      text: [
        'Tu carta te dice tu papel. Y aquí está la clave del juego: Bea (Jefa) ve el tablero COLOREADO; tú lo ves en gris. Que nadie mire la pantalla de su Jefe.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Bea (Jefa 🔴)', lines: ['Ve las 25 palabras CON su color:', '🔴 Volcán, Rayo, Faro… (9)', '🔵 Nieve, Puente… (8)', '⬜ 7 transeúntes · 💀 Serpiente'] },
          { title: 'TÚ (agente 🔴)', lines: ['Ves las mismas 25 palabras…', '…todas grises, sin colores.', 'Tu información llegará por la pista de Bea.'] },
        ],
      },
    },
    {
      icon: '💬',
      title: 'Turno rojo: la pista de la Jefa',
      who: { actor: 'Bea (Jefa 🔴) escribe su pista en su móvil y la dice en alto', others: 'tú esperas sin tocar; el equipo azul escucha (la pista es pública).' },
      text: [
        'La pista es UNA palabra + un número: cuántas casillas rojas conecta. Bea quiere unir «Volcán» y «Rayo», así que pone «fuego», elige el 2 y pulsa el botón.',
        'Nada de gestos ni palabras extra: solo esa palabra y ese número.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Bea (Jefa 🔴)', lines: ['Escribe: «fuego»', 'Número: 2'], buttons: [{ label: '💬 Dar la pista «fuego» · 2', kind: 'primary' }] },
          { title: 'TÚ (agente 🔴)', lines: ['«💬 La Jefa roja está preparando su pista…»', 'La voz cantará la pista cuando la confirme.'] },
        ],
      },
    },
    {
      icon: '🤔',
      title: 'Turno rojo: te toca tocar',
      who: { actor: 'TÚ (agente 🔴) tocas palabras en el tablero, de una en una', others: 'Bea ya no puede hablar; los azules miran y sufren.' },
      text: ['La pista es «fuego: 2». En el tablero ves «Volcán», «Rayo», «Nieve» y «Playa».'],
      ask: {
        prompt: '¿Qué tocas?',
        choices: [
          { label: '«Volcán», y si acierto, «Rayo»', good: true, reply: 'Eso es. Tocas UNA casilla, la app revela su color, y si es roja puedes seguir. Con «2» tenéis hasta 3 toques (número + 1), pero nadie os obliga a gastarlos.' },
          { label: '«Nieve», que el fuego la derrite', reply: 'Demasiada carambola: si es transeúnte pierdes el turno, y si es azul o el 💀… Con «fuego: 2», ve a lo claro: Volcán y Rayo.' },
          { label: 'Espero a que Bea me haga una señal', reply: 'No la habrá: la Jefa tiene PROHIBIDO añadir nada tras la pista. Decidís los agentes solos, debatiendo en voz alta.' },
        ],
      },
    },
    {
      icon: '👉',
      title: 'Cada toque, una revelación',
      who: { actor: 'TÚ sigues tocando (o pasas)', others: 'la app revela el color a TODOS con cada toque.' },
      text: [
        'Tocas «Volcán»: 🔴 ¡roja! Puedes seguir. Tocas «Rayo»: 🔴 ¡otra! Si tocas una neutral (⬜ transeúnte) o una azul, el turno pasa al rival; si tocas al 💀 asesino, habéis perdido.',
        'Regla oficial: hay que tocar al menos UNA por turno; después se activa «🤐 Pasar el turno» para plantarse.',
      ],
      visual: { kind: 'log', lines: ['💬 La Jefa roja da una pista («fuego») para 2 palabras.', '👉 Tú destapas «Volcán»: 🔴 rojo.', '👉 Tú destapas «Rayo»: 🔴 rojo.', '🤐 El equipo rojo pasa.'] },
    },
    {
      icon: '🔁',
      title: 'Turno azul: mismos pasos, otro equipo',
      who: { actor: 'Carlos (Jefe 🔵) da su pista y David toca', others: 'vosotros dos miráis: cada revelación azul también os da información.' },
      text: [
        'Los turnos se alternan igual: pista del Jefe → toques de sus agentes → pasar o fallar. El marcador de arriba (🔴 7 · 🔵 8) dice cuántas le quedan a cada equipo.',
      ],
      visual: { kind: 'board', rows: [{ label: '🔴 Rojo (por destapar)', value: '7' }, { label: '🔵 Azul (por destapar)', value: '8' }] },
    },
    {
      icon: '🏆',
      title: 'El final',
      who: { actor: 'Quien destapa su última palabra gana al momento', others: 'y si alguien toca al 💀, su equipo pierde ahí mismo.' },
      text: [
        'Al acabar, la app enseña el mapa completo a todos y guarda el marcador. Revancha con «🔁 Otra partida» (equipos y mapa nuevos).',
        'Resumen: Jefa piensa → pista pública → agentes tocan → pasar a tiempo. Y lejos, muy lejos, del asesino. 🕵️',
      ],
      visual: { kind: 'log', lines: ['👉 David destapa «Serpiente»: 💀 ASESINO.', '🏆 🔴 ¡Gana el equipo ROJO! El equipo azul tocó al ASESINO.'] },
    },
  ],
};
