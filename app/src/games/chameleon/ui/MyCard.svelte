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
  <div style="text-align:center;margin:10px 0"><button class="small ghost" data-a="ch-togglecard" onclick={toggle}>👁 Ver mi carta</button></div>
{:else}
  <div class="rolecard {cham ? 'cham' : 'town'}" data-a="ch-togglecard" onclick={toggle} role="button" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
    {#if cham}
      <span class="remoji">🦎</span>
      <span class="rname">Eres el CAMALEÓN</span>
      <div class="rdesc">No conoces la palabra secreta. Escucha las pistas, imita el tono y suelta una palabra que encaje… sin cantarte.</div>
    {:else}
      <span class="remoji">🔑</span>
      <span class="rname">«{secretWord(game)}»</span>
      <div class="rteam">es la palabra secreta</div>
      <div class="rdesc">Da una pista que demuestre que la conoces… pero no tanto que el Camaleón la adivine.</div>
    {/if}
    {#if mini}<p class="small-note" style="margin-top:8px">Se oculta sola en unos segundos; toca la carta para ocultarla ya.</p>{/if}
  </div>
{/if}

<style>
  .rolecard.cham { border-color: #6a8a2b; box-shadow: 0 0 0 1px #6a8a2b inset; }
  .rolecard.town { border-color: #2b6a7a; box-shadow: 0 0 0 1px #2b6a7a inset; }
</style>
