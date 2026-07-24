// Tutorial de El Camaleón: el flujo real de la app, paso a paso.
import type { DemoScript } from '../../shell/demo/types';

const WORDS = [
  'Tiburón', 'Arena', 'Faro', 'Medusa',
  'Socorrista', 'Marea', 'Coral', 'Velero',
  'Gaviota', 'Buceo', 'Isla', 'Puerto',
  'Ola', 'Cangrejo', 'Ancla', 'Naufragio',
];

export const DEMO: DemoScript = {
  id: 'chameleon',
  name: 'El Camaleón',
  emoji: '🦎',
  steps: [
    {
      icon: '🎯',
      title: 'Todos saben la palabra… menos uno',
      text: [
        'La app enseña a TODOS la misma rejilla de 16 palabras sobre un tema. Todos saben cuál es la SECRETA… menos el Camaleón, que solo ve la rejilla y tiene que fingir.',
        'El grupo gana si lo desenmascara (y él no adivina la palabra); el Camaleón gana si pasa desapercibido o si, pillado, la acierta.',
      ],
      visual: { kind: 'grid', words: WORDS, hl: 0 },
    },
    {
      icon: '🎴',
      title: 'Tu carta privada',
      text: [
        'Mira tu carta a solas y confirma: o te resalta la palabra secreta (eres del grupo), o te dice que eres el CAMALEÓN y no la conoces.',
        'La rejilla queda siempre a la vista de todos, sin resaltar nada: por eso el Camaleón puede disimular.',
      ],
      visual: { kind: 'card', emoji: '🦎', title: 'Eres el CAMALEÓN', lines: ['No conoces la palabra secreta.', 'Escucha las pistas, dedúcela y da una pista que cuele.'] },
    },
    {
      icon: '🗣️',
      title: 'Una pista por cabeza',
      text: [
        'Por turnos (empieza quien indique la app), cada uno dice EN VOZ ALTA una sola palabra relacionada con la secreta.',
        'Cuando todos han hablado, cualquiera pulsa «👉 Todos han dado su pista · a votar».',
      ],
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['La palabra secreta es «Tiburón» (tema: el mar) y te toca dar tu pista.'],
      ask: {
        prompt: '¿Qué dices?',
        choices: [
          { label: '«Aleta»', good: true, reply: 'Relacionada pero no evidente: los del grupo la entienden y el Camaleón sigue a ciegas. Ese es el punto dulce.' },
          { label: '«Escualo»', reply: 'Demasiado obvia: acabas de regalarle la palabra al Camaleón. Si lo pillan, adivinará y ganará igualmente.' },
          { label: '«Agua»', reply: 'Tan vaga que vale para media rejilla… y las pistas vagas son justo lo que hace el Camaleón: las sospechas caerán sobre ti.' },
        ],
      },
    },
    {
      icon: '👉',
      title: 'El voto (secreto)',
      text: [
        'Tras debatir, todos señalan a la vez en su móvil a su sospechoso (a ti mismo no). La app destapa el recuento.',
        'Si hay un más votado claro, queda señalado. Si hay EMPATE en cabeza, la mesa no se aclara… y el Camaleón escapa.',
      ],
    },
    {
      icon: '🎯',
      title: 'La última bala del Camaleón',
      text: [
        'Si el señalado ES el Camaleón, aún puede salvarse: la app le pide señalar en la rejilla la palabra que crea secreta. Si acierta, gana él; si falla, punto para todo el grupo.',
        'Puntos: Camaleón sin pillar +2 · pillado pero acierta +1 · pillado y falla, +1 a cada uno del grupo. Rondas rápidas: ¡encadenad varias!',
      ],
      visual: {
        kind: 'log',
        lines: ['🗳️ La mesa señala a Bea.', '🦎 ¡Bea era el Camaleón! Pero aún puede escapar si adivina la palabra…', '🦎 El Camaleón apuesta por «Medusa». La palabra era «Tiburón».', '👥 El grupo gana la ronda (+1 a cada uno).'],
      },
    },
  ],
};
