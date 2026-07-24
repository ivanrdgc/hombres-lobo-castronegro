<script lang="ts">
  // Fase de noche en postura 🍽️ MESA (B28).
  //
  // EN REPOSO los móviles de la mesa enseñan EXACTAMENTE la misma tarjeta:
  // mismo título, mismo texto, mismo alto y un único botón idéntico. Da igual
  // que te toque actuar, que ya hayas actuado o que tu carta esté en el centro.
  // El panel solo aparece tras un gesto del dueño y dentro de la cortina de
  // privacidad (PrivacySheet), que es igual en todos los móviles y se cierra
  // sola. Como TODOS pueden tocar el botón —y quien no está llamado recibe «no
  // es tu turno»—, tocarlo no delata a nadie.
  //
  // B34: esa cortina abre TU TURNO, no «tu carta». La única puerta a la carta es
  // la pastilla flotante 🎴 Mi carta, así que aquí no hay ningún botón más.
  //
  // La cadencia del narrador no cambia: la noche sigue avanzando cuando el
  // actor confirma (y los pasos fantasma se comportan igual que siempre).
  import { isMaster } from '../../../core/sync/store.svelte';
  import { stepActors, playersOf } from '../engine';
  import { STEP_CALL } from '../texts';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';
  import NarratorPanel from './NarratorPanel.svelte';
  import NightActionPanel from './NightActionPanel.svelte';
  import PrivacySheet from './PrivacySheet.svelte';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

  const step = $derived(game.steps[game.stepIdx]);
  const players = $derived(playersOf(game));
  const actors = $derived(step ? stepActors(step, game, players) : null);
  const isActor = $derived(!!(actors && actors.includes(my.id)));
  const call = $derived(step ? STEP_CALL[step] : undefined);
  const quiet = $derived(step === 'durmiendo' || step === 'amanecer');

  // Acuse de recibo: al completar tu acción dejas de ser actor y el panel
  // desaparecía de golpe, justo cuando esperabas un «hecho». Recordamos en LOCAL
  // que este paso era tuyo para despedirte con calma… dentro de la cortina.
  let actedStep = $state(-1);
  $effect(() => { if (isActor) actedStep = game.stepIdx; });
  const justActed = $derived(!isActor && actedStep === game.stepIdx);
  // Si la llamada la cerró el narrador (nadie actuaba), no le digas «hecho»:
  // se quedó sin turno y conviene que lo sepa.
  const skipped = $derived((game.skippedSteps || []).includes(game.stepIdx));

  // La cortina la abre el dueño del móvil y se cierra sola al cambiar de paso o
  // de fase: nada secreto sobrevive a un cambio de escena.
  let open = $state(false);
  $effect(() => { void game.stepIdx; void game.phase; open = false; });
</script>

<div class="narration">🌙 {step === 'durmiendo' ? 'Castronegro cierra los ojos…' : step === 'amanecer' ? 'Los primeros rayos asoman…' : (call || 'La noche avanza…')}</div>

<!-- Tarjeta NEUTRA: idéntica en los diez móviles de la mesa. -->
<div class="actionpanel">
  <h3>🌘 Es de noche</h3>
  <p class="hint">Móvil plano en la mesa y ojos cerrados. Ábrelo cuando la voz llame a TU carta.</p>
  <button class="primary block" data-a="una-open" onclick={() => (open = true)} disabled={quiet}>👁 Abrir mi turno</button>
  {#if quiet}
    <p class="why">Todavía no hay ninguna carta llamada: espera a la primera.</p>
  {:else}
    <p class="why"><b>Esta pantalla es idéntica en todos los móviles</b> y cualquiera puede abrirla: si no te toca, te lo dirá y ya está.</p>
  {/if}
  <p class="rule">🔑 De noche actúas con la carta que te TOCÓ al empezar (o con la que copiaste, si eres El Doble), aunque a estas alturas alguien ya te la haya cambiado sin que lo sepas. ¿No la recuerdas? Está en la pastilla <b>🎴 Mi carta</b>, abajo.</p>
</div>

{#if open}
  <PrivacySheet title="🌘 Mi turno" onclose={() => (open = false)}>
    {#if isActor && step}
      <NightActionPanel {game} {my} step={step!} {players} />
    {:else if justActed && skipped}
      <div class="actionpanel"><h3>⏭️ La voz cerró esta llamada</h3>
        <p class="hint">Se hizo larga y el narrador la cerró para que la noche siguiera. Si no te dio tiempo a actuar, esta noche te quedas sin acción: cierra la hoja y los ojos, que mañana en el debate decides igual que los demás.</p></div>
    {:else if justActed}
      <div class="actionpanel"><h3>✅ Hecho: ya has actuado</h3>
        <p class="hint">Cierra la hoja, cierra los ojos y deja el móvil en la mesa. La noche continúa sin ti: tu carta todavía puede cambiar de manos… y ni te enterarás.</p></div>
    {:else}
      <div class="actionpanel"><h3>🤫 Ahora no te toca</h3>
        <p class="hint">Esta llamada no es de tu carta: cierra la hoja, cierra los ojos y deja el móvil en la mesa. Nadie sabrá que la has abierto —todos vemos esta misma hoja—.</p>
        <p class="hint">Si tu carta no actúa de noche (🧑‍🌾 Aldeano, 🏹 Cazador, 🪢 Curtidor…), no te llamarán nunca: tu turno llega mañana, en el debate. Y la voz llama a TODOS los roles del mazo, estén repartidos o en el centro, así que el silencio no delata a nadie.</p></div>
    {/if}
  </PrivacySheet>
{/if}

<!-- Escape de quien narra jugando: solo el botón (nunca a quién se espera). -->
{#if isMaster()}<NarratorPanel {game} />{/if}

<style>
  .why { margin-top: 6px; font-size: 0.8rem; color: var(--muted); line-height: 1.35; }
  .rule { margin-top: 12px; font-size: 0.8rem; color: var(--muted); line-height: 1.35; }
</style>
