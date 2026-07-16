<script lang="ts">
  // Enrutador de la vista de grupo: decide qué pantalla toca según el estado
  // (port de groupScreen() de la v1).
  import { app, me } from '../core/sync/store.svelte';
  import { navigate } from '../core/sync/store.svelte';
  import Flash from './Flash.svelte';
  import JoinScreen from './JoinScreen.svelte';
  import BlockedScreen from './BlockedScreen.svelte';
  import MesaScreen from './MesaScreen.svelte';
  import LobbyScreen from './LobbyScreen.svelte';
  import StartScreen from '../games/hombres-lobo/ui/StartScreen.svelte';
  import AutoScreen from '../games/hombres-lobo/ui/AutoScreen.svelte';
  import ManualScreen from '../games/hombres-lobo/ui/ManualScreen.svelte';
  import GuidedScreen from '../games/hombres-lobo/ui/GuidedScreen.svelte';

  const g = $derived(app.group);
  const my = $derived(me());
  // Qué pantalla ve ESTE dispositivo en el lobby (navegación local). Por defecto
  // la mesa (página principal); al lobby del juego se entra a mano.
  const lobbyView = $derived(app.ui.lobbyView ?? 'catalog');
</script>

{#if app.groupMissing}
  <span class="moon">🌑</span>
  <h1 class="title-hero">Este grupo no existe</h1>
  <p class="subtitle">Puede que el máster lo haya eliminado.</p>
  <Flash />
  <div class="card">
    <button class="primary block" data-a="go-home" onclick={() => navigate('/')}>🏡 Crear una partida nueva</button>
  </div>
{:else if !g}
  <p style="text-align:center;margin-top:40vh;color:var(--muted)">Buscando el grupo…</p>
{:else if !my}
  {#if g.status === 'playing'}
    <BlockedScreen group={g} />
  {:else}
    <JoinScreen group={g} />
  {/if}
{:else if g.status === 'lobby'}
  {#if lobbyView === 'start'}
    <StartScreen group={g} my={my} />
  {:else if lobbyView === 'game'}
    <LobbyScreen group={g} my={my} />
  {:else}
    <MesaScreen group={g} my={my} />
  {/if}
{:else if !g.game}
  <p style="text-align:center;margin-top:40vh">Preparando la partida…</p>
{:else if g.game.mode === 'manual'}
  <ManualScreen group={g} my={my} />
{:else if g.game.mode === 'guiado'}
  <GuidedScreen group={g} my={my} />
{:else}
  <AutoScreen group={g} my={my} />
{/if}
