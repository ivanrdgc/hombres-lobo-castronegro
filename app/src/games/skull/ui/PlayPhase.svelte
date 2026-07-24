<script lang="ts">
  // Turno: el jugador activo coloca otro disco o abre la apuesta. Las dos
  // opciones se ofrecen con su efecto y su precio (colocar pasa el turno;
  // apostar abre la subasta y te compromete a levantar), y si te has quedado
  // sin discos en la mano se dice AQUÍ que estás obligado a apostar.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { inHand, totalPlaced, placedCount } from '../engine';
  import DiscOption from './DiscOption.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my }: { game: SkullState; my: PlayerDoc } = $props();
  const myTurn = $derived(game.turn === my.id);
  const inGame = $derived(game.playerIds.includes(my.id));
  const hand = $derived(inGame ? inHand(game, my.id) : { flowers: 0, skulls: 0 });
  const mustBid = $derived(hand.flowers + hand.skulls === 0);
  const max = $derived(totalPlaced(game));
  const minePlaced = $derived(placedCount(game, my.id));
  let bid = $state(1);
  $effect(() => { if (bid > max) bid = max; if (bid < 1) bid = 1; });
  const turnName = $derived(game.names[game.turn] || '¿?');
</script>

{#if myTurn}
  <div class="actionpanel">
    <h3>🎬 Tu turno: pon un disco o apuesta</h3>
    <p class="hint">
      En la mano: <b>{'🌸'.repeat(hand.flowers)}{'💀'.repeat(hand.skulls)}{mustBid ? '—' : ''}</b>
      ({hand.flowers} flor{hand.flowers === 1 ? '' : 'es'} · {hand.skulls} calavera{hand.skulls === 1 ? '' : 's'}).
      En la mesa hay <b>{max}</b> disco{max === 1 ? '' : 's'} entre todos, {minePlaced} {minePlaced === 1 ? 'tuyo' : 'tuyos'}.
    </p>

    {#if mustBid}
      <p class="skforced">☝️ Te has quedado sin discos en la mano: <b>estás obligado a apostar</b>. Es la única jugada que te queda.</p>
    {:else}
      <DiscOption disc="flower" a="sk-place-flower" label="Poner una flor"
        desc="Sube tu pila y pasa el turno sin comprometerte a nada. Sube también el tope de la apuesta: habrá un disco más en la mesa."
        blocked={hand.flowers <= 0 ? 'no te quedan flores en la mano: o la calavera, o apostar' : ''}
        onpick={() => guard(() => A.placeDisc('flower'))} />

      <DiscOption disc="skull" a="sk-place-skull" label="Poner la calavera"
        desc="Queda arriba de tu pila: el primero que levante de ahí falla. Pero si el que apuesta acabas siendo tú, tu pila es la primera que levantas."
        blocked={hand.skulls <= 0 ? 'tu calavera ya está en tu pila (o la perdiste al fallar)' : ''}
        onpick={() => guard(() => A.placeDisc('skull'))} />
    {/if}

    <div class="skbid">
      <h3 style="font-size:1rem;margin:0 0 4px">🗣️ …o abrir la apuesta</h3>
      <p class="small-note" style="margin:0 0 8px">
        Prometes levantar tantas flores seguidas sin topar una calavera, <b>empezando por tu propia pila</b> (de arriba abajo).
        De 1 a {max}: el tope son los {max} disco{max === 1 ? '' : 's'} que hay en la mesa. Luego los demás suben o pasan.
      </p>
      <div class="btnrow" style="flex-wrap:wrap;gap:6px">
        {#each Array.from({ length: max }, (_, i) => i + 1) as k (k)}
          <button class="small skn {bid === k ? 'primary' : 'ghost'}" data-a="sk-bid-num" data-p={String(k)} onclick={() => (bid = k)}>{k}{k === max ? ' 🔝' : ''}</button>
        {/each}
      </div>
      <p class="small-note" style="margin:10px 0 0">
        ▶️ Vas a apostar <b>{bid}</b>: levantar {bid} flor{bid === 1 ? '' : 'es'} sin topar calavera.
        {#if bid >= max}Es el tope: nadie podrá subir y revelas tú, ahora mismo.{/if}
      </p>
      <button class="primary block" style="margin-top:6px" data-a="sk-bid-open" disabled={max < 1} onclick={() => guard(() => A.openBid(bid))}>🗣️ Apostar {bid} flor{bid === 1 ? '' : 'es'}</button>
    </div>

    <details class="skref">
      <summary data-a="sk-ref-play">📖 Recordatorio: apuesta, pujas y revelado</summary>
      <p class="small-note">Quien abre la apuesta ya no coloca más discos en esta ronda: se pasa a la puja.</p>
      <p class="small-note">Los demás suben (un número mayor) o pasan; pasar es definitivo. Cuando todos menos uno han pasado, ese levanta.</p>
      <p class="small-note">Levantar: primero tu pila (de arriba abajo) y luego el disco de arriba de las pilas que elijas. Si llegas a las flores apostadas, reto ⭐ (dos ganan la partida). Si sale una calavera, pierdes un disco al azar.</p>
    </details>
  </div>
{:else}
  <div class="narration">🎬 Turno de <b>{turnName}</b>: pone otro disco sobre su pila o abre la apuesta.</div>
  <div class="card">
    <p class="hint" style="margin:0">👀 Esperando a {turnName}. En la mesa hay {max} disco{max === 1 ? '' : 's'}: ese es el tope de la apuesta.</p>
    <p class="small-note">Mientras, mira en el tablero cuántos discos tiene cada pila y ve calculando cuántas flores te atreverías a levantar tú.</p>
  </div>
{/if}

<style>
  .skforced { margin: 8px 0 0; padding: 10px 12px; border-radius: var(--r-1, 8px); font-size: 0.88rem; color: var(--moon, #ffd98a); background: color-mix(in srgb, var(--accent, #c8a24a) 14%, transparent); border: 1px solid var(--accent, #c8a24a); }
  .skbid { margin-top: 14px; border-top: 1px solid var(--border, #2c3047); padding-top: 10px; }
  .skn { min-width: 48px; flex: 0 0 auto; min-height: 44px; }
  .skref { margin-top: 12px; border-top: 1px solid var(--border, #2c3047); padding-top: 8px; }
  .skref summary { font-size: 0.85rem; color: var(--muted, #999); cursor: pointer; min-height: 30px; }
</style>
