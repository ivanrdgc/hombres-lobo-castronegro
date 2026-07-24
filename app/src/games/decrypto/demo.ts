// Tutorial de Decrypto: una transmisión de ejemplo continua, con quién actúa en
// cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'decrypto',
  name: 'Decrypto',
  emoji: '🔐',
  steps: [
    {
      icon: '🎯',
      title: 'La partida de ejemplo',
      text: [
        'Jugáis cuatro: TÚ y Bea en el equipo 🔴 rojo; Carlos y David en el 🔵 azul. Cada equipo tiene 4 palabras clave numeradas 1-4 que SOLO conocen los suyos.',
        'Cada ronda transmitís un código de 3 cifras a los vuestros con pistas… mientras el rival os escucha e intenta descifrarlo. Ganáis con 2 INTERCEPCIONES al rival; perdéis si os liais 2 veces con vuestro propio código.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ + Bea (🔴 rojo)', lines: ['Vuestras palabras:', '1 Sol · 2 Luna · 3 Río · 4 Mar'] },
          { title: 'Carlos + David (🔵 azul)', lines: ['Sus palabras (no las veis):', '1 Rey · 2 Pan · 3 Oro · 4 Sal'] },
        ],
      },
    },
    {
      icon: '🔐',
      title: 'Tu equipo transmite: el código',
      who: { actor: 'Bea (encriptadora 🔴) recibe un código secreto en su móvil y escribe 3 pistas', others: 'tú, Carlos y David esperáis: aún nadie ve el código, ni siquiera tú.' },
      text: [
        'La app le da a Bea el código 4-2-1. Debe dar una pista para su palabra 4 (Mar), otra para la 2 (Luna) y otra para la 1 (Sol), EN ESE ORDEN. Solo Bea ve el código.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Bea (encriptadora 🔴)', lines: ['Código secreto: 4 - 2 - 1', '4 Mar → «marea» · 2 Luna → «noche» · 1 Sol → «playa»'], buttons: [{ label: '💬 Dar las 3 pistas', kind: 'primary' }] },
          { title: 'TÚ (🔴, esperando)', lines: ['«🔐 Bea prepara las pistas de su código…»', 'Verás las pistas cuando las confirme.'] },
        ],
      },
    },
    {
      icon: '🕵️',
      title: 'El rival intenta interceptar',
      who: { actor: 'Carlos y David (🔵) oyen las pistas «marea, noche, playa» e intentan adivinar el orden', others: 'tú y Bea calláis: no podéis ayudar ni corregir.' },
      text: [
        'Desde la 2.ª transmisión de un equipo, el rival puede INTERCEPTAR: con las pistas de hoy (y las de rondas anteriores) intenta reconstruir qué cifra va con cada pista. Uno del azul registra su intento.',
        'Si aciertan el código entero, se llevan una ficha de intercepción. Por eso las pistas obvias son peligrosas.',
      ],
    },
    {
      icon: '🤔',
      title: 'Tu equipo descifra',
      who: { actor: 'TÚ (🔴, no eres la encriptadora) registras el código que crees', others: 'Bea mira en silencio: ya no puede intervenir.' },
      text: ['Bea (que conoce vuestras palabras) dijo «marea, noche, playa». Tus palabras son 1 Sol · 2 Luna · 3 Río · 4 Mar.'],
      ask: {
        prompt: '¿Qué código registras?',
        choices: [
          { label: '4-2-1 (Mar, Luna, Sol)', good: true, reply: '¡Exacto! «marea»→Mar (4), «noche»→Luna (2), «playa»→Sol (1). Comunicación limpia: ni error para vosotros ni pista fácil para el rival.' },
          { label: '1-2-4 (Sol, Luna, Mar)', reply: 'Ojo al ORDEN: las pistas van en el orden del código, no del 1 al 4. «marea» es la primera pista → primera cifra. Falla y os lleváis un error de comunicación.' },
          { label: 'Le pregunto a Bea cuál era', reply: 'No puede decíroslo: la encriptadora calla tras dar las pistas. Solo tenéis sus tres pistas para deducir.' },
        ],
      },
    },
    {
      icon: '📻',
      title: 'Se destapa y se reparten fichas',
      who: { actor: 'La app revela el código real (4-2-1) y reparte las fichas', others: 'cualquiera pulsa «▶️ Siguiente transmisión»: ahora transmite el equipo azul.' },
      text: [
        'Si tu equipo acertó, ningún error; si el rival acertó, se lleva su intercepción. El código y las pistas quedan en el historial: el rival os conocerá mejor cada ronda (y vosotros a ellos).',
        'Luego transmite el azul, con las mismas fases. Cada ronda, ambos equipos transmiten una vez.',
      ],
      visual: { kind: 'log', lines: ['💬 El equipo rojo ha dado sus 3 pistas.', '🕵️ El equipo azul intenta interceptar.', '✅ El equipo rojo descifró su código (4-2-1).', '🔒 El equipo azul no logró interceptar.'] },
    },
    {
      icon: '🏆',
      title: 'Ganar',
      who: { actor: 'La app lleva las fichas y corta la partida al llegar a 2', others: 'todos veis el marcador arriba en todo momento.' },
      text: [
        'Gana el equipo que logre 2 INTERCEPCIONES; pierde el que acumule 2 ERRORES propios. El arte está en dar pistas que los tuyos pillen al vuelo pero despisten al rival.',
        'Cuanto más avanza la partida, más difícil: el enemigo ya ha oído muchas pistas de tus palabras. 🔐',
      ],
      visual: { kind: 'board', rows: [{ label: '🔴 Rojo', value: '1 🕵️ · 0 ❌' }, { label: '🔵 Azul', value: '0 🕵️ · 1 ❌' }] },
    },
  ],
};
