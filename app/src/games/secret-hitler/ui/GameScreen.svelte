<script lang="ts">
  // Pantalla de partida de Secret Hitler: cabecera + tablero + fase actual
  // + crónica. Enruta por game.phase.
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { shGame } from '../actions';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import Board from './Board.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import NominatePhase from './NominatePhase.svelte';
  import ElectionPhase from './ElectionPhase.svelte';
  import LegislativePhase from './LegislativePhase.svelte';
  import PowerPhase from './PowerPhase.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(shGame(group)!);
  const executed = $derived(game.playerIds.includes(my.id) && game.alive[my.id] === false);
  // Solo pedimos activar si el audio NO suena ya (estado real del AudioContext).
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  const legislative = $derived(['legislativePresident', 'legislativeChancellor', 'vetoDecision'].includes(game.phase));

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>🏛️ Secret Hitler</h2>
  <!-- Sin marcador de decretos: vive en el tablero, dos dedos más abajo (B29).
       El ejecutado sí lleva su estado siempre a la vista, en cualquier fase. -->

  {#if executed}<span class="chip" data-a="sh-dead-chip">💀 Ejecutado</span>{/if}
  <GameMenu {game} {my} />
</div>
<Flash />

{#if needsUnlock}
  <div class="card" style="text-align:center"><span class="moon">🔊</span><h3>Este dispositivo pone la voz</h3>
    <button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la voz</button></div>
{/if}
{#if game.paused}
  <div class="card" style="text-align:center"><span class="moon">⏸️</span><h3>Partida en pausa</h3>
    <p class="small-note">La ha pausado {game.paused.name || 'alguien'}. Los paneles vuelven al reanudar (menú ⋯ → ▶️ Reanudar).</p></div>
{/if}

{#if game.phase !== 'reveal'}<Board {game} />{/if}

<!-- En pausa se ocultan los paneles de acción: si se dejan a la vista, la mesa
     toca botones que la transacción descarta en silencio. -->
{#if !game.paused}
  {#if game.phase === 'reveal'}
    <RevealPhase {game} {my} />
  {:else if game.phase === 'nominate'}
    <NominatePhase {game} {my} />
  {:else if game.phase === 'election'}
    <ElectionPhase {game} {my} />
  {:else if legislative}
    <LegislativePhase {game} {my} />
  {:else if game.phase === 'power'}
    <PowerPhase {game} {my} />
  {:else if game.phase === 'end'}
    <EndPhase {game} {my} />
  {/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Crónica</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="sh-mycard" />
