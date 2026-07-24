<script lang="ts">
  // Pantalla de partida de «Skull»: cabecera + tablero de pilas + fase.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { skullGame, flip, nextRound } from '../actions';
  import { guard } from '../../../core/sync/guard';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import StacksBoard from './StacksBoard.svelte';
  import SetupPhase from './SetupPhase.svelte';
  import PlayPhase from './PlayPhase.svelte';
  import BidPhase from './BidPhase.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(skullGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
  const nm = (pid: string) => game.names[pid] || '¿?';
  // En qué momento de la ronda estamos, sin tener que leerlo entre líneas.
  const phaseChip = $derived(
    game.phase === 'setup' ? '🌸 Colocación'
      : game.phase === 'play' ? '🎬 Turnos'
        : game.phase === 'bid' ? '🗣️ Puja'
          : game.phase === 'reveal' ? '🎲 Revelado'
            : game.phase === 'roundEnd' ? '🔄 Fin de ronda' : '',
  );
</script>

<div class="topbar">
  <h2>💀 {group.name}</h2>
  {#if game.phase !== 'end'}<span class="chip">Ronda {game.round}</span>{/if}
  {#if phaseChip}<span class="chip">{phaseChip}</span>{/if}
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
  <div class="card"><StacksBoard {game} {my} onflip={(pid) => guard(() => flip(pid))} /></div>
  {#if game.phase === 'setup'}
    <SetupPhase {game} {my} />
  {:else if game.phase === 'play'}
    <PlayPhase {game} {my} />
  {:else if game.phase === 'bid'}
    <BidPhase {game} {my} />
  {:else if game.phase === 'reveal'}
    <RevealPhase {game} {my} />
  {:else if game.phase === 'roundEnd'}
    {#if game.lastResult}<div class="narration">{game.lastResult.text}</div>{/if}
    <div class="card">
      <p class="hint" style="margin:0">🔄 Se recogen todas las pilas: cada uno recupera sus discos (menos el descartado al fallar).</p>
      <p class="small-note">La ronda {game.round + 1} la empieza <b>{nm(game.starter)}</b>. Los ⭐ del tablero son los retos ganados: con dos se acaba la partida.</p>
    </div>
    <!-- El espectador no juega: no le ofrecemos el botón de continuar. -->
    {#if inGame}
      <button class="primary block" data-a="sk-next-round" onclick={() => guard(nextRound)}>▶️ Siguiente ronda (empieza {nm(game.starter)})</button>
    {/if}
  {/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador (sin ver las pilas ocultas).</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="sk-mycard" />
