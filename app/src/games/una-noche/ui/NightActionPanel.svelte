<script lang="ts">
  // Panel de acción nocturna del actor del paso en curso (B25). Cada rol EXPLICA
  // su acción DONDE se decide —«qué verás · qué cambias · ¿obligatorio?»—, se
  // elige primero QUÉ se hace y solo después A QUIÉN (con ↩️ para volver), y se
  // confirma con un botón que nombra la consecuencia. Al fondo, plegada, la
  // referencia del mazo: nadie debe salir de la pantalla en la que decide.
  // Lo que se ve NUNCA se promete como definitivo: la noche sigue después.
  //
  // Postura 🍽️ MESA (B28): este panel NO se pinta en la pantalla de la fase —eso
  // delataba de reojo quién estaba actuando—, sino dentro de la cortina de
  // privacidad que abre el dueño del móvil (NightPhase → PrivacySheet). Por eso
  // aquí no hay ni un color de bando: todos los botones son iguales, para que ni
  // un vistazo lateral distinga «rojo = lobo» de «morado = esbirro».
  import { guard } from '../../../core/sync/guard';
  import { selIds, sel1, clearSel } from '../../../shell/selection';
  import { app, state as selState } from '../../../core/sync/store.svelte';
  import * as A from '../actions';
  import { DOBLE_JOIN_ROLES, ROLES } from '../roles';
  import { packmates, nightIs } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState, RoleId, StepId } from '../types';
  import UnaGrid from './UnaGrid.svelte';

  const { game, my, step, players }: {
    game: GameState; my: PlayerDoc; step: StepId; players: { id: string; name?: string }[];
  } = $props();

  const meId = my.id;
  const acts = $derived(game.acts);
  const others = $derived(players.filter((p) => p.id !== meId));
  const rn = (r: RoleId) => `${ROLES[r].emoji} ${ROLES[r].name}`;
  const nm = (pid: string) => game.names[pid] || '¿?';
  const wolves = $derived(players.filter((p) => nightIs(game, p.id, 'lobo')));
  const wolfMates = $derived(packmates(game, players, 'lobo', meId));
  const masonMates = $derived(packmates(game, players, 'mason', meId));

  // Qué roles hay en el mazo (público): sirve para avisar de si lo que ves
  // todavía puede moverse de sitio esta misma noche.
  const has = (r: RoleId) => (game.composition?.[r] || 0) > 0;
  const swapsLater = $derived(has('ladron') || has('alborotadora') || has('borracho'));
  const afterRobber = $derived(has('alborotadora') || has('borracho'));

  // Referencia del mazo, en el ORDEN en que la voz llama a cada rol.
  const TEAM_LABEL: Record<string, string> = { pueblo: '🏡 Pueblo', lobos: '🐺 Lobos', tanner: '🪢 En solitario' };
  const deckRows = $derived(
    (Object.entries(game.composition || {}) as [RoleId, number][])
      .filter(([id, n]) => n > 0 && !!ROLES[id])
      .sort((a, b) => (ROLES[a[0]].wake ?? 99) - (ROLES[b[0]].wake ?? 99)),
  );
  const openRole = (id: RoleId) => (app.ui.modal = { type: 'una-role-detail', role: id });

  // Elegir QUÉ antes que A QUIÉN (Vidente y la Vidente copiada por El Doble).
  let seerMode = $state<'player' | 'center' | null>(null);
  let dobleSeerMode = $state<'player' | 'center' | null>(null);

  // Selección de cartas del centro (2 para la Vidente, hasta 2 para su copia).
  const centerSel = (key: string) => selIds(key).map(Number);
  const CENTER = [0, 1, 2];
  function toggleCenter(key: string, idx: number, max: number) {
    let cur = selIds(key).slice();
    const s = String(idx);
    if (cur.includes(s)) cur = cur.filter((x) => x !== s);
    else { cur.push(s); while (cur.length > max) cur.shift(); }
    selState.ui.sel = { key, ids: cur };
  }
  const centerList = (key: string) => centerSel(key).slice().sort((a, b) => a - b).map((i) => i + 1).join(' y ');

  function seerCenterGo() {
    const idxs = centerSel('una-seer-c');
    if (idxs.length !== 2) return;
    void guard(() => A.seerCenter(idxs));
    clearSel();
  }
  function dobleSeeCenterGo() {
    const idxs = centerSel('una-dsee-c');
    if (idxs.length !== 2) return;
    void guard(() => A.dobleSeeCenter(idxs));
    clearSel();
  }
</script>

<!-- Ficha fija de la acción: se lee de un vistazo antes de tocar nada. -->
{#snippet plan(see: string, change: string, must: string)}
  <ul class="plan">
    <li><b>👁 Qué verás</b><span>{see}</span></li>
    <li><b>🔀 Qué cambias</b><span>{change}</span></li>
    <li><b>❓ ¿Obligatorio?</b><span>{must}</span></li>
  </ul>
{/snippet}

{#snippet why(show: boolean, txt: string)}
  {#if show}<p class="why">{txt}</p>{/if}
{/snippet}

<div class="actionpanel">
{#if step === 'doble'}
  {@const dr = acts.dobleRole}
  {@const subDone = !!acts.dobleView || acts.dobleCard != null || !!acts.dobleActed}
  <h3>👯 Tu turno · El Doble</h3>
  {#if !dr}
    {@render plan(
      'La carta de quien toques (solo la ves tú).',
      'Te conviertes en ese rol para el RESTO de la partida. Las cartas no se mueven: la tuya sigue siendo 👯 El Doble.',
      'Sí: tienes que copiar a alguien.',
    )}
    <p class="ask">¿A quién miras?</p>
    <UnaGrid players={others} selKey="una-doble" exclude={[meId]} />
    <button class="primary block" data-a="una-doble-copy" disabled={!sel1('una-doble')} onclick={() => (sel1('una-doble') ? guard(() => A.dobleCopy(sel1('una-doble')!)) : undefined)}>👯 Copiar la carta de {sel1('una-doble') ? nm(sel1('una-doble')!) : '…'}</button>
    {@render why(!sel1('una-doble'), 'Toca antes a la persona cuya carta quieres mirar.')}
  {:else if !acts.dobleActionDone && ['vidente', 'ladron', 'alborotadora', 'borracho'].includes(dr) && !subDone}
    <p class="hint">Has copiado a <b>{rn(dr)}</b>: ya eres ese rol. Y como ese rol actúa AHORA, te toca hacer su acción.</p>
    {#if dr === 'vidente'}
      {@render plan(
        'Una carta de un jugador, O dos del centro. Tú eliges.',
        'Nada: solo miras.',
        'Sí: la Vidente que has copiado mira ahora.',
      )}
      {#if !dobleSeerMode}
        <p class="ask">¿Qué quieres mirar?</p>
        <button class="modebtn" data-a="una-dsee-mode" data-p="player" onclick={() => { clearSel(); dobleSeerMode = 'player'; }}>
          <b>👤 La carta de un jugador</b><small>Sabrás con certeza qué es esa persona ahora mismo.</small></button>
        <button class="modebtn" data-a="una-dsee-mode" data-p="center" onclick={() => { clearSel(); dobleSeerMode = 'center'; }}>
          <b>🃏 Dos cartas del centro</b><small>Sabrás dos roles que NADIE tiene en la mesa.</small></button>
      {:else if dobleSeerMode === 'player'}
        <p class="ask">👤 Verás en secreto la carta de quien elijas.</p>
        <button class="ghost block small" data-a="una-dsee-back" onclick={() => { clearSel(); dobleSeerMode = null; }}>↩️ Cambiar: mirar el centro</button>
        <UnaGrid players={others} selKey="una-dsee" exclude={[meId]} />
        <button class="primary block" data-a="una-dsee-player" disabled={!sel1('una-dsee')} onclick={() => (sel1('una-dsee') ? guard(() => A.dobleSeePlayer(sel1('una-dsee')!)) : undefined)}>🔮 Ver la carta de {sel1('una-dsee') ? nm(sel1('una-dsee')!) : '…'}</button>
        {@render why(!sel1('una-dsee'), 'Toca antes a quién quieres mirar.')}
      {:else}
        <p class="ask">🃏 Verás DOS de las tres cartas del centro. Marca cuáles.</p>
        <button class="ghost block small" data-a="una-dsee-back" onclick={() => { clearSel(); dobleSeerMode = null; }}>↩️ Cambiar: mirar a un jugador</button>
        <div class="btnrow">{#each CENTER as i (i)}<button class="small {centerSel('una-dsee-c').includes(i) ? 'primary' : 'ghost'}" data-a="una-dsee-c" data-p={String(i)} onclick={() => toggleCenter('una-dsee-c', i, 2)}>{centerSel('una-dsee-c').includes(i) ? '✅' : '🃏'} Centro {i + 1}</button>{/each}</div>
        <button class="primary block" data-a="una-dsee-center" disabled={centerSel('una-dsee-c').length !== 2} onclick={dobleSeeCenterGo}>🔮 Ver {centerSel('una-dsee-c').length === 2 ? `las cartas ${centerList('una-dsee-c')} del centro` : '2 del centro'}</button>
        {@render why(centerSel('una-dsee-c').length !== 2, 'Marca DOS de las tres cartas del centro.')}
      {/if}
    {:else if dr === 'ladron'}
      {@render plan(
        'Tu nueva carta, en cuanto robes.',
        'Cambias tu carta por la suya: pasas a ser ese rol y esa persona se queda tu 👯 El Doble (sin enterarse).',
        'Sí: el Ladrón que has copiado roba ahora.',
      )}
      <p class="ask">¿A quién robas?</p>
      <UnaGrid players={others} selKey="una-drob" exclude={[meId]} />
      <button class="primary block" data-a="una-drob" disabled={!sel1('una-drob')} onclick={() => (sel1('una-drob') ? guard(() => A.dobleRob(sel1('una-drob')!)) : undefined)}>🃏 Robar la carta de {sel1('una-drob') ? nm(sel1('una-drob')!) : '…'}</button>
      {@render why(!sel1('una-drob'), 'Toca antes a quién robas.')}
    {:else if dr === 'alborotadora'}
      {@render plan(
        'Nada: no miras las cartas que mueves.',
        'Esos DOS se intercambian la carta entre ellos y no se enteran. La tuya no se toca.',
        'Sí: la Alborotadora que has copiado actúa ahora.',
      )}
      <p class="ask">¿Qué dos cartas intercambias? (no puedes ser tú)</p>
      <UnaGrid players={others} selKey="una-dtm" max={2} exclude={[meId]} />
      <button class="primary block" data-a="una-dtm" disabled={selIds('una-dtm').length !== 2} onclick={() => guard(() => A.dobleTrouble(selIds('una-dtm')[0], selIds('una-dtm')[1]))}>🌀 Intercambiar {selIds('una-dtm').length === 2 ? `${nm(selIds('una-dtm')[0])} ↔ ${nm(selIds('una-dtm')[1])}` : 'sus cartas'}</button>
      {@render why(selIds('una-dtm').length !== 2, `Marca a DOS jugadores (llevas ${selIds('una-dtm').length}).`)}
    {:else if dr === 'borracho'}
      {@render plan(
        'Nada: cambias a ciegas.',
        'Tu carta se va al centro y te quedas la del centro que elijas, SIN mirarla: ni tú sabrás qué eres.',
        'Sí: el Borracho que has copiado cambia ahora.',
      )}
      <p class="ask">Elige una de las tres. Da igual cuál: están boca abajo.</p>
      <div class="btnrow">{#each CENTER as i (i)}<button class="primary" data-a="una-ddrink" data-p={String(i)} onclick={() => guard(() => A.dobleDrink(i))}>🍺 Coger la {i + 1}</button>{/each}</div>
    {/if}
  {:else}
    <!-- Cierre del turno del Doble: copie lo que copie (incluidos los roles
         de grupo y los pasivos) ve QUÉ es antes de que el panel desaparezca. -->
    <p class="hint">Has copiado a <b>{dr ? rn(dr) : ''}</b>: eres ese rol el resto de la partida.
      {#if acts.dobleView}{#if acts.dobleView.kind === 'player'} Viste que <b>{nm(acts.dobleView.pid)}</b> es {rn(acts.dobleView.role)}.{:else} En el centro viste: {acts.dobleView.roles.map(rn).join(', ')}.{/if}{/if}
      {#if acts.dobleCard != null} Robaste una carta: ahora eres <b>{rn(acts.dobleCard)}</b>.{/if}
      {#if dr === 'borracho'} Cambiaste tu carta por una del centro: ni tú sabes cuál es ahora.{/if}
      {#if dr === 'alborotadora'} Intercambiaste dos cartas ajenas.{/if}
      {#if dr && DOBLE_JOIN_ROLES.includes(dr)} La voz volverá a llamarte en su turno para que actúes con ellos.{/if}
      {#if dr && !DOBLE_JOIN_ROLES.includes(dr) && !['vidente', 'ladron', 'alborotadora', 'borracho'].includes(dr)} No actúa de noche: por esta noche has terminado.{/if}</p>
    {#if swapsLater && (acts.dobleView || acts.dobleCard != null)}<p class="warn">⚠️ La noche NO ha acabado: esa carta todavía puede cambiar de manos. Lo que has visto era verdad… en este momento.</p>{/if}
    <button class="primary block" data-a="una-doble-ok" onclick={() => guard(A.dobleConfirm)}>👯 Entendido, cierro los ojos</button>
  {/if}

{:else if step === 'lobos'}
  {@const lonePeek = !wolfMates.length && !acts.loneWolfCard}
  {@const soloSeen = !wolfMates.length && !!acts.loneWolfCard}
  <h3>🐺 Tu turno · Los Hombres Lobo</h3>
  {#if game.originalRole[meId] === 'doble'}<p class="hint">👯 Copiaste al lobo: cazas y ganas con la manada.</p>{/if}
  {#if wolfMates.length}
    {@render plan('Quién más es lobo esta noche.', 'Nada: en Una Noche la noche no mata.', 'Solo reconoceros en silencio.')}
    <p class="big">Tu manada: <b>{wolfMates.map((p) => p.name).join(', ')}</b></p>
  {:else}
    {@render plan(
      'Una carta del centro, la que tú elijas.',
      'Nada: solo miras.',
      'No, pero es tu premio por ser el único lobo: aprovéchalo.',
    )}
    <p class="hint">Eres el <b>único</b> lobo despierto: los otros lobos están entre las 3 cartas del centro.</p>
    {#if acts.loneWolfCard}
      <p class="big">Centro {(acts.loneWolfPeek ?? 0) + 1}: <b>{rn(acts.loneWolfCard)}</b></p>
      {#if has('borracho')}<p class="warn">⚠️ Ojo: el Borracho puede llevarse esa carta del centro más tarde.</p>{/if}
    {:else}
      <!-- Acción PRINCIPAL del lobo solitario: antes eran tres botoncitos
           ghost bajo el botón grande de cerrar y se perdía el vistazo. -->
      <p class="ask">Solo puedes mirar UNA. ¿Cuál?</p>
      <div class="btnrow">{#each CENTER as i (i)}<button class="primary" data-a="una-wolf-peek" data-p={String(i)} onclick={() => guard(() => A.loneWolfPeek(i))}>👁 Mirar la {i + 1}</button>{/each}</div>
    {/if}
  {/if}
  <button class="{lonePeek ? 'ghost' : 'primary'} block" data-a="una-wolf-ok" onclick={() => guard(A.wolvesSeen)}>🐺 {lonePeek ? 'Cerrar los ojos sin mirar el centro' : soloSeen ? 'Ya lo he visto: cierro los ojos' : 'Reconocido: cierro los ojos'}</button>

{:else if step === 'esbirro'}
  <h3>😈 Tu turno · El Esbirro</h3>
  {@render plan('Quiénes son los hombres lobo.', 'Nada: solo miras.', 'Solo mirar. Ellos jamás sabrán que existes.')}
  {#if wolves.length}
    <p class="big">Los lobos son: <b>{wolves.map((p) => p.name).join(', ')}</b></p>
    <p class="hint">Ganas con ellos. Si hace falta, sacrifícate: que te linchen a ti en vez de a un lobo hace ganar a tu bando.</p>
  {:else}
    <p class="hint">No hay ningún hombre lobo en la mesa: ambas cartas están en el centro. Tú solo defiendes su causa: ganas si cae cualquiera que no seas tú… y si el único condenado eres <b>tú</b>, gana el Pueblo.</p>
  {/if}
  <button class="primary block" data-a="una-minion-ok" onclick={() => guard(A.minionSeen)}>😈 Entendido, cierro los ojos</button>

{:else if step === 'masones'}
  <h3>🧱 Tu turno · Los Masones</h3>
  {@render plan('Quién es tu hermano masón.', 'Nada: solo miras.', 'Solo reconoceros.')}
  {#if masonMates.length}
    <p class="big">Tu hermandad: <b>{masonMates.map((p) => p.name).join(', ')}</b></p>
    <p class="hint">Sabéis con total certeza que el otro empezó siendo del pueblo: es vuestra mayor baza de día.</p>
  {:else}
    <p class="hint">Eres el único masón: el otro está en el centro. Nadie te confirmará.</p>
  {/if}
  <button class="primary block" data-a="una-mason-ok" onclick={() => guard(A.masonSeen)}>🧱 Reconocido: cierro los ojos</button>

{:else if step === 'vidente'}
  <h3>🔮 Tu turno · La Vidente</h3>
  {#if !acts.videnteDone}
    {@render plan(
      'Una carta de un jugador, O dos del centro. Tú eliges.',
      'Nada: solo miras, no mueves ninguna carta.',
      'No: puedes no mirar nada.',
    )}
    {#if !seerMode}
      <p class="ask">¿Qué quieres mirar?</p>
      <button class="modebtn" data-a="una-seer-mode" data-p="player" onclick={() => { clearSel(); seerMode = 'player'; }}>
        <b>👤 La carta de un jugador</b><small>Sabrás con certeza qué es esa persona ahora mismo.</small></button>
      <button class="modebtn" data-a="una-seer-mode" data-p="center" onclick={() => { clearSel(); seerMode = 'center'; }}>
        <b>🃏 Dos cartas del centro</b><small>Sabrás dos roles que NADIE tiene en la mesa: estrecha mucho el cerco.</small></button>
      <button class="ghost block" data-a="una-seer-skip" onclick={() => guard(A.seerSkip)}>🙈 No mirar nada (y cerrar los ojos)</button>
    {:else if seerMode === 'player'}
      <p class="ask">👤 Verás en secreto la carta de quien elijas.</p>
      <button class="ghost block small" data-a="una-seer-back" onclick={() => { clearSel(); seerMode = null; }}>↩️ Cambiar: mirar el centro</button>
      <UnaGrid players={others} selKey="una-seer" exclude={[meId]} />
      <button class="primary block" data-a="una-seer-player" disabled={!sel1('una-seer')} onclick={() => (sel1('una-seer') ? guard(() => A.seerPlayer(sel1('una-seer')!)) : undefined)}>🔮 Ver la carta de {sel1('una-seer') ? nm(sel1('una-seer')!) : '…'}</button>
      {@render why(!sel1('una-seer'), 'Toca antes a quién quieres mirar.')}
    {:else}
      <p class="ask">🃏 Verás DOS de las tres cartas del centro. Marca cuáles.</p>
      <button class="ghost block small" data-a="una-seer-back" onclick={() => { clearSel(); seerMode = null; }}>↩️ Cambiar: mirar a un jugador</button>
      <div class="btnrow">{#each CENTER as i (i)}<button class="small {centerSel('una-seer-c').includes(i) ? 'primary' : 'ghost'}" data-a="una-seer-c" data-p={String(i)} onclick={() => toggleCenter('una-seer-c', i, 2)}>{centerSel('una-seer-c').includes(i) ? '✅' : '🃏'} Centro {i + 1}</button>{/each}</div>
      <button class="primary block" data-a="una-seer-center" disabled={centerSel('una-seer-c').length !== 2} onclick={seerCenterGo}>🔮 Ver {centerSel('una-seer-c').length === 2 ? `las cartas ${centerList('una-seer-c')} del centro` : '2 del centro'}</button>
      {@render why(centerSel('una-seer-c').length !== 2, 'Marca DOS de las tres cartas del centro.')}
    {/if}
  {:else}
    <p class="big">{#if acts.videnteView?.kind === 'player'}<b>{nm(acts.videnteView.pid)}</b> es {rn(acts.videnteView.role)}.{:else if acts.videnteView?.kind === 'center'}En el centro: {acts.videnteView.roles.map(rn).join(', ')}.{/if}</p>
    <p class="hint">Memorízalo: esta pantalla desaparece al cerrar. Nadie más lo ha visto.</p>
    {#if swapsLater}<p class="warn">⚠️ La noche NO ha acabado: esa carta todavía puede cambiar de sitio. Era verdad en este momento.</p>{/if}
    {#if !acts.videnteSeen}<button class="primary block" data-a="una-seer-ok" onclick={() => guard(A.seerConfirm)}>✔️ Lo he visto, cierro los ojos</button>{/if}
  {/if}

{:else if step === 'ladron'}
  <h3>🃏 Tu turno · El Ladrón</h3>
  {#if !acts.ladronDone}
    {@render plan(
      'Tu nueva carta, en cuanto robes (nadie más la ve).',
      'Cambias tu carta por la suya: pasas a ser ese rol —con su bando— y esa persona se queda tu 🃏 Ladrón sin enterarse.',
      'No: puedes no robar y seguir siendo el Ladrón.',
    )}
    <p class="ask">¿A quién robas?</p>
    <UnaGrid players={others} selKey="una-rob" exclude={[meId]} />
    <button class="primary block" data-a="una-rob" disabled={!sel1('una-rob')} onclick={() => (sel1('una-rob') ? guard(() => A.robberRob(sel1('una-rob')!)) : undefined)}>🃏 Robar la carta de {sel1('una-rob') ? nm(sel1('una-rob')!) : '…'}</button>
    {@render why(!sel1('una-rob'), 'Toca antes a quién robas.')}
    <button class="ghost block" data-a="una-rob-skip" onclick={() => guard(A.robberSkip)}>🙈 No robar (sigo siendo el Ladrón)</button>
  {:else if acts.ladronTarget}
    <!-- Sin robo (o ya confirmado) dejas de ser actor y el panel se va solo:
         esta rama solo existe mientras hay carta nueva que leer. -->
    <p class="big">Robaste a <b>{nm(acts.ladronTarget)}</b>: ahora eres <b>{acts.ladronCard ? rn(acts.ladronCard) : '…'}</b>.</p>
    <p class="hint">Ese es tu bando a partir de ahora. {nm(acts.ladronTarget)} tiene tu 🃏 Ladrón y no lo sabe.</p>
    {#if afterRobber}<p class="warn">⚠️ La noche sigue: alguien podría cambiarte ESTA carta después sin que te enteres.</p>{/if}
    {#if !acts.ladronSeen}<button class="primary block" data-a="una-rob-ok" onclick={() => guard(A.robberConfirm)}>✔️ Lo he visto, cierro los ojos</button>{/if}
  {/if}

{:else if step === 'alborotadora'}
  <!-- Al terminar dejas de ser actor: el «hecho» lo da ya la pantalla de la
       fase (✅ Hecho), así que aquí no hace falta rama de después. -->
  <h3>🌀 Tu turno · La Alborotadora</h3>
  {@render plan(
    'Nada: no miras las cartas que mueves (tú tampoco sabrás qué eran).',
    'Esos DOS se intercambian la carta entre ellos y no se enteran. La tuya no se toca: sigues siendo la Alborotadora.',
    'No: puedes no tocar nada.',
  )}
  <p class="ask">¿Qué dos cartas intercambias? (no puedes ser tú)</p>
  <UnaGrid players={others} selKey="una-tm" max={2} exclude={[meId]} />
  <button class="primary block" data-a="una-tm" disabled={selIds('una-tm').length !== 2} onclick={() => guard(() => A.troublemakerSwap2(selIds('una-tm')[0], selIds('una-tm')[1]))}>🌀 Intercambiar {selIds('una-tm').length === 2 ? `${nm(selIds('una-tm')[0])} ↔ ${nm(selIds('una-tm')[1])}` : 'sus cartas'}</button>
  {@render why(selIds('una-tm').length !== 2, `Marca a DOS jugadores (llevas ${selIds('una-tm').length}).`)}
  <button class="ghost block" data-a="una-tm-skip" onclick={() => guard(A.troublemakerSkip)}>🙈 No intercambiar nada</button>

{:else if step === 'borracho'}
  <h3>🍺 Tu turno · El Borracho</h3>
  {@render plan(
    'Nada: cambias a ciegas, sin mirar.',
    'Tu carta se va al centro y te quedas la del centro que elijas. Ni tú sabrás qué eres al amanecer.',
    'Sí: tienes que cambiar por una de las tres.',
  )}
  <p class="ask">Elige una. Da igual cuál: están boca abajo.</p>
  <div class="btnrow">{#each CENTER as i (i)}<button class="primary" data-a="una-drink" data-p={String(i)} onclick={() => guard(() => A.drunkTake(i))}>🍺 Coger la {i + 1}</button>{/each}</div>

{:else if step === 'insomne'}
  <h3>😴 Tu turno · La Insomne</h3>
  {#if !(acts.insomneCard || {})[meId]}
    {@render plan(
      'Tu propia carta, tal y como está AHORA.',
      'Nada: solo miras.',
      'Solo mirar. Eres la última de la noche: lo que veas ya no cambia.',
    )}
    <button class="primary block" data-a="una-insomne-look" onclick={() => guard(A.insomniacLook)}>👁 Mirar mi carta ahora</button>
  {:else}
    {@const mine = (acts.insomneCard || {})[meId]!}
    <p class="big">Tu carta ahora es <b>{rn(mine)}</b>.</p>
    <p class="hint">{mine === game.originalRole[meId]
      ? 'La misma con la que empezaste: nadie te la ha tocado. Eres esa carta al 100 %.'
      : '¡Te la han cambiado! Ya no eres lo que empezaste siendo: juegas y ganas con ESTA carta.'} Como miras la última de la noche, es definitiva.{#if game.originalRole[meId] === 'doble'} (Tu carta 👯 El Doble vale como el rol que copiaste.){/if}</p>
    <button class="primary block" data-a="una-insomne-ok" onclick={() => guard(A.insomniacDone)}>✔️ Lo he visto, cierro los ojos</button>
  {/if}
{/if}

  <!-- La regla que más se olvida en la mesa, ahí donde se actúa. -->
  <p class="rule">🔑 De noche actúas con la carta que te TOCÓ al empezar (o con la que copiaste, si eres El Doble), aunque a estas alturas alguien ya te la haya cambiado sin que lo sepas.</p>

  <!-- B25·4: la referencia se consulta DESDE donde se decide. -->
  <details class="unaref">
    <summary data-a="una-ref">📖 Las {deckRows.reduce((a, [, n]) => a + n, 0)} cartas de esta partida y lo que hacen</summary>
    <p class="small-note" style="margin:6px 0 2px">Una por jugador y 3 en el centro; la lista es pública. En este orden llama la voz de noche. Toca una para el detalle.</p>
    {#each deckRows as [id, n] (id)}
      <button class="refrow" data-a="una-ref-role" data-p={id} onclick={() => openRole(id)}>
        <div class="sinfo">
          <div class="sname">{ROLES[id].emoji} {ROLES[id].name}{n > 1 ? ` ×${n}` : ''}<span style="opacity:.65;font-weight:400"> · {TEAM_LABEL[ROLES[id].team]}{ROLES[id].wake === undefined ? ' · no actúa de noche' : ''}</span></div>
          <div class="sdesc">{ROLES[id].desc}</div>
        </div>
        <span class="chev">ℹ️</span>
      </button>
    {/each}
  </details>
</div>

<style>
  /* Ficha «qué verás / qué cambias / obligatorio»: lo que el contrato pide
     LEER antes de tocar nada, sin salir de la pantalla de decisión. */
  .plan { list-style: none; margin: 6px 0 10px; padding: 8px 10px; border-radius: var(--r-1); background: var(--card2); border: 1px solid var(--border); }
  .plan li { display: flex; gap: 8px; padding: 3px 0; font-size: 0.85rem; line-height: 1.35; }
  .plan li b { flex: 0 0 auto; min-width: 6.6rem; color: var(--moon); font-weight: 600; }
  .plan li span { flex: 1; color: var(--text); }
  .ask { margin: 10px 0 0; font-size: 0.95rem; font-weight: 600; color: var(--moon); }
  /* Opción de acción: nombre + qué consigues, con área de toque grande. */
  .modebtn { display: block; width: 100%; text-align: left; margin-top: 8px; padding: 12px; min-height: 52px; border-radius: var(--r-2); border: 1px solid var(--line-2); background: var(--card2); font-weight: 400; }
  .modebtn b { display: block; font-size: 1rem; color: var(--moon); }
  .modebtn small { display: block; margin-top: 2px; font-size: 0.8rem; color: var(--muted); line-height: 1.3; }
  /* Motivo de un botón deshabilitado (nunca un gris mudo ni un title=). */
  .why { margin-top: 6px; font-size: 0.8rem; color: var(--muted); }
  .warn { margin-top: 8px; font-size: 0.82rem; color: var(--moon); }
  .big { margin: 10px 0 2px; text-align: center; font-size: 1.1rem; line-height: 1.4; }
  .rule { margin-top: 14px; font-size: 0.8rem; color: var(--muted); line-height: 1.35; }
  .unaref { margin-top: 10px; border-top: 1px solid var(--border); padding-top: 8px; }
  .unaref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); }
  .refrow { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; font-weight: 400; font-size: 1rem; padding: 10px 4px; background: none; border: none; border-bottom: 1px solid var(--border); border-radius: 0; color: inherit; }
  .refrow:last-of-type { border-bottom: none; }
  .refrow:active { background: rgba(255, 255, 255, 0.05); transform: none; }
  .refrow .sinfo { flex: 1; }
  .refrow .sname { font-size: 0.95rem; }
  .refrow .sdesc { color: var(--muted); font-size: 0.78rem; line-height: 1.3; }
  .refrow .chev { flex: 0 0 auto; opacity: 0.7; }
</style>
