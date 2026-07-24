<script lang="ts">
  // Lobby de El Espía: introducción (con lectura local en voz alta), cómo se
  // juega, la lista pública de localizaciones y «Empezar partida».
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { INTRO_LOBBY } from '../texts';
  import { LOCATIONS } from '../locations';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  const introAudio = $derived(localAudioState('espia-intro'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🕵️ {group.name}</h2>
</div>
<Flash />
<div class="card">
  <div style="display:flex;align-items:center;gap:8px">
    <h3 style="flex:1;margin:0">🕵️ El Espía</h3>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="espia-play-intro" aria-label="Detener la lectura" title="Detener" onclick={() => toggleLocalSpeech('espia-intro', INTRO_LOBBY)}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="espia-play-intro" aria-label="Escuchar la introducción" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('espia-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  {#each INTRO_LOBBY as p, i (i)}<p style="margin:9px 0">{p}</p>{/each}
  <button class="block" data-a="espia-open-help" onclick={() => (app.ui.modal = { type: 'espia-help' })}>🎲 Cómo se juega</button>
  <button class="block" data-a="open-demo" onclick={() => (app.ui.modal = { type: 'espia-demo' })}>🎓 Tutorial interactivo (2 min)</button>
</div>
<div class="card">
  <h3>📍 Las {LOCATIONS.length} localizaciones</h3>
  <p class="small-note">La lista es pública, como la carta de referencia del juego de mesa: el espía la usa para adivinar y los agentes para medir sus respuestas.</p>
  <button class="block" data-a="espia-open-lugares" onclick={() => (app.ui.modal = { type: 'espia-lugares' })}>📍 Ver las localizaciones</button>
</div>
<div class="card">
  <p class="small-note" style="margin-top:0">De 3 a 8 jugadores. Rondas de 8 minutos (elegible al empezar) con marcador acumulado.</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/espia/empezar`)}>🕵️ Empezar partida</button>
</div>
