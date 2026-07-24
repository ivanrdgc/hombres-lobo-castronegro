// Tutorial de Codenames: el flujo real de la app, paso a paso.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'codenames',
  name: 'Codenames',
  emoji: '🕵️',
  steps: [
    {
      icon: '🎯',
      title: 'Dos equipos, un tablero de palabras',
      text: [
        'Rojo contra azul, frente a 25 palabras. Cada equipo tiene un JEFE de espías; el resto son agentes.',
        'Solo los Jefes ven el MAPA secreto: qué palabras son suyas, del rival, neutrales… y cuál es el ASESINO. Gana el equipo que destapa todas las suyas; quien toca al asesino, pierde en el acto.',
      ],
      visual: {
        kind: 'board',
        rows: [{ label: '🔴 Rojo (empieza)', value: '9 palabras' }, { label: '🔵 Azul', value: '8 palabras' }, { label: '⬜ Transeúntes', value: '7' }, { label: '💀 Asesino', value: '1' }],
      },
    },
    {
      icon: '🗺️',
      title: 'El mapa, solo para los Jefes',
      text: [
        'La app reparte los equipos y designa un Jefe por bando (lo ves en tu carta). El Jefe ve el tablero coloreado en su móvil; los agentes, solo las palabras.',
        'Colocaos de modo que nadie vea la pantalla de su Jefe.',
      ],
      visual: { kind: 'card', emoji: '🕵️', title: 'Jefe de espías · 🔴 Rojo', lines: ['Ves el mapa completo.', 'Guía a tus agentes con pistas de una palabra + número, lejos del asesino.'] },
    },
    {
      icon: '💬',
      title: 'La pista del Jefe',
      text: [
        'En su turno, el Jefe da EN VOZ ALTA una pista de UNA palabra y un número: la palabra conecta varias casillas suyas, el número dice cuántas. Ej.: «fuego: 2».',
        'En la app introduce la palabra y el número (1-9) y la confirma. Nada de gestos ni pistas de más.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '(escribe) «fuego»', kind: 'ghost' }, { label: '1 · 2 · 3 · 4 …', kind: 'ghost' }, { label: '💬 Dar la pista «fuego» · 2', kind: 'primary' }], caption: 'Este panel solo lo ve el Jefe del equipo de turno.' },
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['Eres agente del equipo rojo. Tu Jefe ha dicho «fuego: 2» y en el tablero ves «Volcán», «Rayo», «Nieve» y «Playa».'],
      ask: {
        prompt: '¿Qué tocas?',
        choices: [
          { label: '«Volcán» y luego «Rayo»', good: true, reply: 'Buena lectura: los dos encajan con «fuego». Tocáis de una en una; si aciertas una roja, sigues. Con «2» tenéis hasta 3 toques (número + 1), pero no hace falta gastarlos.' },
          { label: '«Nieve», que también quema del frío', reply: 'Arriesgado: si es neutral pierdes el turno, y si es azul o el asesino, mucho peor. Con «fuego» ve a lo evidente.' },
          { label: 'Toco las cuatro de golpe', reply: 'Se toca de UNA EN UNA: en cuanto sale una que no es tuya, el turno acaba. Y «fuego: 2» dice que solo dos son tuyas.' },
        ],
      },
    },
    {
      icon: '👉',
      title: 'Tocar y arriesgar',
      text: [
        'Cada palabra que tocáis revela su color: si es vuestra, seguid; si es neutral, fin del turno; si es del rival, se la regaláis; si es el ASESINO, perdéis.',
        'Cuando no queráis arriesgar más, pulsad «🤐 Pasar el turno». La app lleva la cuenta de las casillas que os quedan.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '🤐 Pasar el turno', kind: 'ghost' }], caption: 'Mejor pasar a tiempo que topar con el asesino.' },
    },
    {
      icon: '🏆',
      title: 'Ganar',
      text: [
        'Los turnos se alternan hasta que un equipo destapa todas sus palabras (gana) o alguien topa con el asesino (pierde su equipo). La app anuncia cada jugada en voz alta, nunca el mapa oculto.',
        'Al final se destapa el tablero entero. Jugad las partidas que queráis: se guarda el marcador. 🕵️',
      ],
      visual: { kind: 'log', lines: ['💬 El Jefe rojo da una pista («fuego») para 2 palabras.', '👉 Destapa «Volcán»: 🔴 rojo.', '👉 Destapa «Rayo»: 🔴 rojo.', '🏆 ¡Gana el equipo ROJO! Ha destapado todas sus casillas.'] },
    },
  ],
};
