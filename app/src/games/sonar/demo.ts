// Tutorial de Captain Sonar: una partida de ejemplo continua, con quién actúa
// en cada momento y qué ve cada pantalla. Las casillas del ejemplo son REALES
// (ninguna cae en isla ni se sale del mapa): quien siga el tutorial con el mapa
// delante puede rehacer la triangulación paso a paso.
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
        'Los dos submarinos parten de posiciones SECRETAS en el mismo mapa de 8×8 con islas. Objetivo: dejar al rival sin casco (aguanta 3 puntos de vida ❤️) antes de que os hunda él.',
      ],
    },
    {
      icon: '🗺️',
      title: 'Tu mapa (solo de tu tripulación)',
      who: { actor: 'TÚ y Bea veis vuestro mapa con vuestro submarino rojo 🔴 en D6', others: 'Carlos y David ven SU mapa con el submarino azul 🔵… y del vuestro, nada.' },
      text: [
        'La vida ❤️ y la energía ⚡ de ambos submarinos son públicas (arriba). Lo secreto es DÓNDE está cada uno: ni vosotros veis su casilla ni ellos la vuestra.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (tripulación Roja)', lines: ['🗺️ Vuestro mapa: 🔴 en D6, islas ⛰️', '🎧 Su tira de rumbos: (aún nada)'] },
          { title: 'Carlos (tripulación Azul)', lines: ['🗺️ Su mapa: 🔵 en una casilla que tú NO ves', 'De tu submarino no ve NADA.'] },
        ],
      },
    },
    {
      icon: '🧭',
      title: 'Turno Rojo: navegar se ANUNCIA',
      who: { actor: 'CUALQUIERA de tu tripulación pulsa la acción (decidid juntos)', others: 'la voz canta «el submarino Rojo navega al Este»: el rival lo apunta.' },
      text: [
        'Navegáis al Este: +1 de energía ⚡ y una casilla más de estela. Ese anuncio es el corazón del juego: el rival colecciona vuestros rumbos (⬆️⬇️⬅️➡️) e intenta reconstruir la ruta.',
        'Se juega por turnos alternos y con UNA acción por turno: en cuanto pulsáis, le toca al otro submarino. Prohibido pisar islas, salirse del mapa o cruzar vuestra propia estela.',
      ],
      visual: { kind: 'log', lines: ['🧭 El submarino Rojo 🔴 navega al Este. (+1 de energía ⚡)', '🧭 El submarino Azul 🔵 navega al Oeste. (+1 de energía ⚡)'] },
    },
    {
      icon: '⚡',
      title: 'Sistemas y energía',
      who: { actor: 'La tripulación de turno elige UNA acción: navegar o gastar en un sistema', others: 'los demás miran el marcador: vida y energía de los dos submarinos son públicas.' },
      text: [
        'Navegar es la ÚNICA forma de cargar energía: +1 de energía ⚡ por casilla, con tope de 6 de energía ⚡. Los sistemas solo gastan, así que cada disparo se paga con turnos de navegación… y con rumbos cantados.',
        'Otro dato de oro: cada submarino empezó en las 3 columnas de su lado (el Rojo en la A, la B o la C; el Azul en la F, la G o la H). Eso deja poco más de 20 puntos de partida posibles en vez de 56.',
        'Coged papel y boli… o usad el CUADERNO DE SONAR que sale bajo la tira de rumbos: un mapa en blanco donde con un toque marcáis una casilla como descartada ❌ y con otro como candidata ⭕. Solo lo ve vuestro móvil.',
      ],
      visual: {
        kind: 'board',
        rows: [
          { label: '🧭 Navegar', value: '+1 ⚡ (única carga)' },
          { label: '🚀 Torpedo', value: '3 ⚡' },
          { label: '🛰️ Dron', value: '2 ⚡' },
          { label: '🤫 Silencio', value: '3 ⚡ · 1 o 2 casillas' },
          { label: '⏫ Emerger', value: 'gratis · borra la estela' },
          { label: '🔋 Tope de energía', value: '6 ⚡' },
        ],
      },
    },
    {
      icon: '🎧',
      title: 'Triangular: su tira de rumbos',
      who: { actor: 'TÚ estudias la tira del Azul: Oeste, Oeste, Sur ⬅️⬅️⬇️', others: 'ellos hacen lo mismo con la vuestra.' },
      text: [
        'El Azul lleva Oeste, Oeste, Sur ⬅️⬅️⬇️, y salió de su tercio: la F, la G o la H. Probáis tres puntos de partida y solo uno aguanta.',
        'Desde H4 la ruta encaja: H4, G4, F4 y F5, todo agua. G3 es isla, así que nadie pudo empezar ahí. Y desde G8 el último Sur se saldría del mapa. Conclusión: el Azul estaría en F5.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Su tira de rumbos', lines: ['🎧 El Azul ha cantado: ⬅️ ⬅️ ⬇️', '🔵 Empezó en la F, la G o la H'] },
          { title: 'Vuestro cuaderno de sonar', lines: ['✅ H4 → G4 → F4 → F5 (encaja)', '❌ G3: es isla, nadie empieza ahí', '❌ G8 → F8 → E8 → ⬇️ se sale del mapa'] },
        ],
      },
      ask: {
        prompt: 'Solo H4 aguanta: el Azul estaría en F5. ¿Qué hacéis?',
        choices: [
          { label: '🛰️ Dron (2 ⚡): que cante su cuadrante', good: true, reply: 'Buena: el dron dice EN ALTO en cuál de los 4 cuadrantes está. Si confirma el Sureste, vuestra deducción se sostiene y el torpedo va casi a tiro hecho.' },
          { label: '🚀 Torpedo a F5', good: true, reply: 'También: para eso habéis triangulado. Con 3 de energía y la casilla a tiro, se dispara. Ojo a la onda: no lancéis a menos de 2 casillas de vuestro casco.' },
          { label: '🧭 Seguir navegando y no gastar', reply: 'Cada turno que pasa ellos se mueven y vosotros les cantáis un rumbo más: la ventaja que acabáis de ganar se evapora.' },
        ],
      },
    },
    {
      icon: '🤫',
      title: 'Turno Azul: silencio y emerger',
      who: { actor: 'Carlos y David gastan 3 de energía ⚡ en «Silencio»', others: 'vuestra tira solo muestra el símbolo del silencio 🤫: rumbo desconocido.' },
      text: [
        'El Silencio rompe la triangulación: se mueven 1 o 2 casillas en línea recta sin anunciar el rumbo, así que vuestra deducción («está en F5») se queda coja y hay que rehacerla.',
        'Y cuando la propia estela encierra a un submarino, le toca ⏫ EMERGER: borra su estela y vuelve a maniobrar… a cambio de cantar su cuadrante.',
      ],
      visual: { kind: 'log', lines: ['🤫 El submarino Azul 🔵 maniobra en silencio: rumbo desconocido (1 o 2 casillas).', '⏫ El submarino Rojo 🔴 emerge en el cuadrante Suroeste y borra su estela.'] },
    },
    {
      icon: '🚀',
      title: 'El torpedo',
      who: { actor: 'Vuestra tripulación (con 3 de energía ⚡) toca la casilla E5 en el mapa', others: 'todos oyen el disparo y el resultado.' },
      text: [
        'Alcance: 4 casillas o menos contando en línea recta, sin diagonales (moverse en diagonal cuenta 2). Impacto directo en la casilla elegida: 2 de daño; en las 8 que la rodean, diagonales incluidas: 1 de daño.',
        'Esa onda también alcanza a quien dispara. Estáis en D7 y E5 os queda a 3 casillas de recorrido y a 2 de vuestro casco: se puede disparar sin quemarse. Apuntáis sobre vuestro mapa de siempre: se marcan las casillas a tiro y, avisadas en ámbar, las que os quitarían vida también a vosotros.',
        'Hasta el agua informa: un fallo dice al rival dónde creéis que está… y a vosotros, dónde NO está.',
      ],
      visual: { kind: 'log', lines: ['🚀 Torpedo del submarino Rojo 🔴 contra E5: ¡IMPACTO DIRECTO en el submarino Azul 🔵! (2 de daño, le quedan 1).'] },
    },
    {
      icon: '🏆',
      title: 'El final',
      who: { actor: 'Quien deja al rival a 0 ❤️ gana en el acto', others: 'la app revela entonces las posiciones de los dos submarinos.' },
      text: [
        'Otro torpedo y el Azul se hunde: ¡victoria de vuestra tripulación, +1 punto para cada tripulante y el marcador se acumula! Si os hundís con vuestra propia onda, la victoria es suya… aunque el mismo disparo hunda a los dos.',
        // En un juego de EQUIPO la pastilla flotante es «📖 Reglas» y no hay
        // ninguna «carta» que consultar (B34 · un nombre por cosa).
        'Consejo de a bordo: decidid en voz baja (¡el rival está en la misma sala!), y abrid las reglas 📖 (abajo a la derecha) para los costes y el alcance. ⚓',
      ],
      visual: { kind: 'log', lines: ['🚀 Torpedo del submarino Rojo 🔴 contra D4: ¡IMPACTO DIRECTO en el submarino Azul 🔵! (2 de daño, le quedan 0).', '🏆 ¡Gana el submarino Rojo 🔴! El submarino Azul 🔵 se hunde.', '📍 Posiciones finales: Rojo en C6, Azul en D4.'] },
    },
  ],
};
