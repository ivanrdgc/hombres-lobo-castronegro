<script lang="ts">
  // Visor plegable de TU carta, al estilo de Los Hombres Lobo («👁 Ver mi
  // carta»). En Una Noche solo se puede ver la carta INICIAL (la que te tocó y
  // ya miraste): tu carta puede haber cambiado de noche sin que lo sepas, así
  // que NO es necesariamente tu carta final. Se avisa con claridad. Debajo, un
  // historial privado de lo que has visto y hecho esta noche.
  import { untrack } from 'svelte';
  import type { GameState, RoleId } from '../types';
  import RoleCard from './RoleCard.svelte';
  import { playerHistory } from '../history';

  // startOpen: en el modal «🎴 Tu carta inicial» la carta se enseña ya abierta
  // (el título prometía la carta y estaba tras otro toque); en la partida sigue
  // plegada, que ahí la privacidad manda.
  const { game, pid, startOpen = false }: { game: GameState; pid: string; startOpen?: boolean } = $props();
  const role = $derived(game.originalRole[pid] as RoleId);
  const history = $derived(playerHistory(game, pid));
  let open = $state(untrack(() => startOpen)); // solo el valor de partida
</script>

{#if !open}
  <div style="text-align:center;margin:10px 0"><button class="small ghost" data-a="una-show-card" onclick={() => (open = true)}>👁 Ver en secreto: con qué carta empecé y qué hice</button></div>
{:else}
  <RoleCard {role} note="⚠️ Es la carta con la que EMPEZASTE la noche. En Una Noche alguien pudo cambiártela sin que lo sepas: NO es necesariamente tu carta final." />
  {#if history.length}
    <div class="card">
      <h3>📝 Lo que viste e hiciste esta noche</h3>
      <ul class="histlist">{#each history as h (h)}<li>{h}</li>{/each}</ul>
      <p class="small-note">Solo tú ves esto. Al final de la partida se muestra el historial completo de todos.</p>
    </div>
  {/if}
  <div style="text-align:center;margin-top:6px"><button class="small ghost" data-a="una-hide-card" onclick={() => (open = false)}>🙈 Ocultar</button></div>
{/if}

<style>
  .histlist { margin: 4px 0 0; padding-left: 1.15rem; }
  .histlist li { margin: 5px 0; line-height: 1.35; }
</style>
