<script lang="ts">
  // El mapa del Jefe: postura de MANO (B28). Es la única pantalla secreta del
  // juego y su secreto no lo comparte ni con su equipo.
  //
  // Nace TAPADO —en el reparto los móviles suelen estar boca arriba— y se abre
  // de un toque para TODA la partida: abierto ya no pide más gestos, que es lo
  // propio de una mano de cartas. «🙈 Tapar» lo cierra para soltar el móvil,
  // levantarse o pasárselo a alguien.
  //
  // El aviso de «esto no lo ve nadie» se dice UNA sola vez (B29·1): tapado va
  // en la portada, abierto va en la tira pegajosa que acompaña al mapa. Nunca
  // los dos a la vez, y siempre con el mismo `data-a` para que sea una cosa.
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
  {#if open}
    <div class="cnshield" data-a="cn-shield">
      <span class="cnsh-txt">🔒 <b>Solo para tus ojos.</b> Ni tus agentes pueden ver este mapa.</span>
      <button class="small ghost cnhide" data-a="cn-map-hide" aria-label="Tapar el mapa" onclick={() => (openSeed = null)}>🙈 Tapar</button>
    </div>
    <Board {game} {my} />
  {:else}
    <div class="cncover">
      <span class="cnc-emoji">🙈</span>
      <p class="cnc-title">Tu mapa está tapado</p>
      <p class="cnc-desc" data-a="cn-shield">
        🔒 <b>Solo para tus ojos</b>, ni tus agentes pueden verlo. Coge el móvil, ponlo de cara a ti y ábrelo: se queda abierto el resto de la partida.
      </p>
      <button class="primary block" data-a="cn-map-open" onclick={() => (openSeed = game.seed)}>🗺️ Ver mi mapa</button>
    </div>
  {/if}
</div>

<style>
  .cnmapcard { border-color: var(--line-2, #3b4060); }
  /* Pegajosa: mientras el mapa esté en pantalla, el aviso va con él (si se
     queda arriba y sales de vista, el mapa se mira sin la advertencia). */
  .cnshield {
    position: sticky; top: 0; z-index: 2;
    display: flex; align-items: center; gap: 8px; font-size: 0.82rem; line-height: 1.3;
    color: var(--moon, #ffd98a); background: color-mix(in srgb, var(--accent, #f2b552) 12%, var(--card, #191c2b));
    border: 1px dashed color-mix(in srgb, var(--accent, #f2b552) 55%, transparent);
    border-radius: 10px; padding: 7px 10px;
  }
  .cnsh-txt { flex: 1; min-width: 0; }
  /* «Tapar» va DENTRO del aviso (y el aviso es pegajoso): el momento de soltar
     el móvil llega mirando el mapa, no al final de la tarjeta. */
  .cnhide { flex: 0 0 auto; min-height: 34px; padding: 5px 9px; font-size: 0.78rem; }
  .cncover { text-align: center; padding: 14px 4px 4px; }
  .cnc-emoji { font-size: 2.6rem; display: block; }
  .cnc-title { font-weight: 700; margin-top: 6px; }
  .cnc-desc { color: var(--muted, #a9a6c0); font-size: 0.85rem; margin-top: 6px; line-height: 1.4; }
</style>
