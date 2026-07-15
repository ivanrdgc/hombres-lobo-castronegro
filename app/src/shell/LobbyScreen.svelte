<script lang="ts">
  // Lobby de Los Hombres Lobo: solo la configuración específica del juego
  // (port de lobbyScreen v1). En el lobby no hay máster: cualquier dispositivo
  // configura e inicia.
  import { app } from '../core/sync/store.svelte';
  import { ROLES, wolfCountFor, OFFICIAL_MIN_PLAYERS } from '../games/hombres-lobo/roles';
  import type { GroupDoc, PlayerDoc } from '../core/sync/schema';
  import Flash from './Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  const extra = $derived(group.extraRoles || []);
  const nJug = $derived(app.players.filter((p) => p.isPlayer !== false).length);
  const wolvesFixed = $derived((group.settings || {}).wolvesCount || null);
  const lobos = $derived(Math.max(1, Math.min(Math.max(nJug - 1, 1), wolvesFixed || wolfCountFor(nJug || 1))));
</script>

<div class="topbar">
  <h2>🌕 {group.name}</h2>
  <span style="display:flex;gap:6px"><button class="small ghost" data-a="change-game" onclick={() => (app.ui.lobbyView = 'catalog')}>🎲 Otro juego</button><button class="small ghost" data-a="leave" onclick={() => (app.ui.modal = { type: 'confirm-leave' })}>🚪 Salir</button></span>
</div>
<Flash />
<div class="card">
  <h3>📖 ¿Primera vez?</h3>
  <p class="small-note">Una introducción ambientada y cómo se juega desde el móvil — con lectura en voz alta en el dispositivo narrador.</p>
  <button class="block" data-a="open-explain" onclick={() => (app.ui.modal = { type: 'explain' })}>📖 Explicación del juego</button>
</div>
<div class="card">
  <h3>🎴 Roles de la partida</h3>
  <p class="small-note">Con {nJug} jugador{nJug === 1 ? '' : 'es'} marcado{nJug === 1 ? '' : 's'}: <b>{lobos} 🐺 lobo{lobos > 1 ? 's' : ''}</b>{wolvesFixed ? ' (fijado)' : ''}{#if (group.settings || {}).villagersCount != null}, <b>{(group.settings || {}).villagersCount} 🧑‍🌾</b> reservados{/if} y el resto según los roles activados (los huecos se rellenan con 🧑‍🌾 aldeanos; si sobran roles, se sortean). En guiado/manual el narrador no juega aunque esté marcado.</p>
  {#if nJug < OFFICIAL_MIN_PLAYERS && !(group.settings || {}).casual}<p class="small-note">⚠️ Las reglas oficiales piden de {OFFICIAL_MIN_PLAYERS} a 18 jugadores además del narrador. Para jugar con menos, activad el <b>modo casual</b> en los ajustes.</p>{/if}
  <div class="btnrow" style="margin-top:6px">
    {#if extra.length}{#each extra as r (r)}{#if ROLES[r]}<span class="chip">{ROLES[r].emoji} {ROLES[r].name}</span>{/if}{/each}{:else}<span class="chip">Solo lobos y aldeanos</span>{/if}{#if (group.settings || {}).alguacil}<span class="chip">⭐ Alguacil</span>{/if}
  </div>
  <button class="block" data-a="open-roles" onclick={() => (app.ui.modal = { type: 'roles' })}>⚙️ Elegir roles</button>
</div>
<div class="card">
  <h3>🎬 Empezar</h3>
  <button class="block" data-a="open-settings" onclick={() => (app.ui.modal = { type: 'settings' })}>🔧 Ajustes de partida</button>
  <button class="primary block" data-a="open-start" onclick={() => (app.ui.modal = { type: 'start' })}>🎬 Empezar partida</button>
  <button class="danger block" data-a="confirm-delete-group" onclick={() => (app.ui.modal = { type: 'confirm-delete' })}>🗑️ Eliminar la mesa</button>
</div>
