<script lang="ts">
  // Primera pantalla de Ávalon. Un solo trabajo (B29): decir de qué va en dos
  // líneas y dejar tres caminos claros — jugar, aprender y consultar. El nombre
  // del juego lo dice la cabecera UNA vez (antes se repetía en la tarjeta de
  // debajo), y los roles opcionales bajan a «referencia plegada»: la mesa que no
  // los toca no tiene por qué verlos, y el resumen ya dice cuáles están puestos.
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { setSettings } from '../../../core/sync/group-actions';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { ROLES, OPTIONAL_ROLES, evilCountFor, MIN_PLAYERS, MAX_PLAYERS } from '../roles';
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
  const enabledNames = $derived(OPTIONAL_ROLES.filter((r) => enabled.includes(r)).map((r) => ROLES[r].name));
  const meta = gameMeta('avalon');
  const introAudio = $derived(localAudioState('av-intro'));

  function toggle(r: RoleId) {
    const next = enabled.includes(r) ? enabled.filter((x) => x !== r) : [...enabled, r];
    guard(() => setSettings({ avalon: next }));
  }
  const openDetail = (r: RoleId) => (app.ui.modal = { type: 'av-role-detail', role: r });
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🏰 Ávalon</h2>
</div>
<Flash />

<div class="card">
  <div class="pitchhead">
    <!-- Los mismos dos datos y con el mismo formato que la ficha del catálogo. -->
    <p class="chips" style="margin:0">
      <span class="chip">👥 {MIN_PLAYERS}–{MAX_PLAYERS}</span>
      <span class="chip">⏱️ {meta.mins[0]}–{meta.mins[1]} min</span>
    </p>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="av-play-intro" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech('av-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="av-play-intro" aria-label="Escuchar la introducción" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('av-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  <p style="margin:6px 0 8px">{INTRO_LOBBY[0]}</p>
  <p class="small-note">{INTRO_LOBBY[1]}</p>
  <!-- Aviso de postura (B28): Ávalon se juega con el móvil PLANO en la mesa;
       decirlo antes de repartir evita el «¿por qué no veo mi carta siempre?». -->
  <p class="small-note" data-a="av-posture">{POSTURE_HINT[meta.posture]}</p>
  <p class="small-note">🎩 Nadie hace de máster: la app reparte las lealtades y lleva las misiones.</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/avalon/empezar`)}>🏰 Empezar partida</button>
  <div class="btnrow">
    <button data-a="open-demo" onclick={() => (app.ui.modal = { type: 'av-demo' })}>🎓 Aprender en 2 min</button>
    <button data-a="av-open-help" onclick={() => (app.ui.modal = { type: 'av-help' })}>🎲 Cómo se juega</button>
  </div>
</div>

<div class="card">
  <details>
    <summary data-a="av-roles-open">🎭 Roles opcionales: <b>{enabledNames.length ? enabledNames.join(' y ') : 'ninguno'}</b></summary>
    <p class="small-note">Merlín y el Asesino juegan SIEMPRE; estos se añaden o se quitan. {est >= MIN_PLAYERS ? `Con los ${est} de la mesa, ${evilCountFor(est)} serían del Mal.` : `Ávalon necesita ${MIN_PLAYERS} jugadores como mínimo.`}</p>
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
  </details>
</div>

<style>
  .pitchhead { display: flex; align-items: flex-start; gap: 8px; }
  .pitchhead .chips { flex: 1; }
  .stepper { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
  summary { cursor: pointer; padding: 6px 0; font-size: 0.95rem; }
</style>
