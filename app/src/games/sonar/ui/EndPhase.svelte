<script lang="ts">
  // Final: quién gana y, en la misma tarjeta, las dos posiciones reveladas con
  // su estela — es el momento de repasar la caza. Aquí ya no hay secreto de
  // equipo: los móviles se pueden girar y comparar.
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
      Tripulación: <b>{crew(game.winner)}</b>{myTeam === game.winner ? ' — ¡vosotros!' : ''}.
    </p>
  {/if}

  <hr class="sep" />
  <h3 style="margin:0">🔓 Dónde estaba cada uno</h3>
  <p class="small-note" style="margin:2px 0 0">Ya podéis girar los móviles: se acabó el secreto. • son las casillas por las que pasó desde su última emersión.</p>
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
</div>

<div class="card">
  <h3>🏆 Marcador · +1 por victoria, se acumula</h3>
  {#each ranked as pid (pid)}
    {@const t = teamOf(game, pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{t === 'red' ? '🔴' : '🔵'} {nm(pid)}{game.winner && t === game.winner ? ' ✅' : ''}{pid === my.id ? ' (tú)' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="sn-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida (mismas tripulaciones)</button>
<p class="small-note" style="text-align:center;margin:4px 0 10px">Nadie cambia de corro ni de altavoz: solo se recolocan los submarinos y el cuaderno empieza en blanco.</p>
<button class="ghost block" data-a="sn-back-lobby" onclick={() => guard(() => A.endSonar())}>🏁 Terminar y volver al lobby</button>

<style>
  .snmaps { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
  .snside { flex: 1; min-width: 240px; }
</style>
