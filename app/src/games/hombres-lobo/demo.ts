// Tutorial de Los Hombres Lobo de Castronegro: una primera noche y un primer
// día de ejemplo, con quién actúa en cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'hombres_lobo',
  name: 'Los Hombres Lobo',
  emoji: '🐺',
  steps: [
    {
      icon: '🎯',
      title: 'La partida de ejemplo',
      text: [
        'Jugáis TÚ, Bea, Carlos, David, Eva y Fran. Entre vosotros se esconden hombres lobo: de noche devoran a alguien; de día fingen ser aldeanos.',
        'La APP es el narrador: reparte los roles, dirige la noche con la voz, anuncia los amaneceres y registra el voto. El pueblo gana si caza a todos los lobos; los lobos, si igualan en número a los vivos.',
      ],
    },
    {
      icon: '🎴',
      title: 'El reparto: cada uno a solas con su carta',
      who: { actor: 'TODOS miráis vuestra carta a la vez, cada uno en su móvil', others: 'nadie enseña la pantalla: la carta se muestra un instante y se oculta sola.' },
      text: [
        'A ti te toca la 🔮 Vidente. A Bea (aunque tú no lo sabes) le ha tocado 🐺 Hombre Lobo. La voz llama a cada rol por su NOMBRE («Vidente, abre los ojos…»), con una excepción que verás en el paso 5.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['🔮 Eres la Vidente', 'Cada noche descubres la carta secreta de un vecino.'] },
          { title: 'Bea (tú no lo ves)', lines: ['🐺 Eres Hombre Lobo', 'Cada noche, la manada elige a quién devorar.'] },
        ],
      },
    },
    {
      icon: '🌙',
      title: 'Cae la noche',
      who: { actor: 'TODOS cerráis los ojos, móvil desbloqueado y boca arriba delante', others: 'la voz irá llamando rol a rol; solo el llamado abre los ojos.' },
      text: [
        'La voz dice: «Vidente, abre los ojos…». Abres los ojos CON DISIMULO, tocas en tu pantalla a Carlos para investigarlo, lees el resultado y vuelves a cerrar. Tu pantalla se oculta sola al terminar.',
        'La voz también hace llamadas FALSAS de roles que ni están en juego: ni el tiempo ni el sonido delatan quién actúa de verdad.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (te han llamado)', lines: ['Parrilla de vecinos: tocas a Carlos.', '🔮 «Carlos es… 🧑‍🌾 Aldeano.»'], buttons: [{ label: '✅ Visto (cierro los ojos)', kind: 'primary' }] },
          { title: 'Bea (no es su turno)', lines: ['Pantalla neutra, igual que todas.', 'Ojos cerrados: ni sabe que estás mirando.'] },
        ],
      },
    },
    {
      icon: '🐺',
      title: 'El turno de los lobos',
      who: { actor: 'Bea (loba) abre los ojos cuando la voz llama a los lobos y elige víctima en su pantalla', others: 'tú y el resto seguís con los ojos cerrados, sin saber quién actúa.' },
      text: [
        'Los lobos se reconocen entre sí en su pantalla y uno marca la presa. Después la voz los despide y sigue con el siguiente rol… o con una llamada falsa.',
      ],
    },
    {
      icon: '🤔',
      title: 'Las palabras clave (la excepción)',
      who: { actor: 'Quien oiga SU palabra clave abre los ojos, aunque la voz no diga ningún rol', others: 'el resto ni se entera de a quién iba la llamada.' },
      text: [
        'Los vínculos que NACEN en la partida (los enamorados de Cupido, los encantados del Gaitero…) no pueden llamarse por su nombre sin delatarlos. Por eso, al crearse, la app te enseña una PALABRA CLAVE junto a tu carta.',
        'Supón que Cupido te flechó anoche y tu palabra es «Luna de Plata». La voz dice: «Cupido ha disparado sus flechas… si oyes tu palabra clave, abre los ojos: … Luna de Plata…».',
      ],
      ask: {
        prompt: '¿Qué haces al oír «Luna de Plata»?',
        choices: [
          { label: 'Abro los ojos con disimulo y confirmo en mi pantalla', good: true, reply: 'Eso es: la palabra clave ES tu llamada. Reconoces a tu amor en silencio y confirmas; la voz jamás dirá vuestros nombres.' },
          { label: 'Espero a que diga «enamorados: tú y Bea»', reply: 'Nunca lo dirá: nombraros en alto cantaría el vínculo a toda la mesa. Solo tú sabes que «Luna de Plata» va por ti.' },
          { label: 'Pregunto en voz alta quién es mi pareja', reply: '¡Ni una palabra de noche! Todo pasa en tu pantalla y en silencio. Y ojo: en Castronegro, si tu amor cae, mueres de pena tras él.' },
        ],
      },
    },
    {
      icon: '☀️',
      title: 'El amanecer',
      who: { actor: 'La VOZ anuncia quién no ha sobrevivido', others: 'todos abrís los ojos; los caídos pasan a mirar en silencio (ven todas las cartas, pero ni hablan ni votan).' },
      text: [
        '«Castronegro despierta… esta noche ha caído David.» Según los ajustes de la mesa, su rol se revela o queda boca abajo.',
      ],
    },
    {
      icon: '🗳️',
      title: 'El día: debate y hoguera',
      who: { actor: 'TODOS los vivos debatís de viva voz y decidís a quién condenar', others: 'UNA persona cualquiera registra la decisión en la app; la primera registrada cuenta.' },
      text: [
        'Tú (Vidente) sueltas tu información con cuidado: «yo de Carlos me fío…». Cuando el pueblo se decide por Bea, alguien la toca en pantalla y confirma. También se puede perdonar o registrar un empate.',
        'Al caer, algunos roles dejan un último encargo (la flecha del Cazador, la sucesión del Alguacil): la app lo pide en pantalla a quien corresponda.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '⚖️ Condenar a Bea', kind: 'danger' }, { label: '🕊️ El pueblo perdona', kind: 'ghost' }], caption: 'Debatid en voz alta y tocad al condenado; cualquiera lo registra.' },
    },
    {
      icon: '🔊',
      title: 'Y vuelta a la noche',
      who: { actor: 'Cualquier vivo pulsa «🌙 Empezar la noche» y el ciclo se repite', others: 'la voz manda: pausa, repetir o repasar roles desde el menú ⋯ si hace falta.' },
      text: [
        'Noche → amanecer → día → hoguera… hasta que un bando gana. Hay decenas de roles opcionales (Bruja, Cazador, Cupido…): toca sus fichas en el lobby para el detalle.',
        'Consejo de mesa: volumen alto, pantalla encendida y silencio ceremonial de noche. Castronegro os espera. 🌕',
      ],
    },
  ],
};
