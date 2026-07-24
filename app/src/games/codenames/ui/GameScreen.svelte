<script lang="ts">
  // Pantalla de partida de «Codenames»: cabecera + tu carta + tablero + fase.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { codenamesGame, revealCell } from '../actions';
  import { guard } from '../../../core/sync/guard';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import { e2eTestMode } from '../../../core/test-hooks';
  import { CLUE_STALL_MS, clueStalled } from '../engine';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import Board from './Board.svelte';
  import MyCard from './MyCard.svelte';
  import CluePhase from './CluePhase.svelte';
  import GuessPhase from './GuessPhase.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(codenamesGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });

  // Un toque en el tablero SELECCIONA; destapar se confirma abajo (las celdas
  // son pequeñas y un roce en el asesino termina la partida). La selección es
  // local y se borra en cuanto cambia algo en el tablero o el turno.
  let sel: number | null = $state(null);
  $effect(() => { void game.phase; void game.turn; void (game.log || []).length; sel = null; });

  // Reloj local para detectar un turno de pista atascado (Jefe ausente).
  const STALL_MS = e2eTestMode() ? 4000 : CLUE_STALL_MS;
  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 2500); return () => clearInterval(t); });
  const stalled = $derived(clueStalled(game, now, STALL_MS));
</script>

<div class="topbar">
  <h2>🕵️ {group.name}</h2>
  {#if game.phase !== 'end'}
    <span class="chip" data-a="cn-turn-chip">{game.turn === 'red' ? '🔴 Turno rojo' : '🔵 Turno azul'} · {game.phase === 'clue' ? 'pista' : 'toques'}</span>
    <span class="chip">🔴 {game.remaining.red} · 🔵 {game.remaining.blue}</span>
  {/if}
  <GameMenu {game} {my} {stalled} />
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
  {#if inGame}<MyCard {game} pid={my.id} />{/if}
  <div class="card"><Board {game} {my} {sel} onpick={(i) => (sel = sel === i ? null : i)} /></div>
  {#if game.phase === 'clue'}
    <CluePhase {game} {my} {stalled} />
  {:else if game.phase === 'guess'}
    <GuessPhase {game} {my} {sel} onconfirm={() => guard(() => revealCell(sel!))} oncancel={() => (sel = null)} />
  {/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador (sin ver el mapa oculto).</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="cn-mycard" />
