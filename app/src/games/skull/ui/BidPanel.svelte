<script lang="ts">
  // LA SUBASTA, en un solo panel: abrir la apuesta (en tu turno) o subirla /
  // pasar (en tu puja). Antes eran dos pantallas casi iguales en dos ficheros.
  // Solo aparece cuando la decisión es TUYA: lo que hacen los demás ya se lee
  // arriba, en los hechos y en la mesa. Pasar sigue pidiendo un segundo toque,
  // porque es irreversible.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { totalPlaced, placedCount } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my }: { game: SkullState; my: PlayerDoc } = $props();
  const myTurn = $derived(game.turn === my.id && !!game.alive[my.id]);
  const cur = $derived(game.bid?.n ?? 0);
  const max = $derived(totalPlaced(game));
  const opening = $derived(game.phase === 'play' && myTurn);
  const raising = $derived(game.phase === 'bid' && myTurn && game.bid?.by !== my.id);
  const min = $derived(opening ? 1 : cur + 1);
  const nums = $derived(max >= min ? Array.from({ length: max - min + 1 }, (_, i) => min + i) : []);
  const minePlaced = $derived(placedCount(game, my.id));
  const nm = (pid: string) => game.names[pid] || '¿?';

  // El número elegido se ACOTA al vuelo (nunca con un `$effect` que se escriba
  // a sí mismo: con la mesa vacía el tope es 0, el mínimo 1 y el efecto se
  // quedaba en bucle). Si te pisan la apuesta, el mínimo sube y `pick` con él.
  let picked = $state(1);
  const pick = $derived(Math.min(Math.max(picked, min), Math.max(min, max)));
  let askPass = $state(false);
  // Si te pisan la apuesta mientras dudabas, se recoge la confirmación de pasar.
  $effect(() => { void cur; askPass = false; });
</script>

{#if opening || raising}
  <div class="actionpanel">
    <h3>{opening ? '🗣️ Abrir la apuesta' : '📈 Subir la apuesta… o pasar'}</h3>
    <p class="hint">Quien se queda solo levanta: primero TU pila ({minePlaced} disco{minePlaced === 1 ? '' : 's'}) y luego las ajenas.</p>

    {#if nums.length}
      <div class="btnrow" style="flex-wrap:wrap;gap:6px">
        {#each nums as k (k)}
          <button class="small skn {pick === k ? 'primary' : 'ghost'}" data-a={opening ? 'sk-bid-num' : 'sk-raise-num'} data-p={String(k)} onclick={() => (picked = k)}>{k}{k === max ? ' 🔝' : ''}</button>
        {/each}
      </div>
      {#if opening}
        <button class="primary block" style="margin-top:8px" data-a="sk-bid-open" disabled={max < 1} onclick={() => guard(() => A.openBid(pick))}>🗣️ Apostar {pick} flor{pick === 1 ? '' : 'es'}{pick >= max ? ' (el tope: revelas ya)' : ''}</button>
      {:else}
        <button class="primary block" style="margin-top:8px" data-a="sk-raise" onclick={() => guard(() => A.raiseBid(pick))}>📈 Subir a {pick}{pick >= max ? ' (el tope: revelas ya)' : ''}</button>
      {/if}
    {:else}
      <p class="small-note" style="margin:0">La apuesta está en el tope ({max}): ya solo se puede pasar.</p>
    {/if}

    {#if raising}
      {#if !askPass}
        <button class="ghost block" style="margin-top:8px;min-height:44px" data-a="sk-pass-ask" onclick={() => (askPass = true)}>🤐 Pasar: salirme de la subasta</button>
      {:else}
        <div class="skwarn">⚠️ Pasar es <b>definitivo</b>: no vuelves a pujar en esta ronda. Si pasáis todos, levanta {nm(game.bid?.by || '')}.</div>
        <button class="danger block" style="margin-top:8px" data-a="sk-pass" onclick={() => guard(A.passBid)}>🤐 Sí, paso</button>
        <button class="ghost block" style="margin-top:6px" data-a="sk-pass-cancel" onclick={() => (askPass = false)}>↩️ Seguir pujando</button>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .actionpanel { margin: 7px 0; padding: 10px 11px; }
  .actionpanel h3 { font-size: 1rem; margin-bottom: 3px; }
  .actionpanel .hint { font-size: 0.79rem; line-height: 1.3; margin-bottom: 7px; }
  .skwarn { margin-top: 8px; padding: 8px 10px; border-radius: var(--r-1, 8px); font-size: 0.81rem; color: #f3c2c2; background: color-mix(in srgb, var(--danger, #e0526b) 14%, transparent); border: 1px solid var(--danger, #e0526b); }
  .skn { min-width: 46px; flex: 0 0 auto; min-height: 44px; }
</style>
