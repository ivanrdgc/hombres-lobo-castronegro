<script lang="ts">
  // Pantalla de partida de El Espía: enruta por fase; cabecera con ronda y
  // menú ⋯. Los dispositivos fuera de la ronda ven un modo espectador sin
  // información secreta (ni lugar ni papeles hasta el final).
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { espiaGame } from '../actions';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import PlayPhase from './PlayPhase.svelte';
  import TimeupPhase from './TimeupPhase.svelte';
  import EndPhase from './EndPhase.svelte';
  import VotePanel from './VotePanel.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(espiaGame(group)!);
  const inRound = $derived(game.playerIds.includes(my.id));
  // Solo pedimos activar si el audio NO suena ya (estado real del AudioContext),
  // no según una bandera: cualquier toque previo ya lo habrá reanudado.
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }

  let logEl: HTMLElement | null = $state(null);
  $effect(() => {
    void (game.log || []).length;
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  });
</script>

<div class="topbar">
  <h2>🕵️ El Espía</h2>
  <span class="chip">Ronda {game.round}</span>
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
  <div class="card" style="text-align:center">
    <span class="moon">⏸️</span>
    <h3>Partida en pausa</h3>
    <p class="small-note">La ha pausado {game.paused.name || 'alguien'}. El reloj está congelado: nadie puede acusar ni votar hasta que se reanude (⋯ → ▶️ Reanudar).</p>
  </div>
{/if}

{#if !inRound && game.phase !== 'end'}
  <div class="card" style="text-align:center">
    <span class="moon">👀</span>
    <h3>Miras desde fuera</h3>
    <p class="small-note">No juegas esta ronda: sigue el reloj y las votaciones desde aquí. Entre rondas puedes sentarte a la mesa.</p>
  </div>
  {#if game.vote}<VotePanel {game} {my} />{/if}
  <!-- El espectador ve la MISMA fase que la mesa: en «timeup» no hay reloj,
       sino turnos de acusación (antes se quedaba con la pantalla de juego). -->
  {#if game.phase === 'play'}<PlayPhase {game} {my} spectator={true} />
  {:else if game.phase === 'timeup'}<TimeupPhase {game} {my} />{/if}
{:else if game.phase === 'reveal'}
  <RevealPhase {game} {my} />
{:else if game.phase === 'play'}
  {#if game.vote}<VotePanel {game} {my} />{/if}
  <PlayPhase {game} {my} spectator={false} />
{:else if game.phase === 'timeup'}
  {#if game.vote}<VotePanel {game} {my} />{/if}
  <TimeupPhase {game} {my} />
{:else if game.phase === 'end'}
  <EndPhase {game} {my} />
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario de la misión</h3>
    <div class="log" bind:this={logEl}>
      {#each game.log as l, i (i)}<p>{l.txt}</p>{/each}
    </div></div>
{/if}

<CardFab modal="espia-mycard" />
