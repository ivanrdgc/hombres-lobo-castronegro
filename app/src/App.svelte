<script lang="ts">
  import { app } from './core/sync/store.svelte';
  import { GAMES } from './shell/ui-helpers';
  import Landing from './shell/Landing.svelte';
  import GroupScreen from './shell/GroupScreen.svelte';
  import ModalHost from './shell/modals/ModalHost.svelte';
  import Toast from './shell/Toast.svelte';
  import AudioLab from './shell/AudioLab.svelte';

  // #audio se conserva como página de diagnóstico (laboratorio de la F2).
  let hash = $state(location.hash);
  window.addEventListener('hashchange', () => (hash = location.hash));

  // El título sigue la navegación LOCAL: en el catálogo (o la mesa), «Juegos
  // digitales»; dentro del lobby o la partida de un juego, el nombre del juego.
  const currentGameName = $derived(GAMES.find((x) => x.id === app.group?.currentGame)?.name);
  const inGame = $derived(
    !!app.group && (app.group.status === 'playing' || (app.ui.lobbyView ?? 'catalog') === 'game'),
  );
  $effect(() => {
    document.title = inGame && currentGameName ? currentGameName : 'Juegos digitales';
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
