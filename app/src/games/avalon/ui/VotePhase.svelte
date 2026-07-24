<script lang="ts">
  // Voto de la propuesta: TODOS votan en secreto aprobar/rechazar; la app cuenta
  // y los destapa a la vez (nadie ve el voto ajeno hasta el reveal). Aquí solo
  // se muestra cuántos han votado, jamás qué. Cada botón dice qué pasa si sale:
  // votar sin saber que este era el quinto rechazo era la ruina más tonta.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { leaderId } from '../engine';
  import { teamSize, requiredFails } from '../roles';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const inGame = $derived(game.playerIds.includes(my.id));
  const voted = $derived(Object.keys(game.votes).length);
  const total = $derived(game.playerIds.length);
  const iVoted = $derived(game.votes[my.id] !== undefined);
  const nm = (pid: string) => game.names[pid] || '¿?';
  const leader = $derived(leaderId(game));
  const size = $derived(teamSize(total, game.quest));
  const req = $derived(requiredFails(total, game.quest));
  const onTeam = $derived(game.team.includes(my.id));
  const lastChance = $derived(game.voteTrack >= 4); // otro rechazo y gana el Mal
  // Quién falta por votar no delata nada (el voto sigue oculto) y evita el
  // «¿a quién esperamos?» con el móvil de alguien boca abajo en la mesa.
  const pend = $derived(game.playerIds.filter((pid) => game.votes[pid] === undefined).map(nm));
</script>

<!-- Qué se vota, quién lo propuso y qué hay en juego, UNA sola vez (antes lo
     decían la línea de narración y esta caja, con las mismas palabras). Vive
     fuera del panel para que siga a la vista de quien ya votó. -->
<div class="reqbox" data-a="av-vote-what">
  <span class="reqbig">Misión {game.quest} · {size} caballero{size === 1 ? '' : 's'}</span>
  <div class="teamchips">{#each game.team as pid (pid)}<span class="tchip">{nm(pid)}{pid === my.id ? ' (tú)' : ''}</span>{/each}</div>
  <span class="reqline">🧭 Lo propone <b>{nm(leader)}</b>{game.team.includes(leader) ? ' (se ha incluido)' : ' (se ha quedado fuera)'} · {req === 2 ? '💥 esta misión necesita 2 sabotajes' : '💥 1 sabotaje la hunde'}</span>
  <span class="reqline">Vota toda la mesa, vaya o no en la misión{onTeam ? ' — tú vas en este equipo' : ''}.</span>
</div>

{#if inGame && !iVoted}
  <div class="actionpanel"><h3>🗳️ Vota este equipo</h3>
    <p class="hint">Tu voto es secreto: nadie lo ve hasta que haya votado la mesa entera, y entonces se destapan A LA VEZ y con nombres.</p>
    <div class="btnrow">
      <button class="primary" data-a="av-vote" data-p="si" onclick={() => guard(() => A.voteTeam(true))}>👍 Aprobar</button>
      <button class="danger" data-a="av-vote" data-p="no" onclick={() => guard(() => A.voteTeam(false))}>👎 Rechazar</button>
    </div>
    <p class="small-note" data-a="av-vote-what-if">👍 <b>Aprobar</b>: si hay mayoría, el equipo parte a la misión {game.quest} y juega sus cartas en secreto.</p>
    <p class="small-note {lastChance ? 'warn' : ''}">👎 <b>Rechazar</b>: con empate o mayoría de rechazo no hay misión, el liderazgo pasa al siguiente y se vuelve a proponer. {lastChance ? '⚠️ Sería el QUINTO rechazo seguido: gana el Mal ahí mismo.' : `Van ${game.voteTrack} de 5 rechazos seguidos; a las 5 gana el Mal.`}</p>
  </div>
{:else}
  <div class="card"><p class="hint">{iVoted ? '✅ Tu voto está echado.' : '👀 La mesa está votando.'} Han votado <b>{voted}/{total}</b>. Se destaparán todos a la vez.</p>
    {#if pend.length}<p class="small-note" data-a="av-vote-pending">⏳ Falta{pend.length === 1 ? '' : 'n'} por votar: <b>{pend.join(', ')}</b>.</p>{/if}
    <p class="small-note">Mientras tanto: fíjate en quién ha tardado y prepara tu argumento; los votos se leen en voz alta cuando se destapen.</p></div>
{/if}
{#if inGame}<RoleCard {game} pid={my.id} />{/if}

<style>
  .reqbox {
    display: flex; flex-direction: column; gap: 4px; margin: 10px 0 0;
    border: 1px solid var(--accent, #c8a24a); border-radius: var(--r-2, 14px);
    background: color-mix(in srgb, var(--accent, #c8a24a) 12%, transparent);
    padding: 10px 12px;
  }
  .reqbig { font-size: 1.06rem; font-weight: 700; }
  .reqline { font-size: 0.8rem; color: var(--muted); }
  .teamchips { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0; }
  .tchip {
    font-size: 0.85rem; padding: 5px 10px; border-radius: 999px;
    background: var(--card2, #22242e); border: 1px solid var(--accent, #c8a24a);
  }
  .warn { color: #f3a0a0; }
</style>
