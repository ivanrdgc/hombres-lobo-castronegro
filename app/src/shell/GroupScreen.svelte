<script lang="ts">
  // Enrutador de la vista de grupo: decide qué pantalla toca según el estado.
  // La mesa admite VARIAS partidas a la vez: quien está en una (juega o narra)
  // la ve siempre; los libres navegan mesa/lobbies o miran una partida por su
  // URL (/g/<mesa>/<juego>/partida/<mid>). Las pantallas del juego las aporta
  // el GameDefinition correspondiente.
  import { app, me, myMatch, routeMatch, matchView } from '../core/sync/store.svelte';
  import { navigate } from '../core/sync/store.svelte';
  import { GAME_DEFS, gameDef } from '../games/registry';
  import Flash from './Flash.svelte';
  import JoinScreen from './JoinScreen.svelte';
  import BlockedScreen from './BlockedScreen.svelte';
  import MesaScreen from './MesaScreen.svelte';

  const g = $derived(app.group);
  const my = $derived(me());
  // Mi partida manda; si no tengo, la de la URL (espectador).
  const active = $derived(myMatch() ?? routeMatch());
  const view = $derived(g && active ? matchView(g, active) : null);
  const def = $derived(gameDef(active?.gameId));
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
    <!-- Solo grupos con una partida del esquema antiguo aún en el doc. -->
    <BlockedScreen group={g} />
  {:else}
    <JoinScreen group={g} />
  {/if}
{:else if view && view.game}
  <def.Screen group={view} my={my} />
{:else if urlDef && app.route.start}
  <urlDef.Start group={g} my={my} />
{:else if urlDef}
  <urlDef.Lobby group={g} my={my} />
{:else}
  <MesaScreen group={g} my={my} />
{/if}
