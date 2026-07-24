// Tutorial de Skull: el flujo real de la app, paso a paso.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'skull',
  name: 'Skull',
  emoji: '💀',
  steps: [
    {
      icon: '🎯',
      title: 'Farol con flores y calaveras',
      text: [
        'Cada jugador tiene 4 discos: 3 FLORES 🌸 y 1 CALAVERA 💀. Vais poniéndolos boca abajo en vuestra pila; solo tú sabes qué has puesto.',
        'En algún momento alguien apuesta cuántas flores es capaz de levantar seguidas sin topar una calavera. Gana quien se lleve DOS retos (o quede como último con discos).',
      ],
      visual: { kind: 'card', emoji: '💠', title: 'Tus discos', lines: ['🌸 🌸 🌸 Tres flores', '💀 Una calavera', 'Colócalos boca abajo: nadie ve cuál es cuál.'] },
    },
    {
      icon: '🌸',
      title: 'Colocar discos',
      text: [
        'Cada ronda empieza con todos poniendo UN disco a la vez (tu «disco de salida»). Elige flor o calavera.',
        'Luego, por turnos, puedes poner OTRO disco encima… o abrir una apuesta. Cuantos más discos hay en la mesa, más alto se podrá apostar.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '🌸 Poner una flor', kind: 'primary' }, { label: '💀 Poner la calavera', kind: 'danger' }], caption: 'Poner la calavera pronto es una trampa… si alguien la levanta, falla.' },
    },
    {
      icon: '🗣️',
      title: 'La apuesta y las pujas',
      text: [
        'Apostar es decir «levantaré N flores seguidas sin topar una calavera» (N no pasa del total de discos en la mesa).',
        'Los demás, por turnos, suben la apuesta o pasan. Cuando todos menos uno pasan, ese se la juega y le toca levantar.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '1 · 2 · 3 · 4 …', kind: 'ghost' }, { label: '🗣️ Apostar 3', kind: 'primary' }, { label: '📈 Subir · 🤐 Pasar', kind: 'ghost' }], caption: 'Subes creyendo que hay más flores… o pasas si hueles una calavera.' },
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['Has ganado la puja: apostaste levantar 3 flores. La regla dice por dónde empezar.'],
      ask: {
        prompt: '¿Por qué pila empiezas a levantar?',
        choices: [
          { label: 'Por la MÍA, obligatoriamente', good: true, reply: 'Correcto: primero levantas TODA tu propia pila (por eso conviene no haberte puesto tu calavera). Luego eliges de qué rivales seguir.' },
          { label: 'Por la del rival más sospechoso', reply: 'Todavía no: la regla obliga a levantar primero TODOS tus discos. Solo después eliges pilas ajenas.' },
          { label: 'Por la que tenga más discos', reply: 'No eliges libremente al principio: primero van los tuyos. Elegir rival llega después, y solo el disco de arriba de cada pila.' },
        ],
      },
    },
    {
      icon: '🎲',
      title: 'El revelado',
      text: [
        'Levantas discos de uno en uno (en el tablero, botón «Levantar»): primero los tuyos, luego el de arriba de las pilas que elijas.',
        'Si juntas tantas FLORES como apostaste, ganas el reto (una ⭐). Si sale una CALAVERA antes, fallas y pierdes un disco al azar: puede ser una flor… o tu calavera.',
      ],
      visual: { kind: 'log', lines: ['🗣️ Ana apuesta que levanta 3 flores.', '🃏 Ana levanta un disco de su propia pila: 🌸 flor.', '🃏 Ana levanta un disco de Bea: 💀 ¡CALAVERA!', '💀 Ana topa con una calavera y pierde un disco.'] },
    },
    {
      icon: '🏆',
      title: 'Ganar',
      text: [
        'Quien se queda sin discos queda eliminado; si solo queda uno en pie, gana. Y el primero en ganar DOS retos se lleva la partida.',
        'La app custodia las pilas (nadie ve las tuyas) y anuncia cada jugada en voz alta. Puro pulso y farol. 💀',
      ],
      visual: { kind: 'board', rows: [{ label: '👑 Ana', value: '⭐⭐' }, { label: 'Bea', value: '⭐' }, { label: 'Carlos', value: '—' }] },
    },
  ],
};
