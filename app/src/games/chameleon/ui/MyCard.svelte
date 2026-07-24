<script lang="ts">
  // Carta PRIVADA: te recuerda si eres el Camaleón o cuál es la palabra secreta.
  // Mini + auto-oculta, para consultarla con disimulo durante la ronda.
  import { isChameleon, secretWord } from '../engine';
  import type { ChameleonState } from '../types';

  const { game, pid, mini = false }: { game: ChameleonState; pid: string; mini?: boolean } = $props();
  const cham = $derived(isChameleon(game, pid));
  let open = $state(false);
  function toggle() { if (mini) open = !open; }
  $effect(() => { if (!open) return; const t = setTimeout(() => (open = false), 12000); return () => clearTimeout(t); });
</script>

{#if mini && !open}
  <div style="text-align:center;margin:10px 0"><button class="small ghost" data-a="ch-togglecard" onclick={toggle}>👁 Ver mi carta en secreto</button></div>
{:else}
  <div class="rolecard {cham ? 'cham' : 'town'}" data-a="ch-togglecard" onclick={toggle} role="button" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
    {#if cham}
      <span class="remoji">🦎</span>
      <div class="rteam" style="margin:0 0 2px">Tu papel en esta ronda</div>
      <span class="rname">Eres el CAMALEÓN</span>
      <div class="rdesc" style="margin-top:6px">No conoces la palabra secreta. Escucha las pistas, imita el tono y suelta una palabra que encaje… sin cantarte. Si te pillan, aún puedes ganar adivinándola.</div>
    {:else}
      <!-- La etiqueta ANTES de la palabra: leída del revés, «Sombrilla» sola en
           grande no decía si era tu palabra o la del vecino. -->
      <span class="remoji">🔑</span>
      <div class="rteam" style="margin:0 0 2px">Tu palabra secreta es</div>
      <span class="rname">«{secretWord(game)}»</span>
      <div class="rdesc" style="margin-top:6px">Búscala en la rejilla. Da una pista que demuestre que la conoces… pero no tanto que el Camaleón la adivine.</div>
    {/if}
    {#if mini}<p class="small-note" style="margin-top:8px">🙈 Que nadie te vea la pantalla: se oculta sola en unos segundos, o toca la carta para ocultarla ya.</p>{/if}
  </div>
{/if}

<style>
  .rolecard.cham { border-color: #6a8a2b; box-shadow: 0 0 0 1px #6a8a2b inset; }
  .rolecard.town { border-color: #2b6a7a; box-shadow: 0 0 0 1px #2b6a7a inset; }
</style>
