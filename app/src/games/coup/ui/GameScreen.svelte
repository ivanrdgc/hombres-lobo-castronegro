<script lang="ts">
  // Pantalla de partida de Coup: enruta por fase. Tablero público siempre a la
  // vista; tu mano privada, peekable. Los dispositivos fuera de la partida ven
  // el tablero de espectador (sin cartas ocultas de nadie).
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { coupGame } from '../actions';
  import { isAlive } from '../engine';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import GameMenu from './GameMenu.svelte';
  import Board from './Board.svelte';
  import MyHand from './MyHand.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import TurnPhase from './TurnPhase.svelte';
  import ReactionPhase from './ReactionPhase.svelte';
  import LosePhase from './LosePhase.svelte';
  import ExchangePhase from './ExchangePhase.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(coupGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const alive = $derived(inGame && isAlive(game, my.id));
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  const turnName = $derived(game.names[game.playerIds[game.turnIdx]] || '¿?');

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>🃏 {group.name}</h2>
  {#if game.phase !== 'end' && game.phase !== 'reveal'}<span class="chip">Turno de {turnName}</span>{/if}
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

{#if game.phase === 'reveal'}
  <RevealPhase {game} {my} />
{:else if game.phase === 'end'}
  <Board {game} meId={my.id} />
  <EndPhase {game} {my} />
{:else if !inGame}
  <div class="card" style="text-align:center"><span class="moon">👀</span>
    <h3>Hay una partida en curso</h3>
    <p class="small-note">Este dispositivo no juega: puedes seguir el tablero desde aquí. Nada de mirar pantallas ajenas.</p>
  </div>
  <Board {game} meId={my.id} />
{:else}
  <Board {game} meId={my.id} />
  {#if alive}<MyHand {game} pid={my.id} />{/if}
  {#if game.phase === 'turn'}
    <TurnPhase {game} {my} />
  {:else if game.phase === 'challengeAction' || game.phase === 'block' || game.phase === 'challengeBlock'}
    <ReactionPhase {game} {my} />
  {:else if game.phase === 'loseInfluence'}
    <LosePhase {game} {my} />
  {:else if game.phase === 'exchangeReturn'}
    <ExchangePhase {game} {my} />
  {/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}
