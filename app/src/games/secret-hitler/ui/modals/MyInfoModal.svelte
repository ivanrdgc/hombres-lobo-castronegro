<script lang="ts">
  // La ÚNICA puerta a tu carta durante la partida (B34): la pastilla 🎴 «Mi
  // carta y las reglas» abre ESTA hoja, y ninguna fase añade su propio «👁 Ver
  // mi carta» en el cuerpo (antes había las dos cosas y la mesa no sabía cuál
  // tocar). La excepción es el reparto, donde mirar la carta ES la pantalla.
  //
  // Postura 🍽️ MESA (B28): tocar la pastilla YA es el gesto, así que la hoja
  // entra destapada dentro de la cortina de privacidad —se oculta sola, cada
  // toque reinicia la cuenta— y se cierra al cambiar de fase, para que nadie
  // devuelva el móvil a la mesa con su bando encendido. Las reglas viajan
  // dentro de la misma hoja: una puerta, un cierre.
  import { untrack } from 'svelte';
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { shGame } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';
  import RoleCard from '../RoleCard.svelte';
  import PrivacySheet from '../PrivacySheet.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? shGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const close = () => (app.ui.modal = null);

  // Se cierra al cambiar de fase. Se compara el VALOR (el doc de la partida se
  // rehace en cada snapshot de la mesa: un `close()` a secas cerraría la hoja
  // con cualquier cambio ajeno).
  const scene = $derived(game?.phase ?? '');
  let lastScene = untrack(() => scene);
  $effect(() => {
    if (scene === lastScene) return;
    lastScene = scene;
    close();
  });

  const rows = [
    { emoji: '🕊️', name: 'Liberal', note: 'mayoría', desc: 'No sabe nada de nadie. Gana con 5 decretos liberales o ejecutando a Hitler.' },
    { emoji: '🐷', name: 'Fascista', desc: 'Conoce a los suyos y a Hitler. Gana con 6 decretos fascistas o con Hitler de Canciller (3+ fascistas en mesa).' },
    { emoji: '💀', name: 'Hitler', desc: 'Con 5-6 jugadores conoce a su fascista; con 7+ juega a ciegas. Finge ser el liberal más ejemplar.' },
    { emoji: '🗳️', name: 'Gobierno', desc: 'El Presidente nomina Canciller y la mesa vota Ja/Nein (empate = rechazo). Tres gobiernos caídos seguidos = caos: decreto a ciegas y sin límites de mandato.' },
    { emoji: '📜', name: 'Legislar', desc: 'Presidente ve 3 decretos y descarta 1; Canciller promulga 1 de los 2. Solo lo promulgado es público. Con 5 fascistas: VETO (una vez por sesión).' },
    { emoji: '⚡', name: 'Poderes fascistas', desc: 'Según jugadores: mirar el mazo, investigar lealtades (Hitler sale «fascista»), elección especial o ejecutar.' },
  ];
</script>

{#if game && my}
  {#if inGame}
    <PrivacySheet title="🎴 Mi carta y las reglas" hold={25000} onclose={close}>
      <RoleCard {game} pid={my.id} note="Tu bando no cambia en toda la partida: vuelve aquí siempre que dudes. La pastilla 🎴 es idéntica en todos los móviles, así que abrirla no delata nada." />
      <!-- Las reglas, plegadas: lo secreto es lo que hay que ver primero, y así
           el botón de ocultar cae dentro de la pantalla, sin desplazar. -->
      <details class="shref">
        <summary data-a="sh-rules">📖 Las reglas: bandos, gobierno, legislatura y poderes</summary>
        <RefRows title="🧮 Nada de esto es secreto: lo sabe la mesa entera" {rows} />
        <p class="small-note">Las reglas largas, sin reloj: menú ⋯ → 📖 Cómo se juega.</p>
      </details>
    </PrivacySheet>
  {:else}
    <!-- Espectador: no hay nada secreto que tapar, así que tampoco cortina. -->
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
    <RefRows title="📖 Las reglas: bandos, gobierno, legislatura y poderes" {rows} />
    <p class="small-note">Las reglas largas, sin reloj: menú ⋯ → 📖 Cómo se juega.</p>
    <button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={close}>Cerrar</button>
  {/if}
{:else}
  <!-- La partida se ha cerrado con la hoja abierta: nunca una pantalla sin salida. -->
  <p class="small-note">Esta partida ya no está en curso.</p>
  <button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={close}>Cerrar</button>
{/if}

<style>
  .shref { margin-top: 12px; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--r-2); background: var(--card2); }
  .shref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); min-height: 32px; }
</style>
