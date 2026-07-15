<script lang="ts">
  // Al repartir, la carta solo se despliega bajo demanda (port de revealGate()
  // de la v1): los móviles quedan boca arriba (y a menudo desbloqueados) sobre
  // la mesa, y nadie debe verla de reojo.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import RoleCard from './RoleCard.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
</script>

{#if app.ui.revealOpen}
  <RoleCard player={my} {group} />
  <button class="primary block" data-a="confirm-role-seen"
    onclick={() => guard(async () => { await A.confirmRoleSeen(); app.ui.revealOpen = false; })}>✅ He visto mi rol</button>
{:else}
  <div class="card"><p class="small-note">🎴 Tu carta está lista. Despliégala cuando nadie mire tu pantalla, memorízala… y confirma.</p>
    <button class="primary block" data-a="open-reveal-role" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi rol</button></div>
{/if}
