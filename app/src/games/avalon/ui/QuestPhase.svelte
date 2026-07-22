<script lang="ts">
  // Misión: cada miembro del equipo juega en secreto Éxito o Fracaso. El Bien
  // solo puede jugar Éxito (la app se lo impide sabotear); el Mal elige. La app
  // baraja las cartas: nadie sabe quién falló, solo cuántos.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ROLES, isEvil, requiredFails } from '../roles';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const inGame = $derived(game.playerIds.includes(my.id));
  const onTeam = $derived(game.team.includes(my.id));
  const iPlayed = $derived(game.questCards[my.id] !== undefined);
  const amEvil = $derived(inGame && isEvil(game.roles[my.id]));
  const submitted = $derived(game.team.filter((pid) => game.questCards[pid] !== undefined).length);
  const req = $derived(requiredFails(game.playerIds.length, game.quest));
  const nm = (pid: string) => game.names[pid] || '¿?';
  void ROLES;
</script>

<div class="narration">⚔️ Misión {game.quest} en marcha: <b>{game.team.map(nm).join(', ')}</b>. {req === 2 ? 'Esta misión necesita 2 sabotajes para fracasar.' : 'Un solo sabotaje la hace fracasar.'}</div>

{#if onTeam && !iPlayed}
  <div class="actionpanel"><h3>🎴 Tu carta de misión (secreta)</h3>
    {#if amEvil}
      <p class="hint">Estás en el Mal: puedes cumplir la misión o sabotearla. Nadie sabrá quién falló, solo cuántos.</p>
      <div class="btnrow">
        <button class="primary" data-a="av-quest" data-p="ok" onclick={() => guard(() => A.questCard(true))}>✅ Éxito</button>
        <button class="danger" data-a="av-quest" data-p="fail" onclick={() => guard(() => A.questCard(false))}>💥 Sabotear</button>
      </div>
    {:else}
      <p class="hint">Eres del Bien: solo puedes hacer que la misión tenga ÉXITO.</p>
      <button class="primary block" data-a="av-quest" data-p="ok" onclick={() => guard(() => A.questCard(true))}>✅ Cumplir la misión</button>
    {/if}
  </div>
{:else if onTeam}
  <div class="card"><p class="hint">✅ Tu carta está echada. Faltan {game.team.length - submitted} del equipo.</p></div>
{:else}
  <div class="card"><p class="hint">👀 El equipo está en la misión ({submitted}/{game.team.length} cartas jugadas). Espera el resultado.</p></div>
{/if}
{#if inGame}<RoleCard {game} pid={my.id} mini={true} />{/if}
