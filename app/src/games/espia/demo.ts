// Tutorial de El Espía: una ronda de ejemplo continua, con quién actúa en cada
// momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'espia',
  name: 'El Espía',
  emoji: '🕵️',
  steps: [
    {
      icon: '🎯',
      title: 'La ronda de ejemplo',
      text: [
        'Jugáis TÚ, Bea, Carlos y David. Todos reciben la MISMA localización con un papel distinto… menos uno, que recibe la carta de ESPÍA y no tiene ni idea de dónde está.',
        'A base de preguntas, los agentes deben cazar al espía sin regalar el lugar; el espía debe deducirlo mientras finge saberlo.',
      ],
    },
    {
      icon: '🎴',
      title: 'El reparto: tu carta',
      who: { actor: 'TODOS miráis vuestra carta a la vez, a solas, y confirmáis', others: 'nadie enseña su móvil, y cuando confirma el último, cualquiera pone el reloj en marcha.' },
      text: [
        'Tu carta: 🏖️ La playa, papel de socorrista. La de Bea (nadie lo sabe): ESPÍA. La lista completa de localizaciones posibles es pública — consúltala cuando quieras.',
        'La carta se cierra sola enseguida: el móvil se queda plano en la mesa y todas las pantallas se ven iguales, así que nadie deduce nada mirando de reojo. Para volver a verla, «Mi carta»; para ir tachando lugares descartados, «Mi libreta». Lo que hagas ahí no lo ve nadie.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['🏖️ Estás en: La playa', 'Tu papel: socorrista', 'Responde como quien conoce el lugar, sin nombrarlo.'] },
          { title: 'Bea (tú no lo ves)', lines: ['🕵️ Es la ESPÍA', 'No sabe el lugar: escuchará, deducirá y fingirá.'] },
        ],
      },
    },
    {
      icon: '❓',
      title: 'Preguntas y respuestas (todo hablado)',
      who: { actor: 'Quien reparte pregunta primero, llamando a alguien por su nombre; el interrogado responde y pregunta al siguiente', others: 'prohibido devolver la pregunta a quien te la acaba de hacer; el móvil solo muestra el reloj.' },
      text: [
        'En esta ronda reparte Carlos, así que abre él el interrogatorio: le pregunta a David si vendría aquí con niños, y David contesta que depende del oleaje.',
        'Ahora pregunta David, que elige a Bea: qué se pondría para venir. Bea es la espía y empieza a sudar, porque aún no sabe dónde está.',
      ],
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba (si fueras la espía)',
      who: { actor: 'Bea responde intentando no cantarse', others: 'todos escucháis con lupa: las respuestas vagas delatan.' },
      text: ['Eres la espía y te preguntan: «¿Qué te pondrías para venir aquí?»'],
      ask: {
        prompt: '¿Qué respondes?',
        choices: [
          { label: '«Algo cómodo, tampoco es plan de ir de gala»', good: true, reply: 'Vaga pero con personalidad: vale para casi cualquier lugar sin sonar evasiva. Gana tiempo y roba pistas de las siguientes respuestas.' },
          { label: '«El bañador, claro»', reply: 'Concretar sin saber es la ruleta rusa del espía: ¿y si era la estación espacial? Solo apuesta cuando tengas una hipótesis sólida.' },
          { label: '«¿Ponerme? ¿Dónde exactamente?»', reply: 'Acabas de gritar que no sabes dónde estás. Las preguntas de vuelta son el clásico delator.' },
        ],
      },
    },
    {
      icon: '🛑',
      title: 'Parar el reloj y acusar',
      who: { actor: 'Carlos pulsa «🛑 Parar el reloj y acusar» y señala a Bea (una vez por ronda cada uno)', others: 'votáis los demás — el «sí» de Carlos es implícito y Bea no vota; si hay unanimidad: se revela su carta y la ronda ACABA.' },
      text: [
        'Tú y David votáis que sí: unánime. La carta de Bea se revela: ¡era la espía! Si alguien hubiera votado «no», el reloj habría seguido corriendo… y Carlos se habría quedado igualmente sin acusación: se gasta aunque el voto caiga.',
        'Ojo con el gatillo fácil: la carta se revela SEA QUIEN SEA. Si condenáis a un inocente, la ronda también termina ahí y el espía se lleva +4 sin despeinarse.',
        'La espía tenía su propia salida: «🎭 Revelarme y adivinar el lugar» (nunca durante una votación). Acierte o falle, la ronda termina.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (votando)', lines: ['«Carlos acusa a Bea, ¿espía?»'], buttons: [{ label: '👍 Sí, es ella', kind: 'danger' }, { label: '👎 No lo veo', kind: 'ghost' }] },
          { title: 'Bea (acusada)', lines: ['No vota: solo espera el veredicto.', 'Su botón de adivinar queda bloqueado durante el voto.'] },
        ],
      },
    },
    {
      icon: '⏰',
      title: 'Si el tiempo se hubiera agotado',
      who: { actor: 'Cada uno, POR TURNOS desde quien repartió, acusa o pasa', others: 'ya no se habla más del caso: solo acusaciones y votos.' },
      text: [
        'En esta tanda acusa todo el mundo, incluso quien ya gastó su acusación con el reloj en marcha. El primer voto unánime cierra la ronda; si nadie acaba condenado, la espía se marcha de rositas (+2).',
        'La espía tampoco pierde su jugada: mientras no haya una votación abierta puede revelarse y adivinar el lugar. La voz avisa antes de llegar aquí: a media ronda, al último minuto y a los 10 segundos.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (es tu turno)', lines: ['⏰ Se acabó el tiempo: acusaciones por turnos.', 'Señala a un sospechoso… o pasa.'], buttons: [{ label: '👉 Acusar a Bea', kind: 'danger' }, { label: '🤐 Paso', kind: 'ghost' }] },
          { title: 'David (espera su turno)', lines: ['Esperando la acusación de TÚ…', 'Puede saltar tu turno si te quedas en blanco demasiado rato.'] },
        ],
      },
    },
    {
      icon: '🏆',
      title: 'Puntos y siguiente ronda',
      who: { actor: 'La app puntúa y cualquiera arranca la siguiente ronda', others: 'el reparto rota y el lugar no se repite hasta agotar el mazo.' },
      text: [
        'Espía: +2 si sobrevive escondida, +4 si condenáis a un inocente, +4 si adivina el lugar. Agentes que aciertan: +1 cada uno, y +1 extra a quien inició la acusación (Carlos se lleva 2).',
        'De 3 a 8 jugadores y rondas de 5, 8 o 10 minutos: la mesa elige la duración al empezar (la oficial son 8). Entre rondas se puede sentar a quien llegue.',
        'Interrogatorio, faroles y miradas de reojo. 🕵️',
      ],
      visual: { kind: 'board', rows: [{ label: '🕵️ Espía escondida', value: '+2' }, { label: '😱 Inocente condenado', value: '+4 (espía)' }, { label: '🎭 Lugar adivinado', value: '+4 (espía)' }, { label: '👥 Agentes aciertan', value: '+1 (+1 extra)' }] },
    },
  ],
};
