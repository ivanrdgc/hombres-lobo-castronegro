// Explicación de cada juego: un ÚNICO origen de texto que alimenta el modal y la
// voz, para que lo que se lee coincida con lo que se muestra. explainSections()
// arma las secciones (ambientación, cómo se juega, roles de la mesa, ajustes) y
// buildExplainSpeech() las convierte en locución con pausas de narrador humano.
// Port literal de public/js/explain.js (v1).
import { ROLES } from '../roles';
import type { RoleId } from '../roles';

export interface Explanation {
  title: string;
  intro: string[];
  how: string[];
}

export const EXPLANATIONS: Record<string, Explanation> = {
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

/** Ajustes de mesa que resume la explicación (subset del settings del grupo). */
export interface ExplainSettings {
  revealDead?: boolean;
  showComposition?: boolean;
  primeraNocheTranquila?: boolean;
  videnteSoloBando?: boolean;
  ocultarCausas?: boolean;
  alguacil?: boolean;
  wolvesCount?: number | null;
  villagersCount?: number | null;
  casual?: boolean;
}

/** Lo que la explicación necesita saber del grupo. */
export interface ExplainGroup {
  currentGame?: string | null;
  extraRoles?: string[];
  settings?: ExplainSettings;
}

// Resumen legible de los modos de juego elegidos para esta mesa. Vive aquí (y no
// en la interfaz) porque forma parte del apartado «Cómo se jugará» que también se
// lee en voz alta.
export function settingsSummary(st: ExplainSettings = {}): string[] {
  const out: string[] = [];
  out.push(st.revealDead
    ? '💀 Cuando alguien muera, su rol se revelará a todo el pueblo.'
    : '🙈 Los roles de los muertos quedarán ocultos: ni el cementerio hablará.');
  out.push(st.showComposition
    ? '🎴 Composición pública: se sabrá qué cartas hay en juego.'
    : '🎴 Composición secreta: nadie sabrá qué roles juegan de verdad, y la voz fingirá también los que no se repartieron.');
  if (st.primeraNocheTranquila) out.push('🌙 Primera noche sin sangre: los lobos se presentan, pero nadie muere.');
  if (st.videnteSoloBando) out.push('🔮 La vidente solo descubrirá el bando (lobo o no), no el rol exacto.');
  if (st.ocultarCausas) out.push('🌫️ Las muertes nocturnas no explicarán la causa: solo quién ha caído.');
  if (st.alguacil) out.push('⭐ Habrá Alguacil: elegido el primer día, su voto vale doble.');
  if (st.wolvesCount) out.push(`🐺 Número de lobos fijado: ${st.wolvesCount}.`);
  if (st.villagersCount != null) out.push(`🧑‍🌾 Aldeanos reservados: ${st.villagersCount}.`);
  if (st.casual) out.push('🎲 Modo casual activo (mesas de menos de 8).');
  return out;
}

// Roles activados en esta mesa (lobo + extras elegidos + aldeano), tal como se
// listan en el modal: emoji, nombre en negrita y descripción.
export function explainRoleItems(group: ExplainGroup = {}): string[] {
  const ids = [...new Set(['hombre_lobo', ...(group.extraRoles || []), 'aldeano'])]
    .filter((id): id is RoleId => id in ROLES);
  return ids.map((id) => `${ROLES[id].emoji} <b>${ROLES[id].name}</b> — ${ROLES[id].desc}`);
}

export interface ExplainSection {
  heading: string | null;
  items: string[];
  kind: 'intro' | 'bullet' | 'plain';
}

// Secciones de la explicación, en el mismo orden que el modal. Cada una:
// { heading, items, kind }. kind guía el estilo del modal y no afecta a la voz.
export function explainSections(group: ExplainGroup = {}): ExplainSection[] {
  const ex = EXPLANATIONS[group.currentGame || ''] || EXPLANATIONS.hombres_lobo;
  return [
    { heading: null, items: ex.intro, kind: 'intro' },
    { heading: '🎲 Cómo se juega', items: ex.how, kind: 'bullet' },
    { heading: '🎴 Roles activados en esta mesa', items: explainRoleItems(group), kind: 'plain' },
    { heading: '🔧 Cómo se jugará', items: settingsSummary(group.settings || {}), kind: 'bullet' },
  ];
}

// Quita el HTML del modal para leerlo en voz alta: etiquetas, emojis, flechas y
// comillas angulares fuera; espacios normalizados. Deja los acentos intactos.
function toSpeech(html: string): string {
  return String(html)
    .replace(/<[^>]+>/g, '')
    // eslint-disable-next-line no-misleading-character-class -- regex heredada de la v1 (golden): quita emojis y sus modificadores
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ssmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface SpeechToken {
  t: string;
  pause: number;
}

function tokenSsml(tk: SpeechToken, first: boolean): string {
  return (first ? '' : `<break time="${tk.pause}ms"/> `) + ssmlEscape(tk.t);
}

function wrapSsml(tokens: SpeechToken[]): string {
  return '<speak><prosody rate="95%">'
    + tokens.map((tk, i) => tokenSsml(tk, i === 0)).join(' ')
    + '</prosody></speak>';
}

export interface ExplainSpeech {
  text: string;
  segments: { text: string; ssml: string }[];
}

// Locución de la explicación a partir del MISMO texto que muestra el modal
// (título + todas las secciones, incluidos roles y ajustes). Añade pausas entre
// secciones y párrafos, y una pausa tras cada encabezado, para que suene como un
// narrador humano. El SSML lo aprovecha la voz neuronal; el texto plano queda
// para la voz del dispositivo. Como la API de síntesis limita cada petición a
// 5000 bytes, la troceamos en segmentos que se reproducen encadenados.
// Devuelve { text, segments: [{ text, ssml }] }.
export function buildExplainSpeech(group: ExplainGroup = {}): ExplainSpeech {
  const ex = EXPLANATIONS[group.currentGame || ''] || EXPLANATIONS.hombres_lobo;
  // tokens: { t: texto, pause: ms de silencio antes }
  const tokens: SpeechToken[] = [{ t: toSpeech(ex.title), pause: 0 }];
  explainSections(group).forEach((sec, si) => {
    if (sec.heading) tokens.push({ t: toSpeech(sec.heading), pause: si === 0 ? 900 : 1100 });
    (sec.items || []).forEach((it, ii) => {
      const t = toSpeech(it);
      if (!t) return;
      const pause = ii === 0
        ? (sec.heading ? 450 : (si === 0 ? 900 : 1100))
        : 700;
      tokens.push({ t, pause });
    });
  });
  const clean = tokens.filter((x) => x.t);
  const text = clean.map((x) => x.t).join(' ');
  // Agrupa tokens en segmentos bajo el límite (holgura sobre los 5000 bytes).
  const LIMIT = 3200;
  const segments: { text: string; ssml: string }[] = [];
  let cur: SpeechToken[] = [];
  let curLen = 0;
  const flush = () => {
    if (!cur.length) return;
    segments.push({ text: cur.map((x) => x.t).join(' '), ssml: wrapSsml(cur) });
    cur = [];
    curLen = 0;
  };
  for (const tk of clean) {
    const add = tk.t.length + 34; // margen por <break>, escapes y espacios
    if (curLen + add > LIMIT && cur.length) flush();
    cur.push(tk);
    curLen += add;
  }
  flush();
  return { text, segments };
}
