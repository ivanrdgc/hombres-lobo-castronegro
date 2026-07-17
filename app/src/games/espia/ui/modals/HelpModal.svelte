<script lang="ts">
  // «Cómo se juega» de El Espía, con lectura local en voz alta.
  import { app } from '../../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../../shell/explain-audio';
  import { HOW_TO } from '../../texts';

  const allTexts = HOW_TO.flatMap((s) => [s.title.replace(/^[^\p{L}]+/u, '') + '.', ...s.body]);
  const audio = $derived(localAudioState('espia-help'));
</script>

<div style="display:flex;align-items:center;gap:8px">
  <h3 style="flex:1;margin:0">🎲 Cómo se juega</h3>
  {#if audio === 'playing'}
    <button class="small ghost" data-a="espia-play-help" title="Detener" onclick={() => toggleLocalSpeech('espia-help', allTexts)}>⏹️</button>
  {:else if audio === 'loading'}
    <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
  {:else}
    <button class="small ghost" data-a="espia-play-help" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('espia-help', allTexts)}>▶️</button>
  {/if}
</div>
{#each HOW_TO as s (s.title)}
  <h3 style="margin-top:14px">{s.title}</h3>
  {#each s.body as p, i (i)}<p style="margin:8px 0">{p}</p>{/each}
{/each}
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
