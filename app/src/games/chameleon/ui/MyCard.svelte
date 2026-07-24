<script lang="ts">
  // Carta PRIVADA de la ronda. El Camaleón es un juego de MESA (docs/UX.md ·
  // «Postura del móvil»): el móvil se queda plano y desbloqueado, y el vecino
  // puede echar un vistazo, así que las dos cartas posibles —la palabra secreta
  // y «Camaleón»— tienen que ser INDISTINGUIBLES de reojo.
  //
  // Antes se distinguían por tres sitios a la vez, sin leer una letra:
  //   · el MARCO (verde para el Camaleón, azul para el grupo),
  //   · el EMOJAZO de 3 rem (🦎 frente a 🔑),
  //   · el ALTO (dos descripciones de largo distinto → dos siluetas distintas).
  // Ahora es LA MISMA carta para todos: mismo marco, mismo emoji, mismo texto y
  // el hueco de la palabra con alto fijo (para que «Ola» y «Tienda de campaña»
  // ocupen igual). Lo único que cambia son las letras del centro… y solo
  // mientras las pides: la carta se tapa sola, nunca se queda fija.
  //
  // B34 · una sola puerta: este componente se pinta en DOS sitios y ninguno más
  // —el REPARTO (la excepción: ahí mirar la carta ES la pantalla) y el modal de
  // la pastilla 🎴 «Mi carta y las reglas»—. Las fases de pistas y voto no
  // llevan su propio «ver mi carta»: la puerta es siempre la pastilla.
  import { e2eTestMode } from '../../../core/test-hooks';
  import { isChameleon, secretWord } from '../engine';
  import type { ChameleonState } from '../types';

  const { game, pid, mini = false, onhide = null }: {
    game: ChameleonState;
    pid: string;
    /** `true`: empieza tapada, con el botón 👁 (así es en el modal de la pastilla). */
    mini?: boolean;
    /** Aviso al padre de que la carta se ha tapado (sola o a la primera). */
    onhide?: (() => void) | null;
  } = $props();

  const cham = $derived(isChameleon(game, pid));
  // Misma forma en los dos casos: una palabra entre comillas, con inicial
  // mayúscula, en el mismo hueco. Ni versales ni etiquetas de más.
  const word = $derived(cham ? 'Camaleón' : secretWord(game));

  /** Segundos que aguanta destapada antes de taparse sola (los e2e no esperan). */
  const HIDE_S = e2eTestMode() ? 5 : 12;
  // `mini` no cambia en toda la vida del componente (las llamadas pasan un
  // literal): capturar su valor inicial es justo lo que se quiere aquí.
  // svelte-ignore state_referenced_locally
  let open = $state(!mini);
  let left = $state(HIDE_S);
  function hide() { open = false; onhide?.(); }
  function toggle() { if (open) hide(); else open = true; }
  // Auto-ocultado también en el reparto: antes la palabra secreta se quedaba en
  // pantalla hasta que pulsabas «Lo tengo», que es media fase con el móvil
  // encendido y boca arriba.
  $effect(() => {
    if (!open) return;
    left = HIDE_S;
    const t = setInterval(() => { if (--left <= 0) hide(); }, 1000);
    return () => clearInterval(t);
  });
</script>

{#if open}
  <!-- Sin marcas de bando tampoco en el HTML (`data-…`): lo único que distingue
       una carta de otra es la palabra que se lee dentro. -->
  <div class="rolecard chcard" data-a="ch-togglecard"
    onclick={toggle} role="button" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(); }}>
    <span class="remoji">🎴</span>
    <div class="rteam" style="margin:0 0 2px">Tu carta de esta ronda</div>
    <!-- Hueco de alto fijo: la palabra más larga del juego no puede hacer la
         carta más alta que «Ola», o el alto delataría de quién es. -->
    <div class="chslot"><span class="rname">«{word}»</span></div>
    <div class="rdesc">
      👉 Si es una palabra del tema, es la SECRETA: da una pista que demuestre que la conoces, sin regalarla.
      🦎 Si pone «Camaleón», eres tú: no la conoces, escucha las pistas e imita el tono.
    </div>
    <p class="chhide">🙈 Todos veis esta misma carta: solo cambia esa palabra. Se tapa sola en {left} s (o tócala para taparla ya).</p>
  </div>
{:else if mini}
  <div class="chpeek">
    <button class="ghost block" data-a="ch-togglecard" onclick={toggle}>👁 Ver mi carta (se tapa sola)</button>
  </div>
{/if}

<style>
  /* Ni un solo rasgo por bando: el marco, el fondo y el emoji son los de
     `.rolecard` de la app, iguales para todo el mundo. */
  .chcard { cursor: pointer; }
  .chslot {
    display: flex; align-items: center; justify-content: center;
    /* Dos líneas de `.rname` (1,3 rem): «Tienda de campaña» mide lo mismo que «Ola». */
    min-height: 3.4rem;
    padding: 0 4px; margin-bottom: 2px;
  }
  .chslot .rname { line-height: 1.25; text-wrap: balance; }
  .chhide { color: var(--muted, #a9a6c0); font-size: 0.8rem; margin: 10px 0 0; }
  .chpeek { text-align: center; margin: 10px 0; }
</style>
