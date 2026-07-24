<script lang="ts">
  // Puerta de entrada de Skull: de qué va en dos líneas y tres caminos —
  // aprender, consultar y jugar—. El nombre del juego lo dice la cabecera; aquí
  // no se repite.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('sk-intro'));
  const meta = gameMeta('skull');
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>💀 Skull</h2>
</div>
<Flash />

<div class="card">
  <p style="margin:0 0 8px">{INTRO_LOBBY[0]}</p>
  <details class="skmore">
    <summary data-a="sk-more-intro">▸ Y cómo se gana</summary>
    <p class="small-note">{INTRO_LOBBY[1]}</p>
  </details>

  {#if introAudio === 'playing'}
    <button class="small ghost" data-a="sk-play-intro" onclick={() => toggleLocalSpeech('sk-intro', [])}>⏹️ Parar la lectura</button>
  {:else if introAudio === 'loading'}
    <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
  {:else}
    <button class="small ghost" data-a="sk-play-intro" onclick={() => toggleLocalSpeech('sk-intro', INTRO_LOBBY)}>▶️ Escuchar esta intro</button>
  {/if}

  <p class="small-note" style="margin:12px 0 2px">👥 De {MIN_PLAYERS} a {MAX_PLAYERS} jugadores · ⏱️ {meta.mins[0]}–{meta.mins[1]} min</p>
  <p class="small-note" style="margin:0 0 12px">{POSTURE_HINT[meta.posture]}</p>

  <div class="btnrow" style="gap:8px">
    <button data-a="open-demo" style="flex:1" onclick={() => (app.ui.modal = { type: 'sk-demo' })}>🎓 Aprender jugando</button>
    <button data-a="sk-open-help" style="flex:1" onclick={() => (app.ui.modal = { type: 'sk-help' })}>🎲 Cómo se juega</button>
  </div>
  <button class="primary block" style="margin-top:8px" data-a="open-start" onclick={() => navigate(`/g/${group.id}/skull/empezar`)}>💀 Empezar partida</button>
</div>

<style>
  .skmore { margin: 0 0 10px; }
  .skmore summary { font-size: 0.85rem; color: var(--muted, #999); cursor: pointer; min-height: 30px; display: flex; align-items: center; }
  .skmore p { margin: 6px 0 0; }
</style>
