<script lang="ts">
  // «La mesa», consultable DESDE DENTRO de una partida (B26). Estando en una
  // partida la URL se recoloca sola a la pantalla de juego (ui-hygiene), así
  // que sin esto no había forma de llegar al menú de un dispositivo: si a
  // alguien se le apagaba el móvil, la mesa se quedaba sin el rescate
  // («⛔ Sacarlo de la partida») salvo yendo con el botón atrás del navegador.
  import { app, matchOf, me } from '../../core/sync/store.svelte';
  import { isActiveDevice } from '../../core/sync/presence';
  import { gameDef } from '../../games/registry';

  const now = Date.now();
  const meId = $derived(me()?.id);
</script>

<h3>🪑 La mesa</h3>
<p class="small-note" style="margin-top:2px">Quién está conectado ahora mismo. Toca a alguien para expulsarlo de la mesa o <b>sacarlo de su partida</b> — es la salida cuando a un móvil se le acaba la batería y la partida se queda esperándolo.</p>

<div class="players" style="margin-top:8px">
  {#each app.players as p (p.id)}
    {@const busy = matchOf(p.id)}
    <div class="player selectable" data-a="table-player" data-p={p.id} role="button" tabindex="0"
      onclick={() => (app.ui.modal = { type: 'player-menu', pid: p.id })}
      onkeydown={(e) => { if (e.key === 'Enter') app.ui.modal = { type: 'player-menu', pid: p.id }; }}>
      <span class="pname">{p.name}</span>
      {#if busy}<span class="badge">{gameDef(busy.gameId).emoji}</span>{/if}
      {#if !isActiveDevice(p, now)}<span class="badge zz">💤 sin señal</span>{/if}
      {#if p.id === meId}<span class="badge you">Tú</span>{/if}
    </div>
  {/each}
</div>

<button class="ghost block" style="margin-top:10px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
