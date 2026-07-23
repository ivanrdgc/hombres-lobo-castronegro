<script lang="ts">
  // Votación: cada jugador señala en secreto a quien cree el Camaleón. La app
  // cuenta y destapa a la vez. No puedes votarte a ti.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ChameleonState } from '../types';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: ChameleonState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const iVoted = $derived(game.votes[my.id] !== undefined);
  const voted = $derived(game.playerIds.filter((pid) => game.votes[pid] !== undefined).length);
  const others = $derived(game.playerIds.filter((pid) => pid !== my.id));
  const pick = $derived(sel1('ch-vote'));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const choose = (pid: string) => (app.ui.sel = { key: 'ch-vote', ids: [pid] });
</script>

<div class="narration">👉 Señalad en secreto a quien creáis el Camaleón. Han votado {voted}/{game.playerIds.length}.</div>

{#if inGame && !iVoted}
  <div class="actionpanel"><h3>🗳️ Tu voto (secreto)</h3>
    <div class="players">
      {#each others as pid (pid)}
        <div class="player selectable {pick === pid ? 'selected' : ''}" data-a="ch-vote" data-p={pid}
          onclick={() => choose(pid)} role="button" tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') choose(pid); }}>
          <span class="pname">{nm(pid)}</span>{#if pick === pid}<span>✔️</span>{/if}
        </div>
      {/each}
    </div>
    <button class="danger block" data-a="ch-vote-confirm" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.castVote(pick); clearSel(); }) : undefined)}>👉 {pick ? `Señalar a ${nm(pick)}` : 'Señala al sospechoso'}</button>
  </div>
{:else if inGame}
  <div class="card"><p class="hint">✅ Tu voto está echado. Esperando al resto…</p></div>
{:else}
  <div class="card"><p class="hint">👀 La mesa está votando…</p></div>
{/if}
{#if inGame}<MyCard {game} pid={my.id} mini={true} />{/if}
