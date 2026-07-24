<script lang="ts">
  // «Cómo se juega», apartado por apartado. Una sola fuente de renderizado para
  // los dos sitios donde se consulta —el modal del lobby (con ▶️ por apartado)
  // y, plegado, el modal del botón 📖 durante la partida—, para que las reglas
  // no se escriban dos veces ni se llamen de dos maneras.
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { HOW_TO } from '../texts';

  const { audio = false }: { audio?: boolean } = $props();
  const keyOf = (i: number) => 'cn-howto:' + i;
</script>

{#each HOW_TO as sec, i (i)}
  {@const st = localAudioState(keyOf(i))}
  <div class="rhead">
    <h3>{sec.heading}</h3>
    {#if audio}
      {#if st === 'playing'}
        <button class="small ghost" data-a="cn-play-howto" aria-label="Detener" onclick={() => toggleLocalSpeech(keyOf(i), [])}>⏹️</button>
      {:else if st === 'loading'}
        <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
      {:else}
        <button class="small ghost" data-a="cn-play-howto" data-p={String(i)} aria-label="Escuchar este apartado" onclick={() => toggleLocalSpeech(keyOf(i), [sec.heading, ...sec.items])}>▶️</button>
      {/if}
    {/if}
  </div>
  {#each sec.items as it, j (j)}<p class="small-note">{it}</p>{/each}
{/each}

<style>
  .rhead { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
  .rhead h3 { flex: 1; margin: 0; font-size: 1.02rem; }
  .rhead button { min-height: 40px; font-size: 1.05rem; line-height: 1; }
  p { margin: 7px 0; }
</style>
