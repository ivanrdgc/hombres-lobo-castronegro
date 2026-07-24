<script lang="ts">
  // Tus influencias (privadas): qué personajes escondes, qué te deja hacer cada
  // uno sin mentir y cuántas monedas tienes. Se pliega y despliega con disimulo,
  // como la carta de rol de los demás juegos.
  import { CHARACTERS } from '../chars';
  import { influenceCount } from '../engine';
  import type { CoupState } from '../types';

  const { game, pid }: { game: CoupState; pid: string } = $props();
  let open = $state(false);
  let openedIn = $state(''); // fase en la que se abrió
  const cards = $derived(game.hands[pid] || []);
  const hidden = $derived(influenceCount(game, pid));
  const coins = $derived(game.coins[pid] || 0);

  // Un móvil abierto boca arriba enseña tus influencias: se cierra solo a los
  // 10 s o en cuanto cambia la fase (ya no estabas mirando).
  $effect(() => {
    if (!open) return;
    if (game.phase !== openedIn) { open = false; return; }
    const t = setTimeout(() => { open = false; }, 10000);
    return () => clearTimeout(t);
  });
</script>

{#if !open}
  <div class="peekrow">
    <span class="purse">🪙 {coins} moneda{coins === 1 ? '' : 's'} · 🂠 {hidden} influencia{hidden === 1 ? '' : 's'}</span>
    <button class="small ghost" data-a="coup-peek" onclick={() => { openedIn = game.phase; open = true; }}>👁 Ver mis influencias</button>
  </div>
{:else}
  <div class="myhand" data-a="coup-myhand" role="button" tabindex="0"
    onclick={() => (open = false)} onkeydown={(e) => { if (e.key === 'Enter') open = false; }}>
    <div class="mhhead">🎴 Tus influencias · 🪙 {coins} monedas</div>
    <div class="mhcards">
      {#each cards as card, i (i)}
        {#if card.lost}
          <div class="mh lost"><b>{CHARACTERS[card.char].emoji} {CHARACTERS[card.char].name}</b><span>💀 descubierta: la mesa entera la ve y ya no vale</span></div>
        {:else}
          <div class="mh"><b>{CHARACTERS[card.char].emoji} {CHARACTERS[card.char].name}</b>
            <span>{CHARACTERS[card.char].power}</span></div>
        {/if}
      {/each}
    </div>
    <p class="small-note safe" style="margin:8px 0 0">✅ Estas aguantan un desafío: si las declaras y alguien duda, la enseñas y el que dudó pierde una influencia. Cualquier otro personaje que declares es farol.</p>
    <p class="small-note" style="margin:4px 0 0">Solo tú ves esto. Toca para ocultar (se cierra sola en 10 s).</p>
  </div>
{/if}

<style>
  .peekrow { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin: 8px 0; }
  .purse { font-size: 0.86rem; color: var(--muted); font-variant-numeric: tabular-nums; }
  .myhand { border: 1px solid var(--accent); border-radius: var(--r-2); padding: 10px 12px; margin: 8px 0; background: var(--card); cursor: pointer; }
  .mhhead { font-weight: 700; margin-bottom: 8px; color: var(--moon); }
  .mhcards { display: flex; flex-direction: column; gap: 6px; }
  .mh { display: flex; flex-direction: column; gap: 1px; padding: 8px 10px; border-radius: var(--r-1); background: var(--card2); }
  .mh span { font-size: 0.8rem; color: var(--muted); }
  .safe { color: var(--ok); }
  .mh.lost { opacity: 0.6; }
  .mh.lost b { text-decoration: line-through; }
</style>
