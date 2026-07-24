<script lang="ts">
  // La mesa, en público y de un vistazo (B28 · 🃏 mano): lo TUYO vive en la mano
  // anclada arriba, así que durante la partida aquí solo salen los demás, en
  // filas de una línea — monedas (y qué le llegan a pagar), influencias que le
  // quedan (🂠 dorso) y las que ya están boca arriba, que es la información
  // pública con la que se calibra un farol. Al terminar (o de espectador) se
  // muestran todos. No revela NADA oculto.
  import { charLabel, CHAR_ORDER, ACTIONS } from '../chars';
  import { influenceCount, pendingReactors, COUP_LIMIT } from '../engine';
  import type { Character, CoupState } from '../types';

  const { game, meId, hideMe = false }: { game: CoupState; meId: string; hideMe?: boolean } = $props();
  const turnPid = $derived(game.playerIds[game.turnIdx]);
  // Al terminar se destapa TODO: sin esto la mesa nunca sabía quién faroleaba.
  const showAll = $derived(game.phase === 'end');
  const p = $derived(game.pending);
  const waiting = $derived(game.phase === 'end' ? [] : pendingReactors(game));
  const deckLeft = $derived((game.deck || []).length);
  const seats = $derived(game.playerIds.filter((pid) => !(hideMe && pid === meId)));

  // Cartas ya boca arriba en toda la corte: lo que hace (o no) creíble un farol.
  const faceUp = $derived.by(() => {
    const n: Record<Character, number> = { duque: 0, asesino: 0, capitan: 0, embajador: 0, condesa: 0 };
    for (const pid of game.playerIds) for (const h of game.hands[pid] || []) if (h.lost) n[h.char] += 1;
    return CHAR_ORDER.filter((c) => n[c]).map((c) => `${charLabel(c)}${n[c] > 1 ? ` ×${n[c]}` : ''}`).join(' · ');
  });

  // Etiqueta del bolsillo: lo que ese montón de monedas le permite (público).
  // Con la jugada escrita, no solo su emoji: «puede 💥» no se entendía sin tener
  // las reglas delante.
  function purse(n: number): string {
    if (n >= COUP_LIMIT) return 'obligado al 💥 golpe';
    if (n >= ACTIONS.golpe.cost) return 'le llega al 💥 golpe';
    if (n >= ACTIONS.asesinar.cost) return 'le llega a 🗡️ asesinar';
    return '';
  }
</script>

{#if hideMe}<p class="boardhead">🪑 La mesa · lo que se ve de los demás</p>{/if}
<div class="board">
  {#each seats as pid (pid)}
    {@const alive = influenceCount(game, pid) > 0}
    {@const isTurn = pid === turnPid && game.phase !== 'end' && game.phase !== 'reveal'}
    {@const coins = game.coins[pid] || 0}
    <div class="seat {alive ? '' : 'out'} {isTurn ? 'turn' : ''}" data-a="coup-seat" data-p={pid}>
      <div class="seathead">
        <span class="nm">{isTurn ? '▶ ' : ''}{game.names[pid] || pid}{pid === meId ? ' (tú)' : ''}</span>
        <span class="coins">🪙 {coins}{alive && purse(coins) ? ` · ${purse(coins)}` : ''}</span>
      </div>
      <div class="cards">
        {#if alive && p && p.actor === pid && game.phase !== 'turn'}
          <span class="tag act">{ACTIONS[p.type].emoji} declara {ACTIONS[p.type].name}</span>
        {/if}
        {#if alive && p && p.target === pid && game.phase !== 'turn'}<span class="tag tgt">🎯 víctima</span>{/if}
        {#if alive && game.block?.by === pid}<span class="tag act">🛡️ bloquea</span>{/if}
        {#if waiting.includes(pid)}<span class="tag wait">⏳ falta</span>{/if}
        {#each game.hands[pid] as card, i (i)}
          {#if card.lost}
            <span class="inf lost">{charLabel(card.char)}</span>
          {:else if showAll}
            <span class="inf shown">{charLabel(card.char)}</span>
          {:else}
            <span class="inf back">🂠</span>
          {/if}
        {/each}
        {#if !alive}<span class="deadtag">💀 eliminado</span>{/if}
      </div>
    </div>
  {/each}
</div>
{#if game.phase !== 'end'}
  <p class="boardnote">🂠 = influencia que le queda oculta · 💀 boca arriba: {faceUp || 'ninguna todavía'} · quedan {deckLeft} cartas en la corte</p>
{:else}
  <!-- La clave de lectura, escrita: el «title=» que la explicaba no existe en
       un móvil (B26·9). -->
  <p class="boardnote">Tachadas, las influencias que fue descubriendo; las demás son las que aún conservaba, farol incluido.</p>
{/if}

<style>
  .boardhead { font-size: 0.78rem; color: var(--muted); margin: 0 0 4px; }
  .board { display: flex; flex-direction: column; gap: 5px; margin: 0 0 4px; }
  .seat {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--r-2);
    background: var(--card);
  }
  .seat.turn { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
  .seat.out { opacity: 0.5; }
  .seathead { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .nm { font-weight: 600; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .coins { font-variant-numeric: tabular-nums; font-size: 0.78rem; color: var(--muted); }
  .cards { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }
  .inf { font-size: 0.78rem; padding: 2px 7px; border-radius: var(--r-full); }
  .inf.back { background: var(--card2); color: #cdd; letter-spacing: 0.1em; }
  .inf.lost { background: #3a2130; color: #f0b8c8; text-decoration: line-through; opacity: 0.85; }
  .inf.shown { background: #23324a; color: #cfe3ff; }
  .tag { font-size: 0.72rem; padding: 2px 7px; border-radius: var(--r-full); border: 1px solid var(--border); color: var(--muted); white-space: nowrap; }
  .tag.act { border-color: var(--accent2); color: #cfc3f7; }
  .tag.tgt { border-color: var(--danger); color: #f3b8c4; }
  .tag.wait { border-color: var(--accent); color: var(--moon); }
  .deadtag { font-size: 0.72rem; color: var(--muted); font-style: italic; }
  .boardnote { font-size: 0.72rem; color: var(--muted); margin: 0 0 8px; }
</style>
