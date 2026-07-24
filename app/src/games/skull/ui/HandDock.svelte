<script lang="ts">
  // TU MANO Y TU PILA, siempre en pantalla y sin abrir nada: los discos que te
  // quedan (y que son el botón para ponerlos), tu pila destapada y en orden, y
  // una línea que dice qué puedes hacer ahora mismo. Es la pieza central de la
  // postura 🃏 mano: el móvil se sujeta mirándote, tu pila solo la ves tú y
  // esconderla detrás de un gesto solo estorbaba.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { inHand, placed, placedCount, invCount, flipTargets } from '../engine';
  import DiscOption from './DiscOption.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState, Disc } from '../types';

  const { game, my, onflip }: {
    game: SkullState; my: PlayerDoc; onflip: (pid: string) => void;
  } = $props();

  const nm = (pid: string) => game.names[pid] || '¿?';
  const alive = $derived(!!game.alive[my.id]);
  const hand = $derived(inHand(game, my.id));
  const stack = $derived(placed(game, my.id));
  const myTurn = $derived(game.turn === my.id);
  const setupDone = $derived(placedCount(game, my.id) >= 1);
  const mustBid = $derived(hand.flowers + hand.skulls === 0);
  const canPlace = $derived(alive && (game.phase === 'setup' ? !setupDone : game.phase === 'play' && myTurn));
  // Fases en las que colocar es una jugada posible (aunque ahora no te toque).
  const placing = $derived(alive && (game.phase === 'setup' || game.phase === 'play'));
  const iReveal = $derived(game.reveal?.by === my.id);
  const targets = $derived(game.phase === 'reveal' ? flipTargets(game) : []);
  const flippedMine = $derived((game.reveal?.flipped || []).filter((f) => f.owner === my.id).length);
  const ownLeft = $derived(placedCount(game, my.id) - flippedMine);

  // Por qué no puedes poner este disco. Nunca un botón gris y mudo.
  function blocked(d: Disc): string {
    if (!alive) return 'estás fuera';
    if (game.phase === 'setup' && setupDone) return 'ya colocaste';
    if (game.phase === 'play' && !myTurn) return `no es tu turno (${nm(game.turn)})`;
    if (game.phase === 'bid') return 'en la puja no se coloca';
    if (game.phase === 'reveal') return 'se está revelando';
    if (game.phase === 'roundEnd') return 'ronda terminada';
    if (d === 'skull') return hand.skulls <= 0 ? 'ya está en tu pila (o la perdiste)' : '';
    return hand.flowers <= 0 ? 'no te quedan flores' : '';
  }

  const place = (d: Disc) => guard(() => (game.phase === 'setup' ? A.placeInitial(d) : A.placeDisc(d)));

  // Tu situación en una línea. No repite lo que ya dicen los hechos de arriba
  // ni el panel de abajo: aquí solo va lo TUYO (tus discos y tu sitio en la
  // subasta, que en la mesa de rivales no aparece).
  const now = $derived.by(() => {
    if (!alive) return '☠️ Estás fuera: te quedaste sin discos, pero sigues viendo la partida.';
    switch (game.phase) {
      case 'setup':
        return setupDone ? '✅ Tu disco de salida ya está puesto.' : '👉 Toca un disco para ponerlo boca abajo: nadie sabrá cuál es.';
      case 'play':
        if (!myTurn) return '⏳ Ve calculando cuántas flores te atreverías a levantar.';
        return mustBid ? '☝️ Sin discos en la mano: solo te queda apostar.' : '👉 Pon un disco y pasa el turno… o apuesta abajo.';
      case 'bid':
        if (game.bid?.by === my.id) return `🗣️ Tu apuesta de ${game.bid.n} sigue en pie: si nadie sube, levantas tú.`;
        if (game.passed[my.id]) return '🤐 Ya pasaste: fuera de la subasta hasta el revelado.';
        if (myTurn) return '🎯 Sigues en la subasta: decides abajo.';
        return `🎯 Sigues en la subasta: podrás subir desde ${(game.bid?.n ?? 0) + 1}.`;
      case 'reveal':
        if (iReveal) {
          return ownLeft > 0
            ? '👆 Obligatorio: levanta primero TU pila, de arriba abajo.'
            : '✅ Tu pila ya está entera: elige arriba de qué rival sigues.';
        }
        return targets.includes(my.id)
          ? `⚠️ ${nm(game.reveal?.by || '')} puede levantar de TU pila ahora mismo.`
          : '⏳ Tu pila sigue tapada para los demás.';
      default:
        return '🔄 Recuperas TODA tu pila al empezar la ronda siguiente.';
    }
  });
</script>

<div class="skmine {canPlace || (iReveal && ownLeft > 0) ? 'act' : ''}">
  <div class="skmhead">
    <h3>🃏 Tu mano</h3>
    <span class="sktag">⭐ {game.marks[my.id] || 0}/2</span>
    <span class="sktag">💠 {invCount(game, my.id)} discos</span>
  </div>

  <!-- En las fases de colocar, los discos SON los botones (con su motivo si no
       toca). En la puja y el revelado no se coloca nada: la mano sigue a la
       vista, pero en una línea, para que quepa la decisión de abajo. -->
  {#if placing}
    <div class="skhand">
      <DiscOption disc="flower" count={hand.flowers} a="sk-place-flower" label="Poner una flor"
        desc="Segura: suma para el reto."
        blocked={blocked('flower')} onpick={() => place('flower')} />
      <DiscOption disc="skull" count={hand.skulls} a="sk-place-skull" label="Poner la calavera"
        desc="Trampa: quien la levante, falla."
        blocked={blocked('skull')} onpick={() => place('skull')} />
    </div>
  {:else if alive}
    <p class="skhandline">
      <span class="skfaces">{'🌸'.repeat(hand.flowers)}{'💀'.repeat(hand.skulls)}{hand.flowers + hand.skulls === 0 ? '—' : ''}</span>
      <span class="skedge">{hand.flowers} flor{hand.flowers === 1 ? '' : 'es'} y {hand.skulls} calavera{hand.skulls === 1 ? '' : 's'} sin colocar</span>
    </p>
  {/if}

  <p class="sknow">{now}</p>

  <div class="skmypile">
    <span class="skpl">Tu pila</span>
    {#if stack.length}
      <span class="skedge">abajo</span>
      <span class="skpile">
        {#each stack as d, i (i)}
          {@const isFlipped = i >= stack.length - flippedMine}
          <span class="skdisc {d === 'skull' ? 'skull' : 'flower'} {isFlipped ? 'done' : ''} {i === stack.length - 1 ? 'top' : ''}"
            >{d === 'skull' ? '💀' : '🌸'}</span>
        {/each}
      </span>
      <span class="skedge">arriba ⬆ ({stack.length} en la mesa{flippedMine ? `, ${flippedMine} ya levantado${flippedMine === 1 ? '' : 's'}` : ''})</span>
    {:else}
      <span class="skempty">vacía: aún no has puesto nada</span>
    {/if}
  </div>

  {#if iReveal && ownLeft > 0}
    <button class="danger block skflip" data-a="sk-flip" data-p={my.id} onclick={() => onflip(my.id)}>
      🃏 Levantar el de arriba de TU pila ({ownLeft} por levantar)
    </button>
  {/if}
</div>

<style>
  /* Tu panel: pegado al pulgar y con borde vivo cuando la jugada es tuya. */
  .skmine { background: var(--card, #22242e); border: 1px solid var(--line-2, #3b4060); border-radius: var(--r-2, 12px); padding: 8px 10px; margin: 7px 0; }
  .skmine.act { border: 2px solid var(--accent, #c8a24a); box-shadow: var(--shadow-1, 0 4px 14px rgba(0, 0, 0, 0.35)); }
  .skmhead { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 5px; }
  .skmhead h3 { flex: 1; margin: 0; font-size: 0.98rem; color: var(--moon, #ffd98a); }
  .sktag { font-size: 0.72rem; color: var(--muted, #999); border: 1px solid var(--border, #333); border-radius: 999px; padding: 1px 8px; white-space: nowrap; }
  .skhand { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
  .skhandline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0; }
  .skhandline .skfaces { font-size: 1.35rem; letter-spacing: 1px; line-height: 1.15; }
  .sknow { margin: 6px 0 0; font-size: 0.81rem; line-height: 1.3; color: var(--text, #eee); }
  .skmypile { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border, #2c3047); }
  .skpl { font-size: 0.78rem; font-weight: 700; color: var(--moon, #ffd98a); }
  .skpile { display: flex; gap: 3px; flex-wrap: wrap; }
  .skdisc { font-size: 1.3rem; line-height: 1.15; }
  .skdisc.done { opacity: 0.4; }
  .skdisc.top { border-bottom: 2px solid var(--accent, #c8a24a); border-radius: 2px; }
  .skedge { font-size: 0.74rem; color: var(--muted, #999); }
  .skempty { font-size: 0.78rem; color: var(--muted, #999); }
  .skflip { min-height: 44px; margin-top: 8px; font-size: 0.88rem; }
</style>
