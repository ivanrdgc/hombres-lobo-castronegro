<script lang="ts">
  // Tablero 5×5. Los Jefes (canSee) ven el color de las casillas SIN destapar,
  // con un tinte suave Y su emoji (el tinte solo, de noche, no distingue una
  // neutral de una propia). Los agentes solo ven las palabras. Las destapadas
  // muestran su color a todos. Tocable solo para el agente del equipo de turno,
  // y en DOS pasos: tocar selecciona; destapar se confirma abajo.
  import { canSeeMap, canGuess } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CodenamesState } from '../types';

  const { game, my, sel = null, onpick = null }: {
    game: CodenamesState; my: PlayerDoc; sel?: number | null; onpick?: ((i: number) => void) | null;
  } = $props();
  const canSee = $derived(canSeeMap(game, my.id));
  const canPick = $derived(canGuess(game, my.id));
  const cls = (i: number) => {
    const revealed = game.revealed[i];
    const color = game.map[i];
    if (revealed) return `rev ${color}`;
    return canSee ? `spy ${color}` : 'hidden';
  };
  const tag = (i: number) =>
    game.map[i] === 'assassin' ? '💀' : game.map[i] === 'neutral' ? '⬜' : game.map[i] === 'red' ? '🔴' : '🔵';
</script>

<div class="cnboard">
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
  /* Casillas destapadas (todos las ven). */
  .cncell.rev.red { background: #7a2233; border-color: #b3405a; color: #ffd9e0; }
  .cncell.rev.blue { background: #1f3a6b; border-color: #4671c0; color: #d9e6ff; }
  .cncell.rev.neutral { background: #4a4636; border-color: #7a745a; color: #efe9d6; opacity: 0.85; }
  .cncell.rev.assassin { background: #111; border-color: #555; color: #eee; }
  /* Vista del Jefe: tinte suave del color sin destapar (+ el emoji de .cntag). */
  .cncell.spy.red { background: #3a2027; border-color: #a03a52; }
  .cncell.spy.blue { background: #1e2740; border-color: #3a5aa0; }
  .cncell.spy.neutral { background: #302e26; border-color: #6a6450; }
  .cncell.spy.assassin { background: #0c0c0c; border-color: #888; box-shadow: 0 0 0 2px #888 inset; }
</style>
