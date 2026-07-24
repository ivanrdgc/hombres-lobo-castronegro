<script lang="ts">
  // Carta de El Espía: el LUGAR y TU PAPEL (o la carta de espía). Se dibuja con
  // el MISMO esqueleto en los dos casos —emoji grande, titular, línea de bando,
  // recuadro clave y, en la versión larga, un `rdesc` y un `rextra` de largo
  // parecido— porque en un juego de mesa (B28) la FORMA se lee de reojo aunque
  // no se lea el texto: si la carta del espía fuera más corta o más alta que la
  // de un agente, quedaría cazado sin jugar.
  // Nunca se muestra sola: vive dentro de MyCard (la pastilla 🎴, única puerta)
  // y del reparto, que la abren a petición y la tapan solos.
  // Los PUNTOS no están aquí: se cuentan una sola vez, en «📖 Las reglas».
  import { locationById } from '../locations';
  import type { EspiaState } from '../types';

  const { game, pid, full = false }: { game: EspiaState; pid: string; full?: boolean } = $props();

  const spy = $derived(pid === game.spyId);
  const loc = $derived(locationById(game.locationId));
  const total = $derived(game.playerIds.length);
  const agentes = $derived(Math.max(1, total - 1));
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
      <div class="rextra">Sois {total} en la mesa: {agentes} conocen el lugar y tú no. Aguanta escondido, <b>revélate y adivina</b> cuando lo tengas… o <b>acusa</b> como cualquiera: una vez por ronda y hace falta unanimidad.</div>
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
      <div class="rextra">Sois {total} en la mesa: {agentes} conocéis el lugar y uno no. Cázalo antes de que lo adivine y <b>acusa</b> con cabeza: una vez por ronda, hace falta unanimidad y <b>condenar a un inocente</b> también acaba la ronda.</div>
    {/if}
  {/if}
</div>
