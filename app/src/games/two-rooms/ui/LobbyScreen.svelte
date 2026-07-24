<script lang="ts">
  // Primera pantalla de Two Rooms. Un solo trabajo (B29): decir de qué va y
  // dejar tres caminos claros — aprender (tutorial), consultar (cómo se juega)
  // y jugar (empezar). El nombre del juego lo dice la cabecera y NO se repite
  // debajo; lo que hace falta para sentarse a jugar (cuánta gente, dos
  // espacios, cómo se sostiene el móvil) vive junto al botón de empezar, que es
  // donde se decide.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('tr-intro'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>💣 Two Rooms and a Boom</h2>
</div>
<Flash />

<div class="card">
  <div style="display:flex;align-items:flex-start;gap:8px">
    <p style="flex:1;margin:0">{INTRO_LOBBY[0]}</p>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="tr-play-intro" title="Detener" onclick={() => toggleLocalSpeech('tr-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="tr-play-intro" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('tr-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  {#each INTRO_LOBBY.slice(1) as p, i (i)}<p style="margin:9px 0 0">{p}</p>{/each}
</div>

<div class="card">
  <p class="small-note" style="margin:0">👥 De {MIN_PLAYERS} a {MAX_PLAYERS} jugadores (mejor cuantos más) · 🚪 dos espacios separados · ⏱️ 15-25 min.</p>
  <!-- Cómo se sostiene el móvil (B28). Two Rooms es de MESA con una excepción,
       y la excepción es justo la jugada del juego: hay que avisarla aquí. -->
  <p class="small-note" style="margin:6px 0 0" data-a="tr-posture">{POSTURE_HINT[gameMeta('two_rooms').posture]}</p>
  <p class="small-note" style="margin:4px 0 0">🤝 Salvo con «Enseñar mi carta a alguien», la jugada del juego: entonces coges el móvil y lo pones delante de quien tú decides —solo el color o la carta entera—, tapando el resto.</p>
  <button class="block" data-a="open-demo" onclick={() => (app.ui.modal = { type: 'tr-demo' })}>🎓 Aprender con el tutorial (2 min)</button>
  <button class="block" data-a="tr-open-help" onclick={() => (app.ui.modal = { type: 'tr-help' })}>🎲 Consultar cómo se juega</button>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/two_rooms/empezar`)}>💣 Empezar partida</button>
</div>
