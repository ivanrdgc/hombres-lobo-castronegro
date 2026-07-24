<script lang="ts">
  // Caza del Insider: cada jugador (también el Maestro) señala en secreto a un
  // sospechoso. La lista es UNA sola y sale entera: los que no se pueden señalar
  // aparecen apagados CON EL MOTIVO (antes desaparecían y la mesa no entendía
  // por qué faltaban nombres). La app cuenta y destapa a la vez.
  // Nada en esta pantalla dice a quién has señalado: el reparto de puntos vive
  // en la chuleta del pie (una sola vez) y el botón no canta tu voto.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { InsiderState } from '../types';
  import RolesRef from './RolesRef.svelte';

  const { game, my }: { game: InsiderState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const iVoted = $derived(game.votes[my.id] !== undefined);
  const canForce = $derived(inGame && A.canForceTally(game, my.id));
  const nm = (pid: string) => game.names[pid] || '¿?';
  // Quién falta POR NOMBRE: hace falta el 100 % de los votos y sin reloj; con un
  // «3/4» pelado la mesa no sabía a quién mirar.
  const pending = $derived(game.playerIds.filter((pid) => game.votes[pid] === undefined).map(nm));
  const voted = $derived(game.playerIds.length - pending.length);
  const pick = $derived(sel1('ins-vote'));
  const choose = (pid: string) => (app.ui.sel = { key: 'ins-vote', ids: [pid] });
  // Se puede señalar a cualquiera menos a uno mismo y al Maestro (es público).
  const why = (pid: string) => (pid === my.id ? 'eres tú: no puedes votarte' : pid === game.masterId ? '🎓 público: no puede ser el Insider' : '');
</script>

<div class="narration">👉 Palabra adivinada. Comentad quién orientaba las preguntas con demasiada puntería y señaladlo en secreto. Han votado {voted} de {game.playerIds.length}.</div>

{#if inGame && !iVoted}
  <div class="actionpanel">
    <h3>🗳️ ¿Quién era el Insider?</h3>
    <p class="hint">Toca un nombre y confirma abajo. Puedes cambiarlo tocando otro; una vez confirmado, no. Nadie ve tu voto hasta el recuento.</p>
    <div class="players">
      {#each game.playerIds as pid (pid)}
        {@const blocked = why(pid)}
        {@const st = game.votes[pid] !== undefined ? '✅ ya ha votado' : '⏳ aún no ha votado'}
        {#if blocked}
          <div class="player dim">
            <div class="pcol">
              <div class="pname">{nm(pid)}</div>
              <div class="why">{blocked}</div>
            </div>
          </div>
        {:else}
          <div class="player selectable {pick === pid ? 'selected' : ''}" data-a="ins-vote" data-p={pid}
            onclick={() => choose(pid)} role="button" tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') choose(pid); }}>
            <div class="pcol">
              <div class="pname">{nm(pid)}</div>
              <div class="why">{st}</div>
            </div>
            {#if pick === pid}<span>✔️</span>{/if}
          </div>
        {/if}
      {/each}
    </div>
    <!-- Rojo solo cuando ya hay a quién señalar: en gris-rojo y sin nadie
         marcado parecía un error de la app, no un paso pendiente. El botón NO
         dice el nombre: era el texto más grande de la pantalla y cantaba tu voto
         al vecino antes de echarlo (el ✔️ de la fila, a un palmo, ya lo dice). -->
    <button class="{pick ? 'danger' : 'ghost'} block" data-a="ins-vote-confirm" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.castVote(pick); clearSel(); }) : undefined)}>👉 {pick ? 'Señalar en secreto a quien he marcado' : 'Elige antes a un sospechoso'}</button>
    {#if !pick}<p class="small-note">Ninguno marcado todavía: toca el nombre de quien te parezca que sabía la palabra.</p>
    {:else}<p class="small-note">Repasa el ✔️ antes de confirmar: tu voto no aparece en ninguna pantalla hasta el recuento.</p>{/if}
  </div>
{:else if inGame}
  <div class="card">
    <h3>✅ Tu voto está echado</h3>
    <p class="hint" data-a="ins-pending" style="margin-bottom:0">{pending.length ? `Falta por votar: ${pending.join(', ')}. En cuanto voten todos se destapa el recuento a la vez.` : 'Recontando…'}</p>
    {#if canForce}
      <!-- Salida de emergencia: sin ella, un móvil muerto dejaba la ronda
           colgada y la única escapatoria era Terminar (que borra el marcador). -->
      <p class="small-note">¿Alguien se ha quedado sin móvil? Puedes cerrar el recuento con los votos que haya (los que falten no cuentan).</p>
      <button class="ghost block" data-a="ins-force-tally" onclick={() => guard(A.forceTally)}>⏭️ Cerrar el recuento sin {pending.join(', ')}</button>
    {/if}
  </div>
{:else}
  <div class="card"><p class="hint" data-a="ins-pending">👀 La mesa está cazando al Insider… Falta por votar: {pending.join(', ') || '…'}</p></div>
{/if}

<RolesRef />

<style>
  /* Nombre + motivo en dos líneas: el motivo NO cabe en `.pname` (una línea con
     puntos suspensivos) y en móvil se perdía. */
  .pcol { flex: 1; min-width: 0; }
  .why { font-size: 0.8rem; color: var(--muted); white-space: normal; line-height: 1.25; margin-top: 2px; }
</style>
