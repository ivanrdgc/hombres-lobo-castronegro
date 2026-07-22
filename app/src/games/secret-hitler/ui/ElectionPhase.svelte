<script lang="ts">
  // Elección del gobierno: cada vivo vota Ja/Nein en secreto; la app cuenta y
  // destapa a la vez (el resultado y quién votó qué quedan en el tablero).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { presidentId, aliveIds } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: SHState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const alive = $derived(inGame && game.alive[my.id]);
  const iVoted = $derived(game.votes[my.id] !== undefined);
  const voted = $derived(aliveIds(game).filter((pid) => game.votes[pid] !== undefined).length);
  const total = $derived(aliveIds(game).length);
  const nm = (pid: string | null) => (pid && game.names[pid]) || '¿?';
</script>

<div class="narration">🗳️ Gobierno propuesto: 🪙 <b>{nm(presidentId(game))}</b> + 🎩 <b>{nm(game.nominatedChancellor)}</b>. Votad todos: ¿lo aprobáis?</div>

{#if alive && !iVoted}
  <div class="actionpanel"><h3>🗳️ Tu voto (secreto)</h3>
    <p class="hint">Nadie lo ve hasta que voten todos. Recuerda: a partir de 3 decretos fascistas, elegir Canciller a Hitler da la victoria a los fascistas.</p>
    <div class="btnrow">
      <button class="primary" data-a="sh-vote" data-p="ja" onclick={() => guard(() => A.voteGov(true))}>👍 Ja</button>
      <button class="danger" data-a="sh-vote" data-p="nein" onclick={() => guard(() => A.voteGov(false))}>👎 Nein</button>
    </div>
  </div>
{:else}
  <div class="card"><p class="hint">{iVoted ? '✅ Tu voto está echado.' : '👀 Votación en curso.'} Han votado <b>{voted}/{total}</b>.</p></div>
{/if}
{#if inGame}<RoleCard {game} pid={my.id} mini={true} />{/if}
