<script lang="ts">
  // Sesión legislativa (secreta): el Presidente ve 3 decretos y DESCARTA uno; el
  // Canciller ve los 2 restantes y PROMULGA uno (con veto si está desbloqueado).
  //
  // Postura 🍽️ MESA con momento de mano (B28): los decretos NO se pintan solos
  // al cambiar de fase —el móvil sigue plano en la mesa y la voz acaba de decir
  // «Presidente, mira tu móvil»—. La pantalla de la fase es una tarjeta neutra
  // con un botón; las cartas viven dentro de la cortina de privacidad, que se
  // cierra sola y no deja rastro (al cerrarla se borra incluso lo que hubieras
  // marcado). Desde fuera, los demás móviles enseñan exactamente lo mismo
  // durante toda la sesión.
  //
  // Cada carta dice EN SU PROPIA TARJETA qué implica jugarla: cuántos van, qué
  // poder desbloquea el siguiente fascista, si activa el veto o si acaba la
  // partida. Y como es irreversible, se elige primero y se confirma después.
  import { untrack } from 'svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { presidentId, POWER_LABEL } from '../engine';
  import { powerFor, LIBERAL_TRACK, FASCIST_TRACK, VETO_AT } from '../roles';
  import type { PolicyId } from '../roles';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';
  import MyCard from './MyCard.svelte';
  import PrivacySheet from './PrivacySheet.svelte';

  const { game, my }: { game: SHState; my: PlayerDoc } = $props();
  const pres = $derived(presidentId(game));
  const chan = $derived(game.nominatedChancellor);
  const inGame = $derived(game.playerIds.includes(my.id));
  const nm = (pid: string | null) => (pid && game.names[pid]) || '¿?';
  const ICON = (p: string) => (p === 'liberal' ? '🕊️' : '🐷');
  const LABEL = (p: string) => (p === 'liberal' ? 'Liberal' : 'Fascista');
  const n = $derived(game.playerIds.length);

  // Elección en dos pasos: tocar la carta la marca; el segundo botón —que
  // nombra la consecuencia— es el que la juega. La marca se guarda CON su fase,
  // así que al pasar de descartar a promulgar no queda nada preseleccionado (y
  // un solo toque no puede promulgar por error).
  let picked = $state<{ phase: string; i: number } | null>(null);
  const pick = $derived(picked && picked.phase === game.phase ? picked.i : null);

  // La cortina la abre el dueño del móvil y se cierra al cambiar de fase: la
  // hoja del Presidente no puede seguir abierta —ni reabrirse sola— cuando le
  // toca al Canciller, que es otra persona. Se compara el VALOR de la fase: el
  // doc de la partida se rehace en cada snapshot y un `open = false` a secas
  // cerraría la hoja cada vez que llega cualquier cambio de la mesa.
  let open = $state(false);
  let lastPhase = untrack(() => game.phase);
  $effect(() => {
    const p = game.phase;
    if (p === lastPhase) return;
    lastPhase = p;
    open = false;
    picked = null;
  });
  function closeSheet() { open = false; picked = null; }

  const presDraw = $derived(game.presidentDraw || []);
  const chanDraw = $derived(game.chancellorDraw || []);
  /** Las dos que le quedarían al Canciller si el Presidente descarta la `i`. */
  const restIf = (i: number): PolicyId[] => presDraw.filter((_, j) => j !== i);
  function passOn(i: number): string {
    const rest = restIf(i);
    const txt = rest.map((p) => `${ICON(p)} ${LABEL(p)}`).join(' + ');
    const fas = rest.filter((p) => p === 'fascist').length;
    const cierre = fas === 2 ? ' — solo podrá promulgar FASCISTA'
      : fas === 0 ? ' — solo podrá promulgar LIBERAL'
      : ' — podrá elegir el color';
    return `Al Canciller ${nm(chan)} le pasarían ${txt}${cierre}.`;
  }
  /** Qué implicaría promulgar ese decreto (marcador, poder, veto, victoria). */
  function enactMeans(p: PolicyId): string {
    if (p === 'liberal') {
      const i = game.liberalPolicies + 1;
      if (i >= LIBERAL_TRACK) return `Sería el ${i}.º liberal: 🏁 ¡GANAN los liberales y se acaba la partida!`;
      return `Sería el ${i}.º liberal de ${LIBERAL_TRACK}. No da ningún poder. Faltarían ${LIBERAL_TRACK - i} para que gane la República.`;
    }
    const i = game.fascistPolicies + 1;
    if (i >= FASCIST_TRACK) return `Sería el ${i}.º fascista: 🏁 ¡GANAN los fascistas y se acaba la partida!`;
    const pw = powerFor(n, i);
    const veto = i === VETO_AT ? ' y desbloquea el ✋ veto' : '';
    return `Sería el ${i}.º fascista de ${FASCIST_TRACK}. ${pw ? `Da al Presidente ${nm(pres)} el poder de ${POWER_LABEL[pw]}` : 'No da ningún poder'}${veto}. Faltarían ${FASCIST_TRACK - i} para la victoria fascista.`;
  }
</script>

{#if game.phase === 'legislativePresident'}
  {#if my.id === pres && game.presidentDraw}
    <div class="actionpanel"><h3>📜 Te toca legislar</h3>
      <p class="hint">Has robado tres decretos y solo los ves tú: descarta uno y los otros dos pasan al Canciller <b>{nm(chan)}</b>. Coge el móvil y ábrelos con la pantalla hacia ti.</p>
      <button class="primary block" data-a="sh-open-cards" onclick={() => (open = true)}>👁 Ver mis tres decretos y descartar uno</button>
      <p class="why">Nadie sabrá nunca qué descartaste: lo que cuentes después es palabra tuya. Hasta que lo abras, en tu pantalla no hay ninguna carta.</p>
    </div>
    <details class="shref">
      <summary data-a="sh-leg-ref">📖 Qué hay en el mazo y qué es público</summary>
      <p class="small-note">El mazo son 17 decretos: <b>11 fascistas</b> 🐷 y solo <b>6 liberales</b> 🕊️. Que a un Presidente honesto le lleguen tres fascistas es lo más normal del mundo: por sí solo no prueba nada.</p>
      <p class="small-note">Quedan {game.draw.length} cartas en el mazo y {game.discard.length} en descartes (se rebaraja todo cuando quedan menos de 3).</p>
      <p class="small-note">Público: solo el decreto que se promulgue. Secreto para siempre: tu descarte y las dos cartas que pasas.</p>
    </details>
  {:else}
    <div class="card"><h3>📜 Legislan en secreto</h3>
      <p class="hint">El Presidente <b>{nm(pres)}</b> mira tres decretos en su móvil y descartará uno. Después, el Canciller <b>{nm(chan)}</b> promulgará uno de los dos que le lleguen.</p>
      <p class="small-note">Solo se hará público el decreto promulgado: ni el descarte ni las cartas que pasa se verán jamás. Lo que digan luego es palabra suya.</p>
    </div>
  {/if}
{:else if game.phase === 'legislativeChancellor'}
  {#if my.id === chan && game.chancellorDraw}
    <div class="actionpanel"><h3>📜 Te toca promulgar</h3>
      <p class="hint">El Presidente <b>{nm(pres)}</b> te ha pasado dos decretos que solo ves tú: promulga uno —será público y sube al tablero— y el otro se descarta en secreto.</p>
      <button class="primary block" data-a="sh-open-cards" onclick={() => (open = true)}>👁 Ver mis dos decretos y promulgar uno</button>
      <p class="why">{game.vetoUnlocked && !game.vetoRefused ? 'Ahí dentro también puedes proponer el ✋ veto: descartar la agenda entera.' : 'Nadie verá el que descartes: lo que cuentes después es palabra tuya.'}</p>
    </div>
  {:else}
    <div class="card"><h3>📜 Decide el Canciller</h3>
      <p class="hint">El Canciller <b>{nm(chan)}</b> tiene dos de los tres decretos que robó <b>{nm(pres)}</b> y va a promulgar uno.</p>
      <p class="small-note">Solo veréis el que promulgue: el descarte queda en secreto.{game.vetoUnlocked ? ' Con 5 decretos fascistas también puede proponer vetar la agenda entera.' : ''}</p>
    </div>
  {/if}
{:else if game.phase === 'vetoDecision'}
  {#if my.id === pres}
    <div class="actionpanel"><h3>✋ Decide sobre el veto</h3>
      <p class="hint">El Canciller <b>{nm(chan)}</b> propone tirar TODA la agenda: ni promulga ni sube nada al tablero. Decides tú, y no hay vuelta atrás.</p>
      <div class="btnrow">
        <button class="danger" data-a="sh-veto-yes" onclick={() => guard(() => A.decideVeto(true))}>✋ Aceptar: tirar la agenda</button>
        <button class="primary" data-a="sh-veto-no" onclick={() => guard(() => A.decideVeto(false))}>📜 Rechazar: que promulgue</button>
      </div>
      <div class="outcomes">
        <p><b>✋ Si aceptas:</b> no se promulga nada y este gobierno cuenta como caído (<b>{game.electionTracker + 1}/3</b> hacia el caos{game.electionTracker >= 2 ? ' — ¡con este se llega a 3 y se promulga un decreto a ciegas!' : ''}). Presidirá el siguiente.</p>
        <p><b>📜 Si rechazas:</b> {nm(chan)} queda obligado a promulgar una de las dos ahora mismo, y ya no podrá volver a vetar.</p>
      </div>
    </div>
  {:else}
    <div class="card"><h3>✋ Se ha propuesto un veto</h3>
      <p class="hint">El Canciller <b>{nm(chan)}</b> quiere tirar la agenda entera. Decide el Presidente <b>{nm(pres)}</b> en su móvil.</p>
      <p class="small-note">Si acepta, no se promulga nada y el gobierno cuenta como caído ({game.electionTracker + 1}/3 hacia el caos). Si rechaza, el Canciller tendrá que promulgar igualmente.</p>
    </div>
  {/if}
{/if}

<!-- La cortina: aquí y solo aquí se ven las cartas (30 s, y cada toque reinicia
     la cuenta: leer tres tarjetas con sus consecuencias lleva su tiempo). -->
{#if open && game.phase === 'legislativePresident' && my.id === pres && presDraw.length}
  <PrivacySheet title="📜 Tus tres decretos" hold={30000} onclose={closeSheet}>
    <p class="lead">Descarta uno. Los otros dos pasan al Canciller <b>{nm(chan)}</b>.</p>
    <div class="pols">
      {#each presDraw as pol, i (i)}
        <button class="pol {pol} {pick === i ? 'sel' : ''}" data-a="sh-pres-discard" data-p={String(i)} onclick={() => (picked = { phase: game.phase, i })}>
          <span class="phead"><span class="picon">{ICON(pol)}</span><span class="pname">Decreto {LABEL(pol)}</span>{#if pick === i}<span class="ptag">✔️ elegido</span>{/if}</span>
          <span class="pwhat">🗑️ Si descartas este: {passOn(i)}</span>
        </button>
      {/each}
    </div>
    {#if pick !== null}
      <button class="ghost block small" style="margin:8px 0" data-a="sh-pres-back" onclick={() => (picked = null)}>↩️ Cambiar de decreto</button>
      <button class="primary block" data-a="sh-pres-discard-go" onclick={() => (pick !== null ? guard(() => A.presidentDiscard(pick!)) : undefined)}>
        🗑️ Descartar el decreto {LABEL(presDraw[pick])} y pasar los otros dos
      </button>
    {:else}
      <p class="small-note">Toca el decreto que quieras descartar; después lo confirmas.</p>
    {/if}
  </PrivacySheet>
{/if}

{#if open && game.phase === 'legislativeChancellor' && my.id === chan && chanDraw.length}
  <PrivacySheet title="📜 Tus dos decretos" hold={30000} onclose={closeSheet}>
    <p class="lead">Promulga uno: será público y sube al tablero. El otro se descarta en secreto.</p>
    {#if chanDraw.length === 2 && chanDraw[0] === chanDraw[1]}
      <p class="small-note" style="margin-top:0">⚠️ Los dos son del mismo color: promulgues el que promulgues sale un decreto {LABEL(chanDraw[0]).toUpperCase()}. Puedes decirlo en voz alta… pero nadie podrá comprobarlo.</p>
    {/if}
    <div class="pols">
      {#each chanDraw as pol, i (i)}
        <button class="pol {pol} {pick === i ? 'sel' : ''}" data-a="sh-chan-enact" data-p={String(i)} onclick={() => (picked = { phase: game.phase, i })}>
          <span class="phead"><span class="picon">{ICON(pol)}</span><span class="pname">Decreto {LABEL(pol)}</span>{#if pick === i}<span class="ptag">✔️ elegido</span>{/if}</span>
          <span class="pwhat">📜 {enactMeans(pol)}</span>
        </button>
      {/each}
    </div>
    {#if pick !== null}
      <button class="ghost block small" style="margin:8px 0" data-a="sh-chan-back" onclick={() => (picked = null)}>↩️ Cambiar de decreto</button>
      <button class="primary block" data-a="sh-chan-enact-go" onclick={() => (pick !== null ? guard(() => A.chancellorEnact(pick!)) : undefined)}>
        📜 Promulgar el decreto {LABEL(chanDraw[pick])}{chanDraw[pick] === 'liberal' ? ` (${game.liberalPolicies + 1}.º 🕊️)` : ` (${game.fascistPolicies + 1}.º 🐷)`}
      </button>
    {:else}
      <p class="small-note">Toca el decreto que quieras promulgar; después lo confirmas.</p>
    {/if}
    {#if game.vetoUnlocked && !game.vetoRefused}
      <div class="vetobox">
        <p class="small-note" style="margin-top:0">✋ <b>Veto</b> (desbloqueado con {VETO_AT} decretos fascistas): propón tirar la agenda ENTERA sin promulgar nada. Si {nm(pres)} acepta, no sube nada al tablero y el gobierno cuenta como caído ({game.electionTracker + 1}/3 hacia el caos); si lo rechaza, quedas obligado a promulgar una de las dos.</p>
        <button class="ghost block" data-a="sh-veto" onclick={() => guard(A.requestVeto)}>✋ Proponer tirar la agenda entera</button>
      </div>
    {:else if game.vetoUnlocked && game.vetoRefused}
      <p class="small-note">✋ {nm(pres)} ha rechazado tu veto: estás obligado a promulgar una de las dos.</p>
    {/if}
  </PrivacySheet>
{/if}

{#if inGame}<MyCard {game} pid={my.id} />{/if}

<style>
  .lead { margin: 6px 0 10px; font-size: 0.92rem; color: var(--muted); line-height: 1.4; }
  .why { margin-top: 8px; font-size: 0.8rem; color: var(--muted); line-height: 1.35; }
  /* Cartas en columna: en un móvil, tres tarjetas en fila no dejan sitio para
     decir qué hace cada una, que es justo lo que hacía falta. */
  .pols { display: flex; flex-direction: column; gap: 8px; margin: 6px 0; }
  .pol {
    display: block; width: 100%; text-align: left; padding: 11px 12px; cursor: pointer;
    border-radius: var(--r-2); border: 2px solid var(--border, #333); background: var(--card2);
    color: var(--text);
  }
  .phead { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .pol .picon { font-size: 1.7rem; }
  .pol .pname { font-weight: 700; font-size: 1rem; color: var(--moon); }
  .pol .ptag { font-size: 0.8rem; color: var(--accent); }
  .pol .pwhat { display: block; margin-top: 6px; font-size: 0.84rem; font-weight: 400; line-height: 1.4; color: var(--muted); white-space: normal; }
  .pol.liberal { border-color: #3a86b0; background: #12293a; }
  .pol.fascist { border-color: #b0603a; background: #2f1a12; }
  .pol.sel { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent); }
  .outcomes {
    margin: 10px 0 0; padding: 10px 12px; border-radius: var(--r-2);
    border: 1px solid var(--border); background: var(--card2);
    font-size: 0.86rem; line-height: 1.4;
  }
  .outcomes p + p { margin-top: 6px; }
  .vetobox { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px; }
  .shref { margin: 0 0 12px; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--r-2); background: var(--card2); }
  .shref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); }
</style>
