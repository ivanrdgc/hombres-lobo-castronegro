<script lang="ts">
  // Pantalla de partida de Insider: enruta por fase; cabecera con ronda y menú ⋯.
  // Los dispositivos fuera de la ronda ven un modo espectador sin secretos.
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { insiderGame } from '../actions';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import QuestionPhase from './QuestionPhase.svelte';
  import VotePhase from './VotePhase.svelte';
  import EndPhase from './EndPhase.svelte';
  import Timer from './Timer.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(insiderGame(group)!);
  const inRound = $derived(game.playerIds.includes(my.id));
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  const masterName = $derived(game.names[game.masterId] || '¿?');

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>🤫 {group.name}</h2>
  <span class="chip">Ronda {game.round}</span>
  <span class="chip">🎓 {masterName}</span>
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

{#if !inRound && game.phase !== 'end'}
  <div class="card" style="text-align:center"><span class="moon">👀</span>
    <h3>Hay una ronda en curso</h3>
    <p class="small-note">Este dispositivo no juega esta ronda: puedes seguir el reloj desde aquí. Nada de mirar pantallas ajenas.</p>
  </div>
  {#if game.phase === 'question'}<Timer {game} />{/if}
{:else if game.phase === 'reveal'}
  <RevealPhase {game} {my} />
{:else if game.phase === 'question'}
  <QuestionPhase {game} {my} spectator={!inRound} />
{:else if game.phase === 'vote'}
  <VotePhase {game} {my} />
{:else if game.phase === 'end'}
  <EndPhase {game} {my} />
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="ins-mycard" />
