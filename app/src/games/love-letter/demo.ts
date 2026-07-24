// Tutorial de Love Letter: el flujo real de la app, paso a paso.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'love_letter',
  name: 'Love Letter',
  emoji: '💌',
  steps: [
    {
      icon: '🎯',
      title: 'Una carta, mucha intriga',
      text: [
        'Tienes UNA carta secreta en la mano. En tu turno robas una segunda, y juegas una de las dos aplicando su efecto. La otra se queda contigo.',
        'Ganas la ronda si quedas como último en pie, o si tienes la carta más alta cuando se agota el mazo. Ganar rondas da favores; el primero en juntar los necesarios gana la partida.',
      ],
      visual: { kind: 'card', emoji: '💗', title: 'Tu mano', lines: ['💂 Guardia (1)', 'En tu turno robarás otra y jugarás una de las dos.'] },
    },
    {
      icon: '🃏',
      title: 'Las ocho cartas',
      text: [
        'Cuanto más alto el número, más poderosa (y más peligrosa de retener).',
        '💂 Guardia (1): adivina la carta de otro. ⛪ Sacerdote (2): mírala. 🎩 Barón (3): duelo, cae el menor. 🛡️ Doncella (4): te protege.',
        '🤴 Príncipe (5): alguien descarta y roba. 👑 Rey (6): cambia manos. 👸 Condesa (7): sin efecto, pero forzosa con Rey/Príncipe. 💗 Princesa (8): si la descartas, ¡fuera!',
      ],
    },
    {
      icon: '💂',
      title: 'Jugar una carta',
      text: [
        'Eliges cuál de tus dos cartas juegas. Si su efecto necesita objetivo, señalas a un jugador (no puede ser uno protegido por la Doncella).',
        'Con el Guardia, además adivinas qué carta tiene: si aciertas (y no vale decir «Guardia»), queda fuera de la ronda.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '💂 Guardia (1)', kind: 'primary' }, { label: '¿A quién? · ¿Qué carta?', kind: 'ghost' }, { label: '▶️ Jugar Guardia', kind: 'primary' }], caption: 'Eliges carta, objetivo y —con el Guardia— la carta que adivinas.' },
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['Tienes la 👸 Condesa (7) y el 🤴 Príncipe (5) en la mano.'],
      ask: {
        prompt: '¿Qué puedes jugar?',
        choices: [
          { label: 'La Condesa, a la fuerza', good: true, reply: 'Exacto: si tienes la Condesa junto al Rey o el Príncipe, la app te obliga a descartar la Condesa. Es la regla que delata (o disimula) tener una carta alta.' },
          { label: 'El Príncipe, para hacer descartar a alguien', reply: 'No te dejará: con Condesa + Rey/Príncipe, estás obligado a jugar la Condesa. La app bloquea la otra opción.' },
          { label: 'Cualquiera de las dos', reply: 'No: la Condesa es forzosa cuando la acompañan el Rey o el Príncipe. Solo podrás jugar la Condesa.' },
        ],
      },
    },
    {
      icon: '💗',
      title: 'Cuidado con la Princesa',
      text: [
        'La Princesa (8) es la más alta, pero si la descartas por lo que sea —jugándola, o forzado por un Príncipe— quedas fuera de la ronda al instante.',
        'El Sacerdote te deja ver la mano de alguien (solo tú lo ves); el Barón bate en duelo y elimina al de carta menor; la Doncella te hace intocable hasta tu próximo turno.',
      ],
      visual: { kind: 'log', lines: ['💂 Ana juega Guardia sobre Bea.', '❌ Bea queda fuera: el Guardia acierta que tenía Príncipe.', '🤴 Carlos juega Príncipe sobre David.', '❌ David queda fuera: el Príncipe le hace descartar la Princesa.'] },
    },
    {
      icon: '🏆',
      title: 'Ganar',
      text: [
        'La ronda acaba cuando queda uno en pie o se agota el mazo (gana la carta más alta). Cada ronda ganada suma un favor 💌.',
        'El primero en llegar a los favores necesarios (7 entre dos, 5 entre tres, 4 con cuatro o más) gana la partida. La app custodia todo: nadie ve tus cartas. 💌',
      ],
      visual: { kind: 'board', rows: [{ label: '👑 Ana', value: '💌💌💌💌' }, { label: 'Bea', value: '💌💌' }, { label: 'Carlos', value: '💌' }] },
    },
  ],
};
