// Explicación de cada juego: un ÚNICO texto que se muestra en el modal y se lee
// en voz alta (misma versión, para que coincidan). La mesa es común; cada juego
// trae la suya. La locución se construye con buildExplainSpeech(): mismas
// palabras que en pantalla, con pausas para que suene como un narrador humano.
export const EXPLANATIONS = {
  hombres_lobo: {
    title: '🐺 Los Hombres Lobo de Castronegro',
    intro: [
      'En el pequeño pueblo de Castronegro, en lo más profundo de la Edad Media, algo terrible ocurre al caer la noche: entre los vecinos se esconden hombres lobo. Cada noche, mientras el pueblo duerme, devoran a un aldeano… y al amanecer vuelven a sonreír como si nada, sentados a vuestra misma mesa.',
      'Al pueblo solo le queda una salida: descubrir a las bestias y eliminarlas en la plaza, antes de que no quede nadie a quien salvar. Pero cuidado: acusar a un inocente también se paga caro.',
    ],
    how: [
      'Cada jugador recibe en su móvil una <b>carta secreta</b> con su rol. No la enseñes a nadie: se muestra un instante y vuelve a ocultarse sola, así que apréndela bien.',
      'La partida alterna <b>noche y día</b>. De noche todos cerráis los ojos, con el móvil <b>boca arriba y desbloqueado</b>: así, cuando la voz te llame, actúas rápido y sin ruido.',
      'La voz irá nombrando a cada rol; solo quien sea llamado abre los ojos, hace su acción en la pantalla y vuelve a cerrarlos. En cuanto actúas, tu pantalla se oculta sola y todas se ven iguales: quien mire tu móvil no sabrá quién eres.',
      'Si junto a tu carta aparece una <b>palabra clave</b>, memorízala: si la voz la pronuncia de noche, la llamada va por ti. Abre los ojos con disimulo y mira tu pantalla.',
      'Al <b>amanecer</b> se anuncia quién no ha sobrevivido a la noche. De día todo es de viva voz: se debate, se acusa y el pueblo <b>vota</b> a quién llevar a la hoguera. Cualquiera anota el resultado en la app, y la primera decisión es la que cuenta.',
      'Gana el <b>pueblo</b> si acaba con todos los hombres lobo; ganan los <b>lobos</b> si llegan a igualar en número a los vivos. Y recuerda: de noche, silencio absoluto y ojos bien cerrados, que la app ya disimula por vosotros, llamando incluso a los que ya no están.',
    ],
  },
};

// Quita el HTML del modal para leerlo en voz alta: etiquetas, emojis, flechas y
// comillas angulares fuera; espacios normalizados. Deja los acentos intactos.
function toSpeech(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, '')
    .replace(/[«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ssmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Locución de la explicación a partir del MISMO texto que muestra el modal
// (intro + cómo se juega). Añade pausas entre párrafos y una pausa dramática al
// pasar de la ambientación a las reglas; el SSML lo aprovecha la voz neuronal,
// y el texto plano queda para la voz del dispositivo. Devuelve { text, ssml }.
export function buildExplainSpeech(ex) {
  const intro = (ex.intro || []).map(toSpeech).filter(Boolean);
  const how = (ex.how || []).map(toSpeech).filter(Boolean);
  const text = [...intro, ...how].join(' ');
  const joined = (arr) => arr.map(ssmlEscape).join(' <break time="800ms"/> ');
  const ssml = '<speak><prosody rate="95%">'
    + joined(intro)
    + ' <break time="1200ms"/> '
    + joined(how)
    + '</prosody></speak>';
  return { text, ssml };
}
