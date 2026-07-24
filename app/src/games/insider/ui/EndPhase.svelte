<script lang="ts">
  // Final de ronda: se destapa el Insider y la palabra, POR QUÉ se ganó o se
  // perdió, adónde fue cada voto y cuánto suma cada uno esta ronda. Tres
  // tarjetas, tres ideas (qué pasó · los votos · el marcador) y abajo los dos
  // caminos: otra ronda o terminar. La cabecera ya dice «🌟 Fin de ronda» y el
  // número, así que aquí no se repite.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { WIN_LABELS } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { InsiderState } from '../types';

  const { game, my }: { game: InsiderState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
  const top = $derived(Math.max(0, ...game.playerIds.map((p) => game.scores[p] || 0)));
  // 👑 solo si va SOLO en cabeza: con tres empatados eran tres coronas y no se
  // entendía nada.
  const leader = $derived.by(() => {
    const tied = game.playerIds.filter((p) => (game.scores[p] || 0) === top);
    return top > 0 && tied.length === 1 ? tied[0] : null;
  });
  // Lo que ha sumado ESTA ronda (el marcador solo enseña el acumulado).
  const delta = (pid: string) =>
    game.outcome === 'group' ? (pid === game.insiderId ? 0 : 1)
      : game.outcome === 'insider' ? (pid === game.insiderId ? 2 : 0) : 0;
  // El empate dejaba `accusedId` en null y la frase desaparecía sin más: la mesa
  // veía «gana el Insider» sin entender por qué. (Con el tiempo agotado no hubo
  // voto, así que ahí no toca decir nada.)
  const voteNote = $derived(
    game.accusedId ? `La mesa señaló a ${nm(game.accusedId)}.`
      : game.outcome === 'timeout' ? ''
        : 'Voto dividido: nadie fue señalado con claridad.',
  );
  // El porqué, sin repetir los nombres que ya están en la línea de arriba.
  const reason = $derived(
    game.outcome === 'group'
      ? 'Lo cazasteis por mayoría: +1 para el Maestro y para cada común (el Insider no puntúa).'
      : game.outcome === 'insider'
        ? (game.accusedId
          ? 'Era inocente, así que el Insider se escapa: +2 para él.'
          : 'Sin mayoría clara no hay señalado, y con eso basta para que el Insider escape: +2 para él.')
        : 'El reloj llegó a cero sin que nadie dijera la palabra. En Insider eso lo pierden todos, empezando por el propio Insider: no supo llevaros a tiempo.',
  );
  const emoji = $derived(game.outcome === 'group' ? '👥' : game.outcome === 'insider' ? '🕵️' : '⏰');
  // A dónde fue cada voto: en la mesa real se señala con el dedo y se ve; aquí
  // se destapa aquí, no en el diario.
  const tally = $derived(
    game.playerIds
      .map((pid) => ({ pid, voters: game.playerIds.filter((v) => game.votes[v] === pid).map(nm) }))
      .filter((r) => r.voters.length)
      .sort((a, b) => b.voters.length - a.voters.length),
  );
  const noVote = $derived(game.playerIds.filter((pid) => game.votes[pid] === undefined).map(nm));
  // A quién le toca ser Maestro si jugáis otra: el reparto lo fija la ronda.
  const nextMaster = $derived(nm(game.playerIds[game.round % game.playerIds.length]));
</script>

<div class="card" style="text-align:center">
  <span class="moon" style="margin-top:6px">{emoji}</span>
  <h3 style="margin:6px 0">{game.outcome ? WIN_LABELS[game.outcome] : ''}</h3>
  <p class="small-note" data-a="ins-vote-note">El Insider era <b>{nm(game.insiderId)}</b> y la palabra, <b>«{game.word}»</b>.{voteNote ? ` ${voteNote}` : ''}</p>
  <p class="small-note">{reason}</p>
</div>

{#if tally.length}
  <div class="card">
    <h3>🗳️ A dónde fue cada voto</h3>
    {#each tally as row (row.pid)}
      <div class="settingrow" style="align-items:center">
        <div class="sinfo">
          <div class="sname">{row.pid === game.accusedId ? '🎯 ' : ''}{nm(row.pid)}{row.pid === game.insiderId ? ' 🕵️' : ''}</div>
          <div class="sdesc">Señalado por {row.voters.join(', ')}</div>
        </div>
        <b>{row.voters.length}</b>
      </div>
    {/each}
    {#if noVote.length}<p class="small-note">Sin votar: {noVote.join(', ')} (el recuento se cerró sin ellos).</p>{/if}
  </div>
{/if}

<div class="card">
  <h3>🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo">
        <div class="sname">{pid === leader ? '👑 ' : ''}{nm(pid)}{pid === game.masterId ? ' 🎓' : ''}{pid === game.insiderId ? ' 🕵️' : ''}{pid === my.id ? ' · tú' : ''}</div>
      </div>
      {#if delta(pid)}<span class="plus">+{delta(pid)}</span>{/if}
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
  <p class="small-note">🎓 Maestro · 🕵️ Insider de esta ronda.</p>
</div>

<!-- El botón sale en TODAS las pantallas (también en la del que solo pone la
     voz): esperar al Maestro solo servía para atascar la revancha. -->
<button class="primary block" data-a="ins-again" onclick={() => guard(A.nextRound)}>🔁 Otra ronda — el Maestro pasa a {nextMaster}</button>
<p class="small-note" style="text-align:center">Palabra nueva y otro Insider en secreto; lo pulsa cualquiera.</p>
<button class="ghost block" data-a="ins-back-lobby" onclick={() => (app.ui.modal = { type: 'ins-end' })}>🏁 Terminar y volver al lobby</button>

<style>
  .plus { color: var(--ok); font-size: 0.85rem; font-weight: 700; }
</style>
