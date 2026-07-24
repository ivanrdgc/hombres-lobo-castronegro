<script lang="ts">
  // Pantalla de partida de «Good Cop Bad Cop». Postura de MESA (B28): el móvil
  // se queda plano y solo lo coges en tu turno, así que ESTA pantalla es
  // IDÉNTICA en todos los móviles — mismo texto, mismos bloques, mismo alto.
  // Nada tuyo (cartas, carta de LÍDER, lo investigado, cuántas veces has
  // mirado) asoma aquí: todo eso vive detrás del gesto 🎴.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import * as A from '../actions';
  import { nextAlive } from '../engine';
  import { guard } from '../../../core/sync/guard';
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
  // La cola de turnos, PÚBLICA y en el mismo orden para todos: antes esta línea
  // decía «tú juegas dentro de N turnos», que cambiaba de un móvil a otro.
  const alive = $derived(game.playerIds.filter((p) => game.alive[p]).length);
  const queue = $derived.by(() => {
    if (game.phase !== 'turn' || alive < 2) return [] as string[];
    const out: string[] = [];
    let cur = game.turn;
    for (let i = 0; i < Math.min(3, alive - 1); i++) { cur = nextAlive(game, cur); out.push(game.names[cur] || '¿?'); }
    return out;
  });
  const queueMore = $derived(alive - 1 > queue.length);
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
  <!-- Lo que hay que hacer AHORA, arriba y sin scroll (B29): en tu turno, el
       panel de acción; esperando, de quién es el turno y qué se le viene. -->
  {#if myTurn}
    <TurnPanel {game} {my} />
    <div class="card"><PlayersBoard {game} {my} /></div>
  {:else}
    <div class="narration">🎬 Turno de <b>{game.names[game.turn] || '¿?'}</b>: investiga, se arma, apunta o dispara.
      <!-- Su estado público, aquí: es lo que dice si el peligro es inmediato. -->
      {#if turnArmed && turnAim}<br />⚠️ Va armado y apunta a <b>{game.names[turnAim] || '¿?'}</b>: puede disparar en este turno.
      {:else if turnArmed}<br />🔫 Va armado, pero todavía no apunta a nadie.{/if}
      {#if queue.length}<br />Después: {queue.join(' → ')}{queueMore ? '…' : ''}. Mientras tanto, pregunta, acusa y negocia.{/if}
    </div>
    <div class="card"><PlayersBoard {game} {my} /></div>
    {#if inGame && game.alive[my.id] && !game.paused}
      <!-- Desatasco: sin esto, un móvil apagado obligaba a cerrar la partida. -->
      <p style="text-align:center;margin:6px 0">
        <button class="small ghost" data-a="gc-skip-turn" onclick={() => guard(A.skipTurn)}>⏭️ Saltar el turno de {game.names[game.turn] || '¿?'} (no responde)</button>
      </p>
    {/if}
  {/if}
  {#if inGame && !game.alive[my.id]}<p class="small-note" style="text-align:center">❌ Estás fuera: tus cartas quedaron destapadas y ya no juegas turnos. Sigues mirando (y comentando) hasta el final.</p>{/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador: ves el tablero y el diario, nunca las cartas ocultas.</p>{/if}
  <!-- El mismo recordatorio en TODOS los móviles: lo privado no vive aquí. -->
  <p class="small-note" style="text-align:center">🎴 Tus cartas y lo que has visto están en el botón de abajo, y se tapan solas. Móvil plano en la mesa.</p>
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario <span class="small-note" style="font-weight:400">— todo lo público: quién investiga a quién, armas, dianas y disparos</span></h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="gc-mycard" />
