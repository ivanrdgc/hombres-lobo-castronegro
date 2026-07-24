<script lang="ts">
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CodenamesState } from '../types';

  const { game, my, stalled = false }: {
    game: CodenamesState; my: PlayerDoc; stalled?: boolean;
  } = $props();
  const spectator = $derived(!matchOf(my.id));
  const slug = $derived(app.route.slug);
  const playing = $derived(game.phase !== 'end');
  // Escotilla anti-bloqueo: en fase de pista SOLO actúa el Jefe de turno; si no
  // puede (se fue, sin batería), la partida se queda muerta. Tras un rato
  // parada, cualquiera puede cederle el turno al otro equipo.
  const spyName = $derived(game.names[game.spymaster[game.turn]] || 'el Jefe');
  const canSkip = $derived(playing && game.phase === 'clue' && stalled && !game.paused);
  let open = $state(false);
  const close = () => (open = false);
</script>

<div class="gamemenu">
  <button class="small ghost" data-a="game-menu" aria-haspopup="menu" aria-expanded={open} aria-label="Herramientas" title="Herramientas" onclick={() => (open = !open)}>⋯</button>
  {#if open}
    <button class="menu-scrim" aria-label="Cerrar menú" onclick={close}></button>
    <div class="menu-pop" role="menu">
      <button role="menuitem" data-a="voice-open" onclick={() => { app.ui.modal = { type: 'voice' }; app.ui.voiceTest = null; close(); }}>{app.ui.muted ? '🔇 Voz' : '🗣️ Voz'}</button>
      <!-- Dentro de una partida la URL se recoloca sola: sin esta entrada no hay
           forma de llegar al menú de un dispositivo apagado y sacarlo. -->
      <button role="menuitem" data-a="table-open" onclick={() => { app.ui.modal = { type: 'table' }; close(); }}>🪑 La mesa</button>
      {#if playing}
        <button role="menuitem" data-a="cn-repeat" onclick={() => { guard(A.requestRepeat); close(); }}>🔁 Repetir</button>
        {#if canSkip}
          <button role="menuitem" data-a="cn-skip-clue" onclick={() => { guard(A.skipClue); close(); }}>⏭️ Saltar el turno de {spyName}</button>
        {/if}
        {#if game.paused}
          <button role="menuitem" data-a="cn-resume" onclick={() => { guard(A.resumeGame); close(); }}>▶️ Reanudar</button>
        {:else}
          <button role="menuitem" data-a="cn-pause" onclick={() => { guard(A.pauseGame); close(); }}>⏸️ Pausar</button>
        {/if}
      {/if}
      {#if spectator}
        <button role="menuitem" data-a="back-to-mesa" onclick={() => { close(); navigate(`/g/${slug}`); }}>← Volver a la mesa</button>
      {/if}
      {#if !spectator}
        <button role="menuitem" class="danger-text" data-a="cn-leave-open" onclick={() => { app.ui.modal = { type: 'cn-leave' }; close(); }}>🚪 Dejar la partida</button>
      {/if}
      <button role="menuitem" class="danger-text" data-a="cn-end-open" onclick={() => { app.ui.modal = { type: 'cn-end' }; close(); }}>🏳️ Terminar</button>
    </div>
  {/if}
</div>
