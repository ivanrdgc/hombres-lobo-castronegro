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
        'El mazo son 16 cartas y sabes exactamente cuáles: 5 Guardias, 2 Sacerdotes, 2 Barones, 2 Doncellas, 2 Príncipes y una sola de Rey, Condesa y Princesa. Deducir es contar las que ya han salido.',
      ],
      visual: { kind: 'board', rows: [{ label: '🎴 Tu mano', value: '1 carta (secreta)' }, { label: '🃏 Mazo', value: '16 cartas, boca abajo' }, { label: '💌 Favores para ganar', value: '5 (con 3 jugadores)' }] },
    },
    {
      icon: '🃏',
      title: 'Las cartas, de un vistazo',
      text: [
        'Cuanto más alto el número, más fuerte la carta (y más te delata). 💂 Guardia (1, cinco copias): adivina la carta de otro. ⛪ Sacerdote (2, dos): mírala en secreto. 🎩 Barón (3, dos): duelo, cae el menor. 🛡️ Doncella (4, dos): te protege un turno.',
        '🤴 Príncipe (5, dos): fuerza a alguien (o a ti) a descartar y robar. 👑 Rey (6, una): intercambia manos. 👸 Condesa (7, una): sin efecto, pero OBLIGATORIA si la tienes con Rey o Príncipe. 💗 Princesa (8, una): si la descartas, quedas fuera.',
        'No hace falta memorizarlas: la app te enseña qué hace cada una al elegirla, y el botón flotante 🎴 (abajo a la derecha) tiene siempre a mano tu carta, la lista de las 8 con sus copias y cuántas quedan en el mazo.',
      ],
    },
    {
      icon: '🎴',
      title: 'Turno de Bea (mientras, tú esperas)',
      who: { actor: 'Bea roba su 2.ª carta y elige cuál jugar, todo en su móvil', others: 'tú y Carlos solo veis QUÉ carta descarta al final, nunca la que se queda.' },
      text: [
        'Bea juega 💂 Guardia sobre Carlos y adivina «Barón». La app resuelve al momento, a la vista de todos: ¡acierta! Carlos queda fuera de la ronda.',
        'Fuera de la RONDA, no de la partida: Carlos deja de jugar durante un par de minutos, y en la siguiente ronda se reparte otra vez a todos. Nadie se queda mirando el resto de la noche.',
        'Fíjate en la fila de jugadores: los descartes son públicos y se ven ENTEROS (memoria de lo que ya salió), pero las manos jamás se ven.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Bea (su turno)', lines: ['Paso 1 · sus dos cartas con el efecto entero: 💂 Guardia (1) o 🛡️ Doncella (4)', 'Paso 2 · toca el Guardia → ¿a quién? Carlos → ¿qué carta tiene? Barón'], buttons: [{ label: '▶️ Jugar 💂 Guardia sobre Carlos', kind: 'primary' }] },
          { title: 'TÚ (esperando)', lines: ['«🎴 Turno de Bea…»', 'Tu carta sigue en tu mano, tapada: toca «👁 Ver mi carta» para mirarla.', 'Ves en el diario: «❌ Carlos queda fuera: el Guardia acierta…»'] },
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
      title: 'Los efectos delicados (tres ejemplos sueltos)',
      who: { actor: 'Cada efecto lo resuelve la app al instante', others: 'lo público va al diario; lo privado (el vistazo del Sacerdote o el duelo del Barón) solo lo ven quienes miraron.' },
      text: [
        'Estos tres no pasan seguidos ni en la ronda de antes: son tres ejemplos sueltos de los efectos que más dudas dan.',
        'Doncella: nadie puede elegirte hasta tu próximo turno (si todos están protegidos, la carta se juega sin efecto… salvo el Príncipe, que te obliga a apuntarte a ti mismo). Sacerdote: SOLO tú ves la carta espiada, y el aviso espera a que pulses «Entendido».',
        'Barón: los dos duelistas se enseñan la carta entre ellos, pero el diario solo canta la del PERDEDOR. Príncipe sobre alguien con la 💗 Princesa: la descarta… y queda fuera de la ronda. Y el Guardia nunca puede adivinar «Guardia».',
      ],
      visual: { kind: 'log', lines: ['🛡️ Nadie puede señalar a Bea hasta su próximo turno.', '🔍 Tú miras en secreto la mano de Bea. (Solo tú ves cuál es.)', '❌ Carlos queda fuera de la ronda: pierde el duelo del Barón con 💂 Guardia.'] },
    },
    {
      icon: '🏆',
      title: 'Fin de ronda y favores',
      who: { actor: 'La app cierra la ronda y reparte el favor 💌', others: 'cualquiera pulsa «▶️ Siguiente ronda»; empieza quien ganó.' },
      text: [
        'La ronda acaba cuando queda uno en pie… o cuando se agota el mazo: entonces todos enseñan su carta y gana la más alta (por eso retener una alta vale oro… y arriesga). Si dos empatan, gana quien tenga la mayor suma de descartes.',
        'Y empieza la siguiente ronda: se baraja todo otra vez y vuelven TODOS, también los que quedaron fuera. Quien ganó la ronda es quien sale primero.',
        'Favores para la partida: 7 entre dos, 5 entre tres, 4 con cuatro y 3 con cinco o seis. La app baraja, custodia y resuelve; tú solo juega y desconfía. 💌',
      ],
      visual: { kind: 'board', rows: [{ label: '👑 TÚ', value: '💌💌' }, { label: 'Bea', value: '💌' }, { label: 'Carlos', value: '—' }] },
    },
  ],
};
