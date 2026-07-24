<script lang="ts">
  // Primera pantalla de El Espía. Un solo trabajo (B29): decir de qué va en dos
  // líneas y dejar tres caminos claros —jugar, aprender y consultar—. La
  // cabecera ya dice a qué juegas, así que ninguna tarjeta repite el nombre.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { INTRO_LOBBY } from '../texts';
  import { ESPIA_MIN_PLAYERS, ESPIA_MAX_PLAYERS, ESPIA_DURATIONS_MIN } from '../engine';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  const introAudio = $derived(localAudioState('espia-intro'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🕵️ El Espía</h2>
</div>
<Flash />

<div class="card">
  <div style="display:flex;align-items:flex-start;gap:8px">
    <div style="flex:1">
      {#each INTRO_LOBBY as p, i (i)}<p style="margin:{i ? '9px' : '0'} 0 0">{p}</p>{/each}
    </div>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="espia-play-intro" aria-label="Detener la lectura" title="Detener" onclick={() => toggleLocalSpeech('espia-intro', INTRO_LOBBY)}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="espia-play-intro" aria-label="Escuchar la introducción" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('espia-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  <p class="small-note" style="margin:12px 0 2px">👥 De {ESPIA_MIN_PLAYERS} a {ESPIA_MAX_PLAYERS} jugadores · ⏱ rondas de {ESPIA_DURATIONS_MIN.join(', ')} minutos · 🏆 marcador acumulado.</p>
  <p class="small-note" style="margin:0 0 4px">{POSTURE_HINT[gameMeta('espia').posture]}</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/espia/empezar`)}>🕵️ Empezar partida</button>
</div>

<div class="card">
  <button class="block" data-a="open-demo" onclick={() => (app.ui.modal = { type: 'espia-demo' })}>🎓 Aprender jugando una ronda (2 min)</button>
  <button class="block" data-a="espia-open-help" onclick={() => (app.ui.modal = { type: 'espia-help' })}>🎲 Cómo se juega</button>
  <button class="block" data-a="espia-open-lugares" onclick={() => (app.ui.modal = { type: 'espia-lugares' })}>📍 Ver las localizaciones posibles</button>
</div>
