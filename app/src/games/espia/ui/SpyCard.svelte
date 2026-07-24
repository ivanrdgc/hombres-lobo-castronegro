<script lang="ts">
  // Carta de identidad de El Espía: el LUGAR y TU PAPEL de un vistazo (o la
  // carta de espía, con lo que gana y lo que arriesga cada jugada). El modo
  // «mini» va plegado por defecto y se auto-oculta —los móviles quedan boca
  // arriba sobre la mesa—, así que ahí solo aparece lo imprescindible; la
  // versión larga vive en el reparto y en el 🎴.
  import { locationById } from '../locations';
  import type { EspiaState } from '../types';

  const { game, pid, mini = false }: { game: EspiaState; pid: string; mini?: boolean } = $props();

  const spy = $derived(pid === game.spyId);
  const loc = $derived(locationById(game.locationId));
  const agentes = $derived(Math.max(1, game.playerIds.length - 1));
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
  <div style="text-align:center;margin:10px 0">
    <button class="small ghost" data-a="espia-togglecard" onclick={toggle}>👁 Ver mi carta (lugar y papel)</button>
  </div>
{:else}
  <div class="rolecard" data-a="espia-togglecard" onclick={toggle} role="button" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
    {#if spy}
      <span class="remoji">🕵️</span>
      <span class="rname">Eres el ESPÍA</span>
      <div class="rteam">Nadie más lo sabe… todavía</div>
      <div class="rdesc">No sabes dónde estáis: escucha, deduce y responde con vaguedades convincentes. Ni preguntes «¿dónde?» ni concretes de más.</div>
      {#if !mini}
        <div class="rextra">🎭 <b>Revelarte y adivinar</b>, cuando quieras (con el reloj en marcha o ya en la tanda de acusaciones; nunca durante una votación): si <b>aciertas</b> el lugar, +4 y ganas la ronda; si <b>fallas</b>, la ronda termina ahí y cada agente se lleva +1.</div>
        <div class="rextra">🏅 Sin jugártela: <b>+2</b> si se agota el tiempo sin que te condenen · <b>+4</b> si la mesa condena a un inocente.</div>
        <div class="rextra">📍 Las 30 localizaciones son tu mapa: ve tachando (solo en tu móvil) las que cada respuesta descarte.</div>
      {/if}
    {:else}
      <span class="remoji">{loc?.emoji || '📍'}</span>
      <span class="rname">{loc?.name || game.locationId}</span>
      <div class="rteam">📍 Aquí estáis todos… menos el espía</div>
      <div class="kwbox">
        <span class="kwlabel">Tu papel aquí</span>
        <span class="kw">{game.roles[pid] || 'agente'}</span>
        <span class="kwhint">Responde como quien conoce el lugar… sin nombrarlo jamás.</span>
      </div>
      {#if !mini}
        <div class="rdesc">Ni demasiado exacto (le regalas el lugar al espía) ni demasiado vago (te confundirán con él).</div>
        <div class="rextra">🎯 Sois {agentes} agentes y un espía. Tu objetivo: cazarlo. Tienes <b>UNA</b> acusación en toda la ronda —se gasta aunque la mesa vote que no— y hace falta unanimidad para revelar una carta.</div>
        <div class="rextra">⚠️ Si condenáis a un inocente, la ronda termina igual y el espía se lleva +4.</div>
      {/if}
    {/if}
    {#if mini}<p class="small-note" style="margin-top:8px">Se ocultará sola en unos segundos; toca la carta para ocultarla ya. El 🎴 de la esquina te la devuelve cuando quieras.</p>{/if}
  </div>
{/if}
