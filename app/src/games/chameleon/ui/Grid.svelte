<script lang="ts">
  // Rejilla del tema: las 16 palabras, PÚBLICAS. `secret` resalta la palabra
  // secreta (solo se le pasa a quien ya la conoce: su carta privada, o el final
  // de ronda, cuando se destapa para todos). `selectable` la hace tocable (el
  // Camaleón, para adivinar) y `guess` marca la casilla apostada.
  //
  // Móvil primero: las columnas se calculan solas (2 en un móvil de 360 px, 4 en
  // pantalla ancha) en vez de forzar 4×4 y dejar «Tienda de campaña» partida en
  // tres líneas ilegibles.
  const { grid, secret = null, guess = null, selectable = false, onpick = null }: {
    grid: string[];
    secret?: number | null;
    guess?: number | null;
    selectable?: boolean;
    onpick?: ((i: number) => void) | null;
  } = $props();
</script>

<div class="chgrid" lang="es">
  {#each grid as w, i (i)}
    <button
      class="cell {secret === i ? 'secret' : ''} {guess === i ? 'guess' : ''} {selectable ? 'pickable' : ''}"
      data-a="ch-cell" data-p={String(i)}
      disabled={!selectable}
      aria-pressed={selectable ? guess === i : undefined}
      onclick={() => selectable && onpick && onpick(i)}
    >
      <span class="w">{w}</span>
      <!-- La marca (no solo el color): de noche, un verde y un ámbar en una
           casilla pequeña se confunden. -->
      {#if secret === i}<span class="mark k" aria-label="tu palabra secreta">🔑</span>{/if}
      {#if guess === i}<span class="mark g" aria-label="casilla apostada">🎯</span>{/if}
    </button>
  {/each}
</div>

<style>
  .chgrid {
    display: grid;
    /* 2 columnas en móvil, 3 a media pantalla, 4×4 cuando cabe de verdad. */
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 7px;
    margin: 10px 0 2px;
  }
  .cell {
    position: relative;
    min-height: 52px; /* área de toque cómoda cuando el Camaleón apuesta */
    display: flex; align-items: center; justify-content: center; text-align: center;
    padding: 9px 7px; border-radius: 10px;
    border: 1px solid var(--border, #2c3047);
    background: var(--card2, #222639); color: var(--text, #eceaf6);
    font-size: 0.9rem; line-height: 1.2; font-weight: 600;
    hyphens: auto; word-break: normal; overflow-wrap: break-word;
  }
  /* La rejilla es INFORMACIÓN, no un botón: fuera de la fase de adivinar nadie
     la toca, pero tiene que LEERSE. El `button:disabled` global la dejaba al
     45 % de opacidad, que es justo la pantalla que Iván no podía leer. */
  .cell:disabled { cursor: default; opacity: 1; }
  /* Y cuando SÍ se toca, que se note que se toca. */
  .cell.pickable { border-color: var(--line-2, #3b4060); }
  .cell.pickable:active { transform: scale(0.96); }
  .cell.secret {
    background: color-mix(in srgb, var(--ok, #58b98c) 22%, var(--card2, #222639));
    border-color: var(--ok, #58b98c); color: #d6ffe6;
    box-shadow: 0 0 0 2px var(--ok, #58b98c) inset;
  }
  .cell.guess { border-color: var(--accent, #f2b552); box-shadow: 0 0 0 3px var(--accent, #f2b552) inset; }
  .mark { position: absolute; top: 2px; font-size: 0.72rem; line-height: 1; }
  .mark.k { left: 3px; }
  .mark.g { right: 3px; }
</style>
