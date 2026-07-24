<script lang="ts">
  // Cortina de privacidad de Secret Hitler (postura 🍽️ MESA con momentos de
  // mano, B28).
  //
  // El juego se debate con el móvil PLANO sobre la mesa: nada secreto puede
  // pintarse solo al cambiar de fase (el Presidente todavía no ha cogido el
  // móvil y la mesa entera le está viendo los tres decretos). Todo lo privado
  // —tu carta, los decretos de la legislatura, las tres del 🔮, la lealtad del
  // 🔎— se abre AQUÍ, con un gesto del dueño del móvil.
  //
  // La hoja es idéntica en todos los móviles: ocupa la pantalla entera, mismo
  // encabezado, mismo reloj, mismo botón de cerrar. Y se cierra sola cuando el
  // reloj llega a cero (cada toque lo reinicia: leer tres decretos con sus
  // consecuencias lleva su tiempo), así que nadie se deja un secreto desplegado
  // boca arriba durante el debate.
  import { untrack, type Snippet } from 'svelte';
  import { e2eTestMode } from '../../../core/test-hooks';

  const { title, hold = 12000, onclose, children }: {
    title: string;
    /** Cuánto aguanta destapada sin que la toquen (ms). */
    hold?: number;
    onclose: () => void;
    children: Snippet;
  } = $props();

  // En los e2e el reloj no debe cerrar la hoja mientras Playwright piensa.
  const HOLD = e2eTestMode() ? 120000 : untrack(() => hold);
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
  data-a="sh-sheet"
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
      <span class="pclock" data-a="sh-sheet-clock" aria-label="se oculta sola">🙈 {Math.ceil(left / 1000)} s</span>
    </div>
    <div class="pbody">{@render children()}</div>
    <button class="ghost block phide" data-a="sh-hide" onclick={onclose}>🙈 Ocultar y dejar el móvil en la mesa</button>
    <p class="pfoot">Se oculta sola: cada toque reinicia la cuenta. Nada de esto queda en pantalla al cerrarla.</p>
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
