<script lang="ts">
  // Enrutador de la vista de grupo: decide qué pantalla toca según el estado.
  // Las pantallas del juego (lobby, empezar, partida) las aporta el
  // GameDefinition del juego seleccionado en la mesa.
  import { app, me } from '../core/sync/store.svelte';
  import { navigate } from '../core/sync/store.svelte';
  import { gameDef } from '../games/registry';
  import Flash from './Flash.svelte';
  import JoinScreen from './JoinScreen.svelte';
  import BlockedScreen from './BlockedScreen.svelte';
  import MesaScreen from './MesaScreen.svelte';

  const g = $derived(app.group);
  const my = $derived(me());
  const def = $derived(gameDef(g?.currentGame));
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
    <def.Start group={g} my={my} />
  {:else if lobbyView === 'game'}
    <def.Lobby group={g} my={my} />
  {:else}
    <MesaScreen group={g} my={my} />
  {/if}
{:else if !g.game}
  <p style="text-align:center;margin-top:40vh">Preparando la partida…</p>
{:else}
  <def.Screen group={g} my={my} />
{/if}
