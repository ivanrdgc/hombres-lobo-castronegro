<script lang="ts">
  // Enrutador de la vista de grupo: decide qué pantalla toca según el estado.
  // Las pantallas del juego (lobby, empezar, partida) las aporta el
  // GameDefinition del juego seleccionado en la mesa.
  import { app, me } from '../core/sync/store.svelte';
  import { navigate } from '../core/sync/store.svelte';
  import { GAME_DEFS, gameDef } from '../games/registry';
  import Flash from './Flash.svelte';
  import JoinScreen from './JoinScreen.svelte';
  import BlockedScreen from './BlockedScreen.svelte';
  import MesaScreen from './MesaScreen.svelte';

  const g = $derived(app.group);
  const my = $derived(me());
  // En partida manda el juego del GRUPO; en el lobby, la URL de ESTE
  // dispositivo (/g/<mesa>/<juego>[/empezar]): única y recargable.
  const def = $derived(gameDef(g?.currentGame));
  const urlDef = $derived(app.route.game ? (GAME_DEFS.find((d) => d.id === app.route.game) ?? null) : null);
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
  {#if urlDef && app.route.start}
    <urlDef.Start group={g} my={my} />
  {:else if urlDef}
    <urlDef.Lobby group={g} my={my} />
  {:else}
    <MesaScreen group={g} my={my} />
  {/if}
{:else if !g.game}
  <p style="text-align:center;margin-top:40vh">Preparando la partida…</p>
{:else}
  <def.Screen group={g} my={my} />
{/if}
