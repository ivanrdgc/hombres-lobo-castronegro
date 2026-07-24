<script lang="ts">
  // Pantalla de partida de «Good Cop Bad Cop»: tablero + turno + fin.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import * as A from '../actions';
  import { nextAlive, turnsUntil } from '../engine';
  import { guard } from '../../../core/sync/guard';
  import { cardLabel } from '../cards';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import PlayersBoard from './PlayersBoard.svelte';
  import TurnPanel from './TurnPanel.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(A.goodCopGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const myTurn = $derived(game.turn === my.id && game.phase === 'turn' && game.alive[my.id]);
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  // Investigaciones tuyas sin leer: se muestran PLEGADAS (el móvil acaba sobre
  // la mesa) y, una vez leídas, siguen consultables en el 🎴.
  const newPeeks = $derived((game.peeks?.[my.id] || []).filter((p) => !p.ack));
  let peekOpen = $state(false);
  // Al que no le toca: cuándo juega y quién va después.
  const alive = $derived(game.playerIds.filter((p) => game.alive[p]).length);
  const nextPid = $derived(game.phase === 'turn' && alive > 1 ? nextAlive(game, game.turn) : null);
  const myWait = $derived(inGame && game.alive[my.id] ? turnsUntil(game, my.id) : -1);
  // El estado PÚBLICO de quien juega: si va armado y a quién apunta.
  const turnArmed = $derived(!!game.armed[game.turn]);
  const turnAim = $derived(game.aimAt[game.turn] && game.alive[game.aimAt[game.turn]!] ? game.aimAt[game.turn] : null);

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>🚔 Good Cop Bad Cop</h2>
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
  <div class="card"><PlayersBoard {game} {my} /></div>

  {#if newPeeks.length}
    <div class="card peekcard">
      <h3 style="margin:0 0 4px">🔒 Solo para tus ojos</h3>
      {#if !peekOpen}
        <p class="small-note" style="margin:0">🔍 Tienes {newPeeks.length === 1 ? 'el resultado de tu investigación' : `${newPeeks.length} resultados de tus investigaciones`}. Nadie más lo ve ni sale en el diario: ábrelo cuando nadie mire tu pantalla.</p>
        <button class="primary block" style="margin-top:6px" data-a="gc-peek-open" onclick={() => (peekOpen = true)}>👁 Ver a solas</button>
      {:else}
        {#each newPeeks as p, i (i)}
          <p style="margin:0 0 4px;font-size:0.92rem">🔍 {game.names[p.target] || '¿?'}, carta {p.idx + 1}: <b>{cardLabel({ kind: p.kind, role: p.role as never, up: false })}</b></p>
        {/each}
        <p class="small-note" style="margin-top:6px">Queda guardado en <b>🎴 Mi carta</b> hasta el final de la partida: no hace falta que lo memorices. Recuerda que cada uno lleva 1 carta del bando contrario, así que una sola no prueba nada.</p>
        <button class="ghost block" style="margin-top:6px" data-a="gc-peek-ok" onclick={() => { peekOpen = false; guard(A.ackPeeks); }}>✅ Entendido, ocultar</button>
      {/if}
    </div>
  {/if}

  {#if myTurn}
    <TurnPanel {game} {my} />
  {:else}
    <div class="narration">🎬 Turno de <b>{game.names[game.turn] || '¿?'}</b>: elige investigar, armarse, apuntar o disparar…
      <!-- Su estado público, aquí: es lo que dice si el peligro es inmediato. -->
      {#if turnArmed && turnAim}<br />⚠️ Va armado y apunta a <b>{game.names[turnAim] || '¿?'}</b>: puede disparar en este turno.
      {:else if turnArmed}<br />🔫 Va armado, pero todavía no apunta a nadie.{/if}
      {#if myWait === 1}<br />Eres el siguiente: ve pensando tu acción.
      {:else if myWait > 1}<br />Después va {game.names[nextPid!] || '¿?'}. Tú juegas dentro de {myWait} turnos: mientras, pregunta, acusa y negocia.
      {:else if nextPid}<br />Después va {game.names[nextPid] || '¿?'}.{/if}
    </div>
    {#if inGame && game.alive[my.id] && !game.paused}
      <!-- Desatasco: sin esto, un móvil apagado obligaba a cerrar la partida. -->
      <p style="text-align:center;margin:6px 0">
        <button class="small ghost" data-a="gc-skip-turn" onclick={() => guard(A.skipTurn)}>⏭️ Saltar el turno de {game.names[game.turn] || '¿?'} (no responde)</button>
      </p>
    {/if}
  {/if}
  {#if inGame && !game.alive[my.id]}<p class="small-note" style="text-align:center">❌ Estás fuera: tus cartas quedaron destapadas y ya no juegas turnos. Sigues mirando (y comentando) hasta el final.</p>{/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador: ves el tablero y el diario, nunca las cartas ocultas.</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario <span class="small-note" style="font-weight:400">— todo lo público: quién investiga a quién, armas, dianas y disparos</span></h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="gc-mycard" />

<style>
  /* La tarjeta privada de investigación: marcada, para no confundirla con el
     tablero público que tiene justo encima. */
  .peekcard { border-color: var(--accent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent); }
  .peekcard h3 { color: var(--moon); }
</style>
