<script lang="ts">
  // Pantalla de partida de «El Camaleón»: cabecera + rejilla pública + fase.
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { chamGame } from '../actions';
  import { topicName } from '../engine';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import GameMenu from './GameMenu.svelte';
  import Grid from './Grid.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import CluePhase from './CluePhase.svelte';
  import VotePhase from './VotePhase.svelte';
  import GuessPhase from './GuessPhase.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(chamGame(group)!);
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  const showGrid = $derived(['reveal', 'clue', 'vote'].includes(game.phase));

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>🦎 {group.name}</h2>
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

{#if showGrid}
  <div class="card"><p class="small-note" style="margin:0 0 2px">🗺️ Tema: <b>{topicName(game.topicId)}</b></p>
    <Grid grid={game.grid} /></div>
{/if}

{#if game.phase === 'reveal'}
  <RevealPhase {game} {my} />
{:else if game.phase === 'clue'}
  <CluePhase {game} {my} />
{:else if game.phase === 'vote'}
  <VotePhase {game} {my} />
{:else if game.phase === 'guess'}
  <GuessPhase {game} {my} />
{:else if game.phase === 'end'}
  <EndPhase {game} {my} />
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}
