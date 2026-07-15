<script lang="ts">
  // Explicación del juego: mismas secciones que la voz (contrato pantalla=voz)
  // con lectura local o en el dispositivo narrador (port de explainModal v1).
  import { app, me } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../games/hombres-lobo/actions';
  import { EXPLANATIONS, explainSections, buildExplainSpeech } from '../../games/hombres-lobo/texts/explain';
  import { play, stopSpeech } from '../../core/audio/player';
  import type { Segment } from '../../core/audio/player';

  const g = $derived(app.group);
  const ex = $derived(EXPLANATIONS[g?.currentGame || ''] || EXPLANATIONS.hombres_lobo);
  const sections = $derived(explainSections(g || {}));
  const narrP = $derived(app.players.find((p) => p.id === g?.lastNarratorId));
  const meId = $derived(me()?.id);
  // El audio neuronal tarda en sintetizarse: mostramos que está cargando y, una
  // vez suena, la opción de detener la lectura (que es larga).
  const au = $derived(app.ui.explainAudio);

  function speakLocal() {
    // Toca de nuevo para detener (la lectura es larga).
    if (app.ui.explainAudio) {
      stopSpeech('hard');
      app.ui.explainAudio = null;
      return;
    }
    app.ui.explainAudio = 'loading';
    const { segments } = buildExplainSpeech(g || {});
    play({
      id: 'explain',
      priority: 'normal',
      segments: segments.flatMap<Segment>((s, i) => (i
        ? [{ kind: 'gap', ms: 700 }, { kind: 'clip', text: s.text }]
        : [{ kind: 'clip', text: s.text }])),
    }, {
      onSegment: (i) => {
        if (i === 0) app.ui.explainAudio = 'playing';
      },
    }).finally(() => (app.ui.explainAudio = null));
  }
</script>

<h3>{ex.title}</h3>
{#each sections as sec, si (si)}
  {#if sec.heading}<h3 style="margin-top:14px">{sec.heading}</h3>{/if}
  {#each sec.items as it, ii (ii)}
    <!-- Los items vienen de nuestro propio módulo de textos (explain.ts), con
         negritas <b> incrustadas como en la v1: no hay entrada de usuario. -->
    <!-- eslint-disable svelte/no-at-html-tags -->
    {#if sec.kind === 'intro'}
      <p style="margin:9px 0">{@html it}</p>
    {:else if sec.kind === 'plain'}
      <p class="small-note" style="margin:7px 0">{@html it}</p>
    {:else}
      <p class="small-note" style="margin:8px 0">• {@html it}</p>
    {/if}
    <!-- eslint-enable svelte/no-at-html-tags -->
  {/each}
{/each}
{#if au === 'loading'}
  <button class="violet block" disabled><span class="spinner"></span> Preparando la voz…</button>
{:else if au === 'playing'}
  <button class="ghost block" data-a="explain-speak-local" onclick={speakLocal}>⏹️ Detener la lectura</button>
{:else}
  <button class="violet block" data-a="explain-speak-local" onclick={speakLocal}>🔊 Leer en este dispositivo</button>
{/if}
{#if narrP && narrP.id !== meId}<button class="ghost block" data-a="explain-speak" onclick={() => guard(() => A.requestExplain())}>🔊 Leer en el narrador ({narrP.name})</button>{/if}
<p class="small-note" style="text-align:center">{narrP && narrP.id === meId ? 'Este dispositivo es el narrador.' : 'La lectura usa la voz configurada en el dispositivo que suene.'}</p>
<button class="primary block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✔️ Listo</button>
