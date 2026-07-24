<script lang="ts">
  // Lobby de Codenames: intro con lectura (▶️), «cómo se juega» y tutorial.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('cn-intro'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🕵️ {group.name}</h2>
</div>
<Flash />

<div class="card">
  <div style="display:flex;align-items:center;gap:8px">
    <h3 style="flex:1;margin:0">🕵️ Codenames</h3>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="cn-play-intro" title="Detener" onclick={() => toggleLocalSpeech('cn-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="cn-play-intro" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('cn-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  {#each INTRO_LOBBY as p, i (i)}<p style="margin:9px 0">{p}</p>{/each}
  <button class="block" data-a="cn-open-help" onclick={() => (app.ui.modal = { type: 'cn-help' })}>🎲 Cómo se juega</button>
  <button class="block" data-a="open-demo" onclick={() => (app.ui.modal = { type: 'cn-demo' })}>🎓 Tutorial interactivo (2 min)</button>
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">De {MIN_PLAYERS} a {MAX_PLAYERS} jugadores, en dos equipos. La app custodia el mapa secreto (solo lo ven los Jefes), reparte los equipos y lleva el marcador; la voz (opcional) relata turnos y pistas.</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/codenames/empezar`)}>🕵️ Empezar partida</button>
</div>
