<script lang="ts">
  // Lobby de Los Hombres Lobo: solo la configuración específica del juego
  // (port de lobbyScreen v1). En el lobby no hay máster: cualquier dispositivo
  // configura e inicia.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { ROLES, wolfCountFor, OFFICIAL_MIN_PLAYERS } from '../roles';
  import { EXPLANATIONS } from '../texts/explain';
  import { explainAudioState, toggleExplainAudio } from '../../../shell/explain-audio';
  import { isActiveDevice } from '../../../core/sync/presence';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  const extra = $derived(group.extraRoles || []);
  // Estimación de cuántos jugarán (los activos no excluidos): la selección
  // definitiva se hace en la pantalla «Empezar partida».
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 10000);
    return () => clearInterval(t);
  });
  const nJug = $derived(app.players.filter((p) => p.isPlayer !== false && isActiveDevice(p, now)).length);
  const wolvesFixed = $derived((group.settings || {}).wolvesCount || null);
  const lobos = $derived(Math.max(1, Math.min(Math.max(nJug - 1, 1), wolvesFixed || wolfCountFor(nJug || 1))));
  // Introducción ambientada, mostrada directamente en el lobby con lectura local.
  const ex = $derived(EXPLANATIONS[group.currentGame || ''] || EXPLANATIONS.hombres_lobo);
  const introAudio = $derived(explainAudioState('intro'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🌕 {group.name}</h2>
  <button class="small ghost" data-a="leave" onclick={() => (app.ui.modal = { type: 'confirm-leave' })}>🚪 Salir</button>
</div>
<Flash />
<div class="card">
  <div style="display:flex;align-items:center;gap:8px">
    <h3 style="flex:1;margin:0">{ex.title}</h3>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="explain-play-intro" aria-label="Detener la lectura" title="Detener" onclick={() => toggleExplainAudio(group, 'intro')}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="explain-play-intro" aria-label="Escuchar la introducción" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleExplainAudio(group, 'intro')}>▶️</button>
    {/if}
  </div>
  {#each ex.intro as p, i (i)}<p style="margin:9px 0">{p}</p>{/each}
  <button class="block" data-a="open-explain" onclick={() => (app.ui.modal = { type: 'explain' })}>🎲 Cómo se juega</button>
</div>
<div class="card">
  <h3>🎴 Roles y configuración</h3>
  <p class="small-note">Ahora mismo jugarían {nJug} (la selección definitiva se hace al empezar): <b>{lobos} 🐺 lobo{lobos > 1 ? 's' : ''}</b>{wolvesFixed ? ' (fijado)' : ''}{#if (group.settings || {}).villagersCount != null}, <b>{(group.settings || {}).villagersCount} 🧑‍🌾</b> reservados{/if} y el resto según los roles activados (los huecos se rellenan con 🧑‍🌾 aldeanos; si sobran roles, se sortean).</p>
  {#if nJug < OFFICIAL_MIN_PLAYERS && !(group.settings || {}).casual}<p class="small-note">⚠️ Las reglas oficiales piden de {OFFICIAL_MIN_PLAYERS} a 18 jugadores además del narrador. Para jugar con menos, activad el <b>modo casual</b> en los ajustes.</p>{/if}
  <!-- Cada chip abre el detalle del rol (qué hace y cómo se juega). -->
  <div class="chips" style="margin-top:6px">
    {#if extra.length}{#each extra as r (r)}{#if ROLES[r]}<button class="chip rolechip" data-a="role-detail" data-p={r} onclick={() => (app.ui.modal = { type: 'role-detail', role: r })}>{ROLES[r].emoji} {ROLES[r].name}</button>{/if}{/each}{:else}<span class="chip">Solo lobos y aldeanos</span>{/if}{#if (group.settings || {}).alguacil}<button class="chip rolechip" data-a="role-detail" data-p="alguacil" onclick={() => (app.ui.modal = { type: 'role-detail', role: 'alguacil' })}>⭐ Alguacil</button>{/if}
  </div>
  <button class="block" data-a="open-roles" onclick={() => (app.ui.modal = { type: 'roles' })}>⚙️ Elegir roles</button>
  <button class="block" data-a="open-settings" onclick={() => (app.ui.modal = { type: 'settings' })}>🔧 Ajustes de partida</button>
</div>
<div class="card">
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/hombres_lobo/empezar`)}>🎬 Empezar partida</button>
</div>
