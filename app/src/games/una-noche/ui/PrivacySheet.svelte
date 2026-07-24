<script lang="ts">
  // Cortina de privacidad de Una Noche (postura 🍽️ MESA, B28).
  //
  // En este juego TODO ocurre en una sola noche y los móviles están planos sobre
  // la mesa: quien mira de reojo el móvil del vecino y ve una pantalla distinta
  // ya sabe demasiado. Por eso lo secreto —tu carta, tu panel de acción, lo que
  // viste— NO vive en la pantalla de la fase: se abre aquí, y esta hoja es
  // IDÉNTICA en todos los móviles (ocupa la pantalla entera, mismo encabezado,
  // mismo reloj, mismo botón de cerrar). De lejos no se distingue si estás
  // actuando, si te han dicho «no es tu turno» o si solo mirabas tu carta.
  //
  // Y se cierra sola: 12 s sin tocarla (el contador se reinicia con cada toque,
  // que elegir objetivo lleva su tiempo). El que la abre la cierra además al
  // cambiar de paso o de fase.
  import type { Snippet } from 'svelte';
  import { e2eTestMode } from '../../../core/test-hooks';

  const { title, onclose, children }: {
    title: string;
    onclose: () => void;
    children: Snippet;
  } = $props();

  // En los e2e el reloj no debe cerrar la hoja mientras Playwright piensa.
  const HOLD = e2eTestMode() ? 120000 : 12000;
  let left = $state(HOLD);
  let last = Date.now();

  $effect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, HOLD - (Date.now() - last));
      left = l;
      if (l === 0) onclose();
    }, 250);
    return () => clearInterval(t);
  });

  // Cualquier interacción dentro de la hoja devuelve el reloj a cero.
  function bump() {
    last = Date.now();
    left = HOLD;
  }
</script>

<div
  class="psheet"
  data-a="una-sheet"
  role="dialog"
  aria-modal="true"
  aria-label={title}
  tabindex="-1"
  onpointerdown={bump}
  onkeydown={bump}
>
  <div class="pwrap">
    <div class="phead">
      <span class="ptitle">{title}</span>
      <span class="pclock" data-a="una-sheet-clock" aria-label="se oculta sola">🙈 {Math.ceil(left / 1000)} s</span>
    </div>
    <div class="pbody">{@render children()}</div>
    <button class="ghost block phide" data-a="una-hide" onclick={onclose}>🙈 Ocultar y dejar el móvil en la mesa</button>
    <p class="pfoot">Esta hoja se ve igual en todos los móviles: abrirla no delata nada.</p>
  </div>
</div>

<style>
  /* Pantalla completa y opaca: la silueta es la misma para todos. Por encima de
     los modales (.overlay = 50) para que «🎴 Mi carta» también la use. */
  .psheet {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: var(--bg-1, #12141f);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: calc(10px + env(safe-area-inset-top, 0px)) 14px calc(18px + env(safe-area-inset-bottom, 0px));
    animation: sheetin 0.14s ease;
  }
  @keyframes sheetin { from { opacity: 0.4; } to { opacity: 1; } }
  .pwrap { max-width: 640px; margin: 0 auto; }
  .phead {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  .ptitle { flex: 1; font-weight: 700; font-size: 1rem; font-family: var(--font-display); }
  .pclock {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
    font-size: 0.8rem;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: var(--r-full);
    padding: 3px 9px;
  }
  .pbody { padding-top: 2px; }
  .phide { margin-top: 14px; min-height: 48px; }
  .pfoot { margin: 8px 0 0; text-align: center; font-size: 0.75rem; color: var(--muted); }
</style>
