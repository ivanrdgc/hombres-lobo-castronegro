<script lang="ts">
  // Barra fija inferior de herramientas (port de masterToolsBar() de la v1).
  // Todos los jugadores pueden repetir la locución y terminar la partida.
  // Sin botón de «forzar»: se insiste hasta que el responsable actúe (repetir,
  // avisos, repaso de roles) o, si alguien se ha ido, se termina la partida.
  import { app, me, isMaster } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { GroupDoc } from '../../../core/sync/schema';

  const { group }: { group: GroupDoc } = $props();

  const game = $derived(group.game);
  const my = $derived(me());
  const narrator = $derived(isMaster());

  function voiceOpen() {
    app.ui.modal = { type: 'voice' };
    app.ui.voiceTest = null;
  }

  function openGameRoles() {
    app.ui.modal = { type: 'game-roles' };
  }

  function endGame() {
    if (isMaster() || (my && my.inGame)) app.ui.modal = { type: 'end-game' };
  }
</script>

{#if game && game.phase !== 'end' && (narrator || (my && my.inGame))}
  {#if game.mode !== 'auto'}
    <!-- En guiado/manual: solo la chuleta de cartas de la partida. -->
    <div class="mastertools"><div class="inner"><button class="ghost" data-a="open-game-roles" onclick={openGameRoles}>🎴 Cartas</button></div></div>
  {:else}
    <div class="mastertools"><div class="inner">
      <button class="ghost" data-a="voice-open" onclick={voiceOpen}>{app.ui.muted ? '🔇 Voz' : '🗣️ Voz'}</button>
      <button class="ghost" data-a="open-game-roles" onclick={openGameRoles}>🎴 Cartas</button>
      <button class="ghost" data-a="repeat-last" onclick={() => guard(A.requestRepeat)}>🔁 Repetir</button>
      <button class="ghost" data-a="end-game" onclick={endGame}>🏳️ Fin</button>
    </div></div>
    {#if narrator}<p class="small-note" style="text-align:center">🔊 Eres el narrador: mantén la pantalla encendida y la app en primer plano. Si bloqueas el móvil o cambias de aplicación, la voz se detiene (limitación del navegador). Otro dispositivo puede tomar el relevo desde 🗣️ Voz.</p>{/if}
  {/if}
{/if}
