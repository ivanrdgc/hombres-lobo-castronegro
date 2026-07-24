<script lang="ts">
  // TU CARTA, con UNA sola puerta (docs/UX.md · B34): se llega siempre por la
  // pastilla flotante «🎴 Mi carta» del shell, y ninguna pantalla de El Espía
  // añade su propio «ver mi carta». Dentro vive TODO lo que depende de tu
  // carta: el lugar, tu papel y tu jugada.
  // Postura de MESA (B28): el móvil acaba plano y boca arriba, así que la carta
  // se tapa sola a los 12 s —con la cuenta a la vista, para que no parezca una
  // avería— y también en cuanto la partida se mueve (fase, ronda, votación,
  // pausa). La libreta NO está aquí: es una herramienta, vive en la pantalla.
  import { app } from '../../../core/sync/store.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';
  import SpyCard from './SpyCard.svelte';

  const { game, my }: { game: EspiaState; my: PlayerDoc } = $props();

  const spy = $derived(my.id === game.spyId);
  // La jugada del espía vive con el reloj en marcha y en la tanda de
  // acusaciones; nunca con una votación abierta ni con la partida en pausa.
  const canGuess = $derived((game.phase === 'play' || game.phase === 'timeup') && !game.vote && !game.paused);

  const HIDE_S = 12;
  let shown = $state(true);
  let left = $state(HIDE_S);

  $effect(() => {
    if (!shown) return;
    left = HIDE_S;
    const t = setInterval(() => {
      if (--left <= 0) shown = false;
    }, 1000);
    return () => clearInterval(t);
  });

  // Al moverse la partida, la carta se tapa. Se compara el MOMENTO (una firma
  // de valores), no la identidad de los objetos: cada snapshot de Firestore
  // reemplaza el doc entero, y disparar con eso taparía la carta al instante.
  // En el primer render no se tapa: se abre destapada, que para eso la pides.
  let moment = '';
  $effect(() => {
    const now = `${game.phase}|${game.round}|${game.voteSeq}|${game.vote ? 1 : 0}|${game.paused ? 1 : 0}`;
    if (!moment) {
      moment = now;
      return;
    }
    if (now === moment) return;
    moment = now;
    shown = false;
  });
</script>

{#if shown}
  <SpyCard {game} pid={my.id} full={true} />
  <div class="jugada">
    {#if game.phase === 'end'}
      <p class="jl">🏁 La ronda ha terminado: esta era tu carta.</p>
    {:else if spy}
      {#if canGuess}
        <p class="jl">Si aciertas, <b>+4</b> y ganas la ronda; si fallas, <b>+1</b> para cada agente. En los dos casos la ronda termina ahí.</p>
        <button class="violet block" data-a="espia-guess-open" onclick={() => (app.ui.modal = { type: 'espia-guess' })}>🎭 Revelarme y adivinar el lugar</button>
      {:else}
        <p class="jl">🎭 Revelarte y adivinar el lugar se activa con el reloj en marcha y sigue vivo en la tanda de acusaciones; durante una votación o una pausa, no.</p>
      {/if}
    {:else}
      <p class="jl">🛑 Para acusar, el botón que tenéis todos en la pantalla de la ronda: una sola vez y hace falta unanimidad.</p>
    {/if}
  </div>
  <button class="ghost block" data-a="espia-hidecard" onclick={() => (shown = false)}>🙈 Tapar la carta (se tapa sola en {left} s)</button>
{:else}
  <p class="small-note hidden-note">🙈 Tu carta se ha tapado sola: el móvil se queda plano en la mesa y así nadie la lee de reojo.</p>
  <button class="ghost block" data-a="espia-togglecard" onclick={() => (shown = true)}>👁 Ver mi carta otra vez</button>
{/if}

<style>
  .jugada { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r-1); padding: 10px 12px; margin: 0 0 10px; }
  .jl { margin: 0; font-size: 0.86rem; color: var(--muted); line-height: 1.45; }
  .jugada button.block { margin-top: 10px; }
  .hidden-note { margin: 6px 0 10px; text-align: center; }
</style>
