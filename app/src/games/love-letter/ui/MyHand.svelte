<script lang="ts">
  // 🖐 Tu mano, SIEMPRE a la vista y sin gestos (B28 · postura de mano): en Love
  // Letter la pantalla ES tu carta, se sujeta mirando hacia ti y nadie la deja
  // boca arriba en la mesa. Taparla tras un «👁 Ver mi carta» era fricción pura:
  // había que destapar en cada turno ajeno para poder pensar.
  import { CARD_INFO, copiesNote } from '../cards';
  import { outCounts } from '../engine';
  import type { LoveLetterState } from '../types';
  import CardFace from './CardFace.svelte';

  const { game, meId, track = true }: { game: LoveLetterState; meId: string; track?: boolean } = $props();
  const hand = $derived(game.hands[meId] || []);
  const out = $derived(outCounts(game));
  const alive = $derived(!!game.alive[meId]);
  const prot = $derived(!!game.protected[meId]);
</script>

{#if alive}
  <div class="hand" data-a="ll-my-hand">
    <div class="hh">🖐 Tu mano <span class="hs">· solo la ves tú</span></div>
    {#each hand as c, i (i)}
      <CardFace card={c} tone="mine" foot={copiesNote(c, out[c], track)} />
    {/each}
    {#if prot}
      <p class="tag">🛡️ Protegido por la Doncella: nadie puede señalarte hasta tu próximo turno.</p>
    {/if}
  </div>
{:else}
  <!-- Nunca un estado sin salida (B26·8): quien cae sigue teniendo algo que
       mirar y sabe que vuelve en la ronda siguiente. -->
  <div class="hand gone" data-a="ll-out-banner">
    <div class="hh">❌ Fuera de ESTA ronda</div>
    <p class="tag">Tus cartas ya se descartaron{#if (game.discards[meId] || []).length} (arriba, en tu pila: {(game.discards[meId] || []).map((c) => `${CARD_INFO[c].emoji} ${CARD_INFO[c].name}`).join(', ')}){/if}. En la siguiente ronda se reparte otra vez y vuelves a jugar; mientras, aprovecha para ver qué cartas van saliendo.</p>
  </div>
{/if}

<style>
  .hand { margin: 10px 0; }
  .hh { font-size: 0.95rem; font-weight: 700; color: var(--moon); margin-bottom: 6px; }
  .hs { font-weight: 400; color: var(--muted); font-size: 0.82rem; }
  .tag { font-size: 0.82rem; color: var(--muted); margin: 7px 0 0; line-height: 1.4; }
  .hand.gone { opacity: 0.9; border: 1px dashed var(--line-2); border-radius: var(--r-2); padding: 12px; }
</style>
