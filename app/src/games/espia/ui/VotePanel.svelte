<script lang="ts">
  // Votación de una acusación: votan todos menos acusador y acusado. Cualquier
  // «no» la tumba al instante; la unanimidad revela la carta y cierra la ronda,
  // sea quien sea el acusado.
  // Todo lo que sale aquí es PÚBLICO (quién acusa, a quién, cuántos votos van):
  // ni una palabra que cambie según tu carta —el «pon cara de inocente (lo
  // eres)» que veía el acusado inocente delataba al espía de reojo (B28).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { voters } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';

  const { game, my }: { game: EspiaState; my: PlayerDoc } = $props();

  const vote = $derived(game.vote!);
  const accuser = $derived(game.names[vote.accuserId] || '¿?');
  const accused = $derived(game.names[vote.accusedId] || '¿?');
  const vs = $derived(voters(game.playerIds, vote));
  const iVote = $derived(vs.includes(my.id) && vote.votes[my.id] === undefined);
  const iVoted = $derived(vs.includes(my.id) && vote.votes[my.id] !== undefined);
  const yeses = $derived(vs.filter((id) => vote.votes[id] === true).length);
  const pending = $derived(vs.filter((id) => vote.votes[id] === undefined).map((id) => game.names[id] || id));
</script>

{#if vote}
  <div class="actionpanel" style="border-color:var(--accent)">
    <h3>⚖️ ¿Es {accused} el espía?</h3>
    <p class="hint"><b>{accuser}</b> {vote.fromTimeup ? 'acusa en su turno' : 'ha parado el reloj para acusar'}. Su «sí» ya cuenta y {accused} no vota.</p>

    {#if my.id === vote.accusedId}
      <p class="hint">😶 Te están juzgando: tú no votas. Aguanta el tipo y espera el veredicto.</p>
    {:else if my.id === vote.accuserId}
      <p class="hint">Tu acusación está sobre la mesa y tu voto ya cuenta como «sí». Ahora se espera a los demás.</p>
      <!-- Si alguien no vota, la mesa se quedaba colgada para siempre: el
           acusador puede retirarla (su acusación sigue gastada). -->
      {#if pending.length}
        <button class="ghost block" data-a="espia-vote-cancel" onclick={() => guard(A.cancelAccusation)}>↩️ Retirar la acusación{vote.fromTimeup ? ' y pasar turno' : ' (el reloj sigue)'}</button>
        <p class="small-note" style="margin-top:6px">Úsalo si alguien no vota (móvil apagado, se ha ido…). Tu acusación de esta ronda queda gastada igual.</p>
      {/if}
    {:else if iVote}
      <p class="small-note" style="margin:0 0 6px"><b>Tu voto decide:</b></p>
      <div class="btnrow">
        <button class="danger" data-a="espia-vote" data-p="si" onclick={() => guard(() => A.voteAccusation(true))}>👍 Sí, es el espía</button>
        <button class="ghost" data-a="espia-vote" data-p="no" onclick={() => guard(() => A.voteAccusation(false))}>👎 No lo veo</button>
      </div>
      <ul class="rules">
        <li>✅ <b>Si votáis que sí todos</b>: se revela la carta de {accused} y la ronda TERMINA. Si era el espía, +1 para cada agente y +2 para {accuser}; si era inocente, gana el espía (+4).</li>
        <li>❌ <b>Basta un solo «no»</b>: la acusación cae y {vote.fromTimeup ? 'el turno pasa al siguiente' : 'el reloj vuelve a correr'}. El diario dirá quién la tumbó.</li>
      </ul>
    {:else if iVoted}
      <p class="hint">✔️ Tu voto está registrado. Falta que voten los demás.</p>
    {:else}
      <!-- Ni acusador, ni acusado, ni votante: espectador o alguien que dejó
           la ronda (antes leía «tu voto está registrado» sin haber votado). -->
      <p class="hint">👀 No votas esta acusación: miras desde fuera.</p>
    {/if}

    <p class="tally">👍 {yeses + 1} de {vs.length + 1} a favor · hace falta unanimidad{pending.length ? ` · esperando a: ${pending.join(', ')}` : ' · votos completos'}</p>
  </div>
{/if}

<style>
  .rules { margin: 10px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
  .rules li { font-size: 0.86rem; color: var(--muted); line-height: 1.45; }
  .tally { margin: 10px 0 0; font-size: 0.85rem; color: var(--moon); }
</style>
