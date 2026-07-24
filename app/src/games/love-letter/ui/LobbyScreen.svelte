<script lang="ts">
  // Lobby de Love Letter: intro con lectura (▶️), «cómo se juega» y tutorial.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('ll-intro'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>💌 Love Letter</h2>
</div>
<Flash />

<div class="card">
  <div style="display:flex;align-items:center;gap:8px">
    <h3 style="flex:1;margin:0">💌 Love Letter</h3>
    {#if introAudio === 'playing'}
      <button class="small ghost tap" data-a="ll-play-intro" aria-label="Detener la lectura" title="Detener" onclick={() => toggleLocalSpeech('ll-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost tap" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost tap" data-a="ll-play-intro" aria-label="Escuchar la introducción" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('ll-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  {#each INTRO_LOBBY as p, i (i)}<p style="margin:9px 0">{p}</p>{/each}
  <button class="block" data-a="ll-open-help" onclick={() => (app.ui.modal = { type: 'll-help' })}>🎲 Cómo se juega · reglas y las 8 cartas</button>
  <button class="block" data-a="open-demo" onclick={() => (app.ui.modal = { type: 'll-demo' })}>🎓 Tutorial interactivo · una ronda guiada (2 min)</button>
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">De {MIN_PLAYERS} a {MAX_PLAYERS} jugadores. La app baraja, reparte y custodia las manos (solo ves la tuya), y resuelve cada efecto; la voz (opcional) relata las jugadas.</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/love_letter/empezar`)}>💌 Empezar partida · elegir quién juega</button>
</div>

<style>
  /* El ← de la cabecera y el ▶️ de lectura, con 44 px de toque (B26·9). */
  .topbar button, .tap { min-height: 44px; min-width: 44px; }
</style>
