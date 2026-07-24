<script lang="ts">
  // Lobby de Insider: la PRIMERA pantalla del juego, con un solo trabajo (B29):
  // decir de qué va y dejar tres caminos claros —aprender (tutorial), consultar
  // (cómo se juega) y jugar (empezar)—. El nombre del juego lo dice la cabecera
  // y NO se repite debajo; los ajustes (quién juega, duración, voz) viven en
  // «Empezar partida», que es donde se tocan.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { MIN_PLAYERS, MAX_PLAYERS, INSIDER_DEFAULT_MIN } from '../engine';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('ins-intro'));
  const meta = gameMeta('insider');
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🤫 Insider</h2>
</div>
<Flash />

<!-- UNA tarjeta: de qué va + cómo se sostiene el móvil + los tres caminos. -->
<div class="card">
  <p class="chips" style="margin:0 0 10px">
    <span class="chip">👥 {MIN_PLAYERS}–{MAX_PLAYERS} jugadores</span>
    <span class="chip">⏱️ {meta.mins[0]}–{meta.mins[1]} min</span>
    {#if meta.easy}<span class="chip">🌱 fácil de explicar</span>{/if}
  </p>

  <div class="introhead">
    <p class="lead">{INTRO_LOBBY[0]}</p>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="ins-play-intro" aria-label="Detener la lectura" title="Detener" onclick={() => toggleLocalSpeech('ins-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="ins-play-intro" aria-label="Escuchar la explicación" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('ins-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  <p class="small-note">{INTRO_LOBBY[1]}</p>
  <!-- Cómo se sostiene el móvil (B28): en Insider el interrogatorio se juega
       hablando, con los móviles planos sobre la mesa. Hay que decirlo ANTES. -->
  <p class="small-note" data-a="ins-posture">{POSTURE_HINT[meta.posture]}</p>

  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/insider/empezar`)}>🤫 Empezar partida</button>
  <p class="small-note" style="text-align:center;margin-top:6px">Elegís quién juega y cuánto dura ({INSIDER_DEFAULT_MIN} min por defecto) en la pantalla siguiente.</p>
  <div class="btnrow" style="margin-top:10px">
    <button data-a="open-demo" style="flex:1" onclick={() => (app.ui.modal = { type: 'ins-demo' })}>🎓 Aprender en 2 min</button>
    <button data-a="ins-open-help" style="flex:1" onclick={() => (app.ui.modal = { type: 'ins-help' })}>📖 Cómo se juega</button>
  </div>
</div>

<style>
  /* La explicación y su ▶️ en la misma línea: el botón de escuchar pertenece al
     texto que lee, no a un título aparte (que además repetía el nombre del juego). */
  .introhead { display: flex; align-items: flex-start; gap: 8px; }
  .lead { flex: 1; margin: 0; font-size: 1.02rem; line-height: 1.5; }
</style>
