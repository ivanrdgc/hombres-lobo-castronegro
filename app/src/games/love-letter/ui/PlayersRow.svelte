<script lang="ts">
  // La mesa, una línea por jugador: orden de turnos, quién juega ahora, quién
  // está protegido o fuera, sus favores y su PILA ENTERA de descartes (en la
  // mesa real están todos boca arriba y contarlos es medio juego). Las manos son
  // secretas: aquí no sale ninguna.
  import { CARD_INFO, VALUE } from '../cards';
  import type { LoveLetterState } from '../types';

  const { game, meId = null }: { game: LoveLetterState; meId?: string | null } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const pile = (pid: string) => game.discards[pid] || [];
</script>

<div class="llrow">
  {#each game.playerIds as pid, i (pid)}
    {@const d = pile(pid)}
    {@const turn = game.turn === pid && game.phase === 'turn'}
    <div class="llp {turn ? 'active' : ''} {game.alive[pid] ? '' : 'out'}">
      <span class="llo">{i + 1}</span>
      <span class="llname">{nm(pid)}{pid === meId ? ' (tú)' : ''}</span>
      {#if turn}<span class="llt now">🎴 juega</span>{/if}
      {#if !game.alive[pid]}<span class="llt">❌ fuera</span>
      {:else if game.protected[pid]}<span class="llt safe">🛡️ protegido</span>{/if}
      <span class="llt tok">💌 {game.tokens[pid] || 0}<span class="llneed">/{game.need}</span></span>
      <span class="lld" data-a="ll-discards" data-p={pid}>
        {#if d.length}{#each d as c, j (j)}<span class="llc">{CARD_INFO[c].emoji}{VALUE[c]}</span>{/each}{:else}<span class="llnone">sin descartes</span>{/if}
      </span>
    </div>
  {/each}
</div>
<p class="leg">🔢 orden · 💌 favores de {game.need} · a la derecha, sus descartes</p>

<style>
  .llrow { display: flex; flex-direction: column; gap: 5px; margin: 2px 0 0; }
  /* Una fila por jugador: se lee de un vistazo y ocupa la mitad que la rejilla. */
  .llp {
    display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
    padding: 7px 9px; border-radius: var(--r-1);
    border: 1px solid var(--border); background: var(--card2);
  }
  .llp.active { border-color: #c86ab0; box-shadow: 0 0 0 1px #c86ab0 inset; }
  .llp.out { opacity: 0.55; }
  .llo {
    flex: 0 0 auto; font-size: 0.72rem; color: var(--muted); border: 1px solid var(--border);
    border-radius: var(--r-full); min-width: 18px; text-align: center; line-height: 16px;
  }
  .llname { font-size: 0.95rem; font-weight: 700; overflow-wrap: anywhere; }
  .llt { font-size: 0.8rem; color: var(--muted); white-space: nowrap; }
  .llt.now { color: #c86ab0; font-weight: 700; }
  .llt.safe { color: var(--ok); }
  .llt.tok { margin-left: auto; }
  .llneed { opacity: 0.6; }
  /* Los descartes son lo más consultado de la pantalla: 0,84 rem y sin recortar. */
  .lld { display: flex; flex-wrap: wrap; gap: 4px; font-size: 0.84rem; }
  .llc {
    white-space: nowrap; padding: 2px 5px; border-radius: 6px;
    background: var(--bg2); border: 1px solid var(--border);
  }
  .llnone { color: var(--muted); font-size: 0.78rem; }
  .leg { font-size: 0.78rem; color: var(--muted); margin: 6px 0 0; line-height: 1.35; }
</style>
