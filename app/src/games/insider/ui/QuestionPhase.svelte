<script lang="ts">
  // Interrogatorio contrarreloj: son los cinco minutos centrales del juego y se
  // juegan HABLANDO, con los móviles planos sobre la mesa. La pantalla sostiene
  // lo que en la mesa real está a la vista —cuánto queda, quién responde, quién
  // abrió— y, debajo, lo único que se toca: el botón del Maestro.
  // Cualquier dispositivo dispara el fin de tiempo (primero gana).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { InsiderState } from '../types';
  import Timer from './Timer.svelte';
  import RoundFacts from './RoundFacts.svelte';
  import RolesRef from './RolesRef.svelte';

  // Solo lo pinta GameScreen a quien juega la ronda (los de fuera tienen su
  // propia pantalla de espectador): aquí no hace falta un modo mirón.
  const { game, my }: { game: InsiderState; my: PlayerDoc } = $props();
  const amMaster = $derived(my.id === game.masterId);

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
      <p class="small-note">Púlsalo en cuanto alguien diga la palabra exacta: para el reloj y empieza la caza del Insider.</p>
    {/if}
  </div>
{:else}
  <div class="card">
    <h3>🙋 Pregunta en voz alta</h3>
    <p class="small-note" style="margin-top:0">Sin turnos y de sí o no: «¿es un objeto?», «¿cabe en una mano?». Cuando creas saberla, <b>dila en voz alta</b>: solo cuenta si el Maestro la da por buena desde su móvil.</p>
  </div>
{/if}

<!-- UNA SOLA PUERTA a tu carta (B34): durante el interrogatorio no hay ningún
     «👁 Ver mi carta» en el cuerpo —antes había una tarjeta entera—, solo la
     pastilla 🎴, idéntica en todos los móviles y en todas las fases. Lo que
     queda aquí no es una puerta, es la regla de mesa: la misma línea para todos,
     así que no delata a nadie. -->
<p class="small-note fabhint">🍽️ Móvil plano en la mesa. Tu carta vive en la pastilla 🎴 <b>Mi carta</b>: se abre solo a quien la pide, se oculta sola y todas las pantallas se ven iguales — pulsarla no delata a nadie.</p>

<RolesRef />

<style>
  .fabhint { text-align: center; margin: 12px 4px 0; }
</style>
