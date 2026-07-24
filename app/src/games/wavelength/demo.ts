// Tutorial de Wavelength: el flujo real de la app, paso a paso.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'wavelength',
  name: 'Wavelength',
  emoji: '📡',
  steps: [
    {
      icon: '🎯',
      title: 'Cuestión de sintonía',
      text: [
        'Es cooperativo. Cada ronda hay un espectro entre dos ideas opuestas (p. ej. «Frío ↔ Caliente») y un OBJETIVO secreto en algún punto de él.',
        'El Psíquico de turno ve el objetivo y da una pista; el equipo coloca un marcador donde cree que apuntaba. Cuanto más cerca, más puntos. No hay respuesta correcta: gana la sintonía entre vosotros.',
      ],
      visual: { kind: 'board', rows: [{ label: '📡 Espectro', value: 'Frío ↔ Caliente' }, { label: '🎯 Objetivo (secreto)', value: 'solo lo ve el Psíquico' }, { label: '🏆 Total del equipo', value: '0' }] },
    },
    {
      icon: '🔮',
      title: 'El Psíquico ve la diana',
      text: [
        'La app designa un Psíquico (rota cada ronda). Solo él ve en su móvil la DIANA: una franja del dial que vale 4 puntos en el centro, 3 y 2 según te alejas.',
        'Nadie más la ve. El Psíquico piensa una idea que, para él, caiga justo ahí.',
      ],
      visual: { kind: 'card', emoji: '🔮', title: 'Eres el Psíquico', lines: ['Espectro: Frío ↔ Caliente', 'La diana cae bastante hacia «Caliente».', 'Piensa algo que encaje ahí… sin señalar el dial.'] },
    },
    {
      icon: '💬',
      title: 'La pista',
      text: [
        'El Psíquico dice EN VOZ ALTA una sola idea. Si la diana está muy hacia «Caliente», podría decir «una sauna»; si estuviera en el medio, «una piscina en primavera».',
        'Cuando la ha dicho, pulsa «💬 Ya he dado la pista». A partir de ahí, calla: no puede dar más pistas ni tocar el dial.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '💬 Ya he dado la pista', kind: 'primary' }], caption: 'Este botón solo lo ve el Psíquico.' },
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['Eres del equipo. El Psíquico (con «Frío ↔ Caliente») ha dicho: «una sauna».'],
      ask: {
        prompt: '¿Dónde colocáis el marcador?',
        choices: [
          { label: 'Muy hacia «Caliente», casi al extremo', good: true, reply: 'Bien leído: una sauna es de lo más caliente que hay, así que el objetivo está casi en el tope. Ajustad con el resto del equipo esos últimos grados.' },
          { label: 'Justo en el centro', reply: 'El centro sería algo templado (una sopa tibia). «Una sauna» pide irse claramente hacia el extremo caliente.' },
          { label: 'Hacia «Frío»', reply: 'Al revés: eso sería «un cubito de hielo». Escuchad la pista y llevad el marcador hacia el calor.' },
        ],
      },
    },
    {
      icon: '🎚️',
      title: 'La marca del equipo',
      text: [
        'Debatís en voz alta e interpretáis la pista. Cuando os ponéis de acuerdo, UNA persona arrastra el marcador y pulsa «✅ Fijar la marca». El Psíquico no toca el dial.',
        'La app revela entonces el objetivo y os da los puntos por cercanía.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '🎚️ (arrastra el marcador)', kind: 'ghost' }, { label: '✅ Fijar la marca (82)', kind: 'primary' }], caption: 'Lo fija una sola persona, por consenso del equipo.' },
    },
    {
      icon: '🏆',
      title: 'Puntos y siguiente ronda',
      text: [
        'Se puntúa por cercanía: 4 en el centro de la diana, 3 cerca, 2 rozando, 0 fuera. Los suma el Psíquico de la ronda (fue quien os sintonizó) y también el total del equipo.',
        'Luego rota el Psíquico y cambia el espectro. A ver hasta dónde llega vuestra sintonía. 📡',
      ],
      visual: { kind: 'log', lines: ['💬 Ya ha dado la pista. El equipo coloca el marcador.', '🎯 El objetivo estaba en 85, el equipo marcó 82. ¡En el centro! (4). Total del equipo: 4.', '📡 Ronda 2: nuevo espectro y nuevo Psíquico.'] },
    },
  ],
};
