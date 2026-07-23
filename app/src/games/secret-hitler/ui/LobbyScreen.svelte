<script lang="ts">
  // Lobby de Secret Hitler: intro con lectura (▶️) + «cómo se juega». No
  // hay roles que configurar (los fija el número de jugadores). La selección de
  // quién juega se hace en «Empezar partida».
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../roles';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('sh-intro'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🏛️ {group.name}</h2>
</div>
<Flash />

<div class="card">
  <div style="display:flex;align-items:center;gap:8px">
    <h3 style="flex:1;margin:0">🏛️ Secret Hitler</h3>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="sh-play-intro" title="Detener" onclick={() => toggleLocalSpeech('sh-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="sh-play-intro" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('sh-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  {#each INTRO_LOBBY as p, i (i)}<p style="margin:9px 0">{p}</p>{/each}
  <button class="block" data-a="sh-open-help" onclick={() => (app.ui.modal = { type: 'sh-help' })}>🎲 Cómo se juega y los roles</button>
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">De {MIN_PLAYERS} a {MAX_PLAYERS} jugadores + un dispositivo que puede poner la voz. La app reparte bandos, custodia el mazo de decretos y aplica los poderes: nadie hace de máster.</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/secret_hitler/empezar`)}>🏛️ Empezar partida</button>
</div>
