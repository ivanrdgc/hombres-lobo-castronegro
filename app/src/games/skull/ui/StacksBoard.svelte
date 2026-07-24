<script lang="ts">
  // La MESA: una ficha por rival, en orden de turno a partir de ti. Solo lo
  // público —qué hace ahora, la ALTURA de su pila (de ahí sale el tope de la
  // apuesta), sus retos ⭐, sus discos 💠 y los que le quedan en mano ✋—. Tu
  // pila NO está aquí: vive en tu panel de mano, destapada (postura 🃏 mano).
  // Las pilas ajenas van tapadas 🎴; lo levantado en el revelado se destapa
  // para todos.
  import { placed, placedCount, invCount, handCount, flipTargets } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState, Disc } from '../types';

  const { game, my, onflip = null }: {
    game: SkullState; my: PlayerDoc; onflip?: ((pid: string) => void) | null;
  } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const targets = $derived(game.phase === 'reveal' ? flipTargets(game) : []);
  // En orden de mesa empezando por el de tu derecha: es el orden en que van a
  // jugar, así que la ficha de arriba es siempre «el siguiente».
  const rivals = $derived.by(() => {
    const ids = game.playerIds;
    const i = ids.indexOf(my.id);
    const rot = i < 0 ? ids : [...ids.slice(i + 1), ...ids.slice(0, i)];
    return rot.filter((pid) => pid !== my.id);
  });

  const flippedCount = (pid: string) => (game.reveal?.flipped || []).filter((f) => f.owner === pid).length;

  /** Lo ÚNICO que se puede pintar de una pila ajena, de abajo arriba: `null`
   *  mientras siga boca abajo y la cara solo cuando ya se levantó delante de
   *  todos. La composición nunca llega al DOM, ni siquiera oculta. */
  function faces(pid: string): (Disc | null)[] {
    const st = placed(game, pid);
    const flips = (game.reveal?.flipped || []).filter((f) => f.owner === pid);
    return st.map((_, i) => {
      const fromTop = st.length - 1 - i;
      return fromTop < flips.length ? flips[fromTop].disc : null;
    });
  }

  // Qué hace cada uno AHORA, sin deducirlo de la narración. Solo estados que
  // dicen algo: los mudos («⏳ colocando», «🎯 sigue») los daba ya la línea de
  // arriba —a quién se espera, quién sigue en la subasta— y llenaban la mesa de
  // ruido (B29·1: un dato, un sitio).
  function status(pid: string): { txt: string; cls: string } | null {
    if (!game.alive[pid]) return { txt: '☠️ fuera', cls: 'gone' };
    if (game.phase === 'setup') return placedCount(game, pid) >= 1 ? { txt: '✅ colocó', cls: 'ok' } : null;
    if (game.phase === 'play') return game.turn === pid ? { txt: '🎬 su turno', cls: 'now' } : null;
    if (game.phase === 'bid') {
      const b = game.bid;
      if (b && b.by === pid) return { txt: `🗣️ apuesta ${b.n}`, cls: 'now' };
      if (game.passed[pid]) return null; // ya lo dice el chip «🤐 pasó»
      return game.turn === pid ? { txt: '👉 puja', cls: 'now' } : null;
    }
    const r = game.reveal;
    if (game.phase === 'reveal' && r && r.by === pid) return { txt: `🎲 levanta ${r.need} 🌸`, cls: 'now' };
    return null;
  }
</script>

<div class="skstacks">
  {#each rivals as pid (pid)}
    {@const st = placed(game, pid)}
    {@const stt = status(pid)}
    {@const isTarget = targets.includes(pid)}
    <div class="skrow {game.turn === pid && (game.phase === 'play' || game.phase === 'bid') ? 'active' : ''} {isTarget ? 'target' : ''} {game.alive[pid] ? '' : 'out'}">
      <div class="skhead">
        <span class="skname">{nm(pid)}</span>
        {#if stt}<span class="sktag {stt.cls}">{stt.txt}</span>{/if}
        {#if game.phase === 'bid' && game.passed[pid]}<span class="skpass" data-a="sk-passed" data-p={pid}>🤐 pasó</span>{/if}
      </div>

      <div class="skpileline">
        {#if st.length}
          <span class="skpile">
            {#each faces(pid) as f, i (i)}
              <span class="skdisc {f ? (f === 'skull' ? 'skull' : 'flower') : 'back'} {i === st.length - 1 ? 'top' : ''}"
                >{f ? (f === 'skull' ? '💀' : '🌸') : '🎴'}</span>
            {/each}
          </span>
          <span class="skedge">{st.length} en la mesa</span>
        {:else}
          <span class="skempty">sin discos en la mesa</span>
        {/if}
      </div>

      <!-- Con la palabra al lado del icono no hace falta leyenda debajo. -->
      <div class="skmeta">⭐ {game.marks[pid] || 0}/2 · 💠 {invCount(game, pid)} · ✋ {handCount(game, pid)} en mano</div>

      {#if onflip && isTarget}
        <button class="danger skflip" data-a="sk-flip" data-p={pid} onclick={() => onflip(pid)}>👆 Levantar el de arriba de {nm(pid)}</button>
      {:else if game.phase === 'reveal' && flippedCount(pid) > 0 && !isTarget}
        <span class="skdone">✔️ pila levantada entera</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  /* Dos fichas por fila en un móvil: hasta 5 rivales caben sin desplazar. */
  .skstacks { display: grid; grid-template-columns: repeat(auto-fit, minmax(158px, 1fr)); gap: 6px; margin: 6px 0 4px; }
  .skrow { display: flex; flex-direction: column; gap: 3px; padding: 7px 9px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--card2, #222639); }
  .skrow.active { border-color: var(--accent, #c8a24a); box-shadow: 0 0 0 1px var(--accent, #c8a24a) inset; }
  .skrow.target { border-color: var(--danger, #e0526b); box-shadow: 0 0 0 1px var(--danger, #e0526b) inset; }
  .skrow.out { opacity: 0.5; }
  .skhead { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .skname { font-size: 0.92rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sktag { font-size: 0.72rem; color: var(--muted, #999); border: 1px solid var(--border, #333); border-radius: 999px; padding: 0 7px; white-space: nowrap; }
  .sktag.now { color: var(--moon, #ffd98a); border-color: var(--accent, #c8a24a); }
  .sktag.ok { color: var(--ok, #58b98c); border-color: var(--ok, #58b98c); }
  .sktag.gone { color: var(--danger, #e0526b); border-color: var(--danger, #e0526b); }
  .skpass { font-size: 0.72rem; color: var(--muted, #999); border: 1px dashed var(--border, #333); border-radius: 999px; padding: 0 7px; white-space: nowrap; }
  .skpileline { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .skpile { display: flex; gap: 2px; flex-wrap: wrap; }
  .skdisc { font-size: 1.2rem; line-height: 1.1; }
  .skdisc.back { filter: grayscale(0.4) brightness(0.8); }
  .skdisc.top { border-bottom: 2px solid var(--accent, #c8a24a); border-radius: 2px; }
  .skedge { font-size: 0.74rem; color: var(--muted, #999); white-space: nowrap; }
  .skempty { font-size: 0.74rem; color: var(--muted, #999); }
  .skmeta { font-size: 0.74rem; color: var(--muted, #999); }
  .skdone { font-size: 0.74rem; color: var(--ok, #58b98c); }
  .skflip { width: 100%; min-height: 44px; margin-top: 3px; font-size: 0.82rem; }
</style>
