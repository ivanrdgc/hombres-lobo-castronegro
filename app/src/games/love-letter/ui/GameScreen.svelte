<script lang="ts">
  // Pantalla de partida de «Love Letter»: cabecera + jugadores + tu carta + fase.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { loveLetterGame, clearPeek, nextRound } from '../actions';
  import { guard } from '../../../core/sync/guard';
  import { CARD_INFO } from '../cards';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import PlayersRow from './PlayersRow.svelte';
  import TurnPanel from './TurnPanel.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(loveLetterGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const myTurn = $derived(game.turn === my.id && game.phase === 'turn');
  const hand = $derived(game.hands[my.id] || []);
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  const peekMine = $derived(game.peek && game.peek.by === my.id ? game.peek : null);

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>💌 {group.name}</h2>
  {#if game.phase !== 'end'}<span class="chip">Ronda {game.round}</span>{/if}
  <GameMenu {game} {my} />
</div>
<Flash />

{#if needsUnlock}
  <div class="card" style="text-align:center"><span class="moon">🔊</span><h3>Este dispositivo pone la voz</h3>
    <button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la voz</button></div>
{/if}
{#if game.paused}
  <div class="card" style="text-align:center"><span class="moon">⏸️</span><h3>Partida en pausa</h3>
    <p class="small-note">La ha pausado {game.paused.name || 'alguien'}.</p></div>
{/if}

{#if game.phase === 'end'}
  <EndPhase {game} {my} />
{:else}
  <div class="card"><PlayersRow {game} /></div>

  {#if peekMine}
    <div class="card" style="border-color:#c86ab0"><p class="small-note" style="margin:0">🔍 Con el Sacerdote viste que <b>{game.names[peekMine.target] || '¿?'}</b> tiene: <b>{CARD_INFO[peekMine.card].emoji} {CARD_INFO[peekMine.card].name}</b>.</p>
      <button class="ghost block" style="margin-top:6px" data-a="ll-peek-ok" onclick={() => guard(clearPeek)}>Entendido</button></div>
  {/if}

  {#if game.phase === 'turn'}
    {#if myTurn}
      <TurnPanel {game} {my} />
    {:else}
      <div class="narration">🎴 Turno de <b>{game.names[game.turn] || '¿?'}</b>…</div>
      {#if inGame && hand.length}
        <div class="card"><p class="small-note" style="margin:0">Tu carta: <b>{CARD_INFO[hand[0]].emoji} {CARD_INFO[hand[0]].name}</b>. {CARD_INFO[hand[0]].short}</p></div>
      {/if}
    {/if}
  {:else if game.phase === 'roundEnd'}
    {#if game.roundResult}<div class="narration">💌 {game.names[game.roundResult.winner] || '¿?'} gana la ronda: {game.roundResult.reason}.</div>{/if}
    <button class="primary block" data-a="ll-next-round" onclick={() => guard(nextRound)}>▶️ Siguiente ronda</button>
  {/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador (sin ver las manos).</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="ll-mycard" />
