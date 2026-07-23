<script lang="ts">
  // Caza del Insider: cada jugador (también el Maestro) señala en secreto a un
  // sospechoso. No vale votarse a uno mismo ni al Maestro. La app cuenta y
  // destapa a la vez.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { InsiderState } from '../types';

  const { game, my }: { game: InsiderState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const iVoted = $derived(game.votes[my.id] !== undefined);
  const voted = $derived(game.playerIds.filter((pid) => game.votes[pid] !== undefined).length);
  // Se puede señalar a cualquiera menos a uno mismo y al Maestro (es público).
  const targets = $derived(game.playerIds.filter((pid) => pid !== my.id && pid !== game.masterId));
  const pick = $derived(sel1('ins-vote'));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const choose = (pid: string) => (app.ui.sel = { key: 'ins-vote', ids: [pid] });
</script>

<div class="narration">👉 Adivinada la palabra. Ahora señalad en secreto a quien creáis el Insider. Han votado {voted}/{game.playerIds.length}.</div>

{#if inGame && !iVoted}
  <div class="actionpanel"><h3>🗳️ Tu voto (secreto)</h3>
    <div class="players">
      {#each targets as pid (pid)}
        <div class="player selectable {pick === pid ? 'selected' : ''}" data-a="ins-vote" data-p={pid}
          onclick={() => choose(pid)} role="button" tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') choose(pid); }}>
          <span class="pname">{nm(pid)}</span>{#if pick === pid}<span>✔️</span>{/if}
        </div>
      {/each}
    </div>
    <button class="danger block" data-a="ins-vote-confirm" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.castVote(pick); clearSel(); }) : undefined)}>👉 {pick ? `Señalar a ${nm(pick)}` : 'Señala al sospechoso'}</button>
  </div>
{:else if inGame}
  <div class="card"><p class="hint">✅ Tu voto está echado. Esperando al resto…</p></div>
{:else}
  <div class="card"><p class="hint">👀 La mesa está cazando al Insider…</p></div>
{/if}
