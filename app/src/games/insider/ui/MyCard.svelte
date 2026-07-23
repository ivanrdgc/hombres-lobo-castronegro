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
  <div style="text-align:center;margin:10px 0"><button class="small ghost" data-a="ins-togglecard" onclick={toggle}>👁 Ver mi carta</button></div>
{:else}
  <div class="rolecard {role}" data-a="ins-togglecard" onclick={toggle} role="button" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
    {#if role === 'master'}
      <span class="remoji">🎓</span>
      <span class="rname">Eres el MAESTRO</span>
      <div class="rteam">tu papel es público</div>
      <div class="kwbox" data-a="ins-word">🔑 La palabra es «{game.word}»</div>
      <div class="rdesc">Responde a las preguntas de sí/no con la VERDAD: «sí», «no» o «no lo sé». No la nombres ni des pistas de más.</div>
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
      <div class="rdesc">Descúbrela haciendo preguntas de sí/no al Maestro. Ojo: uno de los vuestros es el Insider y la conoce; estad atentos a quién empuja demasiado.</div>
    {/if}
    {#if mini}<p class="small-note" style="margin-top:8px">Se oculta sola en unos segundos; toca la carta para ocultarla ya.</p>{/if}
  </div>
{/if}

<style>
  .rolecard.master { border-color: #2b6a7a; box-shadow: 0 0 0 1px #2b6a7a inset; }
  .rolecard.insider { border-color: #8a3b6a; box-shadow: 0 0 0 1px #8a3b6a inset; }
  .rolecard.common { border-color: #4a5a2b; box-shadow: 0 0 0 1px #4a5a2b inset; }
</style>
