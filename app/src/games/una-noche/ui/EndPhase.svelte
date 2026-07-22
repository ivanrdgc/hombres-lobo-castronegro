<script lang="ts">
  // Final: se revela todo. Cada jugador muestra su carta INICIAL → FINAL (con
  // flecha si cambió), las cartas del centro, la decisión del pueblo y el bando
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
</script>

<div class="narration">🌅 Amanece del todo y se destapan las cartas.</div>

<div class="card" style="text-align:center">
  {#each winners as w (w)}<h3 style="margin:6px 0">{WIN_LABELS[w]}</h3>{/each}
</div>

<div class="card">
  <h3>⚖️ El juicio</h3>
  <p class="small-note" style="margin-top:2px">{game.lynched == null || game.lynched === 'nadie' ? 'El pueblo perdonó: no condenó a nadie.' : `El pueblo condenó a ${nm(game.lynched)}.`}</p>
  <p class="small-note">{(game.deaths || []).length ? `💀 Cayó: ${(game.deaths || []).map(nm).join(', ')}.` : '🕊️ No cayó nadie.'}</p>
</div>

<div class="card">
  <h3>🎴 Las cartas, al final</h3>
  {#each players as p (p.id)}
    {@const orig = game.originalRole[p.id]}
    {@const fin = finals[p.id]}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{nm(p.id)}{p.id === my.id ? ' (tú)' : ''} {dead.has(p.id) ? '💀' : ''}</div>
        <div class="sdesc">{rn(orig)}{fin !== orig ? ` → ${rn(fin)}` : ''}{#if orig === 'doble' && game.acts.dobleRole} · copió {ROLES[game.acts.dobleRole].name}{/if}</div></div>
    </div>
  {/each}
  <p class="small-note" style="margin-top:8px">🃏 Centro (al final): {game.center.map(rn).join(', ')}</p>
</div>

<button class="primary block" data-a="una-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida (mismos jugadores)</button>
<button class="ghost block" data-a="una-back-lobby" onclick={() => guard(() => A.endUnaNoche())}>🏁 Terminar y volver al lobby</button>
