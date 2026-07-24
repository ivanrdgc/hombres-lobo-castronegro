<script lang="ts">
  // El ÚNICO sitio privado de El Espía. Postura 🍽️ MESA (B28): la ronda son
  // minutos de preguntas hablando y el móvil se queda plano sobre la mesa, así
  // que la pantalla en reposo tiene que ser IDÉNTICA en todos los móviles.
  // Aquí dentro vive TODO lo que depende de tu carta —el lugar, tu papel, la
  // jugada del espía y la libreta de tachones—, detrás de los mismos dos
  // botones para el espía y para un agente, y con auto-ocultado: un móvil
  // olvidado boca arriba no cuenta nada, y unos tachones a la vista tampoco.
  import { app } from '../../../core/sync/store.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';
  import SpyCard from './SpyCard.svelte';
  import LugaresPanel from './LugaresPanel.svelte';

  const { game, my, full = false, notes = true }:
    { game: EspiaState; my: PlayerDoc; full?: boolean; notes?: boolean } = $props();

  const spy = $derived(my.id === game.spyId);
  // La jugada del espía vive con el reloj en marcha y en la tanda de
  // acusaciones; nunca con una votación abierta ni con la partida en pausa.
  const canGuess = $derived((game.phase === 'play' || game.phase === 'timeup') && !game.vote && !game.paused);

  let view = $state<'none' | 'card' | 'notes'>('none');
  let touched = $state(0);

  const show = (v: 'card' | 'notes') => { view = v; touched = Date.now(); };
  const hide = () => (view = 'none');
  /** Cada toque dentro del panel reinicia la cuenta atrás del auto-ocultado. */
  const bump = () => (touched = Date.now());

  // Auto-ocultado por INACTIVIDAD: la carta se va en 12 s (se mira y se
  // memoriza); la libreta aguanta más porque hay 30 pastillas que leer, y cada
  // tachón vuelve a poner el contador a cero.
  $effect(() => {
    if (view === 'none') return;
    void touched;
    const t = setTimeout(hide, view === 'notes' ? 25000 : 12000);
    return () => clearTimeout(t);
  });

  // …y al cambiar el momento de la partida (fase, ronda, votación): nadie se
  // queda con la carta abierta porque el juego se movió por su cuenta.
  $effect(() => {
    void game.phase;
    void game.round;
    void game.voteSeq;
    void game.vote;
    void game.paused;
    hide();
  });
</script>

{#if view === 'none'}
  <div class="peekrow">
    <!-- Rótulos IDÉNTICOS para todos: si al espía le pusiera «adivinar el
         lugar», el vecino lo ficharía sin leer nada más. -->
    <button class="ghost peek" data-a="espia-togglecard" onclick={() => show('card')}>
      <span>👁 Mi carta</span><small>lugar, papel y tu jugada</small>
    </button>
    {#if notes}
      <button class="ghost peek" data-a="espia-notes" onclick={() => show('notes')}>
        <span>📝 Mi libreta</span><small>tachar lugares (solo tú)</small>
      </button>
    {/if}
  </div>
  {#if notes}
    <p class="small-note peeknote">🍽️ El móvil va plano sobre la mesa: estos dos botones son los mismos en todas las pantallas y lo tuyo solo aparece cuando lo pides… y se oculta solo.</p>
  {/if}
{:else if view === 'card'}
  <SpyCard {game} pid={my.id} {full} />
  <div class="jugada">
    {#if spy}
      <p class="jt">🎭 Tu jugada</p>
      <p class="jl">Revélate y señala el lugar cuando creas saberlo: la ronda TERMINA ahí. <b>+4 si aciertas</b>; si fallas, cada agente se lleva +1. Callado y sin condena: +2.</p>
      {#if canGuess}
        <button class="violet block" data-a="espia-guess-open" onclick={() => { bump(); app.ui.modal = { type: 'espia-guess' }; }}>🎭 Revelarme y adivinar el lugar</button>
      {:else}
        <p class="small-note" style="margin:0">Ahora no: la jugada se activa con el reloj en marcha, sigue viva en la tanda de acusaciones y queda bloqueada durante una votación o una pausa.</p>
      {/if}
    {:else}
      <p class="jt">🎯 Tu jugada</p>
      <p class="jl">Cazarlo: tienes <b>UNA</b> acusación en toda la ronda —se gasta aunque la mesa vote que no— y hace falta unanimidad. Si condenáis a un inocente, la ronda acaba igual y el espía se lleva +4.</p>
      <p class="small-note" style="margin:0">Se acusa desde la pantalla de la ronda, con el 🛑 que tenéis todos.</p>
    {/if}
  </div>
  <button class="ghost block" data-a="espia-hidecard" onclick={hide}>🙈 Ocultar (si no, se cierra sola)</button>
{:else}
  <LugaresPanel {game} onActivity={bump} />
  <button class="ghost block" data-a="espia-hidecard" onclick={hide}>🙈 Cerrar la libreta (si no, se cierra sola)</button>
{/if}

<style>
  /* Dos entradas del mismo tamaño, una al lado de la otra: son el «reposo» de
     la pantalla y se pulsan con el pulgar sin mirar. */
  .peekrow { display: flex; gap: 8px; margin: 12px 0 4px; }
  .peekrow .peek {
    flex: 1 1 0; min-width: 0; min-height: 52px; padding: 8px 10px;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    font-size: 0.95rem; font-weight: 600; line-height: 1.15;
  }
  .peekrow .peek small { font-size: 0.72rem; font-weight: 400; color: var(--muted); }
  .peeknote { margin: 0 0 6px; text-align: center; }
  .jugada { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r-1); padding: 10px 12px; margin: 0 0 10px; }
  .jt { margin: 0 0 4px; font-size: 0.95rem; color: var(--moon); font-weight: 700; }
  .jl { margin: 0 0 8px; font-size: 0.86rem; color: var(--muted); line-height: 1.45; }
</style>
