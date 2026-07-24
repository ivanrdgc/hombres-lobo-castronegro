// Auto-ocultado de lo secreto (postura 🍽️ MESA, B28).
//
// En Castronegro los móviles viven boca arriba y desbloqueados sobre la mesa,
// de noche y de día. Por eso TODO lo que se abre con un gesto —la carta, el
// turno de la noche, las cartas que espía un muerto— se cierra solo a los ~12 s
// sin tocarlo: nadie se deja su secreto a la vista de la mesa.
//
// `touch()` reinicia la cuenta atrás: mientras su dueño está decidiendo (toca,
// arrastra, escribe), el panel no se le cierra en las manos.
export const HIDE_MS = 12000;

/**
 * Cierra `close()` a los `ms` de inactividad mientras `isOpen()` sea cierto.
 * Devuelve el `touch()` que reinicia la cuenta. Llámalo en la inicialización
 * del componente (crea un `$effect`).
 */
export function autoHide(isOpen: () => boolean, close: () => void, ms = HIDE_MS): () => void {
  let last = $state(0);
  $effect(() => {
    if (!isOpen()) return;
    void last; // cada toque reinicia la cuenta atrás
    const t = setTimeout(close, ms);
    return () => clearTimeout(t);
  });
  return () => {
    last = Date.now();
  };
}
