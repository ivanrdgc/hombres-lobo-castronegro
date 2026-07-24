<script lang="ts">
  // TU CARTA (bando, rol y sala): lo que consultas TÚ y nadie más.
  //
  // Two Rooms es de postura 🍽️ MESA (B28), así que durante la partida esta
  // carta NO vive en el cuerpo de ninguna fase: se abre por UNA sola puerta,
  // la pastilla flotante «🎴 Mi carta y las reglas» (B34). Las dos únicas
  // apariciones son esa pastilla y el REPARTO, donde mirar la carta ES la
  // pantalla.
  //
  // ENSEÑÁRSELA A OTRO es OTRA cosa —el mecanismo del juego— y tiene su propio
  // verbo, su propio botón y su propia pantalla a sangre: ShowCard.svelte. Aquí
  // no hay ni un botón de enseñar, para que consultar y enseñar no se confundan.
  import { untrack } from 'svelte';
  import { e2eTestMode } from '../../../core/test-hooks';
  import type { TwoRoomsState } from '../types';

  // autoHide: con el móvil boca arriba en la mesa, lo secreto no puede quedarse
  // encendido. Se guarda sola a los 15 s (en los e2e no: Playwright piensa
  // despacio) y también al cambiar de fase.
  const { game, pid, autoHide = false }: { game: TwoRoomsState; pid: string; autoHide?: boolean } = $props();
  const team = $derived(game.teams[pid]);
  const role = $derived(game.roles[pid]);

  let hidden = $state(false);
  $effect(() => {
    if (!autoHide || hidden || e2eTestMode()) return;
    const t = setTimeout(() => (hidden = true), 15000);
    return () => clearTimeout(t);
  });

  // Cambio de fase = la carta se guarda. Se compara contra el valor anterior en
  // vez de reaccionar al objeto entero: el doc de la partida se reemplaza en
  // cada snapshot y eso la guardaría cada pocos segundos. Arranca con la fase
  // ACTUAL: si no, el primer render de la carta ya la daría por guardada.
  let lastPhase = untrack(() => game.phase);
  $effect(() => {
    const p = game.phase;
    if (p === lastPhase) return;
    lastPhase = p;
    if (autoHide) hidden = true;
  });
</script>

{#if hidden}
  <div class="trhidden">
    <p class="small-note" style="margin:0 0 8px">🙈 Guardada, para que el móvil pueda volver a la mesa.</p>
    <button class="ghost block" data-a="tr-peek" onclick={() => (hidden = false)}>👁 Verla otra vez</button>
  </div>
{:else}
  <div class="trcard {team}" data-a="tr-card">
    <span class="teamline">{team === 'blue' ? '🔵 Equipo AZUL' : '🔴 Equipo ROJO'}</span>
    <!-- Las cuatro descripciones se parecen en largo y el bloque tiene alto
         fijo: la SILUETA de la carta abierta no puede delatar el rol de lejos. -->
    {#if role === 'president'}
      <span class="rolebig">🎖️ Eres el PRESIDENTE</span>
      <span class="roledesc">Acaba la partida lejos del Bombardero. Los azules te protegen… si te encuentran.</span>
    {:else if role === 'bomber'}
      <span class="rolebig">💣 Eres el BOMBARDERO</span>
      <span class="roledesc">Acaba la última ronda en la MISMA sala que el Presidente. Y ¡boom!</span>
    {:else}
      <span class="rolebig">🎴 Carta normal</span>
      <span class="roledesc">{team === 'blue' ? 'Protege al Presidente: que no acabe con el Bombardero.' : 'Cuela al Bombardero en la sala del Presidente.'}</span>
    {/if}
    <span class="roomline">🚪 {game.phase === 'reveal' ? 'Empiezas' : 'Estás'} en la Sala {game.room[pid] + 1}</span>
    {#if autoHide}<p class="small-note" style="margin:6px 0 0">Solo tú ves esto: se guarda sola en unos segundos.</p>{/if}
  </div>
{/if}

<style>
  .trcard { display: flex; flex-direction: column; gap: 4px; border-radius: 12px; padding: 12px 14px; margin: 8px 0 6px; border: 1px solid var(--line, #2a2f45); background: var(--card, #171a2b); }
  .trcard.blue { border-color: #4a6ba8; box-shadow: 0 0 0 1px #4a6ba8 inset; }
  .trcard.red { border-color: #a84a5a; box-shadow: 0 0 0 1px #a84a5a inset; }
  .teamline { font-weight: 700; }
  .rolebig { font-size: 1.05rem; font-weight: 700; margin-top: 2px; }
  .roledesc { font-size: 0.84rem; color: var(--muted, #97a); min-height: 2.6em; }
  .roomline { margin-top: 4px; font-weight: 600; }
  .trhidden { margin: 8px 0 6px; text-align: center; }
</style>
