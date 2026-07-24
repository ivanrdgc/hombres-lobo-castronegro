<script lang="ts">
  // Lobby de Los Hombres Lobo: la primera pantalla del juego y su ÚNICO
  // trabajo (B29) — decir de qué va en dos líneas y dejar tres caminos claros:
  //   🎬 jugar · 🎓 aprender (tutorial) · 📖 consultar (cómo se juega).
  // Debajo, y solo debajo, lo que hay que decidir antes de repartir: qué roles
  // entran en la partida. La cabecera ya dice a qué juegas: aquí no se repite
  // el nombre del juego (era la duplicación que abría la pasada de claridad).
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { ROLES, wolfCountFor, OFFICIAL_MIN_PLAYERS } from '../roles';
  import { EXPLANATIONS } from '../texts/explain';
  import { explainAudioState, toggleExplainAudio } from '../../../shell/explain-audio';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { gameMeta, POSTURE_HINT } from '../../registry';
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
  const nJug = $derived(app.players.filter((p) =>
    !matchOf(p.id) && (p.isPlayerFor?.hombres_lobo ?? p.isPlayer) !== false && isActiveDevice(p, now)).length);
  const wolvesFixed = $derived((group.settings || {}).wolvesCount || null);
  const lobos = $derived(Math.max(1, Math.min(Math.max(nJug - 1, 1), wolvesFixed || wolfCountFor(nJug || 1))));
  // La ambientación completa (y su lectura en voz alta) vive plegada: arriba
  // basta con saber de qué va y poder empezar sin desplazar la pantalla.
  const ex = $derived(EXPLANATIONS[group.currentGame || ''] || EXPLANATIONS.hombres_lobo);
  const introAudio = $derived(explainAudioState('intro'));
  const posture = POSTURE_HINT[gameMeta('hombres_lobo').posture];
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🐺 Hombres Lobo</h2>
</div>
<Flash />
<div class="card">
  <p style="margin:0 0 8px">Entre los vecinos se esconden <b>hombres lobo</b>: cada noche devoran a alguien y de día se sientan a vuestra mesa como si nada.</p>
  <p style="margin:0 0 8px">El pueblo debate a viva voz y manda a la hoguera a quien crea culpable. Ganáis descubriéndolos… o cayendo uno a uno.</p>
  <p class="small-note">{posture}</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/hombres_lobo/empezar`)}>🎬 Empezar partida</button>
  <div class="btnrow">
    <button data-a="open-demo" onclick={() => (app.ui.modal = { type: 'hl-demo' })}>🎓 Probarlo en 2 min</button>
    <button data-a="open-explain" onclick={() => (app.ui.modal = { type: 'explain' })}>📖 Cómo se juega</button>
  </div>
  <details class="lore">
    <summary data-a="open-lore">📜 La historia de Castronegro</summary>
    {#each ex.intro as p, i (i)}<p style="margin:9px 0">{p}</p>{/each}
  </details>
  {#if introAudio === 'playing'}
    <button class="small ghost" data-a="explain-play-intro" onclick={() => toggleExplainAudio(group, 'intro')}>⏹️ Parar la lectura</button>
  {:else if introAudio === 'loading'}
    <button class="small ghost" disabled><span class="spinner"></span> Preparando la voz…</button>
  {:else}
    <button class="small ghost" data-a="explain-play-intro" onclick={() => toggleExplainAudio(group, 'intro')}>▶️ Escuchar la historia</button>
  {/if}
</div>
<div class="card">
  <h3>🎴 Roles de la partida</h3>
  <p class="small-note" style="margin-top:0">Con {nJug} jugando ahora mismo saldrían <b>{lobos} 🐺 lobo{lobos > 1 ? 's' : ''}</b>{wolvesFixed ? ' (fijado)' : ''}{#if (group.settings || {}).villagersCount != null} y <b>{(group.settings || {}).villagersCount} 🧑‍🌾</b> reservados{/if}. Los huecos se rellenan con aldeanos; si sobran roles, se sortean.</p>
  {#if nJug < OFFICIAL_MIN_PLAYERS && !(group.settings || {}).casual}<p class="small-note">⚠️ Las reglas oficiales piden de {OFFICIAL_MIN_PLAYERS} a 18 jugadores además del narrador. Para jugar con menos, activad el <b>modo casual</b> en los ajustes.</p>{/if}
  <!-- Cada chip abre el detalle del rol (qué hace y cómo se juega). -->
  <div class="chips" style="margin-top:6px">
    {#if extra.length}{#each extra as r (r)}{#if ROLES[r]}<button class="chip rolechip" data-a="role-detail" data-p={r} onclick={() => (app.ui.modal = { type: 'role-detail', role: r })}>{ROLES[r].emoji} {ROLES[r].name}</button>{/if}{/each}{:else}<span class="chip">Solo lobos y aldeanos</span>{/if}{#if (group.settings || {}).alguacil}<button class="chip rolechip" data-a="role-detail" data-p="alguacil" onclick={() => (app.ui.modal = { type: 'role-detail', role: 'alguacil' })}>⭐ Alguacil</button>{/if}
  </div>
  <div class="btnrow">
    <button data-a="open-roles" onclick={() => (app.ui.modal = { type: 'roles' })}>⚙️ Elegir los roles</button>
    <button data-a="open-settings" onclick={() => (app.ui.modal = { type: 'settings' })}>🔧 Ajustes de partida</button>
  </div>
</div>

<style>
  /* Tercera altura de la jerarquía: la ambientación larga y su lectura, plegadas. */
  .lore { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px; }
  .lore summary { cursor: pointer; font-size: 0.9rem; color: var(--accent); min-height: 24px; }
</style>
