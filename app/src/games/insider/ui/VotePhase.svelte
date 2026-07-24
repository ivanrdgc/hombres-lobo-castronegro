<script lang="ts">
  // Caza del Insider: cada jugador (también el Maestro) señala en secreto a un
  // sospechoso. La lista es UNA sola y sale entera: los que no se pueden señalar
  // aparecen apagados CON EL MOTIVO (antes desaparecían y la mesa no entendía
  // por qué faltaban nombres). La app cuenta y destapa a la vez.
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

<div class="narration">👉 Adivinada la palabra. Entre vosotros hubo un Insider empujando las preguntas: comentadlo y señaladlo en secreto. Han votado {voted} de {game.playerIds.length}.</div>

<div class="card" style="margin-bottom:0">
  <p class="small-note" style="margin-top:0">🏆 <b>Si el más señalado es el Insider</b>, lo cazáis: +1 para el Maestro y para cada común. <b>Si señaláis a un inocente o hay empate</b>, el Insider escapa: +2 para él. Nadie ve tu voto hasta el recuento.</p>
</div>

{#if inGame && !iVoted}
  <div class="actionpanel">
    <h3>🗳️ ¿Quién era el Insider?</h3>
    <p class="hint">Toca un nombre y confirma abajo. Puedes cambiarlo tocando otro; una vez confirmado, no.</p>
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
         marcado parecía un error de la app, no un paso pendiente. -->
    <button class="{pick ? 'danger' : 'ghost'} block" data-a="ins-vote-confirm" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.castVote(pick); clearSel(); }) : undefined)}>👉 {pick ? `Señalar a ${nm(pick)} como Insider` : 'Elige antes a un sospechoso'}</button>
    {#if !pick}<p class="small-note">Ninguno marcado todavía: toca el nombre de quien te parezca que sabía la palabra.</p>{/if}
    <RolesRef />
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

<style>
  /* Nombre + motivo en dos líneas: el motivo NO cabe en `.pname` (una línea con
     puntos suspensivos) y en móvil se perdía. */
  .pcol { flex: 1; min-width: 0; }
  .why { font-size: 0.8rem; color: var(--muted); white-space: normal; line-height: 1.25; margin-top: 2px; }
</style>
