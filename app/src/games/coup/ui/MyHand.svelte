<script lang="ts">
  // 🃏 POSTURA DE MANO (B28): en Coup el móvil se sujeta mirando a ti — tus dos
  // influencias SON tu mano de cartas y las miras en cada ventana de reacción
  // para decidir si faroleas o si aguantas un desafío. Por eso están SIEMPRE a
  // la vista: sin «👁 Ver mis influencias», sin auto-cierre a los 10 s (eso era
  // diseño de mesa) y ancladas arriba, para leer la ventana de la mesa y tu
  // mano a la vez sin abrir nada.
  // Puerta ÚNICA (B34): esta es la única vista de tu mano en toda la app — la
  // pastilla flotante de Coup es solo «📖 Reglas» y no la repite.
  import { CHARACTERS, charLabel } from '../chars';
  import { influenceCount } from '../engine';
  import type { Character, CoupState } from '../types';

  const { game, pid }: { game: CoupState; pid: string } = $props();
  const cards = $derived(game.hands[pid] || []);
  const hidden = $derived(influenceCount(game, pid));
  const coins = $derived(game.coins[pid] || 0);
  // Lo que puedes declarar SIN mentir: la única cuenta que hay que hacer en
  // cada ventana, resuelta aquí para no hacerla de memoria. Con pareja no se
  // repite el nombre («Embajador y Embajador»): se dice que tienes dos, que es
  // el dato que cambia la decisión (aguantas un desafío y sigues teniéndolo).
  const live = $derived.by(() => {
    const seen: Character[] = [];
    const out: string[] = [];
    for (const card of cards) {
      if (card.lost || seen.includes(card.char)) continue;
      seen.push(card.char);
      const k = cards.filter((x) => !x.lost && x.char === card.char).length;
      out.push(`${charLabel(card.char)}${k > 1 ? ` (tienes ${k})` : ''}`);
    }
    return out;
  });
</script>

<div class="myhand" data-a="coup-myhand">
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
    <p class="mhnote">✅ Sin mentir puedes declarar {live.join(' y ')}. Lo demás es farol.</p>
  {:else}
    <p class="mhnote out">💀 Sin influencias: estás fuera de la corte.</p>
  {/if}
</div>

<style>
  /* Anclada: la ventana de reacción se lee debajo sin perder la mano de vista.
     Los márgenes negativos la llevan al borde de #app (padding lateral 14px)
     para que el contenido no asome por los lados al pasar por detrás. */
  .myhand {
    position: sticky; top: 0; z-index: 20;
    border: 1px solid var(--accent); border-width: 0 0 1px;
    margin: 0 -14px 8px; padding: 7px 14px 8px;
    background: linear-gradient(180deg, var(--card), color-mix(in srgb, var(--card) 88%, var(--bg-0)));
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
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
