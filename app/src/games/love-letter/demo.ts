// Tutorial de Love Letter: una ronda de ejemplo continua, con quién actúa en
// cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'love_letter',
  name: 'Love Letter',
  emoji: '💌',
  steps: [
    {
      icon: '🎯',
      title: 'La ronda de ejemplo',
      text: [
        'Jugáis TÚ, Bea y Carlos. Cada uno tiene UNA carta secreta en la mano; el resto del mazo queda boca abajo (y una carta apartada que nadie verá).',
        'Se juega por turnos: en el tuyo, la app te da una segunda carta y eliges cuál de las dos jugar, aplicando su efecto. Ganas la ronda si quedas como último en pie o si, al agotarse el mazo, tu carta es la más alta. Cada ronda ganada da un favor 💌.',
      ],
      visual: { kind: 'board', rows: [{ label: '🎴 Tu mano', value: '1 carta (secreta)' }, { label: '🃏 Mazo', value: 'boca abajo' }, { label: '💌 Favores para ganar', value: '5 (siendo 3)' }] },
    },
    {
      icon: '🃏',
      title: 'Las cartas, de un vistazo',
      text: [
        'Cuanto más alto el número, más fuerte la carta (y más te delata). 💂 Guardia (1): adivina la carta de otro. ⛪ Sacerdote (2): mírala en secreto. 🎩 Barón (3): duelo, cae el menor. 🛡️ Doncella (4): te protege un turno.',
        '🤴 Príncipe (5): fuerza a alguien (o a ti) a descartar y robar. 👑 Rey (6): intercambia manos. 👸 Condesa (7): sin efecto, pero OBLIGATORIA si la tienes con Rey o Príncipe. 💗 Princesa (8): si la descartas, quedas fuera.',
        'No hace falta memorizarlas: la app te enseña qué hace cada una al elegirla.',
      ],
    },
    {
      icon: '🎴',
      title: 'Turno de Bea (mientras, tú esperas)',
      who: { actor: 'Bea roba su 2.ª carta y elige cuál jugar, todo en su móvil', others: 'tú y Carlos solo veis QUÉ carta descarta al final, nunca la que se queda.' },
      text: [
        'Bea juega 💂 Guardia sobre Carlos y adivina «Barón». La app resuelve al momento, a la vista de todos: ¡acierta! Carlos queda fuera de la ronda.',
        'Fíjate en la fila de jugadores: los descartes son públicos (memoria de lo que ya salió), pero las manos jamás se ven.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Bea (su turno)', lines: ['Mano: 💂 Guardia + 🛡️ Doncella', 'Elige: Guardia → ¿a quién? Carlos → ¿qué tiene? Barón'], buttons: [{ label: '▶️ Jugar Guardia', kind: 'primary' }] },
          { title: 'TÚ (esperando)', lines: ['«🎴 Turno de Bea…»', 'Tu carta sigue en tu mano: 👸 Condesa.', 'Ves en el diario: «❌ Carlos queda fuera: el Guardia acierta…»'] },
        ],
      },
    },
    {
      icon: '🤔',
      title: 'Tu turno: la Condesa manda',
      who: { actor: 'TÚ robas tu 2.ª carta y decides', others: 'Bea espera y toma nota de lo que descartes.' },
      text: ['Tenías la 👸 Condesa (7)… y robas el 🤴 Príncipe (5).'],
      ask: {
        prompt: '¿Qué juegas?',
        choices: [
          { label: 'La Condesa: la app me obliga', good: true, reply: 'Exacto: con la Condesa + Rey o Príncipe en la mano, la Condesa es FORZOSA (la app deshabilita la otra carta). Bea verá tu Condesa descartada y sospechará qué escondes…' },
          { label: 'El Príncipe, que tiene efecto', reply: 'La app no te dejará: el botón del Príncipe sale deshabilitado. La regla existe para que nadie retenga la Condesa junto a cartas altas «gratis».' },
          { label: 'Ninguna, paso mi turno', reply: 'En Love Letter no se pasa: cada turno se juega exactamente una carta. La app no ofrece esa opción.' },
        ],
      },
    },
    {
      icon: '🛡️',
      title: 'Los efectos delicados',
      who: { actor: 'Cada efecto lo resuelve la app al instante', others: 'lo público va al diario; lo privado (el vistazo del Sacerdote) solo lo ve quien miró.' },
      text: [
        'Doncella: nadie puede elegirte hasta tu próximo turno (si todos están protegidos, la carta se juega sin efecto). Sacerdote: SOLO tú ves la carta espiada (te sale una tarjeta privada con «Entendido»).',
        'Príncipe sobre alguien con la 💗 Princesa: la descarta… y queda fuera. Y el Guardia nunca puede adivinar «Guardia».',
      ],
      visual: { kind: 'log', lines: ['🛡️ Bea queda protegida hasta su próximo turno.', '🔍 Tú miras en secreto la mano de Bea. (Solo tú ves cuál es.)', '🤴 Bea descarta 💗 Princesa por el Príncipe… ❌ y queda fuera.'] },
    },
    {
      icon: '🏆',
      title: 'Fin de ronda y favores',
      who: { actor: 'La app cierra la ronda y reparte el favor 💌', others: 'cualquiera pulsa «▶️ Siguiente ronda»; empieza quien ganó.' },
      text: [
        'La ronda acaba cuando queda uno en pie… o cuando se agota el mazo: entonces todos comparan su carta y gana la más alta (por eso retener una alta vale oro… y arriesga).',
        'Favores para la partida: 7 entre dos, 5 entre tres, 4 con cuatro o más. La app baraja, custodia y resuelve; tú solo juega y desconfía. 💌',
      ],
      visual: { kind: 'board', rows: [{ label: '👑 TÚ', value: '💌💌' }, { label: 'Bea', value: '💌' }, { label: 'Carlos', value: '—' }] },
    },
  ],
};
