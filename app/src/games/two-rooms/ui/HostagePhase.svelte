<script lang="ts">
  // Fin de ronda: cada sala vota a quién manda de rehén a la otra. Solo votas a
  // gente de TU sala. La app intercambia a los más votados de cada sala.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import { roomMembers, roomOf, allVotedInRoom } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { TwoRoomsState } from '../types';

  const { game, my }: { game: TwoRoomsState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const myRoom = $derived(inGame ? roomOf(game, my.id) : 0);
  const mates = $derived(inGame ? roomMembers(game, myRoom) : []);
  const iVoted = $derived(game.hVotes[my.id] !== undefined);
  const votedCount = (r: 0 | 1) => roomMembers(game, r).filter((pid) => game.hVotes[pid] !== undefined).length;
  const pick = $derived(sel1('tr-hostage'));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const choose = (pid: string) => (app.ui.sel = { key: 'tr-hostage', ids: [pid] });
</script>

<div class="narration">🗳️ Fin de la ronda {game.round}. Cada sala decide, por votación, a quién manda de rehén a la otra sala.</div>

<div class="card">
  <p class="small-note" style="margin:0">🚪 Sala 1: {votedCount(0)}/{roomMembers(game, 0).length} votos{game.pick[0] ? ` · manda a ${nm(game.pick[0])}` : ''}</p>
  <p class="small-note" style="margin:4px 0 0">🚪 Sala 2: {votedCount(1)}/{roomMembers(game, 1).length} votos{game.pick[1] ? ` · manda a ${nm(game.pick[1])}` : ''}</p>
</div>

{#if inGame && !iVoted}
  <div class="actionpanel"><h3>¿A quién mandáis de tu sala (Sala {myRoom + 1})?</h3>
    <div class="players">
      {#each mates as pid (pid)}
        <div class="player selectable {pick === pid ? 'selected' : ''}" data-a="tr-hostage" data-p={pid}
          onclick={() => choose(pid)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') choose(pid); }}>
          <span class="pname">{nm(pid)}{pid === my.id ? ' (tú)' : ''}</span>{#if pick === pid}<span>✔️</span>{/if}
        </div>
      {/each}
    </div>
    <button class="primary block" data-a="tr-hostage-confirm" disabled={!pick}
      onclick={() => (pick ? guard(async () => { await A.castHostageVote(pick); clearSel(); }) : undefined)}>🗳️ {pick ? `Votar a ${nm(pick)}` : 'Elige a quién mandar'}</button>
  </div>
{:else if inGame}
  <div class="card"><p class="hint">✅ Tu voto está echado. Esperando al resto…</p></div>
{:else}
  <div class="card"><p class="hint">👀 Las salas están decidiendo sus rehenes…</p></div>
{/if}
{#if allVotedInRoom(game, myRoom) && !game.pick[myRoom === 0 ? 1 : 0]}
  <p class="small-note">Tu sala ya ha votado. Falta la otra sala.</p>
{/if}
