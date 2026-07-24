<script lang="ts">
  // Interrogatorio contrarreloj: son los cinco minutos centrales del juego y se
  // juegan HABLANDO, con los móviles planos sobre la mesa. La pantalla sostiene
  // lo que en la mesa real está a la vista —cuánto queda, quién responde, quién
  // abrió— y, debajo, lo único que se toca: el botón del Maestro o tu carta.
  // Cualquier dispositivo dispara el fin de tiempo (primero gana).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { InsiderState } from '../types';
  import Timer from './Timer.svelte';
  import MyCard from './MyCard.svelte';
  import RoundFacts from './RoundFacts.svelte';
  import RolesRef from './RolesRef.svelte';

  const { game, my, spectator = false }: { game: InsiderState; my: PlayerDoc; spectator?: boolean } = $props();
  const inGame = $derived(!spectator && game.playerIds.includes(my.id));
  const amMaster = $derived(inGame && my.id === game.masterId);

  // «¡Adivinada!» corta el reloj y no tiene vuelta atrás: se pide confirmación
  // para que un roce en el bolsillo no liquide el interrogatorio.
  let confirming = $state(false);

  // Reloj a cero: cualquier dispositivo dispara el fin de tiempo.
  $effect(() => {
    const t = setInterval(() => {
      if (game.phase === 'question' && !game.paused && game.deadline !== null && Date.now() >= game.deadline + 400) {
        void guard(A.timeUp);
      }
    }, 1000);
    return () => clearInterval(t);
  });
</script>

<Timer {game} />
<RoundFacts {game} meId={my.id} />

{#if amMaster}
  <div class="actionpanel">
    <h3>🎓 Respondes tú</h3>
    <p class="hint">Solo «sí», «no» o «no lo sé», con la verdad. Ni pistas, ni matices, ni la nombres.</p>
    {#if confirming}
      <p class="hint" style="margin-bottom:10px">¿Han dicho la palabra <b>exacta</b> en voz alta? Elige:</p>
      <button class="primary block" data-a="ins-guessed" onclick={() => guard(A.markGuessed)}>✅ Sí — parar el reloj y cazar al Insider</button>
      <button class="ghost block" data-a="ins-guessed-cancel" onclick={() => (confirming = false)}>↩️ No — seguimos preguntando (el reloj no se ha parado)</button>
      <p class="small-note">Al confirmar no hay marcha atrás: se acaban las preguntas y todos votáis en secreto a quien creáis el Insider.</p>
    {:else}
      <button class="primary block" data-a="ins-guessed-open" onclick={() => (confirming = true)}>✅ ¡Palabra adivinada!</button>
      <p class="small-note">Púlsalo en cuanto alguien diga la palabra exacta: para el reloj y empieza la caza del Insider. Si el reloj llega a 0 antes, pierden todos.</p>
    {/if}
  </div>
{:else if inGame}
  <div class="card">
    <h3>🙋 Pregunta en voz alta</h3>
    <p class="small-note" style="margin-top:0">Sin turnos y de sí o no: «¿es un objeto?», «¿cabe en una mano?». Cuando creas saberla, <b>dila en voz alta</b>: solo cuenta si el Maestro la da por buena desde su móvil.</p>
  </div>
{:else}
  <div class="card"><p class="hint">👀 Miras de espectador: la mesa está cercando la palabra a preguntas.</p></div>
{/if}

<!-- TODOS los de la ronda ven la MISMA carta mini y el MISMO rótulo. Antes el
     común veía una tarjeta de texto y el Insider un botón suelto: conocido el
     Maestro, bastaba mirar de reojo el móvil del vecino para ficharlo. Ahora ni
     abierta se distinguen: mismo emoji, mismos bloques y el mismo alto. -->
{#if inGame}
  <div class="card">
    <h3>🎴 Tu papel</h3>
    <p class="small-note" style="margin-top:0">Dice qué eres y, si la conoces, la palabra. Se oculta sola a los pocos segundos.</p>
    <MyCard {game} pid={my.id} mini={true} />
    <p class="small-note">🍽️ Móvil plano en la mesa: todas las pantallas se ven iguales —también la del Insider—, así que mirar la del vecino no sirve de nada.</p>
  </div>
{/if}

<RolesRef />
