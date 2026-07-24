<script lang="ts">
  // «Las reglas», plegadas DENTRO del panel de acción: quien decide no tiene
  // que salirse de la pantalla (ni abrir el 📖 flotante) para recordar qué pasa
  // al tocar un transeúnte o cuántas casillas le quedan a cada equipo.
  // Mismo nombre y mismas filas que el modal del botón flotante: es una sola
  // cosa consultable desde dos sitios, no dos referencias distintas (B34·3).
  import { boardRef } from '../texts';
  import type { CodenamesState } from '../types';

  const { game }: { game: CodenamesState } = $props();
  const rows = $derived(boardRef(game));
</script>

<details class="cnref">
  <summary data-a="cn-ref">📖 Las reglas</summary>
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
  .cnref summary { cursor: pointer; font-size: 0.82rem; opacity: 0.85; padding: 10px 0; }
</style>
