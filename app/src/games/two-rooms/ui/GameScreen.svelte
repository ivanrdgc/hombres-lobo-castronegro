<script lang="ts">
  // Pantalla de partida de Two Rooms: enruta por fase. Tablero de salas siempre
  // visible durante la partida. Los dispositivos fuera de la partida ven las
  // salas de espectador (sin cartas ocultas de nadie).
  import { app, matchOf } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { twoRoomsGame } from '../actions';
  import { narrates } from '../engine';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import RoomsBoard from './RoomsBoard.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import DiscussPhase from './DiscussPhase.svelte';
  import HostagePhase from './HostagePhase.svelte';
  import EndPhase from './EndPhase.svelte';
  import Timer from './Timer.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(twoRoomsGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const iNarrate = $derived(narrates(game, my.id, group.masterId));
  const needsUnlock = $derived(iNarrate && !app.ui.audioReady && !app.ui.muted);

  // Quién cruza en la colocación: al rehén hay que avisarle EN PERSONA (el
  // tablero solo dice dónde acaba cada cual, no que te toca levantarte).
  const lastSwap = $derived(game.swaps[game.swaps.length - 1] || null);
  const iCross = $derived.by(() => {
    if (!lastSwap || !inGame) return null;
    if ((lastSwap.from0 || []).includes(my.id)) return 2;
    if ((lastSwap.from1 || []).includes(my.id)) return 1;
    return null;
  });
  const nm = (pid: string) => game.names[pid] || '¿?';
  // Los que llegan a MI sala (los que se van de la otra).
  const incoming = $derived.by(() => {
    if (!lastSwap || !inGame) return [] as string[];
    const mine = game.room[my.id];
    return (mine === 0 ? lastSwap.from1 : lastSwap.from0) || [];
  });

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>💣 Two Rooms</h2>
  {#if game.phase !== 'end' && game.phase !== 'reveal'}<span class="chip">Ronda {game.round}/{game.totalRounds}</span>{/if}
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

{#if game.phase === 'reveal'}
  <RevealPhase {game} {my} />
  <!-- El tablero también en el reparto (B22): es info pública y es JUSTO ahora
       cuando hay que saber quién va a qué sala para colocarse. -->
  <RoomsBoard {game} meId={my.id} />
{:else if game.phase === 'end'}
  <EndPhase {game} {my} />
{:else}
  <!-- El reloj, ENCIMA del tablero: con 12+ jugadores la lista es larga y la
       cuenta atrás se salía de la pantalla. -->
  {#if game.phase === 'discuss' || game.phase === 'hostages'}<Timer {game} />{/if}
  <RoomsBoard {game} meId={my.id} />
  {#if game.phase === 'discuss'}
    <DiscussPhase {game} {my} />
  {:else if game.phase === 'hostages'}
    <HostagePhase {game} {my} />
  {:else if game.phase === 'move'}
    <!-- Lo que tienes que hacer TÚ, en una frase; el tablero de arriba ya dice
         cómo quedan las salas y el reloj no corre (B29). -->
    {#if iCross}
      <div class="narration" data-a="tr-cross">🚶 TE TOCA CRUZAR a la Sala {iCross}. Coge tus cosas y cambia de espacio, sin prisa.</div>
    {:else if incoming.length}
      <div class="narration">🚶 Os quedáis donde estáis. Recibís a {incoming.map(nm).join(', ')}.</div>
    {:else}
      <div class="narration">🚶 Los rehenes cruzan de sala. Sin prisa: el reloj no corre.</div>
    {/if}
    {#if inGame}
      <button class="primary block" data-a="tr-begin" onclick={() => guard(A.beginRound)}>▶️ Empezar la ronda {game.round}</button>
    {/if}
  {/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador.</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="tr-mycard" />
