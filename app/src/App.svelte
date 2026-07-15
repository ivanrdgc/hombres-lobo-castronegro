<script lang="ts">
  import { app } from './core/sync/store.svelte';
  import Landing from './shell/Landing.svelte';
  import GroupScreen from './shell/GroupScreen.svelte';
  import ModalHost from './shell/modals/ModalHost.svelte';
  import Toast from './shell/Toast.svelte';
  import AudioLab from './shell/AudioLab.svelte';

  // #audio se conserva como página de diagnóstico (laboratorio de la F2).
  let hash = $state(location.hash);
  window.addEventListener('hashchange', () => (hash = location.hash));

  const inLobos = $derived(!!app.group && (app.group.currentGame === 'hombres_lobo' || app.group.status === 'playing'));
  $effect(() => {
    document.title = inLobos ? 'Los Hombres Lobo de Castronegro' : 'Juegos digitales';
  });
</script>

{#if hash === '#audio'}
  <AudioLab />
{:else}
  <div id="app">
    {#if app.route.view === 'landing'}
      <Landing />
    {:else}
      <GroupScreen />
    {/if}
  </div>
  <ModalHost />
  <Toast />
{/if}
