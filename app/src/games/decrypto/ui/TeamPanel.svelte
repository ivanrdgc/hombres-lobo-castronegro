<script lang="ts">
  // Panel de tu equipo: tus 4 palabras clave numeradas (solo las ve tu equipo) y
  // el historial de pistas y códigos ya revelados de ambos equipos.
  import { TEAM_LABEL } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { DecryptoState } from '../types';

  const { game, my }: { game: DecryptoState; my: PlayerDoc } = $props();
  const team = $derived(game.teams[my.id]);
</script>

{#if team}
  <div class="card">
    <h3 style="margin:0 0 6px">🔑 Tus palabras ({TEAM_LABEL[team]})</h3>
    <div class="dewords">
      {#each game.words[team] as w, i (i)}
        <div class="deword"><span class="denum">{i + 1}</span><span>{w}</span></div>
      {/each}
    </div>
    <p class="small-note" style="margin:6px 0 0">Solo tu equipo ve estas palabras.</p>
  </div>
{/if}

{#if game.history.length}
  <div class="card"><h3 style="margin:0 0 4px">📻 Transmisiones anteriores</h3>
    {#each game.history as h, i (i)}
      <p class="small-note" style="margin:4px 0">{h.team === 'red' ? '🔴' : '🔵'} R{h.round}: {h.clues.join(' · ')} → <b>{h.code.join('-')}</b></p>
    {/each}
  </div>
{/if}

<style>
  .dewords { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .deword { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--surface, #1c1e28); font-weight: 700; }
  .denum { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--accent, #c8a24a); color: #000; font-size: 0.8rem; }
</style>
