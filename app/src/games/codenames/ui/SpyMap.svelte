<script lang="ts">
  // El mapa del Jefe: postura de MANO (B28). Es la única pantalla secreta del
  // juego y su secreto no lo comparte ni con su equipo, así que la tarjeta lleva
  // tres cosas y ninguna sobra:
  //  1. un aviso PERMANENTE encima del mapa (no se va con el scroll),
  //  2. el mapa TAPADO al repartir —en el reparto los móviles suelen estar boca
  //     arriba en la mesa— y abierto de un toque para TODA la partida: abierto
  //     ya no pide más gestos, que es lo propio de la mano de cartas,
  //  3. «🙈 Tapar» para soltar el móvil, levantarse o pasárselo a alguien.
  import Board from './Board.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CodenamesState } from '../types';

  const { game, my }: { game: CodenamesState; my: PlayerDoc } = $props();
  // Se abre una vez por partida: la revancha trae semilla nueva y vuelve a
  // taparlo (mapa nuevo = mismo cuidado que la primera vez).
  let openSeed = $state<number | null>(null);
  const open = $derived(openSeed === game.seed);
</script>

<div class="card cnmapcard">
  <div class="cnshield" data-a="cn-shield">
    <span class="cnsh-txt">🔒 <b>Mapa secreto.</b> No lo puede ver <b>nadie</b>: tampoco tus agentes.</span>
    {#if open}<button class="small ghost cnhide" data-a="cn-map-hide" title="Taparlo para soltar el móvil" onclick={() => (openSeed = null)}>🙈 Tapar</button>{/if}
  </div>
  {#if open}
    <Board {game} {my} />
  {:else}
    <div class="cncover">
      <span class="cnc-emoji">🗺️</span>
      <p class="cnc-title">Tu mapa está tapado</p>
      <p class="cnc-desc">Coge el móvil, ponlo de cara a ti y ábrelo: se queda abierto el resto de la partida.</p>
      <button class="primary block" data-a="cn-map-open" onclick={() => (openSeed = game.seed)}>🕵️ Ver mi mapa</button>
    </div>
  {/if}
</div>

<style>
  .cnmapcard { border-color: var(--line-2, #3b4060); }
  /* Pegajoso: mientras el mapa esté en pantalla, el aviso va con él (si se
     queda arriba y sales de vista, el mapa se mira sin la advertencia). */
  .cnshield {
    position: sticky; top: 0; z-index: 2;
    display: flex; align-items: center; gap: 8px; font-size: 0.82rem; line-height: 1.3;
    color: var(--moon, #ffd98a); background: color-mix(in srgb, var(--accent, #f2b552) 12%, var(--card, #191c2b));
    border: 1px dashed color-mix(in srgb, var(--accent, #f2b552) 55%, transparent);
    border-radius: 10px; padding: 7px 10px;
  }
  .cnsh-txt { flex: 1; min-width: 0; }
  /* Taparlo va DENTRO del aviso (y el aviso es pegajoso): el momento de soltar
     el móvil llega mirando el mapa, no al final de la tarjeta. */
  .cnhide { flex: 0 0 auto; padding: 5px 9px; font-size: 0.78rem; }
  .cncover { text-align: center; padding: 14px 4px 4px; }
  .cnc-emoji { font-size: 2.6rem; display: block; }
  .cnc-title { font-weight: 700; margin-top: 6px; }
  .cnc-desc { color: var(--muted, #a9a6c0); font-size: 0.85rem; margin-top: 4px; }
</style>
