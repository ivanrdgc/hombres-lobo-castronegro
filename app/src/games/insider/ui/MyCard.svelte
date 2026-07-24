<script lang="ts">
  // Carta PRIVADA de Insider: tu papel y, si lo conoces, la PALABRA secreta.
  // Mini + auto-oculta, para consultarla con disimulo durante el interrogatorio.
  import { roleOf } from '../engine';
  import type { InsiderState } from '../types';

  const { game, pid, mini = false }: { game: InsiderState; pid: string; mini?: boolean } = $props();
  const role = $derived(roleOf(game, pid));
  let open = $state(false);
  function toggle() { if (mini) open = !open; }
  $effect(() => { if (!open) return; const t = setTimeout(() => (open = false), 12000); return () => clearTimeout(t); });
</script>

{#if mini && !open}
  <!-- Rótulo IDÉNTICO para los tres papeles (y por eso «si la conoces»): si al
       Insider le pusiera «ver la palabra», el vecino lo ficharía de reojo. -->
  <div style="text-align:center;margin:10px 0"><button class="ghost peek" data-a="ins-togglecard" onclick={toggle}>👁 Ver mi papel (y la palabra, si la conoces)</button></div>
{:else}
  <div class="rolecard {role}" data-a="ins-togglecard" onclick={toggle} role="button" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
    {#if role === 'master'}
      <span class="remoji">🎓</span>
      <span class="rname">Eres el MAESTRO</span>
      <div class="rteam">tu papel es público</div>
      <div class="kwbox" data-a="ins-word">🔑 La palabra es «{game.word}»</div>
      <div class="rdesc">Responde a las preguntas de SÍ o NO con la VERDAD: «sí», «no» o «no lo sé». No la nombres ni des pistas de más.</div>
    {:else if role === 'insider'}
      <span class="remoji">🕵️</span>
      <span class="rname">Eres el INSIDER</span>
      <div class="rteam">secreto: nadie lo sabe</div>
      <div class="kwbox" data-a="ins-word">🔑 La palabra es «{game.word}»</div>
      <div class="rdesc">También la conoces. Orienta las preguntas hacia ella para que la adivinen a tiempo… sin cantarte, o te cazarán al final.</div>
    {:else}
      <span class="remoji">👥</span>
      <span class="rname">Eres del EQUIPO</span>
      <div class="rteam">no conoces la palabra</div>
      <div class="rdesc">Descúbrela haciendo preguntas de SÍ o NO al Maestro. Ojo: uno de los vuestros es el Insider y la conoce; estad atentos a quién empuja demasiado.</div>
    {/if}
    {#if mini}<p class="small-note" style="margin-top:8px">👆 Toca la carta para ocultarla ya; si no, se cierra sola en unos segundos.</p>{/if}
  </div>
{/if}

<style>
  /* Los tres papeles comparten borde: en turquesa/magenta/oliva se fichaba al
     Insider de un vistazo desde el otro lado de la mesa, sin leer nada. El papel
     se lee en el texto de la carta, que es para su dueño. */
  .rolecard.master,
  .rolecard.insider,
  .rolecard.common { border-color: #5a5b70; box-shadow: 0 0 0 1px #5a5b70 inset; }
  /* Se pulsa a media partida y con prisa: dedo entero, no un botoncito. */
  .peek { min-height: 44px; font-size: 0.92rem; font-weight: 500; padding: 10px 16px; }
</style>
