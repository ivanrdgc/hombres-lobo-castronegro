<script lang="ts">
  // Partida de Skull en UNA pantalla (postura 🃏 mano): arriba los hechos con
  // los que se decide, en medio la mesa (pilas ajenas y su altura), abajo TU
  // mano y tu decisión. Nada de lo que hace falta para pujar o colocar está
  // detrás de un gesto; solo el diario y las reglas van plegados.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { skullGame, flip, nextRound } from '../actions';
  import { guard } from '../../../core/sync/guard';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import SkFacts from './SkFacts.svelte';
  import StacksBoard from './StacksBoard.svelte';
  import HandDock from './HandDock.svelte';
  import BidPanel from './BidPanel.svelte';
  import RulesFold from './RulesFold.svelte';
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
</script>

<!-- La fase no se repite aquí: la primera línea de los hechos ya dice qué toca. -->
<div class="topbar">
  <h2>💀 Skull</h2>
  {#if game.phase !== 'end'}<span class="chip">Ronda {game.round}</span>{/if}
  <GameMenu {game} {my} />
</div>
<Flash />

<!-- Avisos de una línea: en un móvil, una tarjeta grande aquí empuja la mano
     y la decisión fuera de la pantalla. -->
{#if needsUnlock}
  <button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la voz en este móvil (es el que narra)</button>
{/if}
{#if game.paused}
  <p class="skpaused">⏸️ <b>Partida en pausa</b> — la ha pausado {game.paused.name || 'alguien'}. Se reanuda desde el menú ⋯</p>
{/if}

{#if game.phase === 'end'}
  <EndPhase {game} />
{:else}
  <SkFacts {game} {my} />
  <StacksBoard {game} {my} onflip={(pid) => guard(() => flip(pid))} />

  {#if inGame}
    <HandDock {game} {my} onflip={(pid) => guard(() => flip(pid))} />
    <BidPanel {game} {my} />
    <!-- El espectador no juega: no le ofrecemos el botón de continuar. -->
    {#if game.phase === 'roundEnd'}
      <button class="primary block" data-a="sk-next-round" onclick={() => guard(nextRound)}>▶️ Siguiente ronda (empieza {nm(game.starter)})</button>
    {/if}
  {:else}
    <p class="small-note" style="text-align:center">👀 Sigues la partida de espectador: ves las alturas de las pilas, no lo que hay dentro.</p>
  {/if}

  <RulesFold phase={game.phase} />
{/if}

{#if game.log && game.log.length}
  <details class="sklog">
    <summary data-a="sk-log">📜 Diario de la partida ({game.log.length})</summary>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div>
  </details>
{/if}

<CardFab modal="sk-mycard" />

<style>
  .skpaused { margin: 6px 0; padding: 8px 11px; font-size: 0.83rem; border-radius: var(--r-1, 8px); border: 1px solid var(--accent, #c8a24a); background: color-mix(in srgb, var(--accent, #c8a24a) 12%, transparent); }
  /* El diario, plegado: es historia, no decisión. Se abre y se queda abierto. */
  .sklog { margin: 4px 0 0; }
  .sklog summary { font-size: 0.82rem; color: var(--muted, #999); cursor: pointer; min-height: 30px; display: flex; align-items: center; }
</style>
