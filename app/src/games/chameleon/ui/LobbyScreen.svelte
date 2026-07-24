<script lang="ts">
  // Primera pantalla del juego (B29): UN solo trabajo — decir de qué va en dos
  // líneas y dejar tres caminos claros (aprender · consultar · jugar).
  //
  // Antes había dos tarjetas y el nombre del juego escrito TRES veces (cabecera,
  // título de la tarjeta y primer párrafo). La cabecera ya dice a qué juegas
  // (B27), así que aquí abajo no se repite: en su sitio van las fichas de
  // «para cuántos / cuánto dura», el mismo vocabulario del catálogo.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('ch-intro'));
  const meta = gameMeta('chameleon');
  // El corpus arranca con «El Camaleón: todos veis…» porque así se LEE en voz
  // alta. En pantalla la cabecera ya lo dice, así que el prefijo sobra (el ▶️
  // sigue leyendo el texto original: la voz no se toca).
  const intro = INTRO_LOBBY.map((p, i) => {
    const s = p.replace(/^El Camaleón[:.]\s+/, '');
    return i === 0 && s !== p ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  });
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🦎 El Camaleón</h2>
</div>
<Flash />

<div class="card">
  <div class="head">
    <p class="chips" style="flex:1;margin:0">
      <span class="chip">👥 {MIN_PLAYERS}–{MAX_PLAYERS}</span>
      <span class="chip">⏱️ {meta.mins[0]}–{meta.mins[1]} min</span>
      {#if meta.easy}<span class="chip">🌱 fácil de explicar</span>{/if}
    </p>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="ch-play-intro" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech('ch-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="ch-play-intro" aria-label="Escuchar la introducción" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('ch-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>

  {#each intro as p, i (i)}<p style="margin:9px 0">{p}</p>{/each}

  <!-- Cómo se sostiene el móvil manda sobre el resto del diseño (docs/UX.md ·
       «Postura del móvil»): aquí es de MESA, y se dice antes de repartir. -->
  <p class="posture" data-a="ch-posture">{POSTURE_HINT[meta.posture]}</p>

  <div class="btnrow">
    <button class="ghost" style="flex:1 1 46%" data-a="open-demo" onclick={() => (app.ui.modal = { type: 'ch-demo' })}>🎓 Tutorial (2 min)</button>
    <button class="ghost" style="flex:1 1 46%" data-a="ch-open-help" onclick={() => (app.ui.modal = { type: 'ch-help' })}>🎲 Cómo se juega</button>
  </div>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/chameleon/empezar`)}>🦎 Empezar partida</button>
</div>

<style>
  .head { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
  .posture {
    margin: 12px 0 10px; padding: 8px 10px; border-radius: 10px;
    font-size: 0.86rem; line-height: 1.35;
    border: 1px solid var(--border, #2c3047);
    background: var(--card2, #222639);
    color: var(--text, #eceaf6);
  }
</style>
