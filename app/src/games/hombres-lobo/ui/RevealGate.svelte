<script lang="ts">
  // Al repartir, la carta solo se despliega bajo demanda (port de revealGate()
  // de la v1): los móviles quedan boca arriba (y a menudo desbloqueados) sobre
  // la mesa, y nadie debe verla de reojo. Si te distraes, se vuelve a cerrar
  // sola a los 12 s: la carta no se queda esperándote a la vista de todos.
  //
  // Esta es la ÚNICA pantalla del juego con un «👁 Ver mi carta» en el cuerpo
  // (B34): en el reparto la instrucción ES la pantalla y no hay nada más que
  // hacer. En el resto de fases la puerta es siempre la pastilla 🎴.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { autoHide } from './autohide.svelte';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import RoleCard from './RoleCard.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const touch = autoHide(() => !!app.ui.revealOpen, () => (app.ui.revealOpen = false));
</script>

{#if app.ui.revealOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div onpointerdown={touch}>
    <RoleCard player={my} {group} />
    <button class="primary block" data-a="confirm-role-seen"
      onclick={() => guard(async () => { await A.confirmRoleSeen(); app.ui.revealOpen = false; })}>✅ Ya me la sé, guardadla</button>
  </div>
{:else}
  <div class="actionpanel"><h3>🎴 Tu carta está lista</h3>
    <p class="hint">Ábrela cuando nadie mire tu pantalla, memoriza tu rol (y tu palabra clave, si la tienes) y confirma. Se oculta sola.</p>
    <button class="primary block" data-a="open-reveal-role" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta</button></div>
{/if}
