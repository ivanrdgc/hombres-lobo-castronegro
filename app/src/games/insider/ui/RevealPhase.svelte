<script lang="ts">
  // Reparto de Insider: cada cual mira su carta y confirma. El Maestro (público)
  // pone el reloj en marcha cuando todos han confirmado. La pantalla dice los
  // TRES pasos y quién falta por nombre: antes se veía un botón suelto y la mesa
  // no sabía si esperaba a alguien o si ya podía empezar a preguntar.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { InsiderState } from '../types';
  import MyCard from './MyCard.svelte';
  import RoundFacts from './RoundFacts.svelte';
  import RolesRef from './RolesRef.svelte';

  const { game, my }: { game: InsiderState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const amMaster = $derived(my.id === game.masterId);
  const nm = (pid: string) => game.names[pid] || '¿?';
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map(nm));
  const masterName = $derived(nm(game.masterId));
  const starterName = $derived(nm(game.playerIds[game.starterIdx]));
  const mins = $derived(Math.max(1, Math.round(game.durationMs / 60000)));
</script>

<div class="narration">🤫 Ronda {game.round}. El Maestro es <b>{masterName}</b> (lo sabéis todos): conoce la palabra y solo responde. Entre los demás se esconde el Insider, que también la conoce.</div>

<RoundFacts {game} meId={my.id} showTime={true} />

<!-- Quién ha confirmado ya: es información pública (en la mesa se ve quién ha
     dejado el móvil boca abajo) y evita el «¿a quién esperamos?» a voces. -->
<div class="players" style="margin-bottom:4px">
  {#each game.playerIds as pid (pid)}
    <div class="player {game.seen[pid] ? '' : 'dim'}">
      <span class="pname">{nm(pid)}{pid === game.masterId ? ' 🎓' : ''}</span>
      {#if pid === my.id}<span class="badge you">tú</span>{/if}
      <span>{game.seen[pid] ? '✅' : '⏳'}</span>
    </div>
  {/each}
</div>

{#if inGame && !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <MyCard {game} pid={my.id} />
    <button class="primary block" data-a="ins-seen" onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo tengo (ocultar la carta)</button>
  {:else}
    <div class="actionpanel">
      <h3>🎴 Tu carta está lista</h3>
      <ol class="howlist">
        <li>Mírala <b>a solas</b>: nadie debe ver tu pantalla.</li>
        <li>Confirma con «Lo tengo» y la carta se oculta.</li>
        <li>Cuando confirméis todos, arranca el reloj: <b>{mins} min</b> de preguntas y abre <b>{starterName}</b>.</li>
      </ol>
      <button class="primary block" data-a="ins-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta en secreto</button>
      <RolesRef />
    </div>
  {/if}
{:else if pend.length}
  <div class="card">
    <h3>⏳ Esperando a {pend.join(', ')}</h3>
    <p class="small-note" style="margin-top:0">Tienen que mirar su carta y confirmar. Si alguno se ha quedado sin móvil, sácalo de la partida desde ⋯ → 🪑 La mesa.</p>
    <p class="small-note">Mientras: ve pensando preguntas de sí o no. Tu carta sigue a mano en el botón 🎴.</p>
  </div>
{:else}
  <!-- Confirmados todos, el botón sale en TODAS las pantallas: si el móvil del
       Maestro muere, cualquiera arranca el reloj y la ronda no se atasca. -->
  <div class="actionpanel">
    <h3>⏱ Todos listos</h3>
    {#if amMaster}
      <p class="hint">Tú respondes: «sí», «no» o «no lo sé», y nada más. Abre preguntando <b>{starterName}</b>; luego pregunta quien quiera.</p>
    {:else}
      <p class="hint">Abre preguntando <b>{starterName}</b>; responde solo <b>{masterName}</b>. Lo normal es que arranque el Maestro, pero vale cualquiera.</p>
    {/if}
    {#if inGame}
      <button class="primary block" data-a="ins-begin" onclick={() => guard(A.beginQuestions)}>⏱ Empezar: {mins} min de preguntas</button>
      <p class="small-note">Al pulsarlo el reloj corre para todos y ya no se para (salvo pausa en ⋯).</p>
    {/if}
    <RolesRef />
  </div>
{/if}
