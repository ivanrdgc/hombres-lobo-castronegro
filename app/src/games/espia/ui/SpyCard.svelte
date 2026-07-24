<script lang="ts">
  // Carta de identidad de El Espía: el LUGAR y TU PAPEL (o la carta de espía).
  // Se dibuja con el MISMO esqueleto en los dos casos —emoji grande, titular,
  // línea de bando, recuadro clave y, en la versión larga, un `rdesc` y dos
  // `rextra`— porque en un juego de mesa (B28) la FORMA se lee de reojo aunque
  // no se lea el texto: si la carta del espía fuera más corta o más alta que la
  // de un agente, quedaría cazado sin jugar.
  // Nunca se muestra sola: vive dentro de PrivatePanel (👁 / 🎴) y del reparto,
  // que la abren a petición y la ocultan solos.
  import { locationById } from '../locations';
  import type { EspiaState } from '../types';

  const { game, pid, full = false }: { game: EspiaState; pid: string; full?: boolean } = $props();

  const spy = $derived(pid === game.spyId);
  const loc = $derived(locationById(game.locationId));
  const agentes = $derived(Math.max(1, game.playerIds.length - 1));
</script>

<div class="rolecard" data-a="espia-card">
  {#if spy}
    <span class="remoji">🕵️</span>
    <span class="rname">Eres el ESPÍA</span>
    <div class="rteam">Nadie más lo sabe… todavía</div>
    <div class="kwbox">
      <span class="kwlabel">El lugar de esta ronda</span>
      <span class="kw">No lo sabes</span>
      <span class="kwhint">Escucha, deduce y responde como quien ha estado ahí mil veces.</span>
    </div>
    {#if full}
      <div class="rdesc">Ni preguntes «¿dónde?» ni concretes de más: una respuesta demasiado exacta te delata igual que una demasiado vaga.</div>
      <div class="rextra">🎭 <b>Revelarte y adivinar</b>, cuando quieras (con el reloj en marcha o ya en la tanda de acusaciones; nunca durante una votación): si <b>aciertas</b> el lugar, +4 y ganas la ronda; si <b>fallas</b>, la ronda termina ahí y cada agente se lleva +1.</div>
      <div class="rextra">🏅 Sin jugártela: <b>+2</b> si se agota el tiempo sin que te condenen · <b>+4</b> si la mesa condena a un inocente.</div>
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
    {#if full}
      <div class="rdesc">Ni demasiado exacto (le regalas el lugar al espía) ni demasiado vago (te confundirán con él).</div>
      <div class="rextra">🎯 Sois {agentes} agentes y un espía. Tu objetivo: cazarlo. Tienes <b>UNA</b> acusación en toda la ronda —se gasta aunque la mesa vote que no— y hace falta unanimidad para revelar una carta.</div>
      <div class="rextra">⚠️ Si condenáis a un inocente, la ronda termina igual y el espía se lleva +4.</div>
    {/if}
  {/if}
</div>
