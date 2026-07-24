<script lang="ts">
  // Pantalla de partida de Los Hombres Lobo: elige la vista según el modo.
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import CardFab from '../../../shell/CardFab.svelte';
  import AutoScreen from './AutoScreen.svelte';
  import ManualScreen from './ManualScreen.svelte';
  import GuidedScreen from './GuidedScreen.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
</script>

{#if group.game?.mode === 'manual'}
  <ManualScreen {group} {my} />
{:else if group.game?.mode === 'guiado'}
  <GuidedScreen {group} {my} />
{:else}
  <AutoScreen {group} {my} />
{/if}

<CardFab modal="hl-mycard" />
