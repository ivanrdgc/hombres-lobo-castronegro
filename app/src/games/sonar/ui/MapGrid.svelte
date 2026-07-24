<script lang="ts">
  // Rejilla 8×8. Es la mesa de la tripulación: la miran TRES personas a la vez
  // desde tres ángulos, así que se dibuja lo más grande que cabe y con leyenda
  // debajo (nadie debería adivinar qué significa una casilla).
  // Tres usos, siempre con la MISMA silueta (postura 👥 equipo · B28):
  //  · mapa propio: islas, estela y vuestro submarino;
  //  · elegir casilla («targets»): puntería del torpedo o destino del silencio.
  //    Las marcas son DISCRETAS a propósito —un + apagado, no una diana roja—:
  //    la tripulación rival está a dos metros y no debe distinguir de lejos si
  //    estáis apuntando o navegando. Solo la casilla elegida canta, y es una;
  //  · cuaderno («notes»): mapa en blanco para las deducciones sobre el rival.
  //    Las marcas son LOCALES de este móvil (no se sincronizan).
  import { W, H, COLS, chebyshev, isIsland, sameCell, type Cell } from '../map';
  import type { Sub } from '../types';

  const {
    sub, team, targets = [], onPick = null, sel = null, notes = null, onNote = null,
    legend = true, aim = 'fire',
  }: {
    sub: Sub; team: 'red' | 'blue'; targets?: Cell[]; onPick?: ((c: Cell) => void) | null;
    /** Casilla ya elegida: resaltada hasta confirmar (también sin `targets`,
     *  para enseñar a dónde iríais al navegar). */
    sel?: Cell | null;
    /** Marca por casilla («x,y» → 1 descartada, 2 candidata). Activa el cuaderno. */
    notes?: Record<string, number> | null; onNote?: ((c: Cell) => void) | null;
    /** Leyenda bajo la rejilla; se apaga donde ya hay una compartida. */
    legend?: boolean;
    /** Qué se está eligiendo: disparo (avisa de la onda propia) o deslizamiento. */
    aim?: 'fire' | 'slip';
  } = $props();
  const cells: Cell[] = Array.from({ length: W * H }, (_, i) => ({ x: i % W, y: Math.floor(i / W) }));
  const inTrail = (c: Cell) => sub.trail.some((t) => sameCell(t, c));
  const canPick = (c: Cell) => !!onPick && targets.some((t) => sameCell(t, c));
  const isSel = (c: Cell) => !!sel && sameCell(sel, c);
  // La onda del torpedo pilla las 8 casillas de alrededor (diagonales incluidas):
  // disparar ahí es −1 ❤️ propio, así que se marca distinto.
  const selfHit = (c: Cell) => aim === 'fire' && chebyshev(sub.pos, c) === 1;
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
        {@const on = isSel(c)}
        <button class="sncell pick {selfHit(c) ? 'selfhit' : ''} {on ? 'on' : ''}" data-a="sn-cell" data-p="{c.x},{c.y}"
          aria-pressed={on} aria-label="Elegir {COLS[c.x]}{c.y + 1}{selfHit(c) ? ', la onda os alcanzaría' : ''}"
          onclick={() => onPick!(c)}>{on ? '✓' : selfHit(c) ? '!' : '+'}</button>
      {:else if notable(c)}
        <button class="sncell note n{noteAt(c)}" data-a="sn-note" data-p="{c.x},{c.y}"
          aria-label="Cuaderno {COLS[c.x]}{c.y + 1}: {noteAt(c) === 1 ? 'descartada' : noteAt(c) === 2 ? 'candidata' : 'sin marcar'}" onclick={() => onNote!(c)}>
          {#if noteAt(c) === 1}❌{:else if noteAt(c) === 2}⭕{/if}
        </button>
      {:else}
        <div class="sncell {isIsland(c) ? 'island' : ''} {!notes && inTrail(c) ? 'trail' : ''} {sameCell(sub.pos, c) ? 'sub' : ''} {isSel(c) ? 'on' : ''}">
          {#if isIsland(c)}⛰️{:else if sameCell(sub.pos, c)}{mine}{:else if isSel(c)}✓{:else if !notes && inTrail(c)}•{/if}
        </div>
      {/if}
    {/each}
  {/each}
</div>

{#if legend}
  <p class="snlegend">
    {#if kind === 'notes'}
      <span>❌ descartada</span><span>⭕ candidata</span><span>{mine} vosotros</span><span>⛰️ isla</span>
    {:else if kind === 'aim'}
      <span>+ podéis elegirla</span>{#if aim === 'fire'}<span>! la onda os alcanzaría (−1 ❤️)</span>{/if}<span>✓ elegida</span>
    {:else}
      <span>{mine} vuestro submarino</span><span>• estela: ya pasasteis y no podéis cruzarla</span><span>⛰️ isla</span>
    {/if}
  </p>
{/if}

<style>
  /* Cuanto más grande, mejor: alrededor de este mapa delibera un corro entero.
     Por debajo de ~430 px la rejilla se sale del acolchado de la tarjeta hasta
     el borde — es la diferencia entre casillas de 33 px y de 40 px. */
  .snmap { display: grid; grid-template-columns: 20px repeat(8, 1fr); gap: 3px; margin: 10px auto 6px; width: 100%; max-width: 460px; }
  .snlabel { font-size: 0.72rem; opacity: 0.75; display: flex; align-items: center; justify-content: center; }
  .sncell { aspect-ratio: 1; border-radius: 6px; border: 1px solid var(--border, #333); background: #14202e; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; padding: 0; min-height: 38px; touch-action: manipulation; }
  .sncell.island { background: #23301f; }
  .sncell.trail { color: #7fd0ff; font-size: 1.3rem; background: #182c40; }
  .sncell.sub { background: #1d3a4a; border-color: #3a7ca0; font-size: 1.15rem; }
  /* Puntería DISCRETA (B28): casi el mismo azul de fondo y un signo apagado. De
     cerca se lee sin esfuerzo; a dos metros la rejilla sigue igual que siempre. */
  .sncell.pick { background: #16232f; border-color: #46647d; color: #9fc4dd; cursor: pointer; font-weight: 700; }
  .sncell.pick.selfhit { color: #d9a441; border-color: #6a5327; }
  .sncell.on, .sncell.pick.on { background: var(--accent); border-color: var(--moon); color: #241a05; box-shadow: 0 0 0 2px var(--moon); font-weight: 700; }
  .sncell.pick:active { transform: scale(0.92); }
  .sncell.note { background: #101a26; cursor: pointer; font-size: 0.9rem; }
  .sncell.note.n1 { background: #1a1a1a; opacity: 0.55; }
  .sncell.note.n2 { background: #2b3a1c; border-color: #6f9b3a; }
  .sncell.note:active { transform: scale(0.92); }
  .snlegend { display: flex; flex-wrap: wrap; gap: 3px 10px; font-size: 0.75rem; color: var(--muted); margin: 0 0 2px; line-height: 1.5; }
  @media (max-width: 430px) {
    .snmap { gap: 2px; width: calc(100% + 28px); margin-left: -14px; margin-right: -14px; }
  }
</style>
