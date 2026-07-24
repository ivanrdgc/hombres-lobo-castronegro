<script lang="ts">
  // La mesa de la ronda de un vistazo: quién abrió el interrogatorio, quién ya
  // gastó su acusación y —tras el tiempo— de quién es el turno. Todo escrito:
  // en el móvil no hay «title» que valga (B25/B26, punto 9).
  import { timeupOrder } from '../engine';
  import type { EspiaState } from '../types';

  const { game, myId }: { game: EspiaState; myId: string } = $props();

  const timeup = $derived(game.phase === 'timeup');
  const order = $derived(timeup ? timeupOrder(game) : game.playerIds);
  const turnPid = $derived(timeup && game.timeupTurn !== null ? order[game.timeupTurn] : null);
  const anyUsed = $derived(!timeup && game.playerIds.some((id) => game.accusedUsed[id]));
  const anyDone = $derived(timeup && (game.timeupTurn ?? 0) > 0);
</script>

<div class="mesa">
  {#each order as pid, i (pid)}
    {@const done = timeup && game.timeupTurn !== null && i < game.timeupTurn}
    <span class="seat {turnPid === pid ? 'turn' : ''} {done ? 'done' : ''}" data-a="espia-seat" data-p={pid}>
      <b>{game.names[pid] || '¿?'}{pid === myId ? ' (tú)' : ''}</b>
      {#if pid === game.dealerId}<span class="mk">❓ abrió</span>{/if}
      {#if !timeup && game.accusedUsed[pid]}<span class="mk">🛑 ya acusó</span>{/if}
      {#if turnPid === pid}<span class="mk">👉 le toca</span>{/if}
      {#if done}<span class="mk">✔️ ya pasó</span>{/if}
    </span>
  {/each}
</div>
<p class="small-note" style="margin-top:6px">
  🪑 Juegan {game.playerIds.length} · <b>❓ abrió</b> el interrogatorio (reparte y pregunta primero)
  {#if timeup}· <b>👉 le toca</b> acusar o pasar{/if}
  {#if anyDone}· <b>✔️ ya pasó</b> por su turno{/if}
  {#if anyUsed}· <b>🛑 ya acusó</b> = gastó SU acusación de esta ronda, lo que no dice nada de su culpa{/if}
</p>

<style>
  .mesa { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0; }
  .seat {
    display: inline-flex; align-items: baseline; gap: 6px; flex-wrap: wrap;
    background: var(--card2); border: 1px solid var(--border); border-radius: var(--r-full);
    padding: 7px 13px; font-size: 0.88rem; min-height: 38px;
  }
  .seat.turn { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, var(--card2)); }
  .seat.done { opacity: 0.5; }
  .mk { font-size: 0.78rem; color: var(--muted); }
  .seat.turn .mk { color: var(--moon); }
</style>
