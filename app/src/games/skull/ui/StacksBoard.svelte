<script lang="ts">
  // Tablero de pilas: una fila por jugador con TODO lo público —retos ⭐, discos
  // que posee, discos que le quedan en mano y qué está haciendo ahora mismo— y
  // su pila. Solo TU pila enseña lo que pusiste y en qué orden; las ajenas van
  // tapadas, pero con la ALTURA siempre a la vista (es lo único público de una
  // pila ajena, y de ahí sale el tope de la apuesta). Los discos ya levantados
  // en el revelado se ven destapados para todos.
  import { placed, placedCount, invCount, handCount, flipTargets } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my, onflip = null }: {
    game: SkullState; my: PlayerDoc; onflip?: ((pid: string) => void) | null;
  } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const targets = $derived(game.phase === 'reveal' ? flipTargets(game) : []);

  // Cuántos discos de una pila están ya levantados (desde arriba) en el revelado.
  const flippedCount = (pid: string) => (game.reveal?.flipped || []).filter((f) => f.owner === pid).length;
  // Disco levantado en la posición i (desde arriba), si lo está.
  function flippedAt(pid: string, fromTop: number) {
    const flips = (game.reveal?.flipped || []).filter((f) => f.owner === pid);
    return fromTop < flips.length ? flips[fromTop].disc : null;
  }

  // Qué hace cada uno AHORA. Antes había que deducirlo de la narración, y en la
  // puja lo decisivo —quién sigue vivo en la subasta— no estaba en ningún sitio.
  function status(pid: string): { txt: string; cls: string } | null {
    if (!game.alive[pid]) return { txt: '☠️ fuera', cls: 'gone' };
    if (game.phase === 'setup') {
      return placedCount(game, pid) >= 1 ? { txt: '✅ ya colocó', cls: 'ok' } : { txt: '⏳ colocando', cls: '' };
    }
    if (game.phase === 'play') return game.turn === pid ? { txt: '🎬 su turno', cls: 'now' } : null;
    if (game.phase === 'bid') {
      const b = game.bid;
      if (b && b.by === pid) return { txt: `🗣️ apuesta ${b.n}`, cls: 'now' };
      if (game.passed[pid]) return null; // ya lo dice el chip «🤐 pasó»
      return game.turn === pid ? { txt: '👉 le toca pujar', cls: 'now' } : { txt: '🎯 sigue en la subasta', cls: '' };
    }
    const r = game.reveal;
    if (game.phase === 'reveal' && r && r.by === pid) return { txt: `🎲 levanta ${r.need} 🌸`, cls: 'now' };
    return null;
  }
</script>

<div class="skstacks">
  {#each game.playerIds as pid (pid)}
    {@const mine = pid === my.id}
    {@const st = placed(game, pid)}
    {@const stt = status(pid)}
    {@const isTarget = targets.includes(pid)}
    <!-- Se resalta a quien tiene la decisión: turno, puja o pila que toca
         levantar. En la colocación todos actúan a la vez. -->
    <div class="skrow {game.turn === pid && (game.phase === 'play' || game.phase === 'bid') ? 'active' : ''} {isTarget ? 'target' : ''} {game.alive[pid] ? '' : 'out'}">
      <div class="skhead">
        <span class="skname">{nm(pid)}{mine ? ' (tú)' : ''}</span>
        <span class="sktag">⭐ {game.marks[pid] || 0}/2</span>
        <span class="sktag">💠 {invCount(game, pid)}</span>
        <span class="sktag">✋ {handCount(game, pid)}</span>
        {#if stt}<span class="sktag {stt.cls}">{stt.txt}</span>{/if}
        {#if game.phase === 'bid' && game.passed[pid]}<span class="skpass" data-a="sk-passed" data-p={pid}>🤐 pasó</span>{/if}
      </div>

      <div class="skpileline">
        {#if st.length}
          <span class="skedge">abajo</span>
          <span class="skpile">
            {#each st as d, i (i)}
              {@const fromTop = st.length - 1 - i}
              {@const flipped = flippedAt(pid, fromTop)}
              <span class="skdisc {flipped ? (flipped === 'skull' ? 'skull' : 'flower') : mine ? (d === 'skull' ? 'skull mine' : 'flower mine') : 'back'} {i === st.length - 1 ? 'top' : ''}"
                >{flipped ? (flipped === 'skull' ? '💀' : '🌸') : mine ? (d === 'skull' ? '💀' : '🌸') : '🎴'}</span>
            {/each}
          </span>
          <span class="skedge">⬆ arriba</span>
          <span class="skedge n">{st.length} en la mesa</span>
        {:else}
          <span class="skempty">— sin discos en la mesa —</span>
        {/if}
      </div>

      {#if onflip && isTarget}
        <button class="danger skflip" data-a="sk-flip" data-p={pid} onclick={() => onflip(pid)}>
          {mine ? '🃏 Levantar el de arriba de TU pila (obligatorio)' : `🃏 Levantar el de arriba de ${nm(pid)}`}
        </button>
      {:else if game.phase === 'reveal' && flippedCount(pid) > 0 && !isTarget}
        <span class="skdone">✔️ pila levantada entera</span>
      {/if}
    </div>
  {/each}
</div>

<p class="sklegend">
  ⭐ retos ganados (2 ganan la partida) · 💠 discos que posee (a cero, fuera) · ✋ discos que le quedan en mano.
  Las pilas ajenas van tapadas 🎴: solo se ve cuántos discos tienen. Siempre se levanta por arriba (la derecha).
</p>

<style>
  .skstacks { display: flex; flex-direction: column; gap: 8px; margin: 8px 0 6px; }
  .skrow { display: flex; flex-direction: column; gap: 5px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--card2, #222639); }
  .skrow.active { border-color: var(--accent, #c8a24a); box-shadow: 0 0 0 1px var(--accent, #c8a24a) inset; }
  .skrow.target { border-color: var(--danger, #e0526b); box-shadow: 0 0 0 1px var(--danger, #e0526b) inset; }
  .skrow.out { opacity: 0.5; }
  .skhead { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .skname { font-size: 0.95rem; font-weight: 700; }
  .sktag { font-size: 0.8rem; font-weight: 400; color: var(--muted, #999); border: 1px solid var(--border, #333); border-radius: 999px; padding: 1px 8px; white-space: nowrap; }
  .sktag.now { color: var(--moon, #ffd98a); border-color: var(--accent, #c8a24a); }
  .sktag.ok { color: var(--ok, #58b98c); border-color: var(--ok, #58b98c); }
  .sktag.gone { color: var(--danger, #e0526b); border-color: var(--danger, #e0526b); }
  .skpass { font-size: 0.8rem; font-weight: 400; color: var(--muted, #999); border: 1px dashed var(--border, #333); border-radius: 999px; padding: 1px 8px; white-space: nowrap; }
  .skpileline { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .skpile { display: flex; gap: 3px; flex-wrap: wrap; }
  .skdisc { font-size: 1.35rem; line-height: 1.15; }
  .skdisc.back { filter: grayscale(0.4) brightness(0.8); }
  .skdisc.top { border-bottom: 2px solid var(--accent, #c8a24a); border-radius: 2px; }
  .skedge { font-size: 0.8rem; color: var(--muted, #999); white-space: nowrap; }
  .skedge.n { opacity: 0.85; }
  .skempty { font-size: 0.8rem; color: var(--muted, #999); }
  .skdone { font-size: 0.8rem; color: var(--ok, #58b98c); }
  .skflip { width: 100%; min-height: 44px; margin-top: 2px; font-size: 0.9rem; }
  .sklegend { font-size: 0.8rem; color: var(--muted, #999); line-height: 1.35; margin: 0; }
</style>
