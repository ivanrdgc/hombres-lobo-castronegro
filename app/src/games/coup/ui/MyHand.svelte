<script lang="ts">
  // 🃏 POSTURA DE MANO (B28): en Coup el móvil se sujeta mirando a ti — tus dos
  // influencias SON tu mano de cartas y las miras en cada ventana de reacción
  // para decidir si faroleas o si aguantas un desafío. Por eso están SIEMPRE a
  // la vista: sin «👁 Ver mis influencias», sin auto-cierre a los 10 s (eso era
  // diseño de mesa) y ancladas arriba, para leer la ventana de la mesa y tu
  // mano a la vez sin abrir nada.
  import { CHARACTERS, charLabel } from '../chars';
  import { influenceCount } from '../engine';
  import type { CoupState } from '../types';

  const { game, pid, pinned = false }: { game: CoupState; pid: string; pinned?: boolean } = $props();
  const cards = $derived(game.hands[pid] || []);
  const hidden = $derived(influenceCount(game, pid));
  const coins = $derived(game.coins[pid] || 0);
  // Lo que puedes declarar SIN mentir: la única cuenta que hay que hacer en
  // cada ventana, resuelta aquí para no hacerla de memoria.
  const live = $derived(cards.filter((c) => !c.lost).map((c) => c.char));
</script>

<div class="myhand {pinned ? 'pin' : ''}" data-a="coup-myhand">
  <div class="mhhead">
    <span>🎴 Tu mano <span class="only">· solo la ves tú</span></span>
    <span class="purse" data-a="coup-purse">🪙 {coins} · 🂠 {hidden}</span>
  </div>
  <div class="mhcards">
    {#each cards as card, i (i)}
      <div class="mh {card.lost ? 'lost' : ''}" data-a="coup-card" data-p={card.char}>
        <b>{CHARACTERS[card.char].emoji} {CHARACTERS[card.char].name}</b>
        <span>{card.lost ? '💀 descubierta · ya no vale' : CHARACTERS[card.char].brief}</span>
      </div>
    {/each}
  </div>
  {#if live.length}
    <p class="mhnote">✅ Sin mentir puedes declarar {live.map(charLabel).join(' y ')}. Lo demás es farol.</p>
  {:else}
    <p class="mhnote out">💀 Sin influencias: estás fuera de la corte.</p>
  {/if}
</div>

<style>
  .myhand {
    border: 1px solid var(--accent); border-radius: var(--r-2);
    padding: 8px 10px 9px; margin: 6px 0 8px; background: var(--card);
  }
  /* Anclada: la ventana de reacción se lee debajo sin perder la mano de vista.
     Los márgenes negativos la llevan al borde de #app (padding lateral 14px)
     para que el contenido no asome por los lados al pasar por detrás. */
  .pin {
    position: sticky; top: 0; z-index: 20;
    margin: 0 -14px 8px; border-radius: 0; border-width: 0 0 1px;
    background: linear-gradient(180deg, var(--card), color-mix(in srgb, var(--card) 88%, var(--bg-0)));
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
    padding: 7px 14px 8px;
  }
  .mhhead {
    display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
    font-weight: 700; font-size: 0.82rem; color: var(--moon); margin-bottom: 6px;
  }
  .only { font-weight: 400; font-size: 0.72rem; color: var(--muted); }
  .purse { font-variant-numeric: tabular-nums; font-size: 0.9rem; color: var(--text); white-space: nowrap; }
  .mhcards { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .mh {
    display: flex; flex-direction: column; gap: 1px; min-width: 0;
    padding: 6px 8px; border-radius: var(--r-1); background: var(--card2);
  }
  .mh b { font-size: 0.9rem; }
  .mh span { font-size: 0.72rem; color: var(--muted); }
  .mh.lost { opacity: 0.55; }
  .mh.lost b { text-decoration: line-through; }
  .mhnote { font-size: 0.73rem; color: var(--ok); margin: 5px 0 0; }
  .mhnote.out { color: var(--muted); }
</style>
