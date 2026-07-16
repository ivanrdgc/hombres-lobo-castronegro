<script lang="ts">
  // «Cómo se juega»: el resto de la explicación (instrucciones, roles activados
  // y ajustes), sin la introducción ambientada (que ya está en el lobby). Cada
  // sección tiene su propio botón de lectura, SOLO en este dispositivo (nunca en
  // el narrador), para poder escuchar únicamente lo que interese.
  import { app } from '../../../../core/sync/store.svelte';
  import { EXPLANATIONS, explainSections } from '../../texts/explain';
  import { explainAudioState, toggleExplainAudio } from '../../../../shell/explain-audio';

  const g = $derived(app.group);
  const ex = $derived(EXPLANATIONS[g?.currentGame || ''] || EXPLANATIONS.hombres_lobo);
  // Solo las secciones distintas de la intro: cómo se juega, roles y ajustes.
  const sections = $derived(explainSections(g || {}).filter((s) => s.id !== 'intro'));
</script>

<h3>{ex.title}</h3>
{#each sections as sec (sec.id)}
  {@const audio = explainAudioState(sec.id)}
  <div style="display:flex;align-items:center;gap:8px;margin-top:14px">
    <h3 style="flex:1;margin:0">{sec.heading}</h3>
    {#if audio === 'playing'}
      <button class="small ghost" data-a="explain-speak-local" aria-label="Detener la lectura" title="Detener" onclick={() => toggleExplainAudio(g || {}, sec.id)}>⏹️</button>
    {:else if audio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="explain-speak-local" aria-label="Leer esta sección en voz alta" title="Leer esta sección" style="font-size:1.1rem;line-height:1" onclick={() => toggleExplainAudio(g || {}, sec.id)}>▶️</button>
    {/if}
  </div>
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
<button class="primary block" style="margin-top:16px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✔️ Listo</button>
