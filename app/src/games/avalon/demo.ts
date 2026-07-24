// Tutorial de Ávalon: una misión de ejemplo continua, con quién actúa en cada
// momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'avalon',
  name: 'Ávalon',
  emoji: '🏰',
  steps: [
    {
      icon: '🎯',
      title: 'La partida de ejemplo',
      text: [
        'Jugáis cinco: TÚ, Bea, Carlos, David y Eva. Sois caballeros de Arturo… pero DOS sois en secreto esbirros de Mordred.',
        'Se juegan hasta CINCO misiones: el Bien gana con tres éxitos; el Mal, con tres fracasos (o si se rechazan cinco propuestas seguidas). Y aunque el Bien logre sus tres… aún queda el Asesino.',
      ],
      visual: { kind: 'board', rows: [{ label: '⚔️ Misiones', value: 'M1 · M2 · M3 · M4 · M5' }, { label: '😇 Bien', value: '3 de 5' }, { label: '😈 Mal (oculto)', value: '2 de 5' }] },
    },
    {
      icon: '🎴',
      title: 'El reparto: cada uno sabe algo distinto',
      who: { actor: 'TODOS miráis vuestra carta a la vez y confirmáis', others: 'nadie enseña la pantalla: lo que sabes tú no lo sabe nadie más.' },
      text: [
        'A ti te toca 🧙 MERLÍN: ves quiénes son los malvados (pero no cuál es cuál… y a Mordred no lo verías). Los malvados se ven entre sí; los leales no saben nada.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (Merlín)', lines: ['🧙 Eres Merlín', 'Ves a los secuaces de Mordred: Bea y Eva.', 'Guía al Bien… sin que se note que lo sabes.'] },
          { title: 'Carlos (leal, tú no lo ves)', lines: ['🤴 Leal Servidor de Arturo', 'No sabe nada de nadie: deduce por votos y misiones.'] },
        ],
      },
    },
    {
      icon: '🧭',
      title: 'Misión 1 · El líder propone',
      who: { actor: 'David (líder de turno) elige el equipo en su móvil', others: 'los demás veis a quién va proponiendo y os preparáis para votar.' },
      text: [
        'El liderazgo rota en cada propuesta. La app le dice a David cuántos van (2 en la misión 1 con cinco jugadores): elige a Bea y a Eva y pulsa «⚔️ Proponer». Puede incluirse a sí mismo.',
        'Tú (Merlín) tuerces el gesto por dentro: ¡son las dos malvadas!',
      ],
      visual: { kind: 'chips', chips: [{ name: 'David', badge: 'líder' }, { name: 'Bea', hl: true, badge: 'propuesta' }, { name: 'Eva', hl: true, badge: 'propuesta' }, { name: 'TÚ' }, { name: 'Carlos' }], caption: 'El equipo propuesto, a la vista de todos.' },
    },
    {
      icon: '🤔',
      title: 'Misión 1 · Todos votan (tú también)',
      who: { actor: 'TODOS votáis en secreto 👍 Aprobar o 👎 Rechazar', others: 'la app destapa los votos A LA VEZ y son públicos: se ve quién votó qué.' },
      text: ['Eres Merlín y SABES que el equipo propuesto son las dos malvadas.'],
      ask: {
        prompt: '¿Cómo votas?',
        choices: [
          { label: '👎 Rechazo, y en el debate siembro dudas con argumentos «normales»', good: true, reply: 'Así juega Merlín: influye sin explicar demasiado bien por qué. Si aciertas SIEMPRE a la primera, el Asesino te encontrará al final.' },
          { label: '👎 Rechazo y digo en alto «¡son las malvadas, lo sé!»', reply: 'Salvarás la misión… y firmarás tu sentencia: al Asesino le basta escuchar quién lo sabía todo. Perder por asesinato de Merlín es la derrota más tonta del Bien.' },
          { label: '👍 Apruebo para no señalarme', reply: 'Tan invisible que inútil: dos sabotajes de una tacada. Merlín debe influir, solo que con sordina. ⚠️ Y recuerda: cinco rechazos seguidos dan la victoria al Mal.' },
        ],
      },
    },
    {
      icon: '⚔️',
      title: 'Misión 1 · El equipo actúa en secreto',
      who: { actor: 'Solo Bea y Eva (equipo aprobado) eligen carta en su móvil', others: 'el resto esperáis: la app solo anunciará CUÁNTOS sabotajes hubo, nunca de quién.' },
      text: [
        'Supón que la propuesta salió aprobada (3 a 2). Cada miembro juega ÉXITO o FRACASO en secreto; los del Bien ni siquiera tienen el botón rojo (la app no les deja sabotear).',
        'Resultado: «💥 Misión 1: FRACASO (1 sabotaje)». ¿Quién de las dos fue? Ese es el juego. Tras leerlo, cualquiera pulsa «▶️ Continuar».',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Bea (en la misión)', lines: ['Elige en secreto:'], buttons: [{ label: '✅ Éxito', kind: 'primary' }, { label: '💥 Fracaso', kind: 'danger' }] },
          { title: 'TÚ (fuera de la misión)', lines: ['«⚔️ El equipo parte a la misión 1…»', 'Esperas el resultado, sin ver nada más.'] },
        ],
      },
    },
    {
      icon: '🗡️',
      title: 'El final: el Asesino busca a Merlín',
      who: { actor: 'Si el Bien logra 3 éxitos, el ASESINO elige a su blanco en su móvil', others: 'todos veis a quién señala; si acierta contigo (Merlín), el Mal roba la partida.' },
      text: [
        'Por eso Merlín susurra en vez de gritar, y por eso existe Percival (rol opcional): ve a Merlín y a Morgana sin distinguirlos, y su papel es desviar las sospechas.',
        'Roles opcionales en el lobby: Percival, Morgana, Mordred y Oberón. Merlín y el Asesino siempre juegan. 🏰',
      ],
      visual: { kind: 'log', lines: ['🗡️ El Bien ha completado tres misiones… pero el Asesino aún puede cambiarlo todo: busca a Merlín.', '🗡️ El Asesino señaló a Carlos, que NO era Merlín: el Bien conserva la victoria.'] },
    },
  ],
};
