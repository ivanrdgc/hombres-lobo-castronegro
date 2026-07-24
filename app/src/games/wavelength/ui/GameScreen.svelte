<script lang="ts">
  // Pantalla de partida de «Wavelength»: cabecera + espectro público + fase.
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { wavelengthGame } from '../actions';
  import { spectrumLabel } from '../spectrums';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import CluePhase from './CluePhase.svelte';
  import GuessPhase from './GuessPhase.svelte';
  import ResultPhase from './ResultPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(wavelengthGame(group)!);
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
  <h2>📡 {group.name}</h2>
  <span class="chip">Ronda {game.round}</span>
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

<div class="card"><p class="small-note" style="margin:0">📡 Espectro: <b>{spectrumLabel(game.spectrumId)}</b> · Total del equipo: <b>{game.teamScore}</b></p></div>

{#if game.phase === 'clue'}
  <CluePhase {game} {my} />
{:else if game.phase === 'guess'}
  <GuessPhase {game} {my} />
{:else if game.phase === 'result'}
  <ResultPhase {game} {my} />
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="wl-mycard" />
