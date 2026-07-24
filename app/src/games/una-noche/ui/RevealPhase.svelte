<script lang="ts">
  // Reparto en postura 🍽️ MESA (B28): antes cada móvil enseñaba la carta a
  // pantalla completa mientras la mesa entera esperaba a los rezagados —el
  // chivato más caro de la partida, porque en Una Noche la carta inicial es
  // media deducción—. Ahora todos los móviles enseñan la MISMA tarjeta neutra y
  // la carta se mira dentro de la cortina de privacidad, que se cierra sola.
  //
  // Es la ÚNICA fase con botón propio a la carta (excepción de B34): aquí la
  // instrucción ES mirarla y memorizarla. En cuanto empieza la noche, la única
  // puerta vuelve a ser la pastilla flotante «🎴 Mi carta».
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';
  import PrivacySheet from './PrivacySheet.svelte';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

  const myRole = $derived(game.originalRole[my.id]);
  const seen = $derived(!!(game.seen || {})[my.id]);
  const pending = $derived(game.playerIds.filter((pid) => !(game.seen || {})[pid]).map((pid) => game.names[pid]));
  const allSeen = $derived(pending.length === 0);

  let open = $state(false);
  $effect(() => { void game.phase; open = false; });

  function memorized() {
    guard(A.confirmSeen);
    open = false;
  }
</script>

<div class="narration">🎴 Mira tu carta en secreto y memorízala. De noche alguien podría cambiártela…</div>

{#if myRole}
  <!-- Tarjeta NEUTRA: el mismo texto y el mismo botón en todos los móviles. -->
  <div class="actionpanel">
    <h3>🎴 Tu carta está repartida</h3>
    <p class="hint">Coge el móvil, tápalo con la mano y ábrelo: la carta solo aparece mientras la miras y se oculta sola a los 12 s. De reojo nadie deduce nada, porque tu pantalla <b>es la misma que la suya</b>.</p>
    <button class="primary block" data-a="una-open-card" onclick={() => (open = true)}>👁 Ver mi carta en secreto</button>
    <p class="why">{seen ? '✅ Tu carta: memorizada.' : '⏳ Tu carta: aún sin confirmar.'} {allSeen ? 'Todos listos.' : 'Faltan por confirmar: ' + pending.join(', ') + '.'}</p>
  </div>

  {#if allSeen}
    <button class="primary block" data-a="una-begin-night" onclick={() => guard(A.beginNight)}>🌙 Comenzar la noche</button>
  {/if}

  {#if open}
    <PrivacySheet title="🎴 Mi carta" onclose={() => (open = false)}>
      <RoleCard role={myRole} />
      {#if !seen}
        <button class="primary block" data-a="una-seen" onclick={memorized}>✅ Ya la he memorizado</button>
      {:else}
        <p class="small-note" style="margin-top:10px">Ya la habías confirmado: repásala y vuelve a ocultarla. En cuanto empiece la noche, cualquiera puede cambiártela sin que te enteres.</p>
      {/if}
    </PrivacySheet>
  {/if}
{:else}
  <div class="card"><p class="hint">🎴 Repartiendo las cartas…</p></div>
{/if}

<style>
  .why { margin-top: 8px; font-size: 0.8rem; color: var(--muted); line-height: 1.35; }
</style>
