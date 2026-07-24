<script lang="ts">
  // «Cómo se juega» de El Espía: guía por apartados, con un ▶️ de lectura local
  // en CADA uno (se lee solo en este dispositivo).
  import { app } from '../../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../../shell/explain-audio';
  import { HOW_TO } from '../../texts';

  const keyOf = (i: number) => 'espia-help:' + i;
</script>

<h3 style="margin:0 0 4px">🎲 Cómo se juega El Espía</h3>

{#each HOW_TO as s, i (i)}
  {@const st = localAudioState(keyOf(i))}
  <div style="display:flex;align-items:center;gap:8px;margin-top:14px">
    <h3 style="flex:1;margin:0;font-size:1.02rem">{s.title}</h3>
    {#if st === 'playing'}
      <button class="small ghost" data-a="espia-play-help" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech(keyOf(i), [])}>⏹️</button>
    {:else if st === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="espia-play-help" data-p={String(i)} aria-label="Escuchar este apartado" title="Escuchar" style="font-size:1.05rem;line-height:1" onclick={() => toggleLocalSpeech(keyOf(i), [s.title, ...s.body])}>▶️</button>
    {/if}
  </div>
  {#each s.body as p, j (j)}<p class="small-note" style="margin:7px 0">{p}</p>{/each}
{/each}

<button class="primary block" style="margin-top:16px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Entendido</button>
