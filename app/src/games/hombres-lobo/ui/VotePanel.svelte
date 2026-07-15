<script lang="ts">
  // Votación del pueblo (port de votePanel() de la v1). La confirmación abre
  // el modal 'vote-confirm'; sin selección, aviso de flash.
  import { app, setFlash } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { sel1 } from '../../../shell/selection';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import PickList from './PickList.svelte';

  const { group, my, players }: { group: GroupDoc; my: PlayerDoc; players: PlayerDoc[] } = $props();

  const game = $derived(group.game!);
  const canVote = $derived(!!(my.alive && !my.revealedTonto && (!game.soloVoteId || game.soloVoteId === my.id)));
  const solo = $derived(game.soloVoteId ? app.players.find((p) => p.id === game.soloVoteId) : null);
  const key = $derived(`vote:d${game.dayNum}:${game.votesLeft}`);

  function voteConfirm() {
    const pid = sel1(key);
    if (!pid) {
      setFlash('Selecciona primero a un jugador de la lista.');
      return;
    }
    app.ui.modal = { type: 'vote-confirm', pid };
  }
</script>

{#if !canVote}
  <div class="narration">🗳️ {#if solo}Hoy solo <b>{solo.name}</b> puede registrar la decisión (designado por el Cabeza de Turco).{:else}El pueblo delibera quién morirá hoy…{/if}</div>
{:else}
  <div class="actionpanel"><h3>🗳️ El juicio del pueblo</h3>
    <p class="hint">Debatid en voz alta. Cuando haya decisión, <b>cualquiera</b> puede registrarla aquí. ¡La primera elección es definitiva!</p>
    <PickList {players} exclude={[]} selKey={key} />
    <button class="danger block" data-a="vote-confirm" onclick={voteConfirm}>⚖️ Condenar al selecionado</button>
    <div class="btnrow"><button class="ghost" data-a="vote-nadie" onclick={() => guard(() => A.castVote('nadie'))}>🕊️ El pueblo perdona</button><button class="ghost" data-a="vote-empate" onclick={() => guard(() => A.castVote('empate'))}>🤝 Hubo empate</button></div></div>
{/if}
