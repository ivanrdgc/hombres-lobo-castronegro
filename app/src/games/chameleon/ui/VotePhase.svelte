<script lang="ts">
  // Votación: primero se debate en voz alta (media partida está ahí) y luego
  // cada uno señala en secreto a quien cree el Camaleón. La app cuenta y
  // destapa a la vez. No puedes votarte a ti.
  //
  // Pasada de UI: señalar a alguien es el gesto que decide la ronda, así que al
  // marcarlo se dice EN CLARO qué pasa si acertáis y qué pasa si os equivocáis,
  // con «↩️ cambiar» para volver; y quién ha votado ya deja de ser un número
  // suelto (nombres, como en la mesa real).
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import { VOTE_GRACE_MS } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ChameleonState } from '../types';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: ChameleonState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const iVoted = $derived(game.votes[my.id] !== undefined);
  const voted = $derived(game.playerIds.filter((pid) => game.votes[pid] !== undefined).length);
  const others = $derived(game.playerIds.filter((pid) => pid !== my.id));
  const pick = $derived(sel1('ch-vote'));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const choose = (pid: string) => (app.ui.sel = { key: 'ch-vote', ids: [pid] });

  // Aún nadie ha votado: el paso a votación fue un toque de más → se deshace.
  const canBack = $derived(inGame && voted === 0);
  // Alguien no responde (móvil bloqueado, se ha levantado): pasado el margen,
  // cualquiera puede cerrar el voto con lo que haya.
  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 5000); return () => clearInterval(t); });
  const done = $derived(game.playerIds.filter((pid) => game.votes[pid] !== undefined).map(nm));
  const missing = $derived(game.playerIds.filter((pid) => game.votes[pid] === undefined).map(nm));
  const canClose = $derived(inGame && voted >= 2 && missing.length > 0 && now - (game.phaseAt || 0) > VOTE_GRACE_MS);
</script>

<div class="narration">👉 Comentad las pistas y luego señalad en secreto a quien creáis el Camaleón. Han votado {voted}/{game.playerIds.length}.</div>

{#if inGame && !iVoted}
  <div class="actionpanel"><h3>🗳️ Tu voto (secreto)</h3>
    <p class="hint">Toca a quien creas el Camaleón. Nadie ve tu voto hasta que vota la mesa entera; a ti mismo no puedes señalarte.</p>
    <div class="players">
      {#each others as pid (pid)}
        <div class="player selectable {pick === pid ? 'selected' : ''}" data-a="ch-vote" data-p={pid}
          onclick={() => choose(pid)} role="button" tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') choose(pid); }}>
          <span class="pname">{nm(pid)}</span>
          {#if game.votes[pid] !== undefined}<span class="vdone" title="ya ha votado">🗳️</span>{/if}
          {#if pick === pid}<span>✔️</span>{/if}
        </div>
      {/each}
    </div>

    {#if pick}
      <!-- Lo que está en juego, con el nombre puesto: es lo único irreversible
           de la ronda y antes se confirmaba a ciegas. -->
      <div class="stake" data-a="ch-vote-stake">
        <p class="stitle">Señalas a <b>{nm(pick)}</b>. Si la mesa coincide:</p>
        <p class="sline">✅ <b>Si es el Camaleón</b> → última bala: tendrá que adivinar la palabra. Si falla, ganáis.</p>
        <p class="sline">❌ <b>Si es inocente</b> → la ronda acaba ahí: el Camaleón gana 2 puntos sin adivinar nada.</p>
        <p class="sline">🤝 <b>Si hay empate</b> → nadie queda señalado y el Camaleón escapa igual.</p>
      </div>
    {/if}

    <button class="danger block" data-a="ch-vote-confirm" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.castVote(pick); clearSel(); }) : undefined)}>👉 {pick ? `Señalar a ${nm(pick)}` : 'Señala primero al sospechoso'}</button>
    {#if pick}
      <div style="text-align:center;margin-top:8px">
        <button class="small ghost" data-a="ch-vote-change" onclick={() => clearSel()}>↩️ Cambiar de sospechoso</button>
      </div>
    {:else}
      <p class="small-note" style="text-align:center;margin-top:8px">El botón se activa en cuanto toques un nombre.</p>
    {/if}
  </div>
{:else if inGame}
  <div class="card"><h3>✅ Tu voto está echado</h3>
    <p class="small-note" style="margin-top:0">Se destapa cuando haya votado todo el mundo: entonces veréis quién señaló a quién.</p>
    {#if missing.length}<p class="small-note">⏳ Faltan por votar: <b>{missing.join(', ')}</b>.</p>{/if}</div>
{:else}
  <div class="card"><h3>👀 La mesa está votando</h3>
    <p class="small-note" style="margin-top:0">Miras de espectador. {#if missing.length}Faltan por votar: <b>{missing.join(', ')}</b>.{:else}Ya han votado todos.{/if}</p></div>
{/if}

<!-- Lo público, en pantalla: en la mesa real se ve quién ya ha señalado (no a
     quién), y era justo lo que faltaba para saber a quién esperáis. -->
{#if done.length && !(inGame && !iVoted)}
  <p class="small-note" style="text-align:center">🗳️ Ya han votado: {done.join(', ')}.</p>
{/if}

{#if canBack}
  <div style="text-align:center;margin:10px 0">
    <button class="small ghost" data-a="ch-back-clues" onclick={() => guard(A.backToClues)}>↩️ Volver a las pistas (aún no ha votado nadie)</button>
  </div>
{:else if canClose}
  <div class="card"><p class="small-note" style="margin-top:0">⏱️ Falta por votar: {missing.join(', ')}. Si no están o no responden, la ronda se resuelve con los votos que haya.</p>
    <button class="ghost block" data-a="ch-close-vote" onclick={() => guard(A.closeVote)}>🗳️ Cerrar la votación sin ellos</button></div>
{/if}
{#if inGame}<MyCard {game} pid={my.id} mini={true} />{/if}

<style>
  .stake {
    margin: 12px 0 4px; padding: 10px 12px; border-radius: 10px;
    border: 1px solid var(--accent, #f2b552);
    background: color-mix(in srgb, var(--accent, #f2b552) 10%, transparent);
  }
  .stake .stitle { font-size: 0.92rem; margin: 0 0 6px; }
  .stake .sline { font-size: 0.84rem; margin: 5px 0; color: var(--muted, #a9a6c0); }
  .vdone { font-size: 0.8rem; opacity: 0.7; }
</style>
