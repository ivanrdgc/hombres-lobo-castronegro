<script lang="ts">
  // Interrogatorio contrarreloj: cronómetro, la carta propia (con la palabra
  // para Maestro e Insider) y el botón del Maestro para confirmar que se ha
  // adivinado. Cualquier dispositivo dispara el fin de tiempo (primero gana).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { roleOf } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { InsiderState } from '../types';
  import Timer from './Timer.svelte';
  import MyCard from './MyCard.svelte';

  const { game, my, spectator = false }: { game: InsiderState; my: PlayerDoc; spectator?: boolean } = $props();
  const inGame = $derived(!spectator && game.playerIds.includes(my.id));
  const amMaster = $derived(inGame && my.id === game.masterId);
  const knowsWord = $derived(inGame && (roleOf(game, my.id) === 'master' || roleOf(game, my.id) === 'insider'));
  const masterName = $derived(game.names[game.masterId] || '¿?');

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

<div class="narration">❓ Preguntas de sí o no para cercar la palabra. Responde solo <b>{masterName}</b> (el Maestro): sí, no o no lo sé. Cuando la digáis en voz alta, el Maestro confirma.</div>

{#if amMaster}
  <div class="card" style="border-color:var(--accent)">
    <p class="small-note" style="margin-top:0">🎓 Solo tú conoces la palabra. En cuanto alguien la diga correctamente, púlsalo:</p>
    <button class="primary block" data-a="ins-guessed" onclick={() => guard(A.markGuessed)}>✅ ¡Palabra adivinada!</button>
  </div>
{/if}

{#if knowsWord}
  <MyCard {game} pid={my.id} mini={true} />
{:else if inGame}
  <div class="card"><p class="small-note" style="margin:0">👥 No conoces la palabra: pregunta y deduce. Y fíjate en quién parece saberla ya…</p></div>
{/if}
