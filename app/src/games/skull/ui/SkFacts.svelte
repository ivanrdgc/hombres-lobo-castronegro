<script lang="ts">
  // LA MESA EN NÚMEROS: lo público con lo que se decide, siempre en pantalla y
  // sin abrir nada (postura 🃏 mano: el móvil se mira en cada puja). Discos en
  // la mesa (el tope de la apuesta), apuesta a batir, a quién se espera y el
  // marcador del revelado.
  // Reparto de trabajo, para no decir dos veces lo mismo (B29·1): esta línea
  // dice QUÉ pasa y a quién se espera —en tercera persona—; qué puedes hacer TÚ
  // lo dice tu panel de mano, y cómo se hace, el panel de decisión.
  import { totalPlaced, flippedFlowers } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my }: { game: SkullState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const who = (pid: string) => (pid === my.id ? 'tú' : nm(pid));
  const max = $derived(totalPlaced(game));
  const cur = $derived(game.bid?.n ?? 0);
  const alive = $derived(game.playerIds.filter((pid) => game.alive[pid]));
  // «Sigue en la subasta» = vivo y sin pasar (el apostador incluido: puede
  // volver a subir si le pisan la apuesta).
  const stillIn = $derived(alive.filter((pid) => !game.passed[pid]));
  const pend = $derived(alive.filter((pid) => (game.stacks[pid] || []).length < 1));
  const by = $derived(game.reveal?.by || '');
  const need = $derived(game.reveal?.need ?? 0);
  const got = $derived(flippedFlowers(game));

  const now = $derived.by(() => {
    switch (game.phase) {
      case 'setup':
        return '🌸 Colocáis a la vez el disco de salida, boca abajo.';
      case 'play':
        return game.turn === my.id
          ? '🎬 Es TU turno.'
          : `🎬 Turno de ${nm(game.turn)}: pone otro disco… o abre la apuesta.`;
      case 'bid':
        return game.turn === my.id
          ? '🗣️ Te toca pujar.'
          : `🗣️ Puja ${nm(game.turn)}: sube de ${cur} o pasa.`;
      case 'reveal':
        return `🎲 ${by === my.id ? 'Te la juegas TÚ' : nm(by) + ' se la juega'}: ${need} flor${need === 1 ? '' : 'es'} seguidas sin topar calavera.`;
      case 'roundEnd':
        return game.lastResult?.text || '🔄 Fin de ronda.';
      default:
        return '';
    }
  });
</script>

<div class="card skfacts">
  <p class="sknow">{now}</p>
  <div class="skfgrid">
    <div class="skf">
      <span class="skfk">🧮 Discos en la mesa</span> <b>{max}</b>
      {#if game.phase === 'play' || game.phase === 'bid'}<span class="skfk">(tope de la apuesta)</span>{/if}
    </div>
    {#if game.phase === 'setup'}
      <div class="skf"><span class="skfk">⏳ Faltan por colocar</span> {pend.length ? pend.map(who).join(', ') : 'nadie, ya están'}</div>
    {:else if game.phase === 'bid' && game.bid}
      <!-- En el revelado la apuesta ya no se bate: lo que importa entonces es
           cuánto lleva, y eso va abajo con sus casillas. -->
      <div class="skf"><span class="skfk">🗣️ Apuesta a batir</span> <b>{cur}</b> ({who(game.bid.by)})</div>
    {/if}
    <!-- Quién pasó se ve ficha a ficha en la mesa («🤐 pasó»); aquí solo el
         dato que hay que contar de un vistazo: cuántos pueden pisarte. -->
    {#if game.phase === 'bid'}
      <div class="skf"><span class="skfk">🎯 Siguen en la subasta</span> <b>{stillIn.length}</b>: {stillIn.map(who).join(', ') || '—'}</div>
    {/if}
    {#if game.phase === 'reveal'}
      <div class="skf wide">
        <span class="skfk">🎲 Lleva</span>
        <span class="skpips">{#each Array.from({ length: need }, (_, i) => i) as i (i)}<span class="skpip {i < got ? 'on' : ''}">{i < got ? '🌸' : '⚪'}</span>{/each}</span>
        <b>{got}</b>/{need} · faltan {Math.max(0, need - got)}
      </div>
    {/if}
  </div>
</div>

<style>
  .skfacts { padding: 8px 11px; margin: 6px 0; }
  .sknow { margin: 0 0 4px; font-size: 0.9rem; color: var(--moon, #ffd98a); line-height: 1.28; }
  /* Dos columnas en cuanto cabe: los cuatro datos de la subasta caben así en
     dos líneas, sin robarle la pantalla a la mano ni a las pilas. */
  .skfgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0 12px; }
  .skf { font-size: 0.78rem; line-height: 1.45; color: var(--text, #eee); }
  .skf.wide { grid-column: 1 / -1; }
  .skfk { color: var(--muted, #999); }
  .skpips { font-size: 0.9rem; }
  .skpip.on { filter: drop-shadow(0 0 5px color-mix(in srgb, var(--ok, #58b98c) 60%, transparent)); }
</style>
