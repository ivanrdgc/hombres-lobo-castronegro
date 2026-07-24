<script lang="ts">
  // Los roles reales de toda la mesa, para quien narra en persona (port de
  // viewRolesModal de la v1). Solo se abre desde el menú ⋯ del narrador.
  import { app } from '../../../../core/sync/store.svelte';
  import { ROLES } from '../../roles';

  const players = $derived(app.players.filter((p) => p.inGame));
</script>

<h3>👁 Los roles de todos (solo tú, que narras)</h3>
<div class="players">
  {#each players as p (p.id)}
    <div class="player {p.alive === false ? 'dead' : ''}">
      <span>{p.role ? ROLES[p.role].emoji : '❔'}</span>
      <span class="pname">{p.name}<br /><small style="color:var(--muted)">{p.role ? ROLES[p.role].name : ''}{p.infected ? ' 🧛' : ''}{p.transformed ? ' 🐾→🐺' : ''}{p.wolfSide ? ' →🐺' : ''}{p.lover ? ' 💘' : ''}{p.charmed ? ' 🎶' : ''}</small></span>
      {#if p.alive === false}<span>💀</span>{/if}
    </div>
  {/each}
</div>
<button class="primary block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
