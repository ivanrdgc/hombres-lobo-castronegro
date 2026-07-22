<script lang="ts">
  // Día: un único voto SIMULTÁNEO. Cada uno señala en secreto; cuando han
  // votado todos, el motor revela y resuelve. Tu voto queda oculto a los demás
  // hasta el recuento.
  import { guard } from '../../../core/sync/guard';
  import { sel1 } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';
  import RoleCard from './RoleCard.svelte';
  import UnaGrid from './UnaGrid.svelte';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

  const players = $derived(playersOf(game));
  const inGame = $derived(game.playerIds.includes(my.id));
  const myVote = $derived(game.votes[my.id] || null);
  const voted = $derived(Object.keys(game.votes || {}).length);
  const total = $derived(game.playerIds.length);
  const myCard = $derived(game.originalRole[my.id]);
  const nm = (pid: string) => game.names[pid] || '¿?';

  let showCard = $state(false);
</script>

<div class="narration">☀️ Es de día. Debatid: ¿quién esconde colmillos? Cuando lo tengáis claro, señalad todos a la vez.</div>

{#if inGame}
  <div class="card">
    <button class="small ghost" data-a="una-show-card" onclick={() => (showCard = !showCard)}>{showCard ? '🙈 Ocultar mi carta' : '👁 Ver mi carta inicial'}</button>
    {#if showCard && myCard}<div style="margin-top:8px"><RoleCard role={myCard} mini note="Es la carta con la que EMPEZASTE la noche: alguien pudo cambiártela." /></div>{/if}
  </div>

  {#if !myVote}
    <div class="actionpanel"><h3>🗳️ Tu voto, en secreto</h3>
      <p class="hint">Toca a quien creas hombre lobo. Nadie verá tu voto hasta que hayáis votado todos.</p>
      <UnaGrid {players} selKey="una-vote" exclude={[my.id]} />
      <button class="danger block" data-a="una-vote" disabled={!sel1('una-vote')} onclick={() => (sel1('una-vote') ? guard(() => A.castVote(sel1('una-vote')!)) : undefined)}>🗳️ {sel1('una-vote') ? `Votar a ${nm(sel1('una-vote')!)}` : 'Votar'}</button>
    </div>
  {:else}
    <div class="actionpanel"><h3>🗳️ Voto emitido</h3>
      <p class="hint">Has señalado a <b>{nm(myVote)}</b>. Esperando a los demás… <b>{voted}/{total}</b> han votado.</p>
      <button class="ghost block" data-a="una-vote-retract" onclick={() => guard(A.retractVote)}>↩️ Cambiar mi voto</button>
    </div>
  {/if}
{:else}
  <div class="card"><p class="hint">👀 El pueblo vota en secreto… <b>{voted}/{total}</b>.</p></div>
{/if}
