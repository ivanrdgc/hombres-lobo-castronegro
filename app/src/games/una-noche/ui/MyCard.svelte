<script lang="ts">
  // CONTENIDO privado de «🎴 Mi carta»: la carta con la que empezaste la noche y
  // lo que viste e hiciste. Ya NO tiene puerta propia (B34): en un juego de mesa
  // la única puerta a tu carta durante la partida es la pastilla flotante
  // «🎴 Mi carta», que abre el MyInfoModal; esto es lo que se ve dentro de su
  // cortina de privacidad.
  //
  // Se enseña la carta INICIAL a propósito: en Una Noche la tuya pudo cambiar de
  // noche sin que lo sepas, así que no tiene por qué ser la final. Se avisa.
  import type { GameState, RoleId } from '../types';
  import RoleCard from './RoleCard.svelte';
  import { playerHistory } from '../history';

  const { game, pid }: { game: GameState; pid: string } = $props();
  const role = $derived(game.originalRole[pid] as RoleId);
  const history = $derived(playerHistory(game, pid));
  // En el reparto todavía no ha pasado nada: ahí el aviso es «memorízala». Ya
  // empezada la noche, lo importante es que puede no ser tu carta final.
  const note = $derived(game.phase === 'reveal'
    ? '📌 Memorízala: en cuanto empiece la noche, alguien podría cambiártela sin que te enteres.'
    : '⚠️ Es la carta con la que EMPEZASTE la noche. Alguien pudo cambiártela sin que lo sepas: no tiene por qué ser la carta final.');
</script>

<RoleCard {role} {note} />

{#if history.length}
  <div class="card">
    <h3>📝 Lo que viste e hiciste esta noche</h3>
    <ul class="histlist">{#each history as h (h)}<li>{h}</li>{/each}</ul>
    <p class="small-note">Solo tú ves esto. Al acabar la partida se muestra el de todos.</p>
  </div>
{/if}

<style>
  .histlist { margin: 4px 0 0; padding-left: 1.15rem; }
  .histlist li { margin: 5px 0; line-height: 1.35; }
</style>
