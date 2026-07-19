<script lang="ts">
  import { app, ctxMatch } from './core/sync/store.svelte';
  import { GAME_DEFS } from './games/registry';
  import Landing from './shell/Landing.svelte';
  import GroupScreen from './shell/GroupScreen.svelte';
  import ModalHost from './shell/modals/ModalHost.svelte';
  import Toast from './shell/Toast.svelte';
  import AudioLab from './shell/AudioLab.svelte';

  // #audio se conserva como página de diagnóstico (laboratorio de la F2).
  let hash = $state(location.hash);
  window.addEventListener('hashchange', () => (hash = location.hash));

  // El título sigue el contexto del dispositivo: dentro de una partida, su
  // juego; en un lobby (/g/<mesa>/<juego>), el de la URL; si no, el genérico.
  const matchName = $derived(GAME_DEFS.find((x) => x.id === ctxMatch()?.gameId)?.name);
  const urlName = $derived(GAME_DEFS.find((x) => x.id === app.route.game)?.name);
  const title = $derived.by(() => {
    if (app.group && matchName) return matchName;
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
