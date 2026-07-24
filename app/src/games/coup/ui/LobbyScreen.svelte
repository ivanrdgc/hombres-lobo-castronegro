<script lang="ts">
  // Lobby de Coup (B29): UNA tarjeta con un solo trabajo — decir de qué va en
  // dos líneas y dejar tres caminos claros: jugar, aprender jugando y consultar
  // las reglas. El nombre del juego lo dice la cabecera, así que aquí no se
  // repite; fuera también el «la app baraja y custodia…», que no cambia lo que
  // haces. La ficha (jugadores, duración, palo) usa el mismo vocabulario que el
  // catálogo de la mesa. Sin ajustes: la app reparte.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('coup-intro'));
  const meta = gameMeta('coup');
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🃏 Coup</h2>
  {#if introAudio === 'playing'}
    <button class="small ghost" data-a="coup-play-intro" title="Detener" onclick={() => toggleLocalSpeech('coup-intro', [])}>⏹️</button>
  {:else if introAudio === 'loading'}
    <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
  {:else}
    <button class="small ghost" data-a="coup-play-intro" title="Escuchar de qué va" aria-label="Escuchar de qué va" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('coup-intro', INTRO_LOBBY)}>▶️</button>
  {/if}
</div>
<Flash />

<div class="card">
  <p class="chips">
    <span class="chip">👥 {MIN_PLAYERS}–{MAX_PLAYERS}</span>
    <span class="chip">⏱️ {meta.mins[0]}–{meta.mins[1]} min</span>
    <span class="chip">🎭 {meta.vibe}</span>
  </p>
  <p class="lead">Escondes dos cartas de influencia y en tu turno dices ser el personaje que te conviene —lo tengas o no— para cobrar, robar o asesinar. Los demás eligen entre creerte, desafiar tu farol o bloquearlo; quien pierde sus dos cartas queda fuera y gana el último en pie.</p>
  <!-- Aviso de postura (B28): Coup es de MANO, y saberlo antes de repartir evita
       que alguien deje el móvil bocarriba con sus dos influencias al aire. -->
  <p class="small-note" data-a="coup-posture" style="margin-top:10px">{POSTURE_HINT[meta.posture]}</p>

  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/coup/empezar`)}>🃏 Empezar partida</button>
  <div class="btnrow">
    <button data-a="open-demo" onclick={() => (app.ui.modal = { type: 'coup-demo' })}>🎓 Tutorial interactivo · 2 min</button>
    <button data-a="coup-open-help" onclick={() => (app.ui.modal = { type: 'coup-help' })}>📖 Cómo se juega</button>
  </div>
</div>

<style>
  .lead { font-size: 0.98rem; line-height: 1.45; margin-top: 10px; }
</style>
