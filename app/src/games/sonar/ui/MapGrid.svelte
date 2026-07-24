<script lang="ts">
  // Rejilla 8×8 con tres usos, cada uno con SU leyenda debajo (nadie debería
  // tener que adivinar qué significa una casilla):
  //  · mapa PROPIO: islas, estela y posición de tu submarino;
  //  · puntería («targets»): casillas a tiro — 💥 marca las que también te
  //    quitarían vida a TI (la onda alcanza las 8 casillas de alrededor). La
  //    casilla elegida («sel») queda resaltada hasta que se confirma el disparo;
  //  · cuaderno («notes»): mapa en blanco para marcar tus deducciones sobre el
  //    rival. Las marcas son LOCALES de este móvil (no se sincronizan).
  import { W, H, COLS, chebyshev, isIsland, sameCell, type Cell } from '../map';
  import type { Sub } from '../types';

  const {
    sub, team, targets = [], onPick = null, sel = null, notes = null, onNote = null, legend = true,
  }: {
    sub: Sub; team: 'red' | 'blue'; targets?: Cell[]; onPick?: ((c: Cell) => void) | null;
    /** Casilla ya elegida (torpedo): resaltada hasta confirmar el disparo. */
    sel?: Cell | null;
    /** Marca por casilla («x,y» → 1 descartada, 2 candidata). Activa el cuaderno. */
    notes?: Record<string, number> | null; onNote?: ((c: Cell) => void) | null;
    /** Leyenda bajo la rejilla; se apaga donde ya hay una compartida. */
    legend?: boolean;
  } = $props();
  const cells: Cell[] = Array.from({ length: W * H }, (_, i) => ({ x: i % W, y: Math.floor(i / W) }));
  const inTrail = (c: Cell) => sub.trail.some((t) => sameCell(t, c));
  const canPick = (c: Cell) => !!onPick && targets.some((t) => sameCell(t, c));
  // La onda del torpedo pilla las 8 casillas de alrededor (diagonales incluidas):
  // disparar ahí es −1 ❤️ propio, así que se pinta distinto.
  const selfHit = (c: Cell) => chebyshev(sub.pos, c) === 1;
  const noteAt = (c: Cell) => (notes ? notes[`${c.x},${c.y}`] || 0 : 0);
  const notable = (c: Cell) => !!notes && !!onNote && !isIsland(c) && !sameCell(sub.pos, c);
  const kind = $derived(notes ? 'notes' : onPick ? 'aim' : 'own');
  const mine = $derived(team === 'red' ? '🔴' : '🔵');
</script>

<div class="snmap" data-team={team} data-kind={kind}>
  <div class="sncorner"></div>
  {#each COLS.slice(0, W) as l (l)}<div class="snlabel">{l}</div>{/each}
  {#each Array.from({ length: H }, (_, y) => y) as y (y)}
    <div class="snlabel">{y + 1}</div>
    {#each cells.slice(y * W, y * W + W) as c (c.x)}
      {#if canPick(c)}
        {@const on = !!sel && sameCell(sel, c)}
        <button class="sncell pick {selfHit(c) ? 'selfhit' : ''} {on ? 'on' : ''}" data-a="sn-cell" data-p="{c.x},{c.y}"
          aria-pressed={on} aria-label="Apuntar a {COLS[c.x]}{c.y + 1}{selfHit(c) ? ', la onda os alcanzaría' : ''}"
          onclick={() => onPick!(c)}>{on ? '✅' : selfHit(c) ? '💥' : '🎯'}</button>
      {:else if notable(c)}
        <button class="sncell note n{noteAt(c)}" data-a="sn-note" data-p="{c.x},{c.y}"
          aria-label="Cuaderno {COLS[c.x]}{c.y + 1}: {noteAt(c) === 1 ? 'descartada' : noteAt(c) === 2 ? 'candidata' : 'sin marcar'}" onclick={() => onNote!(c)}>
          {#if noteAt(c) === 1}❌{:else if noteAt(c) === 2}⭕{/if}
        </button>
      {:else}
        <div class="sncell {isIsland(c) ? 'island' : ''} {!notes && inTrail(c) ? 'trail' : ''} {sameCell(sub.pos, c) ? 'sub' : ''}">
          {#if isIsland(c)}⛰️{:else if sameCell(sub.pos, c)}{team === 'red' ? '🔴' : '🔵'}{:else if !notes && inTrail(c)}•{/if}
        </div>
      {/if}
    {/each}
  {/each}
</div>

{#if legend}
  <p class="snlegend">
    {#if kind === 'notes'}
      <span>❌ descartada</span><span>⭕ candidata</span><span>{mine} vosotros (de referencia)</span><span>⛰️ isla</span>
    {:else if kind === 'aim'}
      <span>🎯 a tiro</span><span>💥 a tiro, pero la onda os alcanza (−1 ❤️ vuestro)</span><span>{mine} vosotros</span><span>⛰️ isla</span><span>apagadas: fuera de alcance</span>
    {:else}
      <span>{mine} vuestro submarino</span><span>• estela: ya pasasteis y no podéis cruzarla</span><span>⛰️ isla</span>
    {/if}
  </p>
{/if}

<style>
  /* Móvil primero: la rejilla ocupa el ancho disponible y por debajo de ~400 px
     se sale un poco del acolchado de la tarjeta — es la diferencia entre
     casillas de 33 px y de 36 px cuando hay 8 columnas. */
  .snmap { display: grid; grid-template-columns: 16px repeat(8, 1fr); gap: 3px; margin: 10px auto 4px; width: 100%; max-width: 400px; }
  .snlabel { font-size: 0.66rem; opacity: 0.65; display: flex; align-items: center; justify-content: center; }
  .sncell { aspect-ratio: 1; border-radius: 5px; border: 1px solid var(--border, #333); background: #14202e; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; padding: 0; min-height: 34px; touch-action: manipulation; }
  .sncell.island { background: #23301f; }
  .sncell.trail { color: #7fd0ff; font-size: 1.1rem; background: #182c40; }
  .sncell.sub { background: #1d3a4a; border-color: #3a7ca0; font-size: 0.95rem; }
  .sncell.pick { background: #40232a; border-color: #a03a5a; cursor: pointer; font-size: 0.75rem; opacity: 0.9; }
  .sncell.pick.selfhit { background: #4a2a18; border-color: #b06a2a; }
  .sncell.pick.on { background: var(--accent); border-color: var(--moon); box-shadow: 0 0 0 2px var(--moon); opacity: 1; }
  .sncell.pick:active { transform: scale(0.92); }
  .sncell.note { background: #101a26; cursor: pointer; font-size: 0.75rem; }
  .sncell.note.n1 { background: #1a1a1a; opacity: 0.55; }
  .sncell.note.n2 { background: #2b3a1c; border-color: #6f9b3a; }
  .sncell.note:active { transform: scale(0.92); }
  .snlegend { display: flex; flex-wrap: wrap; gap: 3px 10px; font-size: 0.7rem; color: var(--muted); margin: 0 0 2px; line-height: 1.5; }
  @media (max-width: 400px) {
    .snmap { gap: 2px; width: calc(100% + 16px); margin-left: -8px; margin-right: -8px; }
  }
</style>
