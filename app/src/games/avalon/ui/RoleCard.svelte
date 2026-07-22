<script lang="ts">
  // Carta secreta de Ávalon: rol, bando y —lo que hace especial a la app— el
  // CONOCIMIENTO que ese rol tendría (compañeros del Mal, la visión de Merlín,
  // la pareja Merlín/Morgana de Percival…), calculado en oculto por la app. En
  // modo «mini» va plegada y se auto-oculta: los móviles quedan boca arriba.
  import { ROLES, knowledgeOf } from '../roles';
  import type { AvalonState } from '../types';

  const { game, pid, mini = false }: { game: AvalonState; pid: string; mini?: boolean } = $props();

  const role = $derived(game.roles[pid]);
  const def = $derived(ROLES[role]);
  const k = $derived(knowledgeOf(game.roles, game.playerIds, pid));
  const nm = (p: string) => game.names[p] || '¿?';
  const nameList = (pids: string[]) => pids.map(nm).join(', ');

  let open = $state(false);
  function toggle() { if (mini) open = !open; }
  $effect(() => {
    if (!open) return;
    const t = setTimeout(() => (open = false), 12000);
    return () => clearTimeout(t);
  });
</script>

{#if mini && !open}
  <div style="text-align:center;margin:10px 0"><button class="small ghost" data-a="av-togglecard" onclick={toggle}>👁 Mostrar mi carta</button></div>
{:else}
  <div class="rolecard {k.team}" data-a="av-togglecard" onclick={toggle} role="button" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
    <span class="remoji">{def.emoji}</span>
    <span class="rname">{def.name}</span>
    <div class="rteam">{k.team === 'evil' ? '🗡️ Bando del Mal' : '🏰 Bando del Bien'}</div>
    <div class="rdesc">{def.desc}</div>
    {#if k.knows.kind === 'evil-allies'}
      <div class="rextra">{k.knows.pids.length ? `😈 Tus compañeros del Mal: ${nameList(k.knows.pids)}. Reconoceos en silencio.` : '😈 No hay más malvados que se conozcan entre sí (los demás juegan a ciegas).'}</div>
    {:else if k.knows.kind === 'oberon'}
      <div class="rextra">👁️ Juegas en SOLITARIO: no conoces a los demás esbirros ni ellos a ti. Merlín, en cambio, sí te ve.</div>
    {:else if k.knows.kind === 'merlin'}
      <div class="rextra">🧙 Los esbirros del Mal: {k.knows.pids.length ? nameList(k.knows.pids) : '—'}. {game.enabledRoles.includes('mordred') ? 'Ojo: Mordred se te oculta, así que puede haber uno más.' : ''} No te delates.</div>
    {:else if k.knows.kind === 'percival'}
      <div class="rextra">{k.knows.ambiguous ? `🛡️ Merlín es UNO de estos dos: ${nameList(k.knows.pids)} (el otro es Morgana, la falsa). Averigua cuál.` : `🛡️ Merlín es: ${nameList(k.knows.pids)}.`}</div>
    {:else}
      <div class="rextra">🤔 No tienes información secreta: deduce por propuestas, votos y sabotajes.</div>
    {/if}
    {#if mini}<p class="small-note" style="margin-top:8px">Se ocultará sola en unos segundos; toca la carta para ocultarla ya.</p>{/if}
  </div>
{/if}

<style>
  .rolecard.evil { border-color: #7a2b2b; box-shadow: 0 0 0 1px #7a2b2b inset; }
  .rolecard.good { border-color: #2b527a; box-shadow: 0 0 0 1px #2b527a inset; }
</style>
