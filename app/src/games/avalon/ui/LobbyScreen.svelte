<script lang="ts">
  // Lobby de Ávalon: intro con lectura (▶️) + «cómo se juega» + configuración de
  // los roles OPCIONALES (Merlín y Asesino son fijos). La selección de quién
  // juega se hace en «Empezar partida».
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { setSettings } from '../../../core/sync/group-actions';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { ROLES, OPTIONAL_ROLES, evilCountFor, MIN_PLAYERS } from '../roles';
  import type { RoleId } from '../roles';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 10000); return () => clearInterval(t); });

  const est = $derived(app.players.filter((p) => !matchOf(p.id)
    && (p.isPlayerFor?.avalon ?? p.isPlayer) !== false && isActiveDevice(p, now)).length);

  // Roles opcionales activados (por defecto: Percival + Morgana, la pareja clásica).
  const enabled = $derived(((group.settings?.avalon as string[] | undefined) ?? ['percival', 'morgana']) as RoleId[]);
  const introAudio = $derived(localAudioState('av-intro'));

  function toggle(r: RoleId) {
    const next = enabled.includes(r) ? enabled.filter((x) => x !== r) : [...enabled, r];
    guard(() => setSettings({ avalon: next }));
  }
  const openDetail = (r: RoleId) => (app.ui.modal = { type: 'av-role-detail', role: r });
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🏰 {group.name}</h2>
</div>
<Flash />

<div class="card">
  <div style="display:flex;align-items:center;gap:8px">
    <h3 style="flex:1;margin:0">🏰 Ávalon</h3>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="av-play-intro" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech('av-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="av-play-intro" aria-label="Escuchar la introducción" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('av-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  {#each INTRO_LOBBY as p, i (i)}<p style="margin:9px 0">{p}</p>{/each}
  <button class="block" data-a="av-open-help" onclick={() => (app.ui.modal = { type: 'av-help' })}>🎲 Cómo se juega y los roles</button>
</div>

<div class="card">
  <h3>🎭 Roles opcionales</h3>
  <p class="small-note">Merlín y el Asesino están SIEMPRE. Activa los demás para dar más chicha (ahora mismo jugarían <b>{est}</b>: {est >= MIN_PLAYERS ? `${evilCountFor(est)} del Mal` : `faltan para las reglas oficiales (mín. ${MIN_PLAYERS})`}).</p>
  {#each OPTIONAL_ROLES as r (r)}
    {@const on = enabled.includes(r)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname" style="opacity:{on ? 1 : 0.6}">{ROLES[r].emoji} {ROLES[r].name} <small>({ROLES[r].team === 'evil' ? 'Mal' : 'Bien'})</small></div>
        <div class="sdesc">{ROLES[r].desc}</div></div>
      <div class="stepper">
        <button class="small ghost" data-a="av-role-info" data-p={r} aria-label="Ver en detalle" title="Ver en detalle" onclick={() => openDetail(r)}>ℹ️</button>
        <button class="switch {on ? 'on' : ''}" data-a="av-toggle-role" data-p={r} role="switch" aria-checked={on} aria-label={ROLES[r].name} onclick={() => toggle(r)}></button>
      </div>
    </div>
  {/each}
  <p class="small-note">💡 Con Percival, activa también Morgana: es su gracia (le aparece como un falso Merlín).</p>
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">De {MIN_PLAYERS} a 10 jugadores + un dispositivo que puede poner la voz. La app reparte lealtades y lleva las misiones; nadie hace de máster.</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/avalon/empezar`)}>🏰 Empezar partida</button>
</div>

<style>
  .stepper { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
</style>
