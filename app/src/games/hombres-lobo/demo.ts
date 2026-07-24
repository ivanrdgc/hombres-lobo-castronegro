// Tutorial de Los Hombres Lobo de Castronegro: el flujo real de la app (modo
// automático, la voz dirige), paso a paso.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'hombres_lobo',
  name: 'Los Hombres Lobo',
  emoji: '🐺',
  steps: [
    {
      icon: '🎯',
      title: 'El pueblo contra los lobos',
      text: [
        'Entre los vecinos de Castronegro se esconden hombres lobo: cada noche devoran a alguien y de día fingen ser aldeanos. El pueblo gana si acaba con todos los lobos; los lobos, si igualan en número a los vivos.',
        'La app hace de narrador: reparte los roles, dirige la noche con la voz, anuncia los amaneceres y registra el voto del día. Nadie más tiene que saberse las reglas.',
      ],
    },
    {
      icon: '🎴',
      title: 'Tu carta secreta',
      text: [
        'Al empezar, cada uno mira su carta en su móvil, a solas: se muestra un instante y se vuelve a ocultar sola. Apréndela bien y confirma.',
        'Si junto a tu carta aparece una PALABRA CLAVE, memorízala: si la voz la pronuncia de noche, esa llamada va por ti (aunque no nombre tu rol).',
      ],
      visual: { kind: 'card', emoji: '🔮', title: 'Eres la Vidente', lines: ['Cada noche descubres la carta de un vecino.', 'Tu palabra clave: «Luna de Plata»'] },
    },
    {
      icon: '🌙',
      title: 'La noche: móvil boca arriba y ojos cerrados',
      text: [
        'De noche todos cerráis los ojos con el móvil desbloqueado delante. La voz va llamando a cada rol; SOLO quien es llamado abre los ojos, actúa tocando su pantalla y vuelve a cerrarlos.',
        'En cuanto actúas, tu pantalla se oculta sola y todas se ven iguales. Y la voz también hace llamadas FALSAS (de roles que ni están en juego): el tiempo y el sonido no delatan a nadie.',
      ],
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['Es de noche, eres la Vidente y la voz dice: «Luna de Plata…» (tu palabra clave).'],
      ask: {
        prompt: '¿Qué haces?',
        choices: [
          { label: 'Abro los ojos con disimulo y toco en mi pantalla a quien quiero investigar', good: true, reply: 'Eso es: la llamada va por ti aunque no diga «vidente». Actúa rápido y en silencio, y vuelve a cerrar los ojos.' },
          { label: 'Espero a que diga «Vidente» claramente', reply: 'Puede que nunca lo diga: la palabra clave ES tu llamada (así los demás no saben qué rol ha actuado). Si la dejas pasar, la voz te dará un toque… y perderás tiempo.' },
          { label: 'Pregunto en voz alta si me toca', reply: '¡Ni una palabra de noche! Hablar delata tu rol a toda la mesa. Todo se resuelve en tu pantalla.' },
        ],
      },
    },
    {
      icon: '☀️',
      title: 'El amanecer',
      text: [
        'La voz anuncia quién no ha sobrevivido a la noche (y, según los ajustes de la mesa, si se revela su rol o queda oculto).',
        'Los caídos siguen en la mesa como espectadores: pueden mirar las cartas de todos… pero ni hablan ni votan. Que nadie les tire de la lengua.',
      ],
    },
    {
      icon: '🗳️',
      title: 'El día: debate y hoguera',
      text: [
        'De día todo es de viva voz: se acusa, se defiende y el pueblo decide a quién condenar. Cuando esté decidido, UNA persona cualquiera lo registra en la app (tocad al condenado y confirmad; también se puede perdonar o registrar un empate).',
        'La primera decisión registrada es la que cuenta: poneos de acuerdo ANTES de tocar.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '⚖️ Condenar a Carlos', kind: 'danger' }, { label: '🕊️ El pueblo perdona', kind: 'ghost' }], caption: 'Algunos roles (Cazador, Alguacil…) dejan un último encargo al caer: la app lo pide en pantalla.' },
    },
    {
      icon: '🎭',
      title: 'Los roles especiales',
      text: [
        'Además de lobos y aldeanos, la mesa puede activar decenas de roles: la Vidente investiga, la Bruja tiene dos pociones, el Cazador dispara al caer, Cupido enamora… Toca cada ficha en el lobby para ver su detalle (con lectura en voz alta).',
        'Cada rol actúa cuando la voz lo llama: no hace falta memorizar el orden, la app lo lleva.',
      ],
    },
    {
      icon: '🔊',
      title: 'La voz manda (y se controla)',
      text: [
        'Desde el menú ⋯ podéis PAUSAR la partida, pedir que REPITA la última locución o repasar los roles. Si el dispositivo narrador se queda tirado, a los demás les aparece un botón para tomar la narración.',
        'Consejo de mesa: volumen alto, pantalla encendida y silencio ceremonial de noche. Castronegro os espera. 🌕',
      ],
    },
  ],
};
