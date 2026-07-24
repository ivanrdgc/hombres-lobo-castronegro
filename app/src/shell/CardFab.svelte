<script lang="ts">
  // Botón flotante «🎴» presente en TODAS las pantallas de partida (B19): abre
  // el modal «mi carta + referencia del juego» del juego actual. Así la carta
  // propia y el mazo completo son consultables en CUALQUIER fase (reparto,
  // votaciones, turnos ajenos…).
  import { app } from '../core/sync/store.svelte';
  const { modal }: { modal: string } = $props();
</script>

<!-- Hueco en el flujo: la pastilla es fija y, sin él, tapaba la última línea
     de los paneles largos (lo detectó la pasada de UI de Ávalon). -->
<div class="cardfab-gap" aria-hidden="true"></div>
<button class="cardfab" data-a="open-mycard" aria-label="Mi carta y las reglas del juego" onclick={() => (app.ui.modal = { type: modal })}>
  <span class="cf-emoji">🎴</span><span class="cf-label">Mi carta<br /><small>y las reglas</small></span>
</button>

<style>
  .cardfab-gap { height: calc(74px + env(safe-area-inset-bottom, 0px)); }
  /* Con forma de pastilla y ROTULADO: en pruebas de mesa, un círculo con un
     emoji suelto no se entiende — hay que decir qué hay detrás. */
  .cardfab {
    position: fixed; right: 12px; bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    z-index: 40; min-height: 52px; padding: 6px 14px 6px 10px; border-radius: 26px;
    display: flex; align-items: center; gap: 8px; text-align: left; line-height: 1.1;
    background: var(--card, #22242e); border: 1px solid #c8a24a;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  }
  .cf-emoji { font-size: 1.5rem; line-height: 1; }
  .cf-label { font-size: 0.82rem; font-weight: 700; }
  .cf-label small { font-weight: 400; opacity: 0.7; font-size: 0.72rem; }
  .cardfab:active { transform: scale(0.96); }
  @media (max-width: 340px) { .cf-label { display: none; } }
</style>
