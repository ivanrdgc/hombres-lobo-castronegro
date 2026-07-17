<script lang="ts">
  // Carta de identidad de El Espía (agente con lugar+papel, o espía). El modo
  // «mini» va plegado por defecto y se auto-oculta: los móviles quedan boca
  // arriba sobre la mesa. Fuera del reloj se puede escuchar en local.
  import { locationById } from '../locations';
  import type { EspiaState } from '../types';

  const { game, pid, mini = false }: { game: EspiaState; pid: string; mini?: boolean } = $props();

  const spy = $derived(pid === game.spyId);
  const loc = $derived(locationById(game.locationId));
  let open = $state(false);

  function toggle() {
    if (!mini) return;
    open = !open;
  }

  // La carta mini se oculta sola a los pocos segundos.
  $effect(() => {
    if (!open) return;
    const t = setTimeout(() => (open = false), 12000);
    return () => clearTimeout(t);
  });
</script>

{#if mini && !open}
  <div style="text-align:center;margin:10px 0"><button class="small ghost" data-a="espia-togglecard" onclick={toggle}>👁 Mostrar mi identidad</button></div>
{:else}
  <div class="rolecard" data-a="espia-togglecard" onclick={toggle} role="button" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
    {#if spy}
      <span class="remoji">🕵️</span>
      <span class="rname">Eres el ESPÍA</span>
      <div class="rdesc">No sabes dónde estáis. Escucha, deduce y responde con vaguedades convincentes.</div>
      <div class="rextra">🎭 Cuando creas saber el lugar, puedes revelarte y adivinarlo (termina la ronda, aciertes o no).</div>
      <div class="rextra">📍 La lista de localizaciones de abajo es tu mapa del tesoro.</div>
    {:else}
      <span class="remoji">{loc?.emoji || '📍'}</span>
      <span class="rname">{loc?.name || game.locationId}</span>
      <div class="rteam">🎭 Tu papel: {game.roles[pid] || 'agente'}</div>
      <div class="rdesc">Responde como quien conoce el lugar… sin nombrarlo jamás. Ni demasiado exacto (se lo regalas al espía) ni demasiado vago (te confundirán con él).</div>
    {/if}
    {#if mini}<p class="small-note" style="margin-top:8px">Se ocultará sola en unos segundos; toca la carta para ocultarla ya.</p>{/if}
  </div>
{/if}
