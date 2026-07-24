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
  // En qué momento de la ronda estamos, siempre en la cabecera: la fase se
  // anunciaba por voz una vez y quien llegaba tarde a la pantalla no la tenía.
  // Rótulos cortos: en 390 px, un chip largo (o uno de más) se comía el nombre
  // de la mesa en la cabecera.
  const PHASE_CHIP: Record<string, string> = {
    reveal: '🎴 Reparto', question: '⏱ Preguntas', vote: '🗳️ Votación', end: '🌟 Fin de ronda',
  };
  const SPECTATOR_NOW: Record<string, string> = {
    reveal: 'Están mirando su carta en secreto.',
    question: 'Preguntan de sí o no contrarreloj para cercar la palabra.',
    vote: 'Adivinaron la palabra: ahora señalan en secreto al Insider.',
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
  <h2>🤫 {group.name}</h2>
  <span class="chip">Ronda {game.round}</span>
  <span class="chip">{PHASE_CHIP[game.phase] || ''}</span>
  <GameMenu {game} {my} />
</div>
<Flash />

{#if needsUnlock}
  <div class="card" style="text-align:center"><span class="moon">🔊</span><h3>Este dispositivo pone la voz</h3>
    <button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la voz</button></div>
{/if}
{#if game.paused}
  <div class="card" style="text-align:center"><span class="moon">⏸️</span><h3>Partida en pausa</h3>
    <p class="small-note">La ha pausado {game.paused.name || 'alguien'}. Nadie puede actuar y el reloj está congelado: los botones vuelven al reanudar (⋯ → ▶️ Reanudar).</p></div>
{/if}

{#if !inRound && game.phase !== 'end'}
  <div class="card" style="text-align:center"><span class="moon">👀</span>
    <h3>Hay una ronda en curso</h3>
    <p class="small-note" style="margin-top:0">{SPECTATOR_NOW[game.phase] || ''} El Maestro es {masterName}.</p>
    <p class="small-note">Este dispositivo no juega esta ronda: puedes seguir el reloj desde aquí. Nada de mirar pantallas ajenas.</p>
  </div>
  {#if game.phase === 'question'}<Timer {game} />{/if}
{:else if game.paused}
  <!-- En pausa el reloj sigue a la vista (congelado), pero NO se pinta la fase:
       sus botones respondían con un silencio (la transacción se descarta) y la
       mesa creía que la app se había colgado. -->
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
