<script lang="ts">
  // Chuleta del tablero PLEGADA dentro del panel de acción: quien decide no
  // tiene que salirse de la pantalla (ni abrir el 🎴) para recordar qué pasa al
  // tocar un transeúnte o cuántas casillas le quedan a cada equipo.
  import { boardRef } from '../texts';
  import type { CodenamesState } from '../types';

  const { game }: { game: CodenamesState } = $props();
  const rows = $derived(boardRef(game));
</script>

<details class="cnref">
  <summary data-a="cn-ref">📖 Los colores y cómo va la pista</summary>
  {#each rows as r (r.name)}
    <div class="settingrow">
      <div class="sinfo">
        <div class="sname">{r.emoji} {r.name}{#if r.note}<span style="opacity:.65;font-weight:400"> · {r.note}</span>{/if}</div>
        <div class="sdesc">{r.desc}</div>
      </div>
    </div>
  {/each}
</details>

<style>
  .cnref { margin-top: 10px; }
  .cnref summary { cursor: pointer; font-size: 0.82rem; opacity: 0.85; padding: 6px 0; }
</style>
