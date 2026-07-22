<script lang="ts">
  // Carta secreta: bando y el CONOCIMIENTO que la app calcula en oculto (los
  // fascistas y Hitler; el Hitler ciego con 7+). Mini + auto-oculta.
  import { ROLE_LABEL, knowledgeOf } from '../roles';
  import type { SHState } from '../types';

  const { game, pid, mini = false }: { game: SHState; pid: string; mini?: boolean } = $props();

  const k = $derived(knowledgeOf(game.roles, game.playerIds, pid));
  const nm = (p: string) => game.names[p] || '¿?';

  let open = $state(false);
  function toggle() { if (mini) open = !open; }
  $effect(() => { if (!open) return; const t = setTimeout(() => (open = false), 12000); return () => clearTimeout(t); });
</script>

{#if mini && !open}
  <div style="text-align:center;margin:10px 0"><button class="small ghost" data-a="sh-togglecard" onclick={toggle}>👁 Mostrar mi carta</button></div>
{:else}
  <div class="rolecard {k.faction}" data-a="sh-togglecard" onclick={toggle} role="button" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
    <span class="remoji">{k.role === 'hitler' ? '💀' : k.role === 'fascist' ? '🐷' : '🕊️'}</span>
    <span class="rname">{ROLE_LABEL[k.role]}</span>
    <div class="rteam">{k.faction === 'fascist' ? 'Bando fascista' : 'Bando liberal'}</div>
    {#if k.knows.kind === 'fascist-team'}
      <div class="rextra">🐷 Compañeros fascistas: {k.knows.fascists.length ? k.knows.fascists.map(nm).join(', ') : '(ninguno más)'}.</div>
      <div class="rextra">💀 Hitler es: <b>{nm(k.knows.hitler)}</b>. Protegedlo sin cantarlo.</div>
    {:else if k.knows.kind === 'hitler-knows'}
      <div class="rextra">💀 Eres Hitler. Tu fascista de confianza: <b>{k.knows.fascists.map(nm).join(', ')}</b>. Hazte pasar por liberal.</div>
    {:else if k.knows.kind === 'hitler-blind'}
      <div class="rextra">💀 Eres Hitler. Con 7+ jugadores NO sabes quiénes son tus fascistas: juega como el liberal más ejemplar y sobrevive.</div>
    {:else}
      <div class="rextra">🕊️ Eres liberal. No sabes nada de nadie: deduce por los votos y los decretos. Cuidado con quién llega a Canciller.</div>
    {/if}
    {#if mini}<p class="small-note" style="margin-top:8px">Se ocultará sola en unos segundos; toca la carta para ocultarla ya.</p>{/if}
  </div>
{/if}

<style>
  .rolecard.fascist { border-color: #7a3b2b; box-shadow: 0 0 0 1px #7a3b2b inset; }
  .rolecard.liberal { border-color: #2b6a7a; box-shadow: 0 0 0 1px #2b6a7a inset; }
</style>
