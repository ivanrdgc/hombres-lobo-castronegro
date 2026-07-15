<script lang="ts">
  // Resoluciones pendientes del día (port de pendingPanel() de la v1): disparo
  // del Cazador, decisión de la Sirvienta (con cuenta atrás), Alguacil y
  // Cabeza de Turco.
  import { setFlash } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { sel1 } from '../../../shell/selection';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import type { PendingEntry } from '../types';
  import PickList from './PickList.svelte';
  import Countdown from './Countdown.svelte';

  // El grupo forma parte del contrato de props (mismas firmas que la v1),
  // aunque este panel no necesita leerlo directamente.
  const { head, my, players }: {
    head: PendingEntry;
    group: GroupDoc;
    my: PlayerDoc;
    players: PlayerDoc[];
  } = $props();

  const key = $derived(`pend:${head.type}`);

  const needSel = () => setFlash('Selecciona primero a un jugador de la lista.');
</script>

{#if head.type === 'cazador'}
  {#if my.id === head.pid}
    <div class="actionpanel"><h3>🏹 ¡Tu última flecha!</h3>
      <p class="hint">Has caído, pero puedes llevarte a alguien contigo.</p>
      <PickList {players} exclude={[my.id]} selKey={key} />
      <button class="danger block" data-a="cazador-shoot" onclick={() => (sel1(key) ? guard(() => A.hunterShoot(sel1(key))) : needSel())}>🏹 Disparar</button>
      <button class="ghost block" data-a="cazador-skip" onclick={() => guard(() => A.hunterShoot(null))}>No disparar</button></div>
  {:else}
    {@const hunter = players.find((p) => p.id === head.pid)}
    <div class="narration">🏹 {hunter?.name || 'El Cazador'} tensa su arco por última vez…</div>
  {/if}
{:else if head.type === 'sirvienta'}
  {@const target = players.find((p) => p.id === head.targetId)}
  {#if my.role === 'sirvienta' && my.alive && !my.lover}
    <div class="actionpanel"><h3>🧹 La Abnegada Sirvienta</h3>
      <p class="hint">El pueblo ha condenado a <b>{target?.name || ''}</b>. ¿Sacrificas tu carta para asumir su rol en secreto? <Countdown deadline={head.deadline ?? 0} /></p>
      <div class="btnrow"><button class="violet" data-a="sirvienta-yes" onclick={() => guard(() => A.resolveSirvienta(true))}>🧹 Tomar su rol</button><button class="ghost" data-a="sirvienta-no" onclick={() => guard(() => A.resolveSirvienta(false))}>No intervenir</button></div></div>
  {:else}
    <div class="actionpanel"><h3>⏳ El juicio se resuelve…</h3><p class="hint">Un instante de silencio antes de revelar el destino de {target?.name || ''}.</p></div>
  {/if}
{:else if head.type === 'alguacil_elect'}
  {#if my.alive}
    <div class="actionpanel"><h3>⭐ Elección del Alguacil</h3>
      <p class="hint">Debatid quién será el Alguacil (su voto vale doble). Cualquiera registra el resultado.</p>
      <PickList {players} selKey={key} />
      <button class="primary block" data-a="alguacil-pick" onclick={() => (sel1(key) ? guard(() => A.pickAlguacil(sel1(key)!)) : needSel())}>⭐ Nombrar Alguacil</button></div>
  {:else}
    <div class="narration">⭐ El pueblo elige a su Alguacil…</div>
  {/if}
{:else if head.type === 'alguacil_pick'}
  {#if my.id === head.pid}
    <div class="actionpanel"><h3>⭐ Tu último acto como Alguacil</h3>
      <p class="hint">Señala a tu sucesor.</p>
      <PickList {players} exclude={[my.id]} selKey={key} />
      <button class="primary block" data-a="alguacil-pick" onclick={() => (sel1(key) ? guard(() => A.pickAlguacil(sel1(key)!)) : needSel())}>⭐ Nombrar sucesor</button></div>
  {:else}
    <div class="narration">⭐ El Alguacil caído señala a su sucesor…</div>
  {/if}
{:else if head.type === 'cabeza_pick'}
  {#if my.id === head.pid}
    <div class="actionpanel"><h3>🐐 Tu sacrificio no será en vano</h3>
      <p class="hint">Regla oficial: anuncia en voz alta quiénes tendrán derecho a votar mañana (los demás callan en la votación). En la app, elige además quién registrará esa decisión.</p>
      <PickList {players} exclude={[my.id]} selKey={key} />
      <button class="primary block" data-a="cabeza-pick" onclick={() => (sel1(key) ? guard(() => A.cabezaPick(sel1(key))) : needSel())}>👉 Será quien registre el voto</button>
      <button class="ghost block" data-a="cabeza-skip" onclick={() => guard(() => A.cabezaPick(null))}>Que vote todo el pueblo</button></div>
  {:else}
    <div class="narration">🐐 El Cabeza de Turco toma su última decisión…</div>
  {/if}
{/if}
