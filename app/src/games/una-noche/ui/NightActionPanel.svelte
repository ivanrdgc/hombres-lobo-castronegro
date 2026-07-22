<script lang="ts">
  // Panel de acción nocturna del actor del paso en curso. Cada rol tiene su
  // control; las acciones con resultado que leer (Vidente, Ladrón, Insomne y
  // El Doble copiando a esos) se confirman antes de que el narrador avance.
  import { guard } from '../../../core/sync/guard';
  import { selIds, sel1, clearSel } from '../../../shell/selection';
  import { state as selState } from '../../../core/sync/store.svelte';
  import * as A from '../actions';
  import { ROLES } from '../roles';
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

{#if step === 'doble'}
  {@const dr = acts.dobleRole}
  {@const subDone = !!acts.dobleView || acts.dobleCard != null || !!acts.dobleActed}
  <div class="actionpanel"><h3>👯 El Doble</h3>
    {#if !dr}
      <p class="hint">Mira la carta de otro jugador: te convertirás en ese rol para el resto de la partida.</p>
      <UnaGrid players={others} selKey="una-doble" exclude={[meId]} />
      <button class="primary block" data-a="una-doble-copy" disabled={!sel1('una-doble')} onclick={() => (sel1('una-doble') ? guard(() => A.dobleCopy(sel1('una-doble')!)) : undefined)}>👯 Copiar a {sel1('una-doble') ? nm(sel1('una-doble')!) : '…'}</button>
    {:else if !acts.dobleActionDone && ['vidente', 'ladron', 'alborotadora', 'borracho'].includes(dr) && !subDone}
      <p class="hint">Has copiado a <b>{rn(dr)}</b>. Ahora haz su acción:</p>
      {#if dr === 'vidente'}
        <UnaGrid players={others} selKey="una-dsee" exclude={[meId]} />
        <button class="primary block" data-a="una-dsee-player" disabled={!sel1('una-dsee')} onclick={() => (sel1('una-dsee') ? guard(() => A.dobleSeePlayer(sel1('una-dsee')!)) : undefined)}>🔮 Ver a {sel1('una-dsee') ? nm(sel1('una-dsee')!) : '…'}</button>
        <p class="hint" style="margin-top:8px">…o dos cartas del centro:</p>
        <div class="btnrow">{#each CENTER as i (i)}<button class="small {centerSel('una-dsee-c').includes(i) ? 'primary' : 'ghost'}" data-a="una-dsee-c" data-p={String(i)} onclick={() => toggleCenter('una-dsee-c', i, 2)}>Centro {i + 1}</button>{/each}</div>
        <button class="primary block" data-a="una-dsee-center" disabled={centerSel('una-dsee-c').length !== 2} onclick={dobleSeeCenterGo}>🔮 Ver 2 del centro</button>
      {:else if dr === 'ladron'}
        <UnaGrid players={others} selKey="una-drob" exclude={[meId]} />
        <button class="primary block" data-a="una-drob" disabled={!sel1('una-drob')} onclick={() => (sel1('una-drob') ? guard(() => A.dobleRob(sel1('una-drob')!)) : undefined)}>🃏 Robar a {sel1('una-drob') ? nm(sel1('una-drob')!) : '…'}</button>
      {:else if dr === 'alborotadora'}
        <p class="hint">Elige a dos (que no seas tú) para intercambiar sus cartas.</p>
        <UnaGrid players={others} selKey="una-dtm" max={2} exclude={[meId]} />
        <button class="primary block" data-a="una-dtm" disabled={selIds('una-dtm').length !== 2} onclick={() => guard(() => A.dobleTrouble(selIds('una-dtm')[0], selIds('una-dtm')[1]))}>🌀 Intercambiar</button>
      {:else if dr === 'borracho'}
        <p class="hint">Cambia tu carta por una del centro, sin verla.</p>
        <div class="btnrow">{#each CENTER as i (i)}<button class="violet" data-a="una-ddrink" data-p={String(i)} onclick={() => guard(() => A.dobleDrink(i))}>🍺 Centro {i + 1}</button>{/each}</div>
      {/if}
    {:else if !acts.dobleActionDone}
      <p class="hint">Has copiado a <b>{dr ? rn(dr) : ''}</b>.
        {#if acts.dobleView}{#if acts.dobleView.kind === 'player'} Viste que <b>{nm(acts.dobleView.pid)}</b> es {rn(acts.dobleView.role)}.{:else} En el centro viste: {acts.dobleView.roles.map(rn).join(', ')}.{/if}{/if}
        {#if acts.dobleCard != null} Robaste una carta: ahora eres <b>{rn(acts.dobleCard)}</b>.{/if}
        {#if dr === 'borracho'} Cambiaste tu carta por una del centro: ni tú sabes cuál es ahora.{/if}
        {#if dr === 'alborotadora'} Intercambiaste dos cartas ajenas.{/if}</p>
      <button class="primary block" data-a="una-doble-ok" onclick={() => guard(A.dobleConfirm)}>👯 Entendido</button>
    {:else}
      <p class="hint">✅ Listo. Cierra los ojos.</p>
    {/if}
  </div>

{:else if step === 'lobos'}
  <div class="actionpanel"><h3>🐺 Los Hombres Lobo</h3>
    {#if game.originalRole[meId] === 'doble'}<p class="hint">👯 Copiaste al lobo: cazas y ganas con la manada.</p>{/if}
    {#if wolfMates.length}
      <p class="hint">Tu manada: <b>{wolfMates.map((p) => p.name).join(', ')}</b>. Reconoceos en silencio.</p>
    {:else}
      <p class="hint">Eres el <b>único</b> lobo. Puedes mirar una carta del centro:</p>
      {#if acts.loneWolfCard}
        <p style="text-align:center;font-size:1.1rem">Centro {(acts.loneWolfPeek ?? 0) + 1}: <b>{rn(acts.loneWolfCard)}</b></p>
      {:else}
        <div class="btnrow">{#each CENTER as i (i)}<button class="small ghost" data-a="una-wolf-peek" data-p={String(i)} onclick={() => guard(() => A.loneWolfPeek(i))}>👁 Centro {i + 1}</button>{/each}</div>
      {/if}
    {/if}
    <button class="danger block" data-a="una-wolf-ok" onclick={() => guard(A.wolvesSeen)}>🐺 Reconocido</button>
  </div>

{:else if step === 'esbirro'}
  <div class="actionpanel"><h3>😈 El Esbirro</h3>
    {#if wolves.length}
      <p class="hint">Los hombres lobo son: <b>{wolves.map((p) => p.name).join(', ')}</b>. Ganas con ellos (ellos no te conocen).</p>
    {:else}
      <p class="hint">No hay ningún hombre lobo en la mesa: ambas cartas están en el centro. Tú solo defiendes su causa.</p>
    {/if}
    <button class="violet block" data-a="una-minion-ok" onclick={() => guard(A.minionSeen)}>😈 Entendido</button>
  </div>

{:else if step === 'masones'}
  <div class="actionpanel"><h3>🧱 Los Masones</h3>
    {#if masonMates.length}
      <p class="hint">Tu hermandad: <b>{masonMates.map((p) => p.name).join(', ')}</b>. Sois de fiar entre vosotros.</p>
    {:else}
      <p class="hint">Eres el único masón: el otro está en el centro.</p>
    {/if}
    <button class="primary block" data-a="una-mason-ok" onclick={() => guard(A.masonSeen)}>🧱 Reconocido</button>
  </div>

{:else if step === 'vidente'}
  <div class="actionpanel"><h3>🔮 La Vidente</h3>
    {#if !acts.videnteDone}
      <p class="hint">Mira la carta de un jugador…</p>
      <UnaGrid players={others} selKey="una-seer" exclude={[meId]} />
      <button class="primary block" data-a="una-seer-player" disabled={!sel1('una-seer')} onclick={() => (sel1('una-seer') ? guard(() => A.seerPlayer(sel1('una-seer')!)) : undefined)}>🔮 Ver a {sel1('una-seer') ? nm(sel1('una-seer')!) : '…'}</button>
      <p class="hint" style="margin-top:8px">…o dos cartas del centro:</p>
      <div class="btnrow">{#each CENTER as i (i)}<button class="small {centerSel('una-seer-c').includes(i) ? 'primary' : 'ghost'}" data-a="una-seer-c" data-p={String(i)} onclick={() => toggleCenter('una-seer-c', i, 2)}>Centro {i + 1}</button>{/each}</div>
      <button class="primary block" data-a="una-seer-center" disabled={centerSel('una-seer-c').length !== 2} onclick={seerCenterGo}>🔮 Ver 2 del centro</button>
      <button class="ghost block" data-a="una-seer-skip" onclick={() => guard(A.seerSkip)}>No mirar nada</button>
    {:else}
      <p class="hint">{#if acts.videnteView?.kind === 'player'}<b>{nm(acts.videnteView.pid)}</b> es {rn(acts.videnteView.role)}.{:else if acts.videnteView?.kind === 'center'}En el centro: {acts.videnteView.roles.map(rn).join(', ')}.{/if}</p>
      {#if !acts.videnteSeen}<button class="primary block" data-a="una-seer-ok" onclick={() => guard(A.seerConfirm)}>✔️ Lo he visto</button>{/if}
    {/if}
  </div>

{:else if step === 'ladron'}
  <div class="actionpanel"><h3>🃏 El Ladrón</h3>
    {#if !acts.ladronDone}
      <p class="hint">Puedes cambiar tu carta por la de otro y mirar tu nueva carta.</p>
      <UnaGrid players={others} selKey="una-rob" exclude={[meId]} />
      <button class="primary block" data-a="una-rob" disabled={!sel1('una-rob')} onclick={() => (sel1('una-rob') ? guard(() => A.robberRob(sel1('una-rob')!)) : undefined)}>🃏 Robar a {sel1('una-rob') ? nm(sel1('una-rob')!) : '…'}</button>
      <button class="ghost block" data-a="una-rob-skip" onclick={() => guard(A.robberSkip)}>No robar</button>
    {:else if acts.ladronTarget}
      <p class="hint">Robaste a <b>{nm(acts.ladronTarget)}</b>. Ahora eres <b>{acts.ladronCard ? rn(acts.ladronCard) : '…'}</b>.</p>
      {#if !acts.ladronSeen}<button class="primary block" data-a="una-rob-ok" onclick={() => guard(A.robberConfirm)}>✔️ Lo he visto</button>{/if}
    {:else}
      <p class="hint">No has robado: sigues con tu carta.</p>
    {/if}
  </div>

{:else if step === 'alborotadora'}
  <div class="actionpanel"><h3>🌀 La Alborotadora</h3>
    {#if !acts.alborotadoraDone}
      <p class="hint">Intercambia las cartas de otros dos jugadores (sin mirarlas). Ellos no lo sabrán.</p>
      <UnaGrid players={others} selKey="una-tm" max={2} exclude={[meId]} />
      <button class="primary block" data-a="una-tm" disabled={selIds('una-tm').length !== 2} onclick={() => guard(() => A.troublemakerSwap2(selIds('una-tm')[0], selIds('una-tm')[1]))}>🌀 Intercambiar {selIds('una-tm').length === 2 ? `${nm(selIds('una-tm')[0])} ↔ ${nm(selIds('una-tm')[1])}` : ''}</button>
      <button class="ghost block" data-a="una-tm-skip" onclick={() => guard(A.troublemakerSkip)}>No intercambiar</button>
    {:else}
      <p class="hint">✅ Hecho. Cierra los ojos.</p>
    {/if}
  </div>

{:else if step === 'borracho'}
  <div class="actionpanel"><h3>🍺 El Borracho</h3>
    {#if !acts.borrachoDone}
      <p class="hint">Cambia tu carta por una del centro… sin mirarla. A ciegas.</p>
      <div class="btnrow">{#each CENTER as i (i)}<button class="violet" data-a="una-drink" data-p={String(i)} onclick={() => guard(() => A.drunkTake(i))}>🍺 Centro {i + 1}</button>{/each}</div>
    {:else}
      <p class="hint">✅ Has cambiado tu carta por una del centro. Ni tú sabes cuál es ahora.</p>
    {/if}
  </div>

{:else if step === 'insomne'}
  <div class="actionpanel"><h3>😴 La Insomne</h3>
    {#if !(acts.insomneCard || {})[meId]}
      <p class="hint">Mira tu propia carta, por si alguien te la ha cambiado.</p>
      <button class="primary block" data-a="una-insomne-look" onclick={() => guard(A.insomniacLook)}>👁 Mirar mi carta</button>
    {:else}
      <p class="hint">Tu carta ahora es <b>{rn((acts.insomneCard || {})[meId]!)}</b>.</p>
      <button class="primary block" data-a="una-insomne-ok" onclick={() => guard(A.insomniacDone)}>✔️ Lo he visto</button>
    {/if}
  </div>
{/if}
