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
        'Jugáis TÚ (en el ejemplo te llamas Ana), Bea y Carlos. Cada uno tiene 4 discos: 3 FLORES 🌸 y 1 CALAVERA 💀, y una pila delante donde los irá poniendo BOCA ABAJO.',
        'En algún momento alguien apostará cuántas flores seguidas es capaz de levantar sin toparse una calavera. Gana la partida quien logre DOS retos así (o quien quede como último con discos).',
      ],
      visual: { kind: 'card', emoji: '💠', title: 'Tus discos', lines: ['🌸 🌸 🌸 💀', 'Solo tú sabes cuáles pones y en qué orden.'] },
    },
    {
      icon: '🌸',
      title: 'Colocación de salida (todos a la vez)',
      who: { actor: 'TODOS colocáis a la vez UN disco boca abajo', others: 'nadie ve lo que ponen los demás: en el tablero, las pilas ajenas salen tapadas 🎴.' },
      text: [
        'Tú pones una flor. ¿Bea? ¿Carlos? Ni idea: eso ES el juego.',
        'El botón flotante 🎴 (abajo a la derecha) está siempre a mano: te recuerda qué discos te quedan, cómo va tu pila y las reglas.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['Tu pila: 🌸 (la ves destapada)'], buttons: [{ label: '🌸 Poner una flor', kind: 'primary' }, { label: '💀 Poner la calavera', kind: 'danger' }] },
          { title: 'Lo que ves de Bea', lines: ['Su pila: 🎴 (tapada)', 'Sus discos: 💠×4 (3 en mano)'] },
        ],
      },
    },
    {
      icon: '🎬',
      title: 'Turnos: otro disco… o apostar',
      who: { actor: 'Bea (su turno) elige: poner otro disco o abrir la apuesta', others: 'tú y Carlos esperáis; su fila brilla en el tablero para que se sepa a quién le toca.' },
      text: [
        'Bea pone un segundo disco (¿flor? ¿calavera?). Te toca a ti: tú también pones otro. Carlos, en su turno, se lanza: pulsa «🗣️ Apostar 2».',
        'La apuesta significa: «levantaré 2 flores seguidas sin destapar ninguna calavera». Nunca puede apostarse más que discos hay en la mesa. Y ojo: si te quedas sin discos en la mano, en tu turno ya solo puedes apostar.',
      ],
      visual: {
        kind: 'log',
        lines: [
          '🎬 Turno de Bea: coloca otro disco o abre una apuesta.',
          '🌀 Bea coloca otro disco. Turno de Ana.',
          '🌀 Ana coloca otro disco. Turno de Carlos.',
          '🗣️ Carlos apuesta que levanta 2 flores sin topar una calavera.',
        ],
      },
    },
    {
      icon: '📈',
      title: 'La puja: ¿subes o pasas?',
      who: { actor: 'TÚ decides (es tu turno de puja): subir la apuesta o pasar', others: 'Carlos ya no puede echarse atrás; Bea esperará su turno de puja.' },
      text: ['Carlos ha apostado 2. Hay 5 discos en la mesa y tu pila son dos discos que solo tú conoces.'],
      ask: {
        prompt: '¿Qué haces?',
        choices: [
          { label: '🤐 Paso: que se la juegue Carlos', good: true, reply: 'Muy sano: pasar es definitivo para la ronda (ya no vuelves a pujar), y quien acaba pujando más alto es quien arriesga. Si crees que hay calaveras sembradas, deja que se estrelle otro.' },
          { label: '📈 Subo a 3: mis dos discos + uno suyo', good: true, reply: 'Valiente y legítimo: TÚ sabes qué pusiste y lo levantarías primero; el tercero ya es fe en la pila ajena. Si nadie sube más, revelas tú. Aquí seguimos por la otra rama: pasas y se la juega Carlos.' },
          { label: 'Subo a 6, a lo grande', reply: 'No te dejará: la apuesta no puede superar los discos que hay en la mesa (5). Y apostar el total significa levantar también las calaveras que haya… y que se revele al instante, porque nadie puede subir más.' },
        ],
      },
    },
    {
      icon: '🎲',
      title: 'El revelado: primero tu propia pila',
      who: { actor: 'Carlos (ganó la puja con 2) levanta discos de uno en uno', others: 'los demás solo miráis: cada disco levantado se destapa para todos.' },
      text: [
        'Regla de oro: quien revela debe levantar PRIMERO todos los discos de su propia pila (por eso ponerse la calavera a uno mismo es un arma de doble filo). Después elige de qué pila ajena levantar el disco de arriba.',
        'Carlos levanta su primer disco: una FLOR 🌸. Le falta una flor… y elige levantar el de arriba de TU pila.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Carlos (revela)', lines: ['Llevadas: 1/2 flores 🌸', 'Botones «Levantar» sobre cada pila permitida.'], buttons: [{ label: 'Levantar el suyo', kind: 'danger' }] },
          { title: 'TÚ', lines: ['«🎲 Carlos se la juega…»', 'Ves cada disco que levanta, destapado en el tablero.'] },
        ],
      },
    },
    {
      icon: '💥',
      title: 'Flor… o calavera',
      who: { actor: 'La app resuelve el reto de Carlos', others: 'cualquiera de los que jugáis puede pulsar «▶️ Siguiente ronda» para recoger las pilas y volver a empezar.' },
      text: [
        'Si tu disco era una FLOR 🌸: Carlos completa sus 2 flores y gana el reto (⭐ una victoria; con dos, la partida). Si era la CALAVERA 💀: falla y pierde un disco AL AZAR de los suyos — puede tocarle su calavera o una flor. Quien se queda sin discos, eliminado.',
        'Al cerrar la ronda cada uno RECOGE TODA su pila y vuelve a tener sus discos: lo único que se pierde es ese disco descartado. La ronda siguiente la empieza quien ganó el reto o, si falló, quien perdió el disco.',
        'Y vuelta a colocar: cada ronda es un pulso nuevo. Farolea con la calavera, huele las ajenas… y no te pases de listo con las apuestas. 💀',
      ],
      visual: { kind: 'log', lines: ['🃏 Carlos levanta un disco de Ana: 💀 ¡CALAVERA!', '💀 Carlos topa con una calavera y pierde un disco (una flor).', '🔄 Ronda 2: cada uno coloca un disco. Empieza Carlos.'] },
    },
  ],
};
