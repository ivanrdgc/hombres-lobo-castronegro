<script lang="ts">
  // Lobby de Wavelength (B29): una sola tarjeta con un solo trabajo — de qué va
  // en dos líneas, cómo hay que coger el móvil, y tres caminos: jugar, aprender
  // jugando o consultar las reglas. El nombre del juego lo dice la cabecera:
  // aquí ya no se repite.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('wl-intro'));
  const meta = gameMeta('wavelength');
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>📡 Wavelength</h2>
</div>
<Flash />

<div class="card">
  <p class="pitch">Un <b>dial entre dos ideas opuestas</b> con un objetivo secreto: el <b>Psíquico</b> de la ronda lo ve y da <b>una pista</b>. El resto debate y coloca el marcador; cuanto más cerca, más puntos.</p>
  <p class="small-note">Cooperativo: todos en el mismo equipo y un solo marcador. De {MIN_PLAYERS} a {MAX_PLAYERS} jugadores, {meta.mins[0]}–{meta.mins[1]} min.</p>

  <!-- Cómo se coge el móvil, antes de repartir nada: en este juego el secreto
       es de una sola persona y decide cómo son las pantallas. -->
  <div class="posture" data-a="wl-posture">
    <p>{POSTURE_HINT[meta.posture]}</p>
    <p class="small-note" style="margin-top:4px">Con un matiz: el secreto es de <b>uno solo</b>. La pantalla del Psíquico no la puede ver <b>nadie</b>, ni los suyos; los demás comparten un dial que se ve igual en todos.</p>
  </div>

  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/wavelength/empezar`)}>📡 Empezar partida</button>
  <div class="btnrow">
    <button data-a="open-demo" onclick={() => (app.ui.modal = { type: 'wl-demo' })}>🎓 Aprender jugando</button>
    <button data-a="wl-open-help" onclick={() => (app.ui.modal = { type: 'wl-help' })}>📖 Cómo se juega</button>
  </div>
  <div class="listen">
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="wl-play-intro" onclick={() => toggleLocalSpeech('wl-intro', [])}>⏹️ Parar</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="wl-play-intro" onclick={() => toggleLocalSpeech('wl-intro', INTRO_LOBBY)}>▶️ Que me lo cuente en voz alta</button>
    {/if}
  </div>
</div>

<style>
  .pitch { font-size: 1.02rem; line-height: 1.45; }
  .pitch b { color: var(--moon); }
  .posture { margin: 12px 0 4px; padding: 10px 12px; border: 1px solid var(--border);
    border-left: 3px solid var(--accent2); border-radius: var(--r-1); background: var(--card2); font-size: 0.88rem; }
  .listen { display: flex; justify-content: center; margin-top: 12px; }
</style>
