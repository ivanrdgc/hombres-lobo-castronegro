// Tutorial de Captain Sonar: una partida de ejemplo continua, con quién actúa
// en cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'sonar',
  name: 'Captain Sonar',
  emoji: '⚓',
  steps: [
    {
      icon: '🎯',
      title: 'La partida de ejemplo',
      text: [
        'Jugáis 2 contra 2: TÚ y Bea tripuláis el submarino 🔴 Rojo; Carlos y David, el 🔵 Azul. Cada tripulación se sienta en su corro, con sus móviles.',
        'Los dos submarinos parten de posiciones SECRETAS en el mismo mapa de 8×8 con islas. Objetivo: dejar al rival sin casco (3 ❤️) antes de que os hunda él.',
      ],
    },
    {
      icon: '🗺️',
      title: 'Tu mapa (solo de tu tripulación)',
      who: { actor: 'TÚ y Bea veis vuestro mapa con el 🔴 en D6', others: 'Carlos y David ven SU mapa con el 🔵… y de vosotros, nada.' },
      text: [
        'La vida ❤️ y la energía ⚡ de ambos submarinos son públicas (arriba). Lo secreto es DÓNDE está cada uno… de momento.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (tripulación Roja)', lines: ['🗺️ Tu mapa: 🔴 en D6, islas ⛰️', '🎧 Rumbos del rival: (aún nada)'] },
          { title: 'Carlos (tripulación Azul)', lines: ['🗺️ Su mapa: 🔵 en G3', 'De tu submarino no ve NADA.'] },
        ],
      },
    },
    {
      icon: '🧭',
      title: 'Turno Rojo: navegar se ANUNCIA',
      who: { actor: 'CUALQUIERA de tu tripulación pulsa la acción (decidid juntos)', others: 'la voz canta «El Rojo navega al Norte»: el rival lo apunta.' },
      text: [
        'Navegáis al Norte: +1 ⚡ y una casilla más de estela. Ese anuncio es el corazón del juego: el rival colecciona vuestros rumbos (⬆️⬇️⬅️➡️) e intenta reconstruir la ruta.',
        'Prohibido pisar islas, salirse del mapa o cruzar vuestra propia estela.',
      ],
      visual: { kind: 'log', lines: ['🧭 🔴 el submarino Rojo navega al Norte. (+1 de energía)', '🧭 🔵 el submarino Azul navega al Oeste. (+1 de energía)'] },
    },
    {
      icon: '🎧',
      title: 'Triangular: su tira de rumbos',
      who: { actor: 'TÚ estudias la tira del Azul: ⬅️⬅️⬇️', others: 'ellos hacen lo mismo con la vuestra.' },
      text: ['El Azul lleva ⬅️⬅️⬇️. Pruebas rutas posibles: desde G3 encaja (G3→F3→E3→E4); desde B2 se saldría del mapa. Las islas y los bordes descartan orígenes: cada anuncio os acerca.'],
      ask: {
        prompt: 'Con dudas entre dos rutas posibles del Azul, ¿qué hacéis?',
        choices: [
          { label: '🛰️ Dron (2 ⚡): que cante su cuadrante', good: true, reply: 'Eso es: el dron dice EN ALTO en cuál de los 4 cuadrantes está. Con la tira de rumbos + el cuadrante, sus rutas posibles se desploman.' },
          { label: '🚀 Torpedo a una de las dos rutas, a suerte', reply: 'Caro (3 ⚡) y a moneda: si falla, encima LES dices dónde miráis. El torpedo se dispara cuando la posición encaja, no para tantear.' },
          { label: '🧭 Seguir navegando y cargando', good: true, reply: 'También razonable: más ⚡ para el golpe. Pero ojo: cada rumbo vuestro también les informa a ellos.' },
        ],
      },
    },
    {
      icon: '🤫',
      title: 'Turno Azul: silencio y emerger',
      who: { actor: 'Carlos y David gastan 3 ⚡ en «Silencio»', others: 'vuestra tira solo muestra 🤫: rumbo desconocido.' },
      text: [
        'El Silencio rompe la triangulación: se mueven sin anunciar rumbo. Y cuando una estela encierra a un submarino, le toca ⏫ EMERGER: borra su estela… pero canta su cuadrante.',
      ],
      visual: { kind: 'log', lines: ['🤫 🔵 el submarino Azul maniobra en silencio: rumbo desconocido.', '⏫ 🔴 el submarino Rojo emerge en el cuadrante Suroeste y borra su estela.'] },
    },
    {
      icon: '🚀',
      title: 'El torpedo',
      who: { actor: 'Vuestra tripulación (3 ⚡) toca la casilla F4 en el mapa', others: 'todos oyen el disparo y el resultado.' },
      text: [
        'Alcance: distancia 4. Impacto directo: 2 de daño; casillas pegadas: 1. ¡Cuidado: la onda también os daña a vosotros si disparáis demasiado cerca!',
        'Hasta el agua informa: un fallo dice al rival dónde creéis que está… y a vosotros, dónde NO está.',
      ],
      visual: { kind: 'log', lines: ['🚀 Torpedo de 🔴 el submarino Rojo contra F4: ¡IMPACTO DIRECTO a 🔵 el submarino Azul! (2 de daño, le quedan 1).'] },
    },
    {
      icon: '🏆',
      title: 'El final',
      who: { actor: 'Quien deja al rival a 0 ❤️ gana en el acto', others: 'la app revela entonces las posiciones de los dos submarinos.' },
      text: [
        'Otro torpedo y el Azul se hunde: ¡victoria de vuestra tripulación! Si os hundís con vuestra propia onda, la victoria es suya.',
        'Consejo de a bordo: decidid en voz baja (¡el rival está en la misma sala!), y consultad el 🎴 para costes y reglas. ⚓',
      ],
      visual: { kind: 'log', lines: ['🚀 Torpedo de 🔴 el submarino Rojo contra E4: ¡IMPACTO DIRECTO a 🔵 el submarino Azul! (2 de daño, le quedan 0).', '🏆 ¡Gana 🔴 el submarino Rojo! 🔵 el submarino Azul se hunde.', '📍 Posiciones finales: Rojo en D3, Azul en E4.'] },
    },
  ],
};
