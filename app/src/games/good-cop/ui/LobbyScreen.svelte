<script lang="ts">
  // Lobby: una sola tarjeta y un solo trabajo (B29) — decir de qué va en dos
  // líneas y dejar tres caminos: aprender, consultar y jugar. La cabecera ya
  // dice a qué juegas, así que aquí no se repite el nombre.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('gc-intro'));
  const meta = gameMeta('good_cop');
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🚔 Good Cop Bad Cop</h2>
</div>
<Flash />

<div class="card">
  <p class="chips" style="margin:0 0 8px">
    <span class="chip">👥 {MIN_PLAYERS}–{MAX_PLAYERS} jugadores</span>
    <span class="chip">⏱️ {meta.mins[0]}–{meta.mins[1]} min</span>
  </p>
  <div style="display:flex;align-items:flex-start;gap:8px">
    <div style="flex:1;min-width:0">
      {#each INTRO_LOBBY as p, i (i)}<p style="margin:{i ? '9px' : '0'} 0 0">{p}</p>{/each}
    </div>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="gc-play-intro" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech('gc-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="gc-play-intro" aria-label="Escuchar la introducción" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('gc-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  <!-- Cómo se sostiene el móvil manda sobre el resto del diseño (B28): se dice
       aquí, antes de repartir nada. -->
  <p class="small-note" style="margin-top:10px">{POSTURE_HINT[meta.posture]}</p>

  <button class="primary block" style="margin-top:12px" data-a="open-start" onclick={() => navigate(`/g/${group.id}/good_cop/empezar`)}>🚔 Empezar partida</button>
  <div class="btnrow" style="margin-top:8px">
    <button data-a="open-demo" onclick={() => (app.ui.modal = { type: 'gc-demo' })}>🎓 Aprender en 2 min</button>
    <button data-a="gc-open-help" onclick={() => (app.ui.modal = { type: 'gc-help' })}>📖 Cómo se juega</button>
  </div>
</div>
