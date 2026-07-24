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
        'De noche, la voz llama a cada rol por su NOMBRE: «Vidente, abre los ojos…». Solo hay una excepción, que veremos enseguida: los vínculos secretos que nacen DURANTE la partida.',
      ],
      visual: { kind: 'card', emoji: '🔮', title: 'Eres la Vidente', lines: ['Cada noche descubres la carta secreta de un vecino.', 'La voz te llamará por tu nombre: «Vidente».'] },
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
      title: 'Ponte a prueba: las palabras clave',
      text: [
        'Algunos roles crean vínculos SECRETOS durante la partida: Cupido enamora a dos personas, el Gaitero encanta a otras… La voz no puede llamarlas por su nombre sin delatarlas, así que les reparte una PALABRA CLAVE que solo ellas ven en su pantalla.',
        'Cupido te ha flechado: eres uno de los enamorados y tu palabra clave es «Luna de Plata». De noche, la voz dice: «Cupido ha disparado sus flechas… si oyes tu palabra clave, abre los ojos: … Luna de Plata…».',
      ],
      ask: {
        prompt: '¿Qué haces?',
        choices: [
          { label: 'Abro los ojos con disimulo y confirmo en mi pantalla', good: true, reply: 'Eso es: la palabra clave ES tu llamada. Reconoces a tu amor en silencio y confirmas; la voz jamás dice vuestros nombres, porque cantaría el vínculo a toda la mesa.' },
          { label: 'Espero a que diga «enamorados» y nuestros nombres', reply: 'No lo hará nunca: nombraros en alto os delataría. Por eso Cupido reparte palabras clave — solo tú sabes que «Luna de Plata» va por ti.' },
          { label: 'Pregunto en voz alta quién es mi pareja', reply: '¡Ni una palabra de noche! Os reconocéis con la mirada, en silencio. Y ojo: en Castronegro, si tu amor cae, tú te mueres de pena tras él.' },
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
