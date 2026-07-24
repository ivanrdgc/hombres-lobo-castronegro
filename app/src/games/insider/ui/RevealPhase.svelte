<script lang="ts">
  // Reparto de Insider: cada cual mira su carta y confirma; cuando están todas
  // vistas, cualquiera arranca el reloj. Orden de la pantalla (B29): lo que hay
  // que hacer AHORA arriba y sin scroll, debajo el contexto (quién ha
  // confirmado) y al pie las reglas, plegadas. Los nombres de la ronda —quién
  // responde, quién abre— salen UNA vez, en la tira de datos públicos.
  // Es la ÚNICA fase con botón propio para la carta (excepción de B34): aquí la
  // instrucción ES la pantalla. Repartida ya, la única puerta es la pastilla 🎴.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { InsiderState } from '../types';
  import MyCard from './MyCard.svelte';
  import RoundFacts from './RoundFacts.svelte';
  import RolesRef from './RolesRef.svelte';

  // Solo la ven los de la ronda (GameScreen manda a los de fuera a su pantalla
  // de espectador): sin modo mirón.
  const { game, my }: { game: InsiderState; my: PlayerDoc } = $props();
  const amMaster = $derived(my.id === game.masterId);
  const nm = (pid: string) => game.names[pid] || '¿?';
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map(nm));
  const mins = $derived(Math.max(1, Math.round(game.durationMs / 60000)));
</script>

<!-- Sin «Ronda N»: la cabecera ya lo dice (y el chip de fase, que estáis en el
     reparto). Aquí va lo que la mesa necesita saber, no el rótulo. -->
<div class="narration">🤫 Cartas repartidas. El Maestro conoce la palabra y solo responde; entre los demás se esconde el Insider, que también la conoce.</div>

<RoundFacts {game} meId={my.id} showTime={true} />

{#if !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <!-- `onHide`: la carta se cierra SOLA a los pocos segundos. Antes se quedaba
         abierta hasta pulsar «Lo tengo» y bastaba con distraerse para dejar la
         palabra a la vista sobre la mesa. -->
    <MyCard {game} pid={my.id} onHide={() => (app.ui.revealOpen = false)} />
    <button class="primary block" data-a="ins-seen" onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo tengo (ocultar la carta)</button>
  {:else}
    <div class="actionpanel">
      <h3>🎴 Tu carta, a solas</h3>
      <ol class="howlist">
        <li>Léela sin que nadie mire: se cierra sola a los pocos segundos y puedes volver a abrirla.</li>
        <li>Confirma con «Lo tengo» y deja el móvil <b>plano en la mesa</b>.</li>
        <li>Con todas las cartas vistas, cualquiera pone el reloj en marcha.</li>
      </ol>
      <button class="primary block" data-a="ins-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta</button>
      <p class="small-note">🍽️ Todas las cartas se ven iguales —mismo dibujo, mismo alto—: nadie sabe si el vecino tiene la palabra.</p>
    </div>
  {/if}
{:else if pend.length}
  <div class="card">
    <h3>⏳ Faltan cartas por mirar</h3>
    <p class="small-note" style="margin-top:0">Ve pensando preguntas de sí o no. Tu carta sigue a mano en la pastilla 🎴 «Mi carta», abajo a la derecha. Si alguien se ha quedado sin móvil, sácalo de la partida desde ⋯ → 🪑 La mesa.</p>
  </div>
{:else}
  <!-- Confirmadas todas, el botón sale en TODAS las pantallas: si el móvil del
       Maestro muere, cualquiera arranca el reloj y la ronda no se atasca. -->
  <div class="actionpanel">
    <h3>⏱ Todos listos</h3>
    {#if amMaster}
      <p class="hint">Tú solo respondes: «sí», «no» o «no lo sé». Ni pistas, ni matices, ni la nombres.</p>
    {:else}
      <p class="hint">Preguntáis en voz alta y sin turnos; responde solo el Maestro. Abre quien diga la tira de arriba.</p>
    {/if}
    <button class="primary block" data-a="ins-begin" onclick={() => guard(A.beginQuestions)}>⏱ Arrancar el reloj: {mins} min</button>
    <p class="small-note">El reloj corre para todos y ya no se para (salvo pausa en ⋯).</p>
  </div>
{/if}

<!-- Quién ha confirmado ya: es información pública (en la mesa se ve quién ha
     dejado el móvil boca abajo) y evita el «¿a quién esperamos?» a voces. Los
     nombres viven AQUÍ, no repetidos en el título de arriba. -->
{#if pend.length}
  <div class="players" style="margin-bottom:4px">
    {#each game.playerIds as pid (pid)}
      <div class="player {game.seen[pid] ? '' : 'dim'}">
        <span class="pname">{nm(pid)}{pid === game.masterId ? ' 🎓' : ''}</span>
        {#if pid === my.id}<span class="badge you">tú</span>{/if}
        <span>{game.seen[pid] ? '✅' : '⏳'}</span>
      </div>
    {/each}
  </div>
{/if}

<RolesRef />
