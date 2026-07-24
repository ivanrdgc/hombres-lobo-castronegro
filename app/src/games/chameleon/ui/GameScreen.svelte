<script lang="ts">
  // Pantalla de partida de «El Camaleón»: cabecera + rejilla pública + fase.
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { chamGame } from '../actions';
  import { topicName } from '../engine';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
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
  // El rótulo del tema acompaña toda la ronda (también mientras el Camaleón
  // adivina); la rejilla pública, solo hasta el voto: en `guess` y en `end` la
  // pintan esas fases (tocable / con la secreta destapada) y saldría doble.
  const showTopic = $derived(game.phase !== 'end');
  const showGrid = $derived(['reveal', 'clue', 'vote'].includes(game.phase));
  // «¿Dónde estamos?» en la cabecera: con cinco fases y rondas encadenadas, la
  // ronda sola no situaba a nadie.
  const PHASES: Record<string, string> = {
    reveal: '🎴 Reparto', clue: '🗣️ Pistas', vote: '🗳️ Voto', guess: '🎯 Última bala', end: '🌟 Fin de ronda',
  };

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>🦎 El Camaleón</h2>
  <span class="chip">Ronda {game.round} · {PHASES[game.phase] || ''}</span>
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

{#if showTopic}
  <div class="card">
    <h3 style="margin:0 0 2px">🗺️ {topicName(game.topicId)}</h3>
    {#if showGrid}
      <!-- La explicación, solo en el reparto: en las pistas y en el voto la
           rejilla ya se sabe y la línea era ruido en todas las pantallas. -->
      {#if game.phase === 'reveal'}
        <p class="small-note" style="margin:0">Las 16 palabras, a la vista de todos. Una es la secreta: la sabéis todos menos el Camaleón.</p>
      {/if}
      <Grid grid={game.grid} />
    {/if}
  </div>
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

<CardFab modal="ch-mycard" />
