<script lang="ts">
  import { app } from './core/sync/store.svelte';
  import { GAME_DEFS } from './games/registry';
  import Landing from './shell/Landing.svelte';
  import GroupScreen from './shell/GroupScreen.svelte';
  import ModalHost from './shell/modals/ModalHost.svelte';
  import Toast from './shell/Toast.svelte';
  import AudioLab from './shell/AudioLab.svelte';

  // #audio se conserva como página de diagnóstico (laboratorio de la F2).
  let hash = $state(location.hash);
  window.addEventListener('hashchange', () => (hash = location.hash));

  // El título sigue la URL: en la portada o la mesa, «Juegos digitales»;
  // dentro del lobby (/g/<mesa>/<juego>) o la partida, el nombre del juego.
  const playingName = $derived(GAME_DEFS.find((x) => x.id === app.group?.currentGame)?.name);
  const urlName = $derived(GAME_DEFS.find((x) => x.id === app.route.game)?.name);
  const title = $derived.by(() => {
    if (app.group?.status === 'playing' && playingName) return playingName;
    if (app.group && urlName) return urlName;
    return 'Juegos digitales';
  });
  $effect(() => {
    document.title = title;
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
