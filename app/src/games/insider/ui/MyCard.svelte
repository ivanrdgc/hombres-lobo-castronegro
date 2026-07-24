<script lang="ts">
  // Carta PRIVADA de Insider: tu papel y, si la conoces, la PALABRA secreta.
  // Contrato de MESA (B28): durante los 5 minutos de interrogatorio los móviles
  // quedan planos y desbloqueados sobre el mantel, así que esta carta
  //  1) solo aparece tras un gesto tuyo,
  //  2) se oculta sola SIEMPRE (también en el reparto: antes se quedaba abierta
  //     con la palabra a la vista hasta que el jugador pulsaba «Lo tengo»), y
  //  3) tiene la MISMA FORMA para los tres papeles: mismo emoji grande, mismos
  //     bloques, mismo recuadro de palabra (con o sin palabra dentro) y mismo
  //     alto. De reojo y sin leer, la carta del Insider y la de un común son
  //     exactamente la misma carta.
  import { e2eTestMode } from '../../../core/test-hooks';
  import { roleOf } from '../engine';
  import type { InsiderState } from '../types';

  const { game, pid, mini = false, onHide }:
    { game: InsiderState; pid: string; mini?: boolean; onHide?: () => void } = $props();
  const role = $derived(roleOf(game, pid));
  const knows = $derived(role !== 'common');
  // Rótulos de la MISMA longitud (una línea en cualquier móvil) y el mismo
  // «secreto: solo tú lo sabes» para Insider y común: un panel más largo, o una
  // línea de más, se lee de reojo aunque no se lea el texto. El detalle largo de
  // cada papel vive en «📖 Las reglas», igual para todos.
  const NAME = { master: 'Eres el MAESTRO', insider: 'Eres el INSIDER', common: 'Eres del EQUIPO' };
  const TEAM = { master: 'público: lo sabe toda la mesa', insider: 'secreto: solo tú lo sabes', common: 'secreto: solo tú lo sabes' };
  const ROLES = ['master', 'insider', 'common'] as const;
  const DESC = {
    master: 'Responde con la verdad y nada más: «sí», «no» o «no lo sé». Ni pistas ni matices.',
    insider: 'Empuja las preguntas hacia ella para que la adivinen a tiempo… sin cantarte.',
    common: 'Descúbrela preguntando de sí o no. Ojo: uno de los vuestros ya la sabe.',
  };
  // En la mesa manda el número largo; en los e2e se acorta (verificar el
  // auto-ocultado no puede costar 12 s de suite).
  const HIDE_MS = e2eTestMode() ? 4000 : 12000;

  let open = $state(false);
  function toggle() { if (mini) open = !open; }
  // Auto-ocultado en LAS DOS variantes: la mini se pliega sola y la del reparto
  // avisa a quien la abrió (`onHide`) para que la recoja.
  $effect(() => {
    if (mini && !open) return;
    const t = setTimeout(() => { open = false; onHide?.(); }, HIDE_MS);
    return () => clearTimeout(t);
  });
</script>

{#if mini && !open}
  <!-- Rótulo IDÉNTICO para los tres papeles (y por eso «si la conoces»): si al
       Insider le pusiera «ver la palabra», el vecino lo ficharía de reojo.
       «Mi carta» y no «mi papel»: es el mismo nombre que la pastilla 🎴 que abre
       este panel, la ayuda, el tutorial y la voz (B34). -->
  <div style="text-align:center;margin:10px 0"><button class="ghost peek" data-a="ins-togglecard" onclick={toggle}>👁 Ver mi carta (y la palabra, si la conoces)</button></div>
{:else}
  <div class="rolecard ins" data-a="ins-togglecard" onclick={toggle} role="button" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
    <!-- Emoji ÚNICO: un 🕵️ frente a un 👥 a 3 rem es el chivato más barato de
         leer desde el otro lado de la mesa. El papel se dice con palabras. -->
    <span class="remoji">🎴</span>
    <span class="rname">{NAME[role]}</span>
    <div class="rteam">{TEAM[role]}</div>
    <!-- El recuadro de la palabra sale SIEMPRE, con la misma forma y el mismo
         alto: lo que cambia es lo que pone dentro. -->
    {#if knows}
      <div class="kwbox insword" data-a="ins-word">🔑 Palabra: <b>«{game.word}»</b></div>
    {:else}
      <div class="kwbox insword">🔑 Palabra: <b>no la conoces</b></div>
    {/if}
    <!-- Las tres descripciones ocupan la MISMA celda y solo se ve la tuya: así
         el bloque mide lo que el texto más largo en CUALQUIER ancho, y no hay
         forma de que la carta del Insider salga una línea más alta que la de un
         común (lo cazó el e2e: 368 px frente a 390 px). -->
    <div class="descbox">
      {#each ROLES as r (r)}
        <div class="rdesc insdesc {r === role ? 'on' : ''}" aria-hidden={r !== role}>{DESC[r]}</div>
      {/each}
    </div>
    <p class="small-note hidenote">
      {#if mini}👆 Toca la carta para ocultarla ya; si no, se cierra sola en unos segundos.
      {:else}Se oculta sola en unos segundos. Puedes volver a abrirla las veces que quieras.{/if}
    </p>
  </div>
{/if}

<style>
  /* Los tres papeles comparten borde: en turquesa/magenta/oliva se fichaba al
     Insider de un vistazo desde el otro lado de la mesa, sin leer nada. El papel
     se lee en el texto de la carta, que es para su dueño. */
  .rolecard.ins { border-color: #5a5b70; box-shadow: 0 0 0 1px #5a5b70 inset; }
  /* Alto blindado: el recuadro reserva sitio para una palabra de dos líneas
     («Máquina de escribir» en un móvil estrecho), así que mide igual con palabra
     y sin ella. */
  .insword { min-height: 3.1em; align-items: center; justify-content: center; font-size: 0.95rem; }
  /* Las tres descripciones apiladas en la misma celda: la altura la fija la más
     larga y es la misma para los tres papeles. */
  .descbox { display: grid; margin-top: 10px; }
  .descbox > .insdesc { grid-area: 1 / 1; visibility: hidden; }
  .descbox > .insdesc.on { visibility: visible; }
  .hidenote { margin-top: 8px; }
  /* Se pulsa a media partida y con prisa: dedo entero, no un botoncito. */
  .peek { min-height: 44px; font-size: 0.92rem; font-weight: 500; padding: 10px 16px; }
</style>
