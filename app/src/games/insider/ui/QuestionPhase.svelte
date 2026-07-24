<script lang="ts">
  // Interrogatorio contrarreloj: son los cinco minutos centrales del juego, así
  // que la pantalla sostiene lo que en la mesa real está a la vista —cuánto
  // queda, quién responde, quién abrió, qué se espera de mí— y para el Maestro
  // sus dos caminos con la consecuencia escrita. Cualquier dispositivo dispara
  // el fin de tiempo (primero gana).
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
  const masterName = $derived(game.names[game.masterId] || '¿?');
  const starterName = $derived(game.names[game.playerIds[game.starterIdx]] || '¿?');

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

<div class="narration">❓ Preguntas de sí o no para cercar la palabra. Abrió <b>{starterName}</b>; después pregunta quien quiera. Responde solo <b>{masterName}</b>: sí, no o no lo sé. Fijaos en quién parece saberla ya…</div>

{#if amMaster}
  <div class="actionpanel">
    <h3>🎓 Eres el Maestro</h3>
    <p class="hint">Solo tú conoces la palabra. Responde con la verdad y nada más: «sí», «no» o «no lo sé». Ni pistas, ni matices, ni la nombres.</p>
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
    <h3>🙋 Qué haces tú</h3>
    <p class="small-note" style="margin-top:0">Pregunta en voz alta lo que quieras, sin turnos: «¿es un objeto?», «¿cabe en una mano?». <b>{masterName}</b> contesta sí, no o no lo sé.</p>
    <p class="small-note">Cuando creas saberla, <b>dila en voz alta</b>: solo cuenta si {masterName} la da por buena desde su móvil.</p>
  </div>
{:else}
  <div class="card"><p class="hint">👀 Miras de espectador: la mesa está cercando la palabra a preguntas. Responde solo {masterName}.</p></div>
{/if}

<!-- TODOS los de la ronda ven la MISMA carta mini y el MISMO rótulo. Antes el
     común veía una tarjeta de texto y el Insider un botón suelto: conocido el
     Maestro, bastaba mirar de reojo el móvil del vecino para ficharlo. -->
{#if inGame}
  <div class="card">
    <h3>🎴 Tu papel</h3>
    <p class="small-note" style="margin-top:0">Ábrela cuando quieras: dice qué eres y, si la conoces, la palabra. Se oculta sola a los pocos segundos.</p>
    <MyCard {game} pid={my.id} mini={true} />
    <RolesRef />
  </div>
{/if}
