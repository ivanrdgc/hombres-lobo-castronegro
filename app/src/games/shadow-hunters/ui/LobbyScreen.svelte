<script lang="ts">
  // Primera pantalla del juego (B29): UN solo trabajo — decir de qué va en dos
  // líneas y dejar tres caminos: aprender (tutorial), consultar (cómo se juega)
  // y jugar (empezar). La cabecera ya dice a qué juegas, así que la tarjeta de
  // debajo NO repite el nombre; y la postura del móvil se avisa aquí, antes de
  // repartir, porque decide cómo se juega toda la partida (B28).
  import { app, navigate } from '../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
  import { INTRO_LOBBY } from '../texts';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const introAudio = $derived(localAudioState('sh-intro'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🌘 Shadow Hunters</h2>
</div>
<Flash />

<div class="card">
  <div style="display:flex;align-items:flex-start;gap:8px">
    <!-- Lo que se lee y lo que se escucha son el MISMO texto (INTRO_LOBBY). -->
    <p style="flex:1;margin:0">{INTRO_LOBBY[0]}</p>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="sh-play-intro" title="Detener" onclick={() => toggleLocalSpeech('sh-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="sh-play-intro" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('sh-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  {#each INTRO_LOBBY.slice(1) as p, i (i)}<p style="margin:9px 0 0">{p}</p>{/each}
  <p class="small-note" style="margin:10px 0 0">{POSTURE_HINT[gameMeta('shadow_hunters').posture]}</p>
  <p class="small-note" style="margin:4px 0 0">De {MIN_PLAYERS} a {MAX_PLAYERS} jugadores · {gameMeta('shadow_hunters').mins[0]}-{gameMeta('shadow_hunters').mins[1]} min.</p>
</div>

<div class="card">
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/shadow_hunters/empezar`)}>🌘 Empezar partida</button>
  <div class="btnrow" style="margin-top:8px">
    <button style="flex:1" data-a="open-demo" onclick={() => (app.ui.modal = { type: 'sh-demo' })}>🎓 Tutorial</button>
    <button style="flex:1" data-a="sh-open-help" onclick={() => (app.ui.modal = { type: 'sh-help' })}>🎲 Cómo se juega</button>
  </div>
  <p class="small-note" style="margin:8px 0 0">Si nadie lo ha jugado nunca, empezad por el tutorial: 2 minutos, solo en este móvil.</p>
</div>
