<script lang="ts">
  // Votación de una acusación: todos menos acusador y acusado. Cualquier «no»
  // la tumba al instante; la unanimidad revela la carta y cierra la ronda.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { voters } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';

  const { game, my }: { game: EspiaState; my: PlayerDoc } = $props();

  const vote = $derived(game.vote!);
  const vs = $derived(voters(game.playerIds, vote));
  const iVote = $derived(vs.includes(my.id) && vote.votes[my.id] === undefined);
  const yeses = $derived(vs.filter((id) => vote.votes[id] === true).length);
  const pending = $derived(vs.filter((id) => vote.votes[id] === undefined).map((id) => game.names[id] || id));
</script>

{#if vote}
  <div class="actionpanel" style="border-color:var(--accent)">
    <h3>⚖️ {game.names[vote.accuserId] || '¿?'} acusa a {game.names[vote.accusedId] || '¿?'}</h3>
    <p class="hint">¿Es {game.names[vote.accusedId] || '¿?'} el espía? Votáis todos los demás: hace falta unanimidad para revelar su carta{vote.fromTimeup ? '' : '; si alguien discrepa, el reloj sigue'}.</p>
    {#if my.id === vote.accusedId}
      <p class="hint">😶 Te están juzgando. Pon tu mejor cara de {game.spyId === my.id ? 'inocente' : 'inocente (lo eres)'}.</p>
    {:else if my.id === vote.accuserId}
      <p class="hint">Tu acusación está sobre la mesa (tu voto cuenta como sí).</p>
    {:else if iVote}
      <div class="btnrow">
        <button class="danger" data-a="espia-vote" data-p="si" onclick={() => guard(() => A.voteAccusation(true))}>👍 Es el espía</button>
        <button class="ghost" data-a="espia-vote" data-p="no" onclick={() => guard(() => A.voteAccusation(false))}>👎 No lo veo</button>
      </div>
    {:else}
      <p class="hint">✔️ Tu voto está registrado.</p>
    {/if}
    <p class="small-note">👍 {yeses + 1}/{vs.length + 1} de acuerdo{pending.length ? ` · esperando a: ${pending.join(', ')}` : ''}</p>
  </div>
{/if}
