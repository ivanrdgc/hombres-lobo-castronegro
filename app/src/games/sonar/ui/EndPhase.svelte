<script lang="ts">
  // Final: submarino ganador, posiciones reveladas (ambos mapas, con la estela
  // de cada uno para poder repasar la caza) y marcador acumulado.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { teamOf, TEAM_NAME } from '../engine';
  import { cellName } from '../map';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SonarState, Team } from '../types';
  import MapGrid from './MapGrid.svelte';

  const { game, my }: { game: SonarState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const myTeam = $derived(teamOf(game, my.id));
  const crew = (t: Team) => game.teams[t].map(nm).join(', ');
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
</script>

<div class="card" style="text-align:center">
  <span class="moon">{game.winner === 'red' ? '🔴' : '🔵'}</span>
  <h3 style="margin:6px 0">¡Gana el {game.winner ? TEAM_NAME[game.winner] : ''}!</h3>
  {#if game.winReason}<p class="small-note" style="margin-top:0">{game.winReason}</p>{/if}
  {#if game.winner}
    <p class="small-note" style="margin-top:4px">
      Tripulación: <b>{crew(game.winner)}</b>{myTeam === game.winner ? ' — ¡vosotros!' : ''}. +1 punto para cada uno.
    </p>
  {/if}
</div>

<div class="card"><h3>🗺️ Dónde estaba cada uno</h3>
  <p class="small-note" style="margin:0">Ahora sí se ven los dos mapas: la posición final y la estela (• casillas por las que pasó desde su última emersión). Buen momento para ver dónde fallaron vuestras deducciones.</p>
  <div class="snmaps">
    {#each ['red', 'blue'] as const as t (t)}
      <div class="snside">
        <p class="small-note" style="margin:0">
          {t === 'red' ? '🔴 Rojo' : '🔵 Azul'} · {cellName(game.subs[t].pos)} · ❤️ {game.subs[t].hp}
          {#if game.winner === t}🏆{:else}💀{/if}
        </p>
        <p class="small-note" style="margin:0;opacity:.75">{crew(t)}{myTeam === t ? ' (vosotros)' : ''}</p>
        <MapGrid sub={game.subs[t]} team={t} legend={false} />
      </div>
    {/each}
  </div>
  <p class="snlegend">
    <span>🔴 / 🔵 posición final</span><span>• estela</span><span>⛰️ isla</span>
  </p>
</div>

<div class="card">
  <h3>🏆 Marcador (se acumula partida tras partida)</h3>
  {#each ranked as pid (pid)}
    {@const t = teamOf(game, pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{t === 'red' ? '🔴' : '🔵'} {nm(pid)}{game.winner && t === game.winner ? ' ✅' : ''}{pid === my.id ? ' (tú)' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="sn-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<p class="small-note" style="text-align:center;margin:4px 0 10px">Con las MISMAS tripulaciones: nadie cambia de corro ni de altavoz, solo se recolocan los submarinos (y el cuaderno empieza en blanco).</p>
<button class="ghost block" data-a="sn-back-lobby" onclick={() => guard(() => A.endSonar())}>🏁 Terminar y volver al lobby</button>

<style>
  .snmaps { display: flex; gap: 12px; flex-wrap: wrap; }
  .snside { flex: 1; min-width: 240px; }
  .snlegend { display: flex; flex-wrap: wrap; gap: 3px 10px; font-size: 0.7rem; color: var(--muted); margin: 4px 0 0; }
</style>
