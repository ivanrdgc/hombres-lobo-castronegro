<script lang="ts">
  // Final: se revela todo. Cada jugador muestra su carta INICIAL → FINAL (con
  // flecha si cambió), las cartas del centro, la decisión del pueblo y el bando
  // ganador (Una Noche admite varios ganadores a la vez).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ROLES } from '../roles';
  import { finalRolesOf, playersOf, WIN_LABELS } from '../engine';
  import { playerHistory } from '../history';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState, RoleId, WinnerId } from '../types';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

  const players = $derived(playersOf(game));
  const finals = $derived(finalRolesOf(game, players));
  const winners = $derived<WinnerId[]>(game.winners && game.winners.length ? game.winners : ['nadie']);
  const dead = $derived(new Set(game.deaths || []));
  const rn = (r: RoleId) => `${ROLES[r].emoji} ${ROLES[r].name}`;
  const nm = (pid: string) => game.names[pid] || '¿?';
  // La revancha re-reparte al instante PARA TODOS y borra esta revelación
  // mientras el resto la lee: se confirma antes de barrer la mesa.
  let againArmed = $state(false);
</script>

<div class="narration">🌅 Amanece del todo y se destapan las cartas.</div>

<!-- B29: el desenlace es UNA idea (quién gana y por qué), no dos tarjetas. -->
<div class="card" style="text-align:center">
  {#each winners as w (w)}<h3 style="margin:6px 0">{WIN_LABELS[w]}</h3>{/each}
  <p class="small-note" style="margin-top:8px">{!game.lynched || !game.lynched.length ? '⚖️ El pueblo perdonó: no condenó a nadie.' : `⚖️ El pueblo condenó a ${game.lynched.map(nm).join(', ')}.`} {(game.deaths || []).length ? `💀 Cayó: ${(game.deaths || []).map(nm).join(', ')}.` : '🕊️ No cayó nadie.'}</p>
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

<div class="card">
  <h3>📝 Qué hizo cada uno esta noche</h3>
  {#each players as p (p.id)}
    {@const h = playerHistory(game, p.id)}
    <div class="histblock">
      <div class="hname">{nm(p.id)}{p.id === my.id ? ' (tú)' : ''} · empezó como {rn(game.originalRole[p.id])}</div>
      <ul class="histlist">{#each h as line (line)}<li>{line}</li>{/each}</ul>
    </div>
  {/each}
</div>

{#if !againArmed}
  <button class="primary block" data-a="una-again" onclick={() => (againArmed = true)}>🔁 Otra partida (mismos jugadores)</button>
{:else}
  <div class="card">
    <p class="hint">⚠️ Esto reparte de nuevo <b>para toda la mesa</b> y borra esta revelación. ¿Han terminado todos de leerla?</p>
    <button class="primary block" data-a="una-again-ok" onclick={() => guard(A.playAgain)}>🔁 Sí, repartid otra vez</button>
    <button class="ghost block" data-a="una-again-no" onclick={() => (againArmed = false)}>↩️ Aún no</button>
  </div>
{/if}
<button class="ghost block" data-a="una-back-lobby" onclick={() => guard(() => A.endUnaNoche())}>🏳️ Terminar y volver al lobby</button>

<style>
  .histblock { padding: 8px 0; border-bottom: 1px solid var(--border); }
  .histblock:last-of-type { border-bottom: none; }
  .hname { font-size: 0.95rem; font-weight: 600; }
  .histlist { margin: 4px 0 0; padding-left: 1.15rem; color: var(--muted); }
  .histlist li { margin: 4px 0; line-height: 1.35; font-size: 0.9rem; }
</style>
