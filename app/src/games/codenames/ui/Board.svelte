<script lang="ts">
  // Tablero 5×5, en DOS versiones porque son dos posturas distintas (B28):
  //
  //  • `priv` — el mapa del JEFE, postura de MANO: móvil sujeto mirando a él y
  //    a 30 cm de la cara. El color va en DETALLE FINO (el emoji de la esquina
  //    y el borde de 1 px) sobre un fondo casi igual en las 25 casillas: a 30 cm
  //    se lee de un golpe, pero a metro y medio o de reojo un borde de 1 px no
  //    se resuelve y las manchas grandes de color —que sí sobreviven a la
  //    distancia y al escorzo— no existen. Denso, para que el mapa entero y la
  //    pista quepan en la misma pantalla sin scroll.
  //  • `pub` — el tablero de los AGENTES y el mapa final, postura de MESA: es
  //    público, se mira entre todos y se toca en grupo, así que va al revés:
  //    casillas grandes, borde marcado, palabra grande y emoji grande, para
  //    leerse desde el otro lado de la mesa y en escorzo.
  //
  // Las palabras (públicas) van a plena luz en las dos; lo que cambia de una a
  // otra es solo el volumen del color, que es lo secreto.
  import { canSeeMap, canGuess } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CodenamesState } from '../types';

  const { game, my, sel = null, onpick = null }: {
    game: CodenamesState; my: PlayerDoc; sel?: number | null; onpick?: ((i: number) => void) | null;
  } = $props();
  const canSee = $derived(canSeeMap(game, my.id));
  const canPick = $derived(canGuess(game, my.id));
  // Al terminar, el mapa deja de ser secreto: se enseña en la versión pública.
  const priv = $derived(canSee && game.phase !== 'end');
  const cls = (i: number) => {
    const revealed = game.revealed[i];
    const color = game.map[i];
    if (revealed) return `rev ${color}`;
    return canSee ? `spy ${color}` : 'hidden';
  };
  const tag = (i: number) =>
    game.map[i] === 'assassin' ? '💀' : game.map[i] === 'neutral' ? '⬜' : game.map[i] === 'red' ? '🔴' : '🔵';
</script>

<div class="cnboard {priv ? 'priv' : 'pub'}">
  {#each game.words as w, i (i)}
    <button
      class="cncell {cls(i)}"
      class:selected={sel === i && !game.revealed[i]}
      data-a="cn-cell" data-p={String(i)}
      disabled={!canPick || game.revealed[i]}
      onclick={() => canPick && !game.revealed[i] && onpick && onpick(i)}
    >
      <span class="cnword">{w}</span>
      {#if game.revealed[i] || canSee}<span class="cntag">{tag(i)}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .cnboard { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin: 8px 0; }
  .cncell {
    position: relative; aspect-ratio: 1.15; display: flex; align-items: center; justify-content: center;
    text-align: center; padding: 2px 3px; border-radius: 9px; border: 1px solid var(--border, #333);
    background: var(--surface, #20222e); color: var(--fg, #eee);
    font-size: 0.75rem; line-height: 1.05; font-weight: 700; word-break: break-word;
  }
  /* El tablero es INFORMACIÓN, no un botón: aunque no puedas tocarlo (fase de
     pista, Jefes, rival) debe verse a plena luz, no al 45 % del disabled global. */
  .cncell:disabled { cursor: default; opacity: 1; }
  .cnword { display: block; }
  .cntag { position: absolute; top: 2px; right: 3px; font-size: 0.72rem; }
  /* Casilla elegida, a la espera de confirmar. */
  .cncell.selected { box-shadow: 0 0 0 3px var(--accent, #c9a227) inset; }

  /* ——— MESA: el tablero público (agentes, espectadores y mapa final) ———
     Se lee desde el otro lado de la mesa: casillas grandes, borde marcado y
     palabra tan grande como quepa. */
  .cnboard.pub { gap: 6px; }
  .cnboard.pub .cncell {
    aspect-ratio: 1; border-width: 2px; border-color: var(--line-2, #3b4060);
    background: var(--card2, #222639); color: #fff;
    font-size: clamp(0.78rem, 3.4vw, 1.05rem); line-height: 1.12; letter-spacing: 0.2px;
  }
  .cnboard.pub .cntag { font-size: 1.05rem; top: 3px; right: 4px; }
  /* Casillas destapadas: el color canta a distancia y el emoji lo repite, para
     que se lea también en escorzo y sin depender del color. */
  .cnboard.pub .cncell.rev.red { background: #8d2439; border-color: #d2506e; color: #ffe2e8; }
  .cnboard.pub .cncell.rev.blue { background: #24468a; border-color: #5c8ae0; color: #e2edff; }
  .cnboard.pub .cncell.rev.neutral { background: #565039; border-color: #8d8666; color: #f3eede; }
  .cnboard.pub .cncell.rev.assassin { background: #000; border-color: #b9b9b9; color: #fff; }
  /* Fin de partida: las que NADIE llegó a tocar, con el mismo color pero en
     trazo discontinuo y algo apagadas (se distingue lo jugado de lo que se
     quedó en el tablero). */
  .cnboard.pub .cncell.spy { border-style: dashed; opacity: 0.82; }
  .cnboard.pub .cncell.spy.red { background: #6b2130; border-color: #c2566d; }
  .cnboard.pub .cncell.spy.blue { background: #1f3a6f; border-color: #5b83cf; }
  .cnboard.pub .cncell.spy.neutral { background: #45412f; border-color: #8a835f; }
  .cnboard.pub .cncell.spy.assassin { background: #050505; border-color: #9a9a9a; }

  /* ——— MANO: el mapa del Jefe ———
     Fondos casi idénticos entre sí (nada de mosaico rojo/azul visible desde
     otra silla) y el color en el borde de 1 px + el emoji, que a la distancia
     de la mesa no se resuelven. El asesino es el MÁS oscuro y sin aro claro: un
     aro brillante era el chivato más ruidoso del tablero, señalaba la casilla
     exacta desde el otro lado. */
  .cnboard.priv .cncell.spy.red { background: #2b2029; border-color: #a03a52; }
  .cnboard.priv .cncell.spy.blue { background: #1f2536; border-color: #3a5aa0; }
  .cnboard.priv .cncell.spy.neutral { background: #2a2823; border-color: #6a6450; }
  .cnboard.priv .cncell.spy.assassin { background: #131318; border-color: #4a4a52; box-shadow: 0 0 0 2px #000 inset; }
  .cnboard.priv .cncell.rev.red { background: #7a2233; border-color: #b3405a; color: #ffd9e0; }
  .cnboard.priv .cncell.rev.blue { background: #1f3a6b; border-color: #4671c0; color: #d9e6ff; }
  .cnboard.priv .cncell.rev.neutral { background: #4a4636; border-color: #7a745a; color: #efe9d6; opacity: 0.85; }
  .cnboard.priv .cncell.rev.assassin { background: #111; border-color: #555; color: #eee; }
</style>
