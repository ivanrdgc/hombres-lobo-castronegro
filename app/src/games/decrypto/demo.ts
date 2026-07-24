// Tutorial de Decrypto: una transmisión de ejemplo continua, con quién actúa en
// cada momento y qué ve cada pantalla. El ejemplo transcurre en la RONDA 2 —la
// primera en la que el rival ya puede interceptar—, para que lo que se explica
// y lo que se enseña no se contradigan.
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
        'Jugáis cuatro: TÚ y Bea en el equipo 🔴 rojo; Carlos y David en el 🔵 azul. Cada equipo tiene 4 palabras clave numeradas del 1 al 4 que SOLO conocen los suyos.',
        'Cada ronda transmitís un código de 3 cifras a los vuestros con pistas… mientras el rival os escucha e intenta descifrarlo. Ganáis con 2 INTERCEPCIONES al rival; perdéis si os liais 2 veces con vuestro propio código.',
        'No hay que memorizar nada: tus 4 palabras están siempre a mano en el botón flotante de la carta (🎴), abajo a la derecha, y también en el panel de tu equipo.',
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
      who: { actor: 'Bea (encriptadora del equipo rojo 🔴) recibe un código secreto en su móvil y escribe 3 pistas', others: 'tú, Carlos y David esperáis: aún nadie ve el código, ni siquiera tú.' },
      text: [
        'Vais por la ronda 2. En la 1 Bea ya transmitió: dijo «gaviota, amanecer, caudal» y el azul lo oyó todo.',
        'Ahora la app le da a Bea el código 4-2-1. Debe dar una pista para su palabra 4 (Mar), otra para la 2 (Luna) y otra para la 1 (Sol), EN ESE ORDEN. Solo Bea ve el código.',
        'La pista nunca puede ser la propia palabra clave ni un derivado suyo: para «Mar» no vale «mar» ni «marino».',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Bea (encriptadora)', lines: ['Código secreto: 4 - 2 - 1', '4 Mar → «marea» · 2 Luna → «noche» · 1 Sol → «playa»'], buttons: [{ label: '💬 Dar las 3 pistas', kind: 'primary' }] },
          { title: 'TÚ (🔴, esperando)', lines: ['«🔐 Bea prepara las pistas de su código…»', 'Verás las pistas cuando las confirme.'] },
        ],
      },
    },
    {
      icon: '🕵️',
      title: 'El rival intenta interceptar',
      who: { actor: 'Carlos y David (🔵) oyen las pistas «marea, noche, playa» e intentan adivinar el orden', others: 'tú y Bea calláis: no podéis ayudar ni corregir.' },
      text: [
        'Desde la segunda transmisión de un equipo, el rival puede INTERCEPTAR: con las pistas de hoy y las de rondas anteriores intenta reconstruir qué cifra va con cada pista. Por eso ahora, en la ronda 2, el azul ya juega.',
        'La pantalla les pone una fila por pista: eligen a qué número apunta cada una. Si aciertan el código entero, se llevan una ficha de intercepción. Por eso las pistas obvias son peligrosas.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Carlos (🔵 azul)', lines: ['1.ª pista «marea» → palabra nº _', '2.ª pista «noche» → palabra nº _', '3.ª pista «playa» → palabra nº _'], buttons: [{ label: '🕵️ Registrar intercepción', kind: 'primary' }] },
          { title: 'TÚ (🔴, en silencio)', lines: ['«🤫 Callad: el azul delibera su intercepción.»', 'Vosotros descifraréis después.'] },
        ],
      },
    },
    {
      icon: '🤔',
      title: 'Tu equipo descifra',
      who: { actor: 'TÚ (del equipo rojo 🔴, no eres la encriptadora) registras el código que crees', others: 'Bea mira en silencio: ya no puede intervenir.' },
      text: ['Bea (que conoce vuestras palabras) dijo «marea, noche, playa». Tus palabras son 1 Sol · 2 Luna · 3 Río · 4 Mar, y los botones las llevan escritas.'],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (🔴 rojo)', lines: ['1.ª pista «marea» → palabra nº', '[1 Sol] [2 Luna] [3 Río] [4 Mar]'], buttons: [{ label: '🔓 Registrar descifrado', kind: 'primary' }] },
          { title: 'Bea (encriptadora)', lines: ['«🤫 Tú diste las pistas: ahora calla.»', 'No puede corregir ni hacer señas.'] },
        ],
      },
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
        'Si tu equipo acertó, ningún error; si el rival acertó, se lleva su intercepción. El código y las pistas quedan en la hoja de pistas, a la vista de todos.',
        'Luego transmite el azul, con las mismas fases. Cada ronda, ambos equipos transmiten una vez.',
      ],
      visual: { kind: 'log', lines: ['💬 Pistas del rojo: marea, noche, playa.', '🕵️ El azul ya ha registrado su intercepción.', '✅ El rojo descifró su código (4-2-1).', '🔒 El azul apostó 2-4-1: no interceptó.'] },
    },
    {
      icon: '🧠',
      title: 'La hoja de pistas: aquí se gana',
      who: { actor: 'Todos miráis la hoja: 4 filas por equipo, una por palabra, con TODAS las pistas que se han dado para ella', others: 'nadie actúa; es el momento de atar cabos antes de la siguiente transmisión.' },
      text: [
        'Interceptar casi nunca sale a la primera: sale acumulando. En la ronda 1 el rojo dijo «gaviota» para su palabra 4; en la 2 dice «marea» para la misma 4. El azul ya sabe que la 4 del rojo va de mar, y a la próxima la clava.',
        'Por eso, cuando te toque encriptar, la app te enseña debajo de cada número las pistas que tu equipo ya dio para él: repetir el mismo campo semántico es regalarle la palabra al rival.',
      ],
      visual: {
        kind: 'board',
        rows: [
          { label: '🔴 palabra 1', value: 'amanecer (R1) · playa (R2)' },
          { label: '🔴 palabra 2', value: 'noche (R2)' },
          { label: '🔴 palabra 3', value: 'caudal (R1)' },
          { label: '🔴 palabra 4', value: 'gaviota (R1) · marea (R2) → ¿mar?' },
        ],
      },
    },
    {
      icon: '🏆',
      title: 'Ganar',
      who: { actor: 'La app lleva las fichas y corta la partida al llegar a 2', others: 'todos veis el marcador arriba en todo momento.' },
      text: [
        'Gana el equipo que logre 2 INTERCEPCIONES; pierde el que acumule 2 ERRORES propios. El arte está en dar pistas que los tuyos pillen al vuelo pero despisten al rival.',
        'La partida dura como mucho 8 rondas. Si al acabarlas nadie ha llegado a 2 fichas, gana quien más veces interceptó; si eso también empata, decide quien menos errores cometió, y si todo empata son tablas.',
      ],
      visual: { kind: 'board', rows: [{ label: '🔴 Rojo', value: '1 🕵️ · 0 ❌' }, { label: '🔵 Azul', value: '0 🕵️ · 1 ❌' }] },
    },
  ],
};
