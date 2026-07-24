<script lang="ts">
  // Pantalla de partida de Una Noche: enruta por fase; cabecera + menú ⋯.
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { unaNocheGame } from '../actions';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import NightPhase from './NightPhase.svelte';
  import DayPhase from './DayPhase.svelte';
  import EndPhase from './EndPhase.svelte';
  import DeckStrip from './DeckStrip.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(unaNocheGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id));
  // Solo pedimos activar si el audio NO suena ya (estado real del AudioContext).
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
  <h2>{group.name}</h2>
  <span class="chip">🌘 Una Noche</span>
  <GameMenu {game} {my} />
</div>
<Flash />
{#if needsUnlock}
  <div class="card" style="text-align:center">
    <span class="moon">🔊</span>
    <h3>Este dispositivo pone la voz</h3>
    <button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la voz</button>
  </div>
{/if}

{#if game.paused}
  <div class="card" style="text-align:center"><span class="moon">⏸️</span><h3>Partida en pausa</h3>
    <p class="small-note">{game.paused.name || 'Alguien'} ha pausado. El narrador espera.</p></div>
{/if}

{#if !inGame && game.phase !== 'end'}
  <div class="card" style="text-align:center">
    <span class="moon">👀</span>
    <h3>Hay una partida en curso</h3>
    <p class="small-note">Este dispositivo no juega: puedes seguir la partida desde aquí, sin mirar pantallas ajenas.</p>
  </div>
{:else if game.phase === 'reveal'}
  <RevealPhase {game} {my} />
{:else if game.phase === 'night'}
  <NightPhase {game} {my} />
{:else if game.phase === 'day'}
  <DayPhase {game} {my} />
{:else if game.phase === 'end'}
  <EndPhase {game} {my} />
{/if}

{#if game.phase !== 'end'}<DeckStrip {game} />{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="una-mycard" />
