// Tutorial de Insider: el flujo real de la app, paso a paso.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'insider',
  name: 'Insider',
  emoji: '🤫',
  steps: [
    {
      icon: '🎯',
      title: 'Cooperáis… con un topo dentro',
      text: [
        'El equipo debe adivinar una palabra secreta con preguntas de SÍ o NO, contrarreloj. El MAESTRO (público) la conoce y responde; el INSIDER, oculto entre vosotros, también la conoce y os empuja hacia ella sin delatarse.',
        'Si la adivináis, queda la segunda parte: cazar al Insider con un voto. Si el tiempo se agota sin palabra, PERDÉIS TODOS (también el Insider).',
      ],
    },
    {
      icon: '🎴',
      title: 'El reparto',
      text: [
        'La app designa al Maestro (rota cada ronda y es público: todos lo veis en pantalla). Después, cada uno mira su carta a solas y confirma.',
        'El Maestro y el Insider ven además la PALABRA. Los comunes solo saben que no la saben.',
      ],
      visual: { kind: 'card', emoji: '🕵️', title: 'Eres el INSIDER', lines: ['La palabra secreta es: «brújula»', 'Guía al equipo hacia ella… sin que se note que la sabes.'] },
    },
    {
      icon: '⏱️',
      title: 'El interrogatorio',
      text: [
        'El Maestro pone el reloj en marcha (3, 5 u 8 minutos, se elige al empezar). Empieza preguntando quien diga la app y luego pregunta cualquiera, sin turnos.',
        'Preguntas de sí o no: «¿es un objeto?», «¿cabe en un bolsillo?». El Maestro solo responde «sí», «no» o «no lo sé». En cuanto alguien dice la palabra exacta, el Maestro pulsa «✅ ¡Palabra adivinada!».',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '✅ ¡Palabra adivinada!', kind: 'primary' }], caption: 'Este botón solo lo ve el Maestro; el reloj se para al pulsarlo.' },
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['Eres el Insider. Queda un minuto y el equipo anda perdido preguntando por animales (la palabra es «brújula»).'],
      ask: {
        prompt: '¿Qué haces?',
        choices: [
          { label: 'Pregunto «¿sirve para orientarse?»', good: true, reply: 'Reencaminas sin cantar: parece una pregunta más, pero corta el bosque entero. El arte del Insider es ESTA pregunta.' },
          { label: 'Pregunto «¿tiene una aguja que apunta al norte?»', reply: 'Demasiado quirúrgica: cuando os pregunten «¿cómo lo has sabido?», no tendrás respuesta. Te acaban de fichar.' },
          { label: 'Me callo el resto de la ronda', reply: 'Si el tiempo se agota, pierdes TÚ también. Y un jugador mudo en Insider es tan sospechoso como uno certero.' },
        ],
      },
    },
    {
      icon: '👉',
      title: 'La caza del Insider',
      text: [
        'Palabra adivinada: breve debate («¿quién ha preguntado con demasiada puntería?») y todos votan a la vez, en secreto — también el Maestro. No puedes votarte a ti mismo ni al Maestro.',
        'Si el más votado es el Insider, lo cazáis (+1 al Maestro y a cada común). Si señaláis a un inocente o hay empate, el Insider escapa (+2 para él).',
      ],
    },
    {
      icon: '🏆',
      title: 'Rondas y marcador',
      text: [
        'El Maestro rota, la palabra nunca se repite hasta agotarse y el marcador se acumula. Rondas de pocos minutos: perfectas para encadenar.',
        'Recuerda la doble lealtad del Insider: necesita que ACERTÉIS la palabra… pero que falléis al señalarlo. 🤫',
      ],
      visual: { kind: 'log', lines: ['✅ ¡Palabra adivinada! Ahora, en secreto, señalad a quien creáis el Insider.', '🗳️ La mesa señala a David.', '🕵️ El Insider era David. ¡Cazado! El equipo se lleva la ronda (+1).'] },
    },
  ],
};
