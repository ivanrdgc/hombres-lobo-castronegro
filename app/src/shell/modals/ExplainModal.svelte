<script lang="ts">
  // «Cómo se juega»: el resto de la explicación (instrucciones, roles activados
  // y ajustes), sin la introducción ambientada (que ya está en el lobby). Con
  // lectura en voz alta SOLO en este dispositivo (nunca en el narrador).
  import { app } from '../../core/sync/store.svelte';
  import { EXPLANATIONS, explainSections } from '../../games/hombres-lobo/texts/explain';
  import { explainAudioState, toggleExplainAudio } from '../explain-audio';

  const g = $derived(app.group);
  const ex = $derived(EXPLANATIONS[g?.currentGame || ''] || EXPLANATIONS.hombres_lobo);
  // Solo las secciones distintas de la intro: cómo se juega, roles y ajustes.
  const sections = $derived(explainSections(g || {}).filter((s) => s.kind !== 'intro'));
  const audio = $derived(explainAudioState('howto'));
</script>

<h3>🎲 Cómo se juega — {ex.title}</h3>
{#each sections as sec, si (si)}
  {#if sec.heading}<h3 style="margin-top:14px">{sec.heading}</h3>{/if}
  {#each sec.items as it, ii (ii)}
    <!-- Los items vienen de nuestro propio módulo de textos (explain.ts), con
         negritas <b> incrustadas como en la v1: no hay entrada de usuario. -->
    <!-- eslint-disable svelte/no-at-html-tags -->
    {#if sec.kind === 'plain'}
      <p class="small-note" style="margin:7px 0">{@html it}</p>
    {:else}
      <p class="small-note" style="margin:8px 0">• {@html it}</p>
    {/if}
    <!-- eslint-enable svelte/no-at-html-tags -->
  {/each}
{/each}
{#if audio === 'loading'}
  <button class="violet block" disabled><span class="spinner"></span> Preparando la voz…</button>
{:else if audio === 'playing'}
  <button class="ghost block" data-a="explain-speak-local" onclick={() => toggleExplainAudio(g || {}, 'howto')}>⏹️ Detener la lectura</button>
{:else}
  <button class="violet block" data-a="explain-speak-local" onclick={() => toggleExplainAudio(g || {}, 'howto')}>🔊 Leer en este dispositivo</button>
{/if}
<p class="small-note" style="text-align:center">La lectura usa la voz configurada en este dispositivo.</p>
<button class="primary block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✔️ Listo</button>
