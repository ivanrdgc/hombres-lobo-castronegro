<script lang="ts">
  // Pantalla de partida de Ávalon: cabecera + tablero de misiones + fase actual
  // + diario. Enruta por game.phase. Los que no juegan siguen la partida sin ver
  // cartas secretas (el tablero y el diario son públicos).
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { avalonGame } from '../actions';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import QuestTrack from './QuestTrack.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import ProposePhase from './ProposePhase.svelte';
  import VotePhase from './VotePhase.svelte';
  import VoteRevealPhase from './VoteRevealPhase.svelte';
  import QuestPhase from './QuestPhase.svelte';
  import ResultPhase from './ResultPhase.svelte';
  import AssassinPhase from './AssassinPhase.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(avalonGame(group)!);
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
  <h2>🏰 {group.name}</h2>
  <span class="chip">Misión {Math.min(game.quest, 5)}</span>
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
    <p class="small-note">La ha pausado {game.paused.name || 'alguien'}.</p></div>
{/if}

{#if game.phase !== 'reveal'}<QuestTrack {game} />{/if}

{#if game.phase === 'reveal'}
  <RevealPhase {game} {my} />
{:else if game.phase === 'propose'}
  <ProposePhase {game} {my} />
{:else if game.phase === 'vote'}
  <VotePhase {game} {my} />
{:else if game.phase === 'voteReveal'}
  <VoteRevealPhase {game} {my} />
{:else if game.phase === 'quest'}
  <QuestPhase {game} {my} />
{:else if game.phase === 'result'}
  <ResultPhase {game} {my} />
{:else if game.phase === 'assassin'}
  <AssassinPhase {game} {my} />
{:else if game.phase === 'end'}
  <EndPhase {game} {my} />
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Crónica del reino</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div>
  </div>
{/if}

<CardFab modal="av-mycard" />
