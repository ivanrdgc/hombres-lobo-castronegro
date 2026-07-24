<script lang="ts">
  // Elección del gobierno: cada vivo vota Ja/Nein en secreto; la app cuenta y
  // destapa a la vez CON NOMBRES (el resultado y quién votó qué quedan en el
  // tablero y en la crónica). En pantalla, antes de votar: QUÉ gobierno se vota,
  // qué pasa si sale y qué pasa si cae. Los ejecutados ven que están fuera.
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
  // Quién FALTA por votar, con nombre: «han votado 3/5» no dice a quién mirar.
  const pending = $derived(aliveIds(game).filter((pid) => game.votes[pid] === undefined).map((pid) => game.names[pid] || '¿?'));
  const needed = $derived(Math.floor(total / 2) + 1);
  const fallen = $derived(game.electionTracker);
  const nm = (pid: string | null) => (pid && game.names[pid]) || '¿?';
</script>

<div class="narration">🗳️ Gobierno propuesto: 🪙 <b>{nm(presidentId(game))}</b> + 🎩 <b>{nm(game.nominatedChancellor)}</b>. Votad todos: ¿lo aprobáis?</div>

{#if alive && !iVoted}
  <div class="actionpanel"><h3>🗳️ Tu voto (secreto hasta el recuento)</h3>
    <p class="hint">Se vota el gobierno ENTERO, los dos juntos: 🪙 {nm(presidentId(game))} de Presidente y 🎩 {nm(game.nominatedChancellor)} de Canciller. Salen adelante con <b>{needed} Ja</b> de {total} (el empate cuenta como rechazo).</p>
    <div class="outcomes">
      <p><b>👍 Si sale Ja:</b> esos dos legislan en secreto —el Presidente ve 3 decretos y descarta 1; el Canciller promulga 1 de los 2— y quedan como último gobierno electo: {nm(game.nominatedChancellor)} no podrá repetir de Canciller la próxima ronda{total > 5 ? `, y ${nm(presidentId(game))} tampoco mientras quedéis más de 5 vivos` : ''}.</p>
      <p><b>👎 Si cae:</b> nadie legisla, la presidencia pasa al siguiente y el país suma <b>{fallen + 1}/3</b> gobiernos caídos.{fallen >= 2 ? ' ¡Con este se llega a 3: caos! Se promulga a ciegas el decreto de arriba del mazo, sin poder presidencial y borrando los límites de mandato.' : ' Al tercero llega el caos: decreto a ciegas del mazo.'}</p>
    </div>
    {#if game.fascistPolicies >= 3}
      <!-- El aviso solo cuando de verdad muerde (con 3+ decretos fascistas). -->
      <p class="danger-note">⚠️ Ya hay {game.fascistPolicies} decretos fascistas: si <b>{nm(game.nominatedChancellor)}</b> fuese Hitler, un Ja da la victoria a los fascistas AHORA MISMO.</p>
    {/if}
    <p class="small-note" style="margin-top:0">Tu voto no se puede cambiar. Cuando hayan votado todos, la app destapa quién votó qué: tu Ja o tu Nein quedará con tu nombre en el tablero y en la crónica.</p>
    <div class="btnrow">
      <button class="primary" data-a="sh-vote" data-p="ja" onclick={() => guard(() => A.voteGov(true))}>👍 Ja · que gobiernen</button>
      <button class="danger" data-a="sh-vote" data-p="nein" onclick={() => guard(() => A.voteGov(false))}>👎 Nein · que caiga</button>
    </div>
  </div>
{:else if inGame && !alive}
  <!-- El ejecutado no se enteraba de que estaba muerto: se lo decimos claro. -->
  <div class="card" data-a="sh-dead-note"><h3>💀 Estás ejecutado</h3>
    <p class="hint">Ya no votas ni puedes gobernar, y tu carta no se destapa hasta el final. Puedes seguir escuchando, mirando el tablero… y callándote lo que sabes.</p>
    <p class="small-note">Han votado <b>{voted}/{total}</b>.{#if pending.length} Faltan: <b>{pending.join(', ')}</b>.{/if}</p>
  </div>
{:else}
  <div class="card"><h3>{iVoted ? '✅ Tu voto está echado' : '👀 Votación en curso'}</h3>
    <p class="hint">Se vota 🪙 {nm(presidentId(game))} + 🎩 {nm(game.nominatedChancellor)}. En cuanto vote el último, la app destapa todos los votos con nombre.</p>
    <p class="small-note">Han votado <b>{voted}/{total}</b>.{#if pending.length} Faltan por votar: <b>{pending.join(', ')}</b>.{/if}</p>
  </div>
{/if}
{#if inGame}<RoleCard {game} pid={my.id} mini={true} />{/if}

<style>
  /* Qué pasa si sale y qué pasa si cae: las dos consecuencias, delante, antes
     de tocar Ja o Nein. */
  .outcomes {
    margin: 6px 0 8px; padding: 10px 12px; border-radius: var(--r-2);
    border: 1px solid var(--border); background: var(--card2);
    font-size: 0.86rem; line-height: 1.4;
  }
  .outcomes p + p { margin-top: 6px; }
  /* Aviso de la trampa de Hitler: solo aparece con 3+ decretos fascistas, y ahí
     tiene que verse de lejos. */
  .danger-note {
    margin: 6px 0; padding: 8px 10px; border-radius: 8px; font-size: 0.9rem;
    background: color-mix(in srgb, var(--danger) 16%, var(--bg-1)); border: 1px solid var(--danger);
  }
</style>
