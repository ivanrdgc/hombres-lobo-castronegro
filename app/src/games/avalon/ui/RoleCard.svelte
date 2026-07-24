<script lang="ts">
  // Carta secreta de Ávalon: rol, bando y —lo que hace especial a la app— el
  // CONOCIMIENTO que ese rol tendría (compañeros del Mal, la visión de Merlín,
  // la pareja Merlín/Morgana de Percival…), calculado en oculto por la app.
  //
  // POSTURA DE MESA (B28): en Ávalon el móvil vive PLANO sobre la mesa y el
  // vecino puede echarle un vistazo. Por eso la carta:
  //  1. nunca se pinta sola — siempre tras un gesto (👁 aquí, 🎴 en el modal);
  //  2. se auto-oculta a los 12 s (y al cambiar de fase: el componente se
  //     vuelve a montar cerrado);
  //  3. abierta, ocupa LO MISMO y lleva EL MISMO color para los dos bandos: ni
  //     el borde rojo/azul de antes ni un panel más largo (el de quien conoce a
  //     los malvados) pueden delatar desde el otro lado de la mesa;
  //  4. cerrada, el botón es idéntico en todos los móviles: tocarlo no dice
  //     nada de ti.
  import { ROLES, knowledgeOf } from '../roles';
  import type { AvalonState } from '../types';

  const { game, pid, startOpen = false }: { game: AvalonState; pid: string; startOpen?: boolean } = $props();

  const role = $derived(game.roles[pid]);
  const def = $derived(ROLES[role]);
  const k = $derived(knowledgeOf(game.roles, game.playerIds, pid));
  const nm = (p: string) => game.names[p] || '¿?';
  const nameList = (pids: string[]) => pids.map(nm).join(', ');

  // `startOpen` solo cuando el gesto ya lo hizo el jugador (pulsar «👁 Ver mi
  // carta» en el reparto, abrir el 🎴): ni así se queda abierta para siempre.
  let openState: boolean | null = $state(null); // null = lo que diga startOpen
  const open = $derived(openState === null ? startOpen : openState);
  function toggle() { openState = !open; }
  $effect(() => {
    if (!open) return;
    const t = setTimeout(() => (openState = false), 12000);
    return () => clearTimeout(t);
  });
</script>

{#if !open}
  <div class="peek">
    <button class="ghost block" data-a="av-togglecard" onclick={toggle}>👁 Ver mi carta (solo tú)</button>
  </div>
{:else}
  <div class="rolecard avcard" data-a="av-togglecard" onclick={toggle} role="button" tabindex="0"
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
      <div class="rextra">🧙 Los esbirros del Mal: {k.knows.pids.length ? nameList(k.knows.pids) : '—'}. {Object.values(game.roles).includes('mordred') ? 'Ojo: Mordred se te oculta, así que puede haber uno más.' : ''} No te delates.</div>
    {:else if k.knows.kind === 'percival'}
      <div class="rextra">{k.knows.ambiguous ? `🛡️ Merlín es UNO de estos dos: ${nameList(k.knows.pids)} (el otro es Morgana, la falsa). Averigua cuál.` : `🛡️ Merlín es: ${nameList(k.knows.pids)}.`}</div>
    {:else}
      <div class="rextra">🤔 No tienes información secreta: deduce por propuestas, votos y sabotajes.</div>
    {/if}
    <p class="small-note rhide">🙈 Se oculta sola en unos segundos · toca la carta para ocultarla ya</p>
  </div>
{/if}

<style>
  .peek { margin: 12px 0 0; }
  /* Sin borde por bando (antes rojo el Mal y azul el Bien): un color se lee de
     reojo desde el otro lado de la mesa sin ni siquiera enfocar el texto. */
  /* Alto FIJO (el del texto más largo de la baraja): así todas las cartas miden
     lo mismo aunque el rol cuente más o menos cosas. */
  .avcard { display: flex; flex-direction: column; min-height: 420px; }
  /* Alturas reservadas para el texto MÁS largo de cada bloque: así la carta de
     Merlín (que lista malvados) y la del leal (que no sabe nada) miden
     exactamente lo mismo — el «panel más largo» era un chivato de forma. */
  .avcard .remoji { font-size: 2.4rem; }
  .avcard .rdesc { min-height: 7em; }
  .avcard .rextra { min-height: 4.2em; display: flex; align-items: center; justify-content: center; }
  .avcard .rhide { margin: auto 0 0; padding-top: 10px; opacity: 0.75; }
</style>
