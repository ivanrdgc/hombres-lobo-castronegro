<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu carta (rol, palabra clave, lo que
  // sabes) y los roles activados de la mesa. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { ROLES } from '../../roles';
  import { explainRoleIds } from '../../texts/explain';
  import RefRows from '../../../../shell/RefRows.svelte';
  import RoleCard from '../RoleCard.svelte';

  const g = $derived(viewGroup());
  const my = $derived(me());
  const inGame = $derived(!!my && !!my.inGame);
  const rows = $derived(g
    ? explainRoleIds({ currentGame: g.currentGame, extraRoles: g.extraRoles }).map((id) => ({
      emoji: ROLES[id].emoji, name: ROLES[id].name, desc: ROLES[id].desc,
    }))
    : []);
</script>

{#if g && my}
  <h3 style="margin:0 0 4px">🎴 Tu carta</h3>
  {#if inGame}
    <RoleCard player={my} group={g} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RefRows title="🎴 Roles activados en esta mesa" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
