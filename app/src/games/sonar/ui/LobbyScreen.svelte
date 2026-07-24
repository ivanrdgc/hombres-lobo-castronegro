<script lang="ts">
  // Primera pantalla del juego: UN solo trabajo (B29) — decir de qué va en dos
  // líneas y dejar tres caminos claros: aprender, consultar y jugar. El nombre
  // del juego ya está en la cabecera, así que aquí no se repite.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { MIN_PLAYERS, MAX_PLAYERS, BEST_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('sn-intro'));
  const meta = gameMeta('sonar');
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>⚓ Captain Sonar</h2>
</div>
<Flash />

<div class="card">
  <div class="snintro">
    <p class="small-note" style="margin:0">👥 {MIN_PLAYERS}-{MAX_PLAYERS} jugadores (mejor de {BEST_PLAYERS}) · ⏱️ {meta.mins[0]}-{meta.mins[1]} min · dos tripulaciones</p>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="sn-play-intro" title="Detener" onclick={() => toggleLocalSpeech('sn-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="sn-play-intro" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('sn-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  {#each INTRO_LOBBY as p, i (i)}<p style="margin:9px 0">{p}</p>{/each}
  <p class="snposture">{POSTURE_HINT[meta.posture]}</p>
  <p class="small-note" style="margin:6px 0 0">Sentaos en dos corros, uno por tripulación, lo más lejos que dé la sala: se habla en voz baja y la app canta en alto lo que oyen los dos.</p>

  <button class="primary block" style="margin-top:14px" data-a="open-start" onclick={() => navigate(`/g/${group.id}/sonar/empezar`)}>⚓ Empezar partida</button>
  <div class="btnrow">
    <button data-a="open-demo" onclick={() => (app.ui.modal = { type: 'sn-demo' })}>🎓 Tutorial (2 min)</button>
    <button data-a="sn-open-help" onclick={() => (app.ui.modal = { type: 'sn-help' })}>📖 Cómo se juega</button>
  </div>
</div>

<style>
  .snintro { display: flex; align-items: center; gap: 8px; }
  .snintro p { flex: 1; }
  .snposture { margin-top: 12px; padding: 9px 11px; border-radius: var(--r-2); border: 1px dashed var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--bg-1)); font-size: 0.82rem; color: var(--moon); line-height: 1.45; }
</style>
