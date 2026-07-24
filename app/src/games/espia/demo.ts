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
      who: { actor: 'TODOS miráis vuestra carta a la vez, a solas, y confirmáis', others: 'cuando confirma el último, cualquiera pone el reloj en marcha.' },
      text: [
        'Tu carta: 🏖️ La playa, papel de socorrista. La de Bea (nadie lo sabe): ESPÍA. La lista completa de localizaciones posibles es pública — consúltala cuando quieras.',
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
        'Carlos: «David, ¿vendrías aquí con niños?» — «Depende del oleaje…». David: «Bea, ¿qué te pondrías para venir?». Bea (espía, sudando): …',
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
      who: { actor: 'Carlos pulsa «🛑 Parar el reloj y acusar» y señala a Bea (una vez por ronda cada uno)', others: 'votáis los demás — el «sí» de Carlos es implícito y Bea no vota; unanimidad = se revela su carta y la ronda ACABA.' },
      text: [
        'Tú y David votáis que sí: unánime. La carta de Bea se revela: ¡era la espía! Si alguien hubiera votado «no», el reloj habría seguido corriendo.',
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
        'El primer voto unánime cierra la ronda. Si nadie acaba condenado, la espía se marcha de rositas (+2). La voz avisa antes: a media ronda, al último minuto y a los 10 segundos.',
      ],
    },
    {
      icon: '🏆',
      title: 'Puntos y siguiente ronda',
      who: { actor: 'La app puntúa y cualquiera arranca la siguiente ronda', others: 'el reparto rota y el lugar no se repite hasta agotar el mazo.' },
      text: [
        'Espía: +2 si sobrevive escondida, +4 si condenáis a un inocente, +4 si adivina el lugar. Agentes que aciertan: +1 cada uno, y +1 extra a quien inició la acusación (Carlos se lleva 2).',
        'Ocho minutos de interrogatorio, faroles y miradas de reojo. 🕵️',
      ],
      visual: { kind: 'board', rows: [{ label: '🕵️ Espía escondida', value: '+2' }, { label: '😱 Inocente condenado', value: '+4 (espía)' }, { label: '🎭 Lugar adivinado', value: '+4 (espía)' }, { label: '👥 Agentes aciertan', value: '+1 (+1 extra)' }] },
    },
  ],
};
