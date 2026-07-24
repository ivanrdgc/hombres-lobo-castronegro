<script lang="ts">
  // Pantalla de partida de «Good Cop Bad Cop»: tablero + turno + fin.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { goodCopGame, clearPeek } from '../actions';
  import { guard } from '../../../core/sync/guard';
  import { cardLabel } from '../cards';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import PlayersBoard from './PlayersBoard.svelte';
  import TurnPanel from './TurnPanel.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(goodCopGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const myTurn = $derived(game.turn === my.id && game.phase === 'turn' && game.alive[my.id]);
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
  <h2>🚔 {group.name}</h2>
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
  <div class="card"><PlayersBoard {game} {my} /></div>

  {#if peekMine}
    <div class="card" style="border-color:#c8a24a"><p class="small-note" style="margin:0">🔍 Investigaste a <b>{game.names[peekMine.target] || '¿?'}</b> (carta {peekMine.idx + 1}): <b>{cardLabel({ kind: peekMine.kind, role: peekMine.role as never, up: false })}</b>. Solo tú lo sabes.</p>
      <button class="ghost block" style="margin-top:6px" data-a="gc-peek-ok" onclick={() => guard(clearPeek)}>Entendido</button></div>
  {/if}

  {#if myTurn}
    <TurnPanel {game} {my} />
  {:else}
    <div class="narration">🎬 Turno de <b>{game.names[game.turn] || '¿?'}</b>: investigar, armarse, apuntar o disparar…</div>
  {/if}
  {#if inGame && !game.alive[my.id]}<p class="small-note" style="text-align:center">❌ Estás fuera: tus cartas quedaron destapadas. Mira cómo acaba.</p>{/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador (sin ver cartas ocultas).</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="gc-mycard" />
