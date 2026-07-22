<script lang="ts">
  // Final: se revela todo. Cada jugador muestra su carta INICIAL → FINAL (con
  // flecha si cambió), las cartas del centro, el recuento del voto y el bando
  // ganador (Una Noche admite varios ganadores a la vez).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ROLES } from '../roles';
  import { finalRolesOf, playersOf, WIN_LABELS } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState, RoleId } from '../types';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

  const players = $derived(playersOf(game));
  const finals = $derived(finalRolesOf(game, players));
  const winners = $derived(game.winners && game.winners.length ? game.winners : ['nadie']);
  const dead = $derived(new Set(game.deaths || []));
  const rn = (r: RoleId) => `${ROLES[r].emoji} ${ROLES[r].name}`;
  const nm = (pid: string) => game.names[pid] || '¿?';
  const votesOf = (pid: string) => Object.entries(game.votes || {}).filter(([, t]) => t === pid).map(([v]) => nm(v));
</script>

<div class="narration">🌅 Amanece del todo y se destapan las cartas.</div>

<div class="card" style="text-align:center">
  {#each winners as w (w)}<h3 style="margin:6px 0">{WIN_LABELS[w]}</h3>{/each}
</div>

<div class="card">
  <h3>🎴 Las cartas, al final</h3>
  {#each players as p (p.id)}
    {@const orig = game.originalRole[p.id]}
    {@const fin = finals[p.id]}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{nm(p.id)}{p.id === my.id ? ' (tú)' : ''} {dead.has(p.id) ? '💀' : ''}</div>
        <div class="sdesc">{rn(orig)}{fin !== orig ? ` → ${rn(fin)}` : ''}{#if orig === 'doble' && game.acts.dobleRole} · copió {ROLES[game.acts.dobleRole].name}{/if}</div></div>
      <div class="btnrow" style="flex:0 0 auto">{#if votesOf(p.id).length}<span class="badge">🗳️ {votesOf(p.id).length}</span>{/if}</div>
    </div>
  {/each}
  <p class="small-note" style="margin-top:8px">🃏 Centro: {game.center.map(rn).join(', ')}</p>
</div>

<div class="card">
  <h3>🗳️ El voto</h3>
  {#each players as p (p.id)}
    <p class="small-note" style="margin:4px 0">{nm(p.id)} → <b>{game.votes[p.id] ? nm(game.votes[p.id]) : '—'}</b></p>
  {/each}
  <p class="small-note" style="margin-top:8px">{(game.deaths || []).length ? `💀 Cae: ${(game.deaths || []).map(nm).join(', ')}.` : '🕊️ No cayó nadie.'}</p>
</div>

<button class="primary block" data-a="una-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida (mismos jugadores)</button>
<button class="ghost block" data-a="una-back-lobby" onclick={() => guard(() => A.endUnaNoche())}>🏁 Terminar y volver al lobby</button>
