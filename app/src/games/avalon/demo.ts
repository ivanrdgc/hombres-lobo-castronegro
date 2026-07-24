// Tutorial de Ávalon: el flujo real de la app, paso a paso.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'avalon',
  name: 'Ávalon',
  emoji: '🏰',
  steps: [
    {
      icon: '🎯',
      title: 'Cinco misiones para el reino',
      text: [
        'Sois caballeros de Arturo… con esbirros de Mordred infiltrados. Se emprenden hasta CINCO misiones: el Bien gana con tres éxitos; el Mal, con tres fracasos (o si se rechazan cinco propuestas seguidas).',
        'Nadie hace de máster: la app reparte lealtades, cuenta votos y cartas en secreto y lo destapa todo a la vez.',
      ],
      visual: { kind: 'board', rows: [{ label: '⚔️ Misión 1', value: '✅' }, { label: '⚔️ Misión 2', value: '💥' }, { label: '⚔️ Misión 3', value: '✅' }, { label: '⚔️ Misión 4', value: '—' }, { label: '⚔️ Misión 5', value: '—' }] },
    },
    {
      icon: '🎴',
      title: 'Tu carta y lo que sabes',
      text: [
        'Mira tu carta a solas y confirma. Cada rol sabe cosas distintas: los malvados se ven entre sí (salvo Oberón); Merlín ve quiénes son los malvados (pero no ve a Mordred); Percival ve a Merlín y a Morgana sin distinguirlos; los leales no saben nada.',
      ],
      visual: { kind: 'card', emoji: '🧙', title: 'Eres MERLÍN', lines: ['Ves a los secuaces de Mordred: Bea, Eva.', 'Guía al Bien… sin que el Asesino te descubra.'] },
    },
    {
      icon: '🧭',
      title: 'Fase 1 · El líder propone',
      text: [
        'El liderazgo rota en cada propuesta. El líder elige en su móvil quiénes van a la misión (la app le dice cuántos tocan) y pulsa «⚔️ Proponer». Puede incluirse a sí mismo.',
      ],
      visual: { kind: 'chips', chips: [{ name: 'Ana', hl: true, badge: 'líder' }, { name: 'Bea', hl: true }, { name: 'Carlos' }, { name: 'David' }, { name: 'Eva' }], caption: 'Equipo propuesto: Ana y Bea. Ahora vota toda la mesa.' },
    },
    {
      icon: '🗳️',
      title: 'Fase 2 · Todos votan',
      text: [
        'TODA la mesa vota en secreto «👍 Aprobar» o «👎 Rechazar». La app destapa los votos A LA VEZ y son públicos: quién aprobó y quién no es oro para deducir. Después, cualquiera pulsa «▶️ Continuar».',
        'Mayoría a favor → el equipo parte. Empate o rechazo → el liderazgo pasa al siguiente. ⚠️ Cinco rechazos seguidos en la misma misión y gana el Mal.',
      ],
    },
    {
      icon: '⚔️',
      title: 'Fase 3 · La misión, en secreto',
      text: [
        'Solo el equipo aprobado actúa: cada miembro juega en secreto ÉXITO o FRACASO en su móvil. Los del Bien solo pueden jugar Éxito (la app no les deja otra); los del Mal eligen.',
        'La app anuncia solo CUÁNTOS sabotajes hubo, jamás de quién. Un solo fracaso hunde la misión (salvo la 4.ª con 7+ jugadores, que pide dos).',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '✅ Éxito', kind: 'primary' }, { label: '💥 Fracaso', kind: 'danger' }], caption: 'Esto solo lo ven los del equipo; el Bien no tiene el botón rojo.' },
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['Eres MERLÍN: sabes que Bea es malvada y acaban de proponerla para la misión 3.'],
      ask: {
        prompt: '¿Cómo lo juegas?',
        choices: [
          { label: 'Voto en contra y siembro dudas con argumentos «normales»', good: true, reply: 'Así juega Merlín: influye sin explicar demasiado bien por qué. Si aciertas siempre a la primera, el Asesino te encontrará al final.' },
          { label: 'Digo abiertamente «Bea es malvada, lo sé»', reply: 'Salvarás esta misión… y firmarás tu sentencia: al Asesino le basta con escuchar quién lo sabía todo. Perder por asesinato de Merlín es la derrota más tonta del Bien.' },
          { label: 'Callo y voto que sí para no señalarme', reply: 'Tan invisible que inútil: si Merlín nunca influye, el Bien juega a ciegas y el Mal solo necesita colarse en tres misiones.' },
        ],
      },
    },
    {
      icon: '🗡️',
      title: 'El final y el Asesino',
      text: [
        'Si el Bien llega a tres éxitos, no cantes victoria: el ASESINO señala a quien crea que es Merlín. Si acierta, el Mal roba la partida; si falla, gana el Bien.',
        'Por eso Percival existe: desviar las sospechas para proteger a Merlín. En el lobby puedes activar los roles opcionales (Percival, Morgana, Mordred, Oberón).',
      ],
      visual: { kind: 'log', lines: ['🗡️ El Bien ha completado tres misiones… pero el Asesino aún puede cambiarlo todo: busca a Merlín.', '🗡️ El Asesino señaló a David, que NO era Merlín: el Bien conserva la victoria.'] },
    },
  ],
};
