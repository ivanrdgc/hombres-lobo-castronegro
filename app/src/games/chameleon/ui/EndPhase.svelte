<script lang="ts">
  // Final de ronda: se destapa la palabra secreta, el Camaleón y el RECUENTO del
  // voto (quién señaló a quién: es lo que la app prometía y nunca enseñaba),
  // con el porqué del desenlace y el marcador acumulado.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { WIN_LABELS, outcomeReason, voteRows } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ChameleonState } from '../types';
  import Grid from './Grid.svelte';

  const { game, my }: { game: ChameleonState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
  const rows = $derived(voteRows(game));
  const sinVoto = $derived(game.playerIds.filter((pid) => !game.votes?.[pid]).map(nm));
  void my;
</script>

<!-- B29: la banda «Fin de la ronda» repetía el chip de la cabecera, y el nombre
     del Camaleón salía tres veces en cuatro líneas. Ahora: quién gana, por qué,
     y los dos datos que la mesa quiere ver (quién era y cuál era la palabra). -->
<div class="card" style="text-align:center">
  <h3 style="margin:6px 0">{game.winner ? WIN_LABELS[game.winner] : ''}</h3>
  <p class="reason">{outcomeReason(game)}</p>
  <p class="facts">🦎 <b>{nm(game.chameleonId)}</b> · 🔑 <b>«{game.grid[game.secret]}»</b>{game.guess !== null ? ` · 🎯 apostó por «${game.grid[game.guess]}»` : ''}</p>
  <Grid grid={game.grid} secret={game.secret} guess={game.guess} />
</div>

<div class="card tally">
  <h3>🗳️ El recuento</h3>
  {#if rows.length}
    {#each rows as r (r.pid)}
      <div class="settingrow" style="align-items:center">
        <div class="sinfo">
          <div class="sname">{r.pid === game.accusedId ? '👉 ' : ''}{nm(r.pid)}{r.pid === game.chameleonId ? ' 🦎' : ''}</div>
          <div class="sdesc">votaron: {r.voters.map(nm).join(', ')}</div>
        </div>
        <b>{r.voters.length}</b>
      </div>
    {/each}
    {#if sinVoto.length}<p class="small-note">Sin votar: {sinVoto.join(', ')}.</p>{/if}
    <p class="small-note" style="margin-bottom:0">{game.accusedId ? `La mesa señaló a ${nm(game.accusedId)}.` : 'Empate en cabeza: la mesa no señaló a nadie.'}</p>
  {:else}
    <p class="small-note" style="margin:0">Nadie llegó a votar en esta ronda.</p>
  {/if}
</div>

<div class="card">
  <h3>🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{nm(pid)}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="ch-again" onclick={() => guard(A.nextRound)}>🔁 Otra ronda</button>
<!-- Con confirmación: al lado de «Otra ronda», un toque de más borraba la partida y el marcador. -->
<button class="ghost block" data-a="ch-back-lobby" onclick={() => (app.ui.modal = { type: 'ch-end' })}>🏁 Terminar y volver al lobby</button>

<style>
  /* El recuento es PÚBLICO y es la recompensa de la ronda: se lee a un palmo,
     con el móvil todavía plano en la mesa. A 0,78 rem y en gris de nota al pie
     era justo el tipo de letra que Iván no podía leer. */
  .tally :global(.sdesc) { font-size: 0.86rem; color: var(--text, #eceaf6); opacity: 0.85; }
  .tally :global(.sname) { font-size: 1rem; font-weight: 600; }
  .reason { font-size: 0.95rem; margin: 4px 0 8px; }
  /* Los dos datos que todo el mundo mira: ni en gris ni en letra de nota. */
  .facts { font-size: 1rem; margin: 0 0 2px; }
</style>
