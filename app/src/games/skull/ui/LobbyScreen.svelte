<script lang="ts">
  // Lobby de Skull: intro con lectura (▶️), «cómo se juega» y tutorial.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('sk-intro'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>💀 Skull</h2>
</div>
<Flash />

<div class="card">
  <div style="display:flex;align-items:center;gap:8px">
    <h3 style="flex:1;margin:0">💀 Skull</h3>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="sk-play-intro" title="Detener" onclick={() => toggleLocalSpeech('sk-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="sk-play-intro" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('sk-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  {#each INTRO_LOBBY as p, i (i)}<p style="margin:9px 0">{p}</p>{/each}
  <button class="block" data-a="sk-open-help" onclick={() => (app.ui.modal = { type: 'sk-help' })}>🎲 Cómo se juega</button>
  <button class="block" data-a="open-demo" onclick={() => (app.ui.modal = { type: 'sk-demo' })}>🎓 Tutorial interactivo (2 min)</button>
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">De {MIN_PLAYERS} a {MAX_PLAYERS} jugadores. La app custodia las pilas boca abajo (solo ves las tuyas), lleva las apuestas y el marcador; la voz (opcional) relata las jugadas.</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/skull/empezar`)}>💀 Empezar partida</button>
</div>
