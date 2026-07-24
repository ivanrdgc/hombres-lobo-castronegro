<script lang="ts">
  // Menú ⋯ de Decrypto: voz, repetir, pausar, la mesa y terminar. Es del GRUPO:
  // cualquier dispositivo puede terminar.
  //
  // Aquí NO hay «dejar la partida»: con los equipos ya repartidos, irse es
  // cerrarla, así que había dos entradas —«🚪 Dejar la partida» y «🏳️ Terminar»—
  // que llamaban a la MISMA acción con dos nombres. Queda una, y su confirmación
  // lo explica.
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { DecryptoState } from '../types';

  const { game, my }: { game: DecryptoState; my: PlayerDoc } = $props();
  const spectator = $derived(!matchOf(my.id));
  const slug = $derived(app.route.slug);
  const playing = $derived(game.phase !== 'end');
  let open = $state(false);
  const close = () => (open = false);
</script>

<div class="gamemenu">
  <button class="small ghost" data-a="game-menu" aria-haspopup="menu" aria-expanded={open} aria-label="Herramientas" title="Herramientas" onclick={() => (open = !open)}>⋯</button>
  {#if open}
    <button class="menu-scrim" aria-label="Cerrar menú" onclick={close}></button>
    <div class="menu-pop" role="menu">
      <button role="menuitem" data-a="voice-open" onclick={() => { app.ui.modal = { type: 'voice' }; app.ui.voiceTest = null; close(); }}>{app.ui.muted ? '🔇 Voz' : '🗣️ Voz'}</button>
      <!-- Dentro de la partida la URL se recoloca sola: sin esta entrada no hay
           forma de ver quién sigue conectado ni de llegar al menú de un móvil
           apagado. Ojo: sacar a alguien de una partida por equipos la TERMINA;
           si el que falla es el encriptador, el relevo está en su fase
           («🔄 que encripte otro»), que sí deja seguir jugando. -->
      <button role="menuitem" data-a="table-open" onclick={() => { app.ui.modal = { type: 'table' }; close(); }}>🪑 La mesa</button>
      {#if playing}
        <button role="menuitem" data-a="de-repeat" onclick={() => { guard(A.requestRepeat); close(); }}>🔁 Repetir</button>
        {#if game.paused}
          <button role="menuitem" data-a="de-resume" onclick={() => { guard(A.resumeGame); close(); }}>▶️ Reanudar</button>
        {:else}
          <button role="menuitem" data-a="de-pause" onclick={() => { guard(A.pauseGame); close(); }}>⏸️ Pausar</button>
        {/if}
      {/if}
      {#if spectator}
        <button role="menuitem" data-a="back-to-mesa" onclick={() => { close(); navigate(`/g/${slug}`); }}>← Volver a la mesa</button>
      {/if}
      <button role="menuitem" class="danger-text" data-a="de-end-open" onclick={() => { app.ui.modal = { type: 'de-end' }; close(); }}>🏳️ Terminar la partida</button>
    </div>
  {/if}
</div>
