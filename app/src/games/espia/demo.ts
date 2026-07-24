// Tutorial de El Espía: el flujo real de la app, paso a paso.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'espia',
  name: 'El Espía',
  emoji: '🕵️',
  steps: [
    {
      icon: '🎯',
      title: 'Todos saben dónde están… menos uno',
      text: [
        'Cada ronda, todos reciben la MISMA localización con un papel distinto. Uno recibe en su lugar la carta de ESPÍA: no tiene ni idea de dónde está.',
        'Los agentes deben cazarlo con preguntas sin regalar el lugar; el espía debe deducirlo mientras finge saberlo.',
      ],
    },
    {
      icon: '🎴',
      title: 'Tu carta (y la del espía)',
      text: [
        'Mira tu carta a solas y confirma. Cuando todos confirman, cualquiera pone el reloj en marcha.',
        'La lista completa de localizaciones posibles es pública: consúltala cuando quieras (el espía la necesita para adivinar; tú, para no pasarte de listo).',
      ],
      visual: { kind: 'card', emoji: '🏖️', title: 'Estás en: La playa', lines: ['Tu papel: socorrista', 'Responde como quien conoce el lugar, sin nombrarlo jamás.'] },
    },
    {
      icon: '❓',
      title: 'Preguntas y respuestas',
      text: [
        'Quien reparte pregunta primero, llamando a alguien por su nombre: «Bea, ¿vendrías aquí con niños?». Se responde como se quiera, y el interrogado pregunta después a quien quiera.',
        'Prohibido devolver la pregunta a quien te la acaba de hacer. Ni respuestas que canten el lugar… ni tan vagas que parezcan de espía.',
      ],
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['Eres el ESPÍA y te preguntan: «¿Vienes mucho por aquí?»'],
      ask: {
        prompt: '¿Qué respondes?',
        choices: [
          { label: '«Menos de lo que me gustaría, la verdad»', good: true, reply: 'Vaga pero con personalidad: vale para casi cualquier lugar sin sonar evasiva. Gana tiempo y escucha las demás respuestas.' },
          { label: '«Sí, vengo cada semana a nadar»', reply: '¿Y si el lugar es una estación espacial? Concretar sin saber es la muerte del espía: solo apuesta cuando tengas una hipótesis.' },
          { label: '«¿Aquí? ¿Dónde exactamente?»', reply: 'Acabas de gritar que no sabes dónde estás. Las preguntas de vuelta son el clásico delator del espía.' },
        ],
      },
    },
    {
      icon: '🛑',
      title: 'Parar el reloj y acusar',
      text: [
        'Una vez por ronda puedes pulsar «🛑 Parar el reloj y acusar». Votan los demás (tu «sí» ya cuenta; el acusado no vota): la unanimidad revela su carta y TERMINA la ronda, sea espía o no. Un solo «no» y el reloj sigue.',
        'El espía tiene su propio botón: «🎭 Revelarme y adivinar el lugar». Acierte o falle, la ronda acaba (nunca puede usarlo durante una votación).',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '🛑 Parar el reloj y acusar a Bea', kind: 'danger' }, { label: '🎭 Revelarme y adivinar el lugar', kind: 'ghost' }], caption: 'La segunda solo aparece en el móvil del espía.' },
    },
    {
      icon: '⏰',
      title: 'Si el tiempo se agota',
      text: [
        'Nadie habla más del caso: empezando por quien repartió, cada uno acusa (o pasa) por turnos y se vota igual. Si nadie acaba condenado, el espía se marcha de rositas.',
      ],
    },
    {
      icon: '🏆',
      title: 'Puntos y rondas',
      text: [
        'El espía: +2 si sobrevive escondido, +4 si condenáis a un inocente, +4 si adivina el lugar. Los agentes, al ganar: +1 cada uno y +1 extra a quien inició la acusación acertada.',
        'El reparto rota, el lugar no se repite hasta agotar el mazo y el marcador manda. La voz avisa a media ronda, al último minuto y a los 10 segundos.',
      ],
      visual: { kind: 'board', rows: [{ label: '🕵️ Espía escondido', value: '+2' }, { label: '😱 Inocente condenado', value: '+4' }, { label: '🎭 Lugar adivinado', value: '+4' }, { label: '👥 Agentes que aciertan', value: '+1' }] },
    },
  ],
};
