<script lang="ts">
  // Primera pantalla del juego (B29): un solo trabajo. De qué va en dos líneas,
  // cómo se sostiene el móvil (B28) y TRES caminos claros: jugar, aprender
  // (tutorial) y consultar (cómo se juega). La cabecera ya dice a qué juegas, así
  // que la tarjeta de debajo no vuelve a titularse «Secret Hitler».
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../roles';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('sh-intro'));
  const meta = $derived(gameMeta('secret_hitler'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🏛️ Secret Hitler</h2>
</div>
<Flash />

<div class="card">
  <p class="pitch">Sois mayoría <b>liberales</b>, pero entre vosotros hay <b>fascistas</b> infiltrados y un <b>Hitler oculto</b> al que ellos sí conocen. Cada ronda, un gobierno promulga un decreto en secreto.</p>
  <p class="pitch">🕊️ Ganáis con 5 decretos liberales o ejecutando a Hitler · 🐷 ellos, con 6 decretos fascistas o colando a Hitler de Canciller.</p>
  <p class="chips" style="margin:10px 0 0">
    <span class="chip">👥 {MIN_PLAYERS}–{MAX_PLAYERS} jugadores</span>
    <span class="chip">⏱️ {meta.mins[0]}–{meta.mins[1]} min</span>
  </p>
  <p class="posture" data-a="sh-posture">{POSTURE_HINT[meta.posture]}</p>
  <button class="primary block" style="margin-top:12px" data-a="open-start" onclick={() => navigate(`/g/${group.id}/secret_hitler/empezar`)}>🏛️ Empezar partida</button>
  <div class="paths">
    <button class="ghost" data-a="open-demo" onclick={() => (app.ui.modal = { type: 'sh-demo' })}>🎓 Aprender en 2 min</button>
    <button class="ghost" data-a="sh-open-help" onclick={() => (app.ui.modal = { type: 'sh-help' })}>📖 Cómo se juega</button>
  </div>
</div>

<div class="card">
  <div style="display:flex;align-items:center;gap:8px">
    <h3 style="flex:1;margin:0">🎬 La República se tambalea</h3>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="sh-play-intro" title="Detener" onclick={() => toggleLocalSpeech('sh-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="sh-play-intro" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('sh-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  {#each INTRO_LOBBY as p, i (i)}<p class="small-note" style="margin:9px 0">{p}</p>{/each}
</div>

<style>
  .pitch { margin: 0 0 8px; line-height: 1.45; }
  .pitch:last-of-type { margin-bottom: 0; }
  .posture { margin: 8px 0 0; font-size: 0.84rem; color: var(--muted); line-height: 1.35; }
  .paths { display: flex; gap: 8px; margin-top: 10px; }
  .paths button { flex: 1; min-width: 0; font-size: 0.88rem; }
</style>
