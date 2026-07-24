<script lang="ts">
  // Reparto: cada cual destapa su carta bajo demanda, la memoriza y confirma;
  // cuando todos han confirmado, cualquiera pone el reloj en marcha.
  // Es la ÚNICA pantalla con su propio botón de ver la carta (excepción del
  // reparto, B34): aquí la instrucción ES el contenido de la pantalla. En
  // cuanto arranca la ronda, la única puerta es la pastilla 🎴.
  // La carta se tapa sola a los pocos segundos (postura de MESA, B28): el móvil
  // se queda boca arriba y una carta abierta olvidada es una ronda regalada.
  // El botón de confirmar sobrevive al auto-tapado.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';
  import SpyCard from './SpyCard.svelte';

  const { game, my }: { game: EspiaState; my: PlayerDoc } = $props();

  const inRound = $derived(game.playerIds.includes(my.id));
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map((pid) => game.names[pid] || pid));
  const allSeen = $derived(pend.length === 0);
  const dealer = $derived(game.names[game.dealerId] || '¿?');
  const mins = $derived(Math.round(game.durationMs / 60000));

  // `peeked` sobrevive al auto-tapado: una vez la has visto, confirmar sigue a
  // un toque (y la carta ya no está en pantalla para el vecino).
  let peeked = $state(false);
  $effect(() => {
    void game.round; // cada reparto se mira de nuevo: cartas nuevas
    peeked = false;
  });
  $effect(() => {
    if (!app.ui.revealOpen) return;
    const t = setTimeout(() => (app.ui.revealOpen = false), 12000);
    return () => clearTimeout(t);
  });
</script>

<div class="narration">🕵️ Ronda {game.round} repartida: cartas nuevas para todos. El reloj arranca cuando hayáis confirmado.</div>

{#if inRound && !game.seen[my.id]}
  <div class="actionpanel">
    <h3>🎴 Mira tu carta y memorízala</h3>
    {#if app.ui.revealOpen}
      <SpyCard {game} pid={my.id} full={true} />
    {:else}
      <p class="hint">Destápala cuando nadie mire tu pantalla: se tapa sola a los pocos segundos. Durante toda la ronda la tienes en la pastilla <b>🎴 Mi carta</b> de abajo.</p>
      <button class="primary block" data-a="espia-reveal" onclick={() => { app.ui.revealOpen = true; peeked = true; }}>👁 Ver mi carta</button>
    {/if}
    {#if peeked}
      <button class="{app.ui.revealOpen ? 'primary' : 'ghost'} block" data-a="espia-seen"
        onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ La he memorizado</button>
    {/if}
  </div>
{:else if !allSeen}
  <div class="card">
    <h3>⏳ Faltan por confirmar: {pend.join(', ')}</h3>
    <p class="small-note" style="margin-top:0">Si alguno se ha quedado sin móvil, sácalo desde ⋯ → 🪑 La mesa. Mientras, ve pensando la primera pregunta.</p>
  </div>
{:else}
  <div class="actionpanel">
    <h3>⏱ Todos listos</h3>
    <p class="hint">Abre <b>{dealer}</b> preguntando a alguien por su nombre; quien responde, pregunta después.</p>
    <button class="primary block" data-a="espia-begin" onclick={() => guard(A.beginRound)}>⏱ Poner el reloj en marcha ({mins} min)</button>
  </div>
{/if}
