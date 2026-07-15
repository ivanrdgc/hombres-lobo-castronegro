<script lang="ts">
  // Crónica de la partida (port de logPanel() de la v1) con auto-scroll al
  // fondo cada vez que crece el registro.
  import type { GameState } from '../types';

  const { game }: { game: GameState } = $props();

  let logEl: HTMLElement | null = $state(null);

  $effect(() => {
    void (game.log || []).length; // re-ejecutar cuando cambie la longitud del log
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  });
</script>

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Crónica de Castronegro</h3>
    <div class="log" id="gamelog" bind:this={logEl}>
      {#each game.log as l, i (i)}<p class={l.kind || ''}>{l.txt}</p>{/each}
    </div></div>
{/if}
