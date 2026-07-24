<script lang="ts">
  // Sesión legislativa (secreta): el Presidente ve 3 decretos y DESCARTA uno; el
  // Canciller ve los 2 restantes y PROMULGA uno (con veto si está desbloqueado).
  // Cada carta dice EN SU PROPIA TARJETA qué implica jugarla: cuántos van, qué
  // poder desbloquea el siguiente fascista, si activa el veto o si acaba la
  // partida. Y como es irreversible, se elige primero y se confirma después.
  // Solo el actor de turno ve las cartas; los demás ven un panel que explica
  // qué está pasando y qué será público.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { presidentId, POWER_LABEL } from '../engine';
  import { powerFor, LIBERAL_TRACK, FASCIST_TRACK, VETO_AT } from '../roles';
  import type { PolicyId } from '../roles';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';
  import RoleCard from './RoleCard.svelte';

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
    <div class="actionpanel"><h3>📜 Descarta un decreto</h3>
      <p class="hint">Has robado tres decretos del mazo y solo los ves tú. DESCARTA uno: los otros dos pasan al Canciller <b>{nm(chan)}</b>, que promulgará uno de ellos. Nadie sabrá nunca qué descartaste, así que lo que cuentes después es palabra tuya.</p>
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
      <details class="shref">
        <summary data-a="sh-leg-ref">📖 Qué hay en el mazo y qué es público</summary>
        <p class="small-note">El mazo son 17 decretos: <b>11 fascistas</b> 🐷 y solo <b>6 liberales</b> 🕊️. Que a un Presidente honesto le lleguen tres fascistas es lo más normal del mundo: por sí solo no prueba nada.</p>
        <p class="small-note">Quedan {game.draw.length} cartas en el mazo y {game.discard.length} en descartes (se rebaraja todo cuando quedan menos de 3). Van 🕊️ {game.liberalPolicies} · 🐷 {game.fascistPolicies}.</p>
        <p class="small-note">Público: solo el decreto que se promulgue. Secreto: tu descarte y las dos cartas que pasas.</p>
      </details>
    </div>
  {:else}
    <div class="card"><h3>📜 Legislan en secreto</h3>
      <p class="hint">El Presidente <b>{nm(pres)}</b> está mirando tres decretos en su móvil y descartará uno. Después, el Canciller <b>{nm(chan)}</b> promulgará uno de los dos que le lleguen.</p>
      <p class="small-note">Solo se hará público el decreto promulgado: ni el descarte del Presidente ni las cartas que pasa se verán jamás. Lo que digan luego es palabra suya.</p>
    </div>
  {/if}
{:else if game.phase === 'legislativeChancellor'}
  {#if my.id === chan && game.chancellorDraw}
    <div class="actionpanel"><h3>📜 Promulga un decreto</h3>
      <p class="hint">El Presidente <b>{nm(pres)}</b> te ha pasado dos decretos (nadie más los ve). PROMULGA uno —será público y sube al tablero— y el otro se descarta en secreto.</p>
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
          <p class="small-note" style="margin-top:0">✋ <b>Veto</b> (desbloqueado con {VETO_AT} decretos fascistas): puedes proponer descartar la agenda ENTERA sin promulgar nada. Si {nm(pres)} acepta, no sube nada al tablero y el gobierno cuenta como caído ({game.electionTracker + 1}/3 hacia el caos); si lo rechaza, quedas obligado a promulgar una de las dos.</p>
          <button class="ghost block" data-a="sh-veto" onclick={() => guard(A.requestVeto)}>✋ Proponer vetar la agenda entera</button>
        </div>
      {:else if game.vetoUnlocked && game.vetoRefused}
        <p class="small-note">✋ {nm(pres)} ha rechazado tu veto: estás obligado a promulgar una de las dos y ya no puedes volver a vetar en esta sesión.</p>
      {:else}
        <p class="small-note">✋ El veto (descartar la agenda entera) se desbloquea con {VETO_AT} decretos fascistas: van {game.fascistPolicies}.</p>
      {/if}
    </div>
  {:else}
    <div class="card"><h3>📜 Decide el Canciller</h3>
      <p class="hint">El Canciller <b>{nm(chan)}</b> tiene dos decretos de los tres que robó <b>{nm(pres)}</b> y va a promulgar uno.</p>
      <p class="small-note">Solo veréis el que promulgue: el descarte queda en secreto.{game.vetoUnlocked ? ' Con 5 decretos fascistas en la mesa, también puede proponer vetar la agenda entera.' : ''}</p>
    </div>
  {/if}
{:else if game.phase === 'vetoDecision'}
  {#if my.id === pres}
    <div class="actionpanel"><h3>✋ Decisión de veto</h3>
      <p class="hint">El Canciller <b>{nm(chan)}</b> propone descartar TODA la agenda: ni promulga ni sube nada al tablero. Decides tú, y no hay vuelta atrás.</p>
      <div class="outcomes">
        <p><b>✋ Si aceptas:</b> las dos cartas se descartan sin promulgar nada y este gobierno cuenta como caído (<b>{game.electionTracker + 1}/3</b> hacia el caos{game.electionTracker >= 2 ? ' — ¡con este se llega a 3 y se promulga un decreto a ciegas!' : ''}). La presidencia pasa al siguiente.</p>
        <p><b>📜 Si rechazas:</b> {nm(chan)} queda obligado a promulgar una de las dos cartas ahora mismo, y ya no podrá volver a vetar en esta sesión.</p>
      </div>
      <div class="btnrow">
        <button class="danger" data-a="sh-veto-yes" onclick={() => guard(() => A.decideVeto(true))}>✋ Aceptar: tirar la agenda</button>
        <button class="primary" data-a="sh-veto-no" onclick={() => guard(() => A.decideVeto(false))}>📜 Rechazar: que promulgue</button>
      </div>
    </div>
  {:else}
    <div class="card"><h3>✋ Se ha propuesto un veto</h3>
      <p class="hint">El Canciller <b>{nm(chan)}</b> quiere descartar la agenda entera. Decide el Presidente <b>{nm(pres)}</b> en su móvil.</p>
      <p class="small-note">Si acepta, no se promulga nada y el gobierno cuenta como caído ({game.electionTracker + 1}/3 hacia el caos). Si rechaza, el Canciller tendrá que promulgar igualmente.</p>
    </div>
  {/if}
{/if}
{#if inGame}<RoleCard {game} pid={my.id} mini={true} />{/if}

<style>
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
    margin: 6px 0 10px; padding: 10px 12px; border-radius: var(--r-2);
    border: 1px solid var(--border); background: var(--card2);
    font-size: 0.86rem; line-height: 1.4;
  }
  .outcomes p + p { margin-top: 6px; }
  .vetobox { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px; }
  .shref { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 8px; }
  .shref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); }
</style>
