// Lectura en voz alta de la explicación, SIEMPRE en el dispositivo local (nunca
// en el narrador: antes de empezar la partida no se reproduce nada en él). La
// intro ambientada se lee desde el lobby; el «cómo se juega» desde su modal.
import { state } from '../core/sync/store.svelte';
import { play, stopSpeech } from '../core/audio/player';
import type { Segment } from '../core/audio/player';
import { buildExplainSpeech } from '../games/hombres-lobo/texts/explain';
import type { ExplainGroup, ExplainPart } from '../games/hombres-lobo/texts/explain';

type LocalPart = Exclude<ExplainPart, 'all'>;

export function explainAudioState(part: LocalPart): 'idle' | 'loading' | 'playing' {
  const a = state.ui.explainAudio;
  return a && a.part === part ? a.phase : 'idle';
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
