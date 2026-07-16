<script lang="ts">
  // Votación del pueblo: UNA lista (el pueblo entero, vivos tocables) y un
  // botón que confirma con nombre — sin modal intermedio. Dos toques.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { selIds } from '../../../shell/selection';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import ActionGrid from './ActionGrid.svelte';

  const { group, my, players }: { group: GroupDoc; my: PlayerDoc; players: PlayerDoc[] } = $props();

  const game = $derived(group.game!);
  const canVote = $derived(!!(my.alive && !my.revealedTonto && (!game.soloVoteId || game.soloVoteId === my.id)));
  const solo = $derived(game.soloVoteId ? players.find((p) => p.id === game.soloVoteId) : null);
  const key = $derived(`vote:d${game.dayNum}:${game.votesLeft}`);
  const selP = $derived(players.find((p) => p.id === selIds(key)[0]));

  function voteNow() {
    const pid = selP?.id;
    if (!pid) return;
    void guard(() => A.castVote(pid));
  }
</script>

{#if !canVote}
  <div class="narration">🗳️ {#if solo}Hoy solo <b>{solo.name}</b> puede registrar la decisión (designado por el Cabeza de Turco).{:else}El pueblo delibera quién morirá hoy…{/if}</div>
{:else}
  <div class="actionpanel"><h3>🗳️ El juicio del pueblo</h3>
    <p class="hint">Debatid en voz alta y tocad al condenado. <b>Cualquiera</b> puede registrar la decisión, y la primera registrada es definitiva.</p>
    <ActionGrid {players} selKey={key} showAlguacil={game.alguacilId || null} />
    <button class="danger block" data-a="vote-confirm" disabled={!selP} onclick={voteNow}>⚖️ {selP ? `Condenar a ${selP.name}` : 'Condenar al elegido'}</button>
    <div class="btnrow"><button class="ghost" data-a="vote-nadie" onclick={() => guard(() => A.castVote('nadie'))}>🕊️ El pueblo perdona</button><button class="ghost" data-a="vote-empate" onclick={() => guard(() => A.castVote('empate'))}>🤝 Hubo empate</button></div></div>
{/if}
