<script lang="ts">
  // Pantalla de partida de «Decrypto»: cabecera con fichas + tu panel de equipo
  // + fase. La fase decide quién actúa (encriptador, rival o propio equipo).
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { decryptoGame } from '../actions';
  import { TEAM_LABEL } from '../engine';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import TeamPanel from './TeamPanel.svelte';
  import CluePhase from './CluePhase.svelte';
  import GuessPhase from './GuessPhase.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(decryptoGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>🔐 {group.name}</h2>
  {#if game.phase !== 'end'}<span class="chip">🔴 {game.tokens.red.intercepts}🕵️/{game.tokens.red.errors}❌ · 🔵 {game.tokens.blue.intercepts}🕵️/{game.tokens.blue.errors}❌</span>{/if}
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
  {#if inGame}<TeamPanel {game} {my} />{/if}
  <div class="card"><p class="small-note" style="margin:0">📡 Ronda {game.round} · transmite el equipo <b>{TEAM_LABEL[game.active]}</b></p></div>
  {#if game.phase === 'clue'}
    <CluePhase {game} {my} />
  {:else if game.phase === 'intercept' || game.phase === 'decode'}
    <GuessPhase {game} {my} />
  {:else if game.phase === 'reveal'}
    <RevealPhase {game} {my} />
  {/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador (sin ver las palabras de los equipos).</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="de-mycard" />
