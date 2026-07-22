<script lang="ts">
  // Voto de la propuesta: TODOS votan en secreto aprobar/rechazar; la app cuenta
  // y los destapa a la vez (nadie ve el voto ajeno hasta el reveal). Aquí solo
  // se muestra cuántos han votado, jamás qué.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { playersOf, leaderId } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const inGame = $derived(game.playerIds.includes(my.id));
  const voted = $derived(Object.keys(game.votes).length);
  const total = $derived(game.playerIds.length);
  const iVoted = $derived(game.votes[my.id] !== undefined);
  const nm = (pid: string) => game.names[pid] || '¿?';
  const team = $derived(game.team.map(nm).join(', '));
  void playersOf; void leaderId;
</script>

<div class="narration">🗳️ Propuesta para la misión {game.quest}: <b>{team}</b>. Votad todos: ¿aprobáis este equipo?</div>

{#if inGame && !iVoted}
  <div class="actionpanel"><h3>🗳️ Tu voto (secreto)</h3>
    <p class="hint">Nadie verá tu voto hasta que hayan votado todos. Si sale más rechazo que aprobación (o empate), el liderazgo pasa al siguiente.</p>
    <div class="btnrow">
      <button class="primary" data-a="av-vote" data-p="si" onclick={() => guard(() => A.voteTeam(true))}>👍 Aprobar</button>
      <button class="danger" data-a="av-vote" data-p="no" onclick={() => guard(() => A.voteTeam(false))}>👎 Rechazar</button>
    </div>
  </div>
{:else}
  <div class="card"><p class="hint">{iVoted ? '✅ Tu voto está echado.' : '👀 La mesa está votando.'} Han votado <b>{voted}/{total}</b>. Se destaparán todos a la vez.</p></div>
{/if}
{#if inGame}<RoleCard {game} pid={my.id} mini={true} />{/if}
