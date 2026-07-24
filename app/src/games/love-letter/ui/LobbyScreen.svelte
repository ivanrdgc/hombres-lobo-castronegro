<script lang="ts">
  // Primera pantalla del juego (B29·8): un solo trabajo — decir de qué va en dos
  // líneas y dejar tres caminos claros: jugar, aprender y consultar. El nombre lo
  // dice ya la cabecera, así que aquí no se repite; la introducción larga se
  // escucha con ▶️ y se lee entera en «Cómo se juega».
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('ll-intro'));
  const meta = gameMeta('love_letter');
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>💌 Love Letter</h2>
</div>
<Flash />

<div class="card">
  <div class="pitchrow">
    <p class="pitch">Una carta en la mano: en tu turno robas otra y juegas una, con su efecto. Gana la ronda quien quede en pie o guarde la carta más alta.</p>
    {#if introAudio === 'playing'}
      <button class="small ghost tap" data-a="ll-play-intro" aria-label="Detener la lectura" title="Detener" onclick={() => toggleLocalSpeech('ll-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost tap" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost tap" data-a="ll-play-intro" aria-label="Escuchar la introducción" title="Escuchar la introducción" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('ll-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  <div class="chips">
    <span class="chip">👥 {MIN_PLAYERS}-{MAX_PLAYERS} jugadores</span>
    <span class="chip">⏱️ {meta.mins[0]}-{meta.mins[1]} min</span>
  </div>
  <!-- Aviso de postura (B28): Love Letter es de MANO, y quien lo lea aquí no
       dejará el móvil boca arriba en la mesa. -->
  <p class="posture">{POSTURE_HINT[meta.posture]} La app reparte y guarda las manos: cada uno ve solo la suya.</p>

  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/love_letter/empezar`)}>💌 Empezar: elegir quién juega</button>
  <div class="ways">
    <button data-a="open-demo" onclick={() => (app.ui.modal = { type: 'll-demo' })}>🎓 Aprender jugando<small>ronda guiada · 2 min</small></button>
    <button data-a="ll-open-help" onclick={() => (app.ui.modal = { type: 'll-help' })}>📖 Cómo se juega<small>reglas y las 8 cartas</small></button>
  </div>
</div>

<style>
  /* El ← de la cabecera y el ▶️ de lectura, con 44 px de toque (B26·9). */
  .topbar button, .tap { min-height: 44px; min-width: 44px; }
  .pitchrow { display: flex; align-items: flex-start; gap: 8px; }
  .pitch { margin: 0; flex: 1; font-size: 1rem; line-height: 1.5; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 0; }
  .posture { font-size: 0.85rem; color: var(--muted); margin: 10px 0 14px; line-height: 1.45; }
  /* Los dos caminos de aprender y consultar, a la misma altura y con su para qué. */
  .ways { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-top: 8px; }
  .ways button { min-height: 56px; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 0.9rem; }
  .ways small { font-weight: 400; opacity: 0.7; font-size: 0.78rem; }
</style>
