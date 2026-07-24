<script lang="ts">
  // Final: equipo ganador (o tablas), las 8 palabras destapadas —el momento
  // «ahhh, era Faro»— y, en UNA sola tarjeta, cómo ha quedado: fichas de cada
  // equipo y marcador acumulado de la mesa. Otra partida re-reparte palabras.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { TEAM_LABEL, teamMembers } from '../engine';
  import type { DecryptoState } from '../types';

  const { game }: { game: DecryptoState } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
</script>

<div class="card" style="text-align:center">
  <span class="moon">{game.winner === 'red' ? '🔴' : game.winner === 'blue' ? '🔵' : '🤝'}</span>
  <h3 style="margin:6px 0">{game.winner ? `¡Gana el equipo ${TEAM_LABEL[game.winner]}!` : '¡Tablas! No gana nadie'}</h3>
  {#if game.winReason}<p class="small-note">{game.winReason}</p>{/if}
</div>

<div class="card"><h3 style="margin:0 0 6px">🔑 Las palabras clave, al descubierto</h3>
  {#each (['red', 'blue'] as const) as t (t)}
    <p class="small-note" style="margin:6px 0 2px"><b>{TEAM_LABEL[t]}</b></p>
    <div class="dewords" data-a="de-final-words" data-p={t}>
      {#each game.words[t] as w, i (i)}
        <div class="deword"><span class="denum">{i + 1}</span><span>{w}</span></div>
      {/each}
    </div>
  {/each}
</div>

<div class="card"><h3 style="margin:0 0 6px">🏆 Cómo ha quedado</h3>
  {#each (['red', 'blue'] as const) as t (t)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{TEAM_LABEL[t]}{game.winner === t ? ' 👑' : ''}</div>
        <div class="sdesc">{teamMembers(game, t).map(nm).join(', ')}</div></div>
      <b>{game.tokens[t].intercepts}🕵️ · {game.tokens[t].errors}❌</b>
    </div>
  {/each}
  <h3 style="margin:14px 0 2px;font-size:1rem">🥇 Marcador de la mesa</h3>
  <p class="small-note" style="margin:0 0 6px">Cada partida ganada suma 1 punto a todos los del equipo vencedor.</p>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{game.teams[pid] === 'red' ? '🔴' : '🔵'} {nm(pid)}{game.winner && game.teams[pid] === game.winner ? ' 👑' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="de-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<button class="ghost block" data-a="de-back-lobby" onclick={() => guard(() => A.endDecrypto())}>🏁 Terminar y volver al lobby</button>

<style>
  .dewords { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .deword { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--surface, #1c1e28); font-weight: 700; }
  .denum { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: 0 0 auto; border-radius: 50%; background: var(--accent, #c8a24a); color: #000; font-size: 0.8rem; font-weight: 800; }
</style>
