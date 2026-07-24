<script lang="ts">
  // Cómo se juega Love Letter: guía por apartados, con un ▶️ de lectura en cada uno.
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../../shell/explain-audio';
  import { HOW_TO } from '../../texts';

  const canPlay = $derived(viewGroup()?.status !== 'playing');
  const keyOf = (i: number) => 'll-howto:' + i;
</script>

<h3 style="margin:0 0 4px">💌 Cómo se juega Love Letter</h3>

{#each HOW_TO as sec, i (i)}
  {@const st = localAudioState(keyOf(i))}
  <div style="display:flex;align-items:center;gap:8px;margin-top:14px">
    <h3 style="flex:1;margin:0;font-size:1.02rem">{sec.heading}</h3>
    {#if canPlay}
      {#if st === 'playing'}
        <button class="small ghost tap" data-a="ll-play-howto" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech(keyOf(i), [])}>⏹️</button>
      {:else if st === 'loading'}
        <button class="small ghost tap" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
      {:else}
        <button class="small ghost tap" data-a="ll-play-howto" data-p={String(i)} aria-label="Escuchar este apartado" title="Escuchar" style="font-size:1.05rem;line-height:1" onclick={() => toggleLocalSpeech(keyOf(i), [sec.heading, ...sec.items])}>▶️</button>
      {/if}
    {/if}
  </div>
  {#each sec.items as it, j (j)}<p class="note">{it}</p>{/each}
{/each}

<button class="primary block" style="margin-top:16px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Entendido</button>

<style>
  /* Los apartados se leen enteros en el móvil: 0,85 rem y un ▶️ tocable. */
  .note { color: var(--muted); font-size: 0.85rem; margin: 7px 0; }
  .tap { min-height: 44px; min-width: 44px; }
</style>
