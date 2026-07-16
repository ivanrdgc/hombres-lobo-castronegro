// Lectura en voz alta de la explicación, SIEMPRE en el dispositivo local (nunca
// en el narrador: antes de empezar la partida no se reproduce nada en él). La
// intro ambientada se lee desde el lobby; el «cómo se juega» desde su modal.
import { state } from '../core/sync/store.svelte';
import { play, stopSpeech } from '../core/audio/player';
import type { Segment } from '../core/audio/player';
import { buildExplainSpeech } from '../games/hombres-lobo/texts/explain';
import type { ExplainGroup, SectionId } from '../games/hombres-lobo/texts/explain';

// Solo se leen secciones concretas (nunca 'all'/'howto' desde un botón).
type LocalPart = SectionId;

export function explainAudioState(part: LocalPart): 'idle' | 'loading' | 'playing' {
  const a = state.ui.explainAudio;
  return a && a.part === part ? a.phase : 'idle';
}

// Limpieza mínima para leer texto de interfaz: fuera emojis y comillas
// angulares, espacios normalizados (mismo criterio que toSpeech de explain.ts).
function cleanForSpeech(t: string): string {
  return String(t)
    // eslint-disable-next-line no-misleading-character-class -- mismo criterio que explain.ts: quita emojis y sus modificadores
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Estado de una lectura local por clave libre (p. ej. 'role:vidente'). */
export function localAudioState(key: string): 'idle' | 'loading' | 'playing' {
  const a = state.ui.explainAudio;
  return a && a.part === key ? a.phase : 'idle';
}

// Lee en voz alta, SOLO en este dispositivo, una lista de frases con pausas
// entre ellas (p. ej. el detalle de un rol). Misma regla que la explicación:
// una única lectura a la vez; repetir la misma clave la detiene.
export function toggleLocalSpeech(key: string, texts: string[]): void {
  const current = state.ui.explainAudio;
  if (current) {
    const wasThis = current.part === key;
    stopSpeech('hard');
    state.ui.explainAudio = null;
    if (wasThis) return; // este mismo estaba sonando: solo detener
  }
  const parts = texts.map(cleanForSpeech).filter(Boolean);
  if (!parts.length) return;
  state.ui.explainAudio = { part: key, phase: 'loading' };
  play({
    id: 'local:' + key,
    priority: 'normal',
    segments: parts.flatMap<Segment>((t, i) => (i
      ? [{ kind: 'gap', ms: 550 }, { kind: 'clip', text: t }]
      : [{ kind: 'clip', text: t }])),
  }, {
    onSegment: (i) => {
      if (i === 0 && state.ui.explainAudio?.part === key) state.ui.explainAudio = { part: key, phase: 'playing' };
    },
  }).finally(() => {
    if (state.ui.explainAudio?.part === key) state.ui.explainAudio = null;
  });
}

// Reproduce (o detiene, si ya suena) la parte indicada. Otra parte en curso se
// detiene primero: solo suena una lectura a la vez.
export function toggleExplainAudio(group: ExplainGroup, part: LocalPart): void {
  const current = state.ui.explainAudio;
  if (current) {
    const wasThis = current.part === part;
    stopSpeech('hard');
    state.ui.explainAudio = null;
    if (wasThis) return; // este mismo estaba sonando: solo detener
  }
  state.ui.explainAudio = { part, phase: 'loading' };
  const { segments } = buildExplainSpeech(group, part);
  play({
    id: 'explain:' + part,
    priority: 'normal',
    segments: segments.flatMap<Segment>((s, i) => (i
      ? [{ kind: 'gap', ms: 700 }, { kind: 'clip', text: s.text }]
      : [{ kind: 'clip', text: s.text }])),
  }, {
    onSegment: (i) => {
      if (i === 0 && state.ui.explainAudio?.part === part) state.ui.explainAudio = { part, phase: 'playing' };
    },
  }).finally(() => {
    if (state.ui.explainAudio?.part === part) state.ui.explainAudio = null;
  });
}
