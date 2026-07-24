<script lang="ts">
  // Elección del gobierno: cada vivo vota Ja/Nein y la app destapa a la vez CON
  // NOMBRES (el resultado y quién votó qué quedan en el tablero y en la
  // crónica). El voto está ARRIBA, sin scroll; debajo, lo que pasa si sale y si
  // cae. Los ejecutados ven que están fuera.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { presidentId, aliveIds } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: SHState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const alive = $derived(inGame && game.alive[my.id]);
  const iVoted = $derived(game.votes[my.id] !== undefined);
  const voted = $derived(aliveIds(game).filter((pid) => game.votes[pid] !== undefined).length);
  const total = $derived(aliveIds(game).length);
  // Quién FALTA por votar, con nombre: «han votado 3/5» no dice a quién mirar.
  const pending = $derived(aliveIds(game).filter((pid) => game.votes[pid] === undefined).map((pid) => game.names[pid] || '¿?'));
  const needed = $derived(Math.floor(total / 2) + 1);
  const fallen = $derived(game.electionTracker);
  const nm = (pid: string | null) => (pid && game.names[pid]) || '¿?';
</script>

<div class="narration">🗳️ Se vota el gobierno 🪙 <b>{nm(presidentId(game))}</b> + 🎩 <b>{nm(game.nominatedChancellor)}</b>: los dos juntos, o ninguno.</div>

{#if alive && !iVoted}
  <div class="actionpanel"><h3>🗳️ Vota este gobierno</h3>
    {#if game.fascistPolicies >= 3}
      <!-- El aviso solo cuando de verdad muerde (con 3+ decretos fascistas). -->
      <p class="danger-note">⚠️ Con {game.fascistPolicies} decretos fascistas, si <b>{nm(game.nominatedChancellor)}</b> fuese Hitler, un Ja da la victoria a los fascistas AHORA MISMO.</p>
    {/if}
    <div class="btnrow">
      <button class="primary" data-a="sh-vote" data-p="ja" onclick={() => guard(() => A.voteGov(true))}>👍 Ja · que gobiernen</button>
      <button class="danger" data-a="sh-vote" data-p="nein" onclick={() => guard(() => A.voteGov(false))}>👎 Nein · que caiga</button>
    </div>
    <div class="outcomes">
      <p><b>👍 Sale con {needed} Ja</b> de {total} (empate = rechazo): legislan en secreto y {nm(game.nominatedChancellor)} no podrá repetir de Canciller{total > 5 ? `, ni ${nm(presidentId(game))} de Presidente` : ''}.</p>
      <p><b>👎 Si cae:</b> presidirá el siguiente y van <b>{fallen + 1}/3</b> gobiernos caídos.{fallen >= 2 ? ' ¡Con este llega el CAOS: decreto a ciegas del mazo, sin poder presidencial y sin límites de mandato!' : ''}</p>
    </div>
    <p class="small-note" style="margin-top:6px">El voto no se puede cambiar y al final se destapa CON TU NOMBRE.</p>
  </div>
{:else if inGame && !alive}
  <!-- El ejecutado no se enteraba de que estaba muerto: se lo decimos claro. -->
  <div class="card" data-a="sh-dead-note"><h3>💀 Estás ejecutado</h3>
    <p class="hint">Ya no votas ni puedes gobernar, y tu carta no se destapa hasta el final. Puedes seguir escuchando, mirando el tablero… y callándote lo que sabes.</p>
    <p class="small-note">Han votado <b>{voted}/{total}</b>.{#if pending.length} Faltan: <b>{pending.join(', ')}</b>.{/if}</p>
  </div>
{:else}
  <div class="card"><h3>{iVoted ? '✅ Tu voto está echado' : '👀 Votación en curso'}</h3>
    <p class="hint">En cuanto vote el último, la app destapa todos los votos con nombre.</p>
    <p class="small-note">Han votado <b>{voted}/{total}</b>.{#if pending.length} Faltan: <b>{pending.join(', ')}</b>.{/if}</p>
  </div>
{/if}
{#if inGame}<MyCard {game} pid={my.id} />{/if}

<style>
  /* Qué pasa si sale y qué pasa si cae, justo debajo de los botones. */
  .outcomes {
    margin: 10px 0 0; padding: 10px 12px; border-radius: var(--r-2);
    border: 1px solid var(--border); background: var(--card2);
    font-size: 0.86rem; line-height: 1.4;
  }
  .outcomes p + p { margin-top: 6px; }
  /* Aviso de la trampa de Hitler: solo con 3+ decretos fascistas, y ahí tiene
     que verse de lejos. */
  .danger-note {
    margin: 6px 0 10px; padding: 8px 10px; border-radius: 8px; font-size: 0.9rem;
    background: color-mix(in srgb, var(--danger) 16%, var(--bg-1)); border: 1px solid var(--danger);
  }
</style>
