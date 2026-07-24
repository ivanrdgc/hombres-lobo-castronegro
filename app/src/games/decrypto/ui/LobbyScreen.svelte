<script lang="ts">
  // Lobby de Decrypto: una sola tarjeta y un solo trabajo (B29) — decir de qué
  // va y dejar tres caminos: jugar, aprender jugando y consultar las reglas. El
  // nombre del juego lo dice la cabecera UNA vez (antes salía también como
  // título de la tarjeta), y el ▶️ de la intro se ha subido a esa cabecera.
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import { POSTURE_HINT, gameMeta } from '../../registry';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('de-intro'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🔐 Decrypto</h2>
  {#if introAudio === 'playing'}
    <button class="small ghost" data-a="de-play-intro" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech('de-intro', [])}>⏹️</button>
  {:else if introAudio === 'loading'}
    <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
  {:else}
    <button class="small ghost" data-a="de-play-intro" aria-label="Escuchar la intro" title="Escuchar la intro" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('de-intro', INTRO_LOBBY)}>▶️</button>
  {/if}
</div>
<Flash />

<div class="card">
  {#each INTRO_LOBBY as p, i (i)}<p style="margin:0 0 10px">{p}</p>{/each}
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/decrypto/empezar`)}>🔐 Empezar partida</button>
  <div class="delearn">
    <button data-a="open-demo" onclick={() => (app.ui.modal = { type: 'de-demo' })}>🎓 Aprender jugando<small>tutorial de 2 min</small></button>
    <button data-a="de-open-help" onclick={() => (app.ui.modal = { type: 'de-help' })}>🎲 Cómo se juega<small>las reglas al detalle</small></button>
  </div>
  <p class="small-note" style="margin:12px 0 0">De {MIN_PLAYERS} a {MAX_PLAYERS} jugadores, en dos equipos.</p>
  <p class="small-note" data-a="de-posture" style="margin:4px 0 0">{POSTURE_HINT[gameMeta('decrypto').posture]}</p>
</div>

<style>
  .delearn { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-top: 8px; }
  .delearn button { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; text-align: left; line-height: 1.25; font-size: 0.92rem; }
  .delearn small { font-size: 0.72rem; font-weight: 400; color: var(--muted, #a9a6c0); }
</style>
