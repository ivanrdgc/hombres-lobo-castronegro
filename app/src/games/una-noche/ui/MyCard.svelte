<script lang="ts">
  // Visor plegable de TU carta, al estilo de Los Hombres Lobo («👁 Ver mi
  // carta»). En Una Noche solo se puede ver la carta INICIAL (la que te tocó y
  // ya miraste): tu carta puede haber cambiado de noche sin que lo sepas, así
  // que NO es necesariamente tu carta final. Se avisa con claridad.
  import type { RoleId } from '../types';
  import RoleCard from './RoleCard.svelte';

  const { role }: { role: RoleId } = $props();
  let open = $state(false);
</script>

{#if !open}
  <div style="text-align:center;margin:10px 0"><button class="small ghost" data-a="una-show-card" onclick={() => (open = true)}>👁 Ver mi carta inicial</button></div>
{:else}
  <RoleCard {role} note="⚠️ Es la carta con la que EMPEZASTE la noche. En Una Noche alguien pudo cambiártela sin que lo sepas: NO es necesariamente tu carta final." />
  <div style="text-align:center;margin-top:6px"><button class="small ghost" data-a="una-hide-card" onclick={() => (open = false)}>🙈 Ocultar</button></div>
{/if}
