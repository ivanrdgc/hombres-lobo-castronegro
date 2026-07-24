// Tutorial de Skull: una ronda de ejemplo continua, con quién actúa en cada
// momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'skull',
  name: 'Skull',
  emoji: '💀',
  steps: [
    {
      icon: '🎯',
      title: 'La ronda de ejemplo',
      text: [
        'Jugáis TÚ, Bea y Carlos. Cada uno tiene 4 discos: 3 FLORES 🌸 y 1 CALAVERA 💀, y una pila delante donde los irá poniendo BOCA ABAJO.',
        'En algún momento alguien apostará: «levanto N flores seguidas sin toparme una calavera». Gana la partida quien logre DOS retos así (o quien quede como último con discos).',
      ],
      visual: { kind: 'card', emoji: '💠', title: 'Tus discos', lines: ['🌸 🌸 🌸 💀', 'Solo tú sabes cuáles pones y en qué orden.'] },
    },
    {
      icon: '🌸',
      title: 'Colocación de salida (todos a la vez)',
      who: { actor: 'TODOS colocáis a la vez UN disco boca abajo', others: 'nadie ve lo que ponen los demás: en el tablero, las pilas ajenas salen tapadas 🎴.' },
      text: [
        'Tú pones una flor. ¿Bea? ¿Carlos? Ni idea: eso ES el juego.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['Tu pila: 🌸 (la ves destapada)'], buttons: [{ label: '🌸 Poner una flor', kind: 'primary' }, { label: '💀 Poner la calavera', kind: 'danger' }] },
          { title: 'Lo que ves de Bea', lines: ['Su pila: 🎴 (tapada)', 'Sus discos en mano: 💠×3'] },
        ],
      },
    },
    {
      icon: '🎬',
      title: 'Turnos: otro disco… o apostar',
      who: { actor: 'Bea (su turno) elige: poner otro disco o abrir la apuesta', others: 'tú y Carlos esperáis; su fila brilla en el tablero para que se sepa a quién le toca.' },
      text: [
        'Bea pone un segundo disco (¿flor? ¿calavera?). Te toca a ti: tú también pones otro. Carlos, en su turno, se lanza: pulsa «🗣️ Apostar 2».',
        'La apuesta significa: «levantaré 2 flores seguidas sin destapar ninguna calavera». Nunca puede apostarse más que discos hay en la mesa.',
      ],
      visual: { kind: 'log', lines: ['🎬 Turno de Bea: coloca otro disco o abre una apuesta.', '🎬 Turno tuyo…', '🗣️ Carlos apuesta que levanta 2 flores sin topar una calavera.'] },
    },
    {
      icon: '📈',
      title: 'La puja: ¿subes o pasas?',
      who: { actor: 'TÚ decides (es tu turno de puja): subir la apuesta o pasar', others: 'Carlos ya no puede echarse atrás; Bea esperará su turno de puja.' },
      text: ['Carlos ha apostado 2. Hay 5 discos en la mesa y tu pila son dos flores.'],
      ask: {
        prompt: '¿Qué haces?',
        choices: [
          { label: '🤐 Paso: que se la juegue Carlos', good: true, reply: 'Muy sano: pasar es definitivo para la ronda, y quien acaba pujando más alto es quien arriesga. Si crees que hay calaveras sembradas, deja que se estrelle otro.' },
          { label: '📈 Subo a 3: mis dos flores + una suya', good: true, reply: 'Valiente y legítimo: sabes que TUS dos primeras son flores seguras (las levantarás tú primero). La tercera ya es fe en la pila ajena… Si nadie sube más, revelarás tú.' },
          { label: 'Subo a 6, a lo grande', reply: 'No te dejará: la apuesta no puede superar los discos que hay en la mesa (5). Y apostarlo TODO significa levantar también las calaveras que haya…' },
        ],
      },
    },
    {
      icon: '🎲',
      title: 'El revelado: primero tu propia pila',
      who: { actor: 'Carlos (ganó la puja con 2) levanta discos de uno en uno', others: 'los demás solo miráis: cada disco levantado se destapa para todos.' },
      text: [
        'Regla de oro: quien revela debe levantar PRIMERO todos los discos de su propia pila (por eso ponerse la calavera a uno mismo es un arma de doble filo). Después elige de qué pila ajena levantar el disco de arriba.',
        'Carlos levanta su primer disco: 🌸. Le falta una flor… y elige levantar el de arriba de TU pila.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Carlos (revela)', lines: ['Llevadas: 1/2 flores 🌸', 'Botones «Levantar» sobre cada pila permitida.'], buttons: [{ label: 'Levantar el tuyo', kind: 'danger' }] },
          { title: 'TÚ', lines: ['«🎲 Carlos se la juega…»', 'Ves cada disco que levanta, destapado en el tablero.'] },
        ],
      },
    },
    {
      icon: '💥',
      title: 'Flor… o calavera',
      who: { actor: 'La app resuelve el reto de Carlos', others: 'y cualquiera pulsa «▶️ Siguiente ronda» para recoger las pilas y volver a empezar.' },
      text: [
        'Si tu disco era 🌸: Carlos completa sus 2 flores y gana el reto (⭐, y con dos ⭐ la partida). Si era 💀: falla y pierde un disco AL AZAR de los suyos — puede tocarle su calavera o una flor. Quien se queda sin discos, eliminado.',
        'Y vuelta a colocar: cada ronda es un pulso nuevo. Farolea con la calavera, huele las ajenas… y no te pases de listo con las apuestas. 💀',
      ],
      visual: { kind: 'log', lines: ['🃏 Carlos levanta un disco de tu pila: 💀 ¡CALAVERA!', '💀 Carlos topa con una calavera y pierde un disco (una flor).', '🔄 Ronda 2: cada uno coloca un disco. Empieza Carlos.'] },
    },
  ],
};
