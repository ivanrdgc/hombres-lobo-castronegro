<script lang="ts">
  // Botón flotante «🎴» presente en TODAS las pantallas de partida (B19): abre
  // el modal «mi carta + referencia del juego» del juego actual. Así la carta
  // propia y el mazo completo son consultables en CUALQUIER fase (reparto,
  // votaciones, turnos ajenos…).
  import { app } from '../core/sync/store.svelte';
  const { modal }: { modal: string } = $props();
</script>

<button class="cardfab" data-a="open-mycard" aria-label="Mi carta y referencia del juego" title="Mi carta y referencia" onclick={() => (app.ui.modal = { type: modal })}>🎴</button>

<style>
  .cardfab {
    position: fixed; right: 14px; bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 40; width: 54px; height: 54px; border-radius: 50%; padding: 0;
    font-size: 1.55rem; line-height: 1; display: flex; align-items: center; justify-content: center;
    background: var(--card, #22242e); border: 1px solid var(--border, #555);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  }
  .cardfab:active { transform: scale(0.94); }
</style>
