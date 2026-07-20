<script lang="ts">
  // Resoluciones pendientes del día: disparo del Cazador, decisión de la
  // Sirvienta (con cuenta atrás), Alguacil y Cabeza de Turco. Las que piden
  // elegir jugador usan ActionGrid (una sola lista, confirmación con nombre).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { selIds, sel1 } from '../../../shell/selection';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import type { PendingEntry } from '../types';
  import ActionGrid from './ActionGrid.svelte';
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
  const selName = $derived(players.find((p) => p.id === selIds(key)[0])?.name ?? null);
  const notMe = (p: PlayerDoc) => p.id !== my.id;
</script>

{#if head.type === 'cazador'}
  {#if my.id === head.pid}
    <div class="actionpanel"><h3>🏹 ¡Tu última flecha!</h3>
      <p class="hint">Has caído, pero puedes llevarte a alguien contigo.</p>
      <ActionGrid {players} selKey={key} canPick={notMe} />
      <button class="danger block" data-a="cazador-shoot" disabled={!selName} onclick={() => (sel1(key) ? guard(() => A.hunterShoot(sel1(key))) : undefined)}>🏹 {selName ? `Disparar a ${selName}` : 'Disparar'}</button>
      <button class="ghost block" data-a="cazador-skip" onclick={() => guard(() => A.hunterShoot(null))}>No disparar</button></div>
  {:else}
    {@const hunter = players.find((p) => p.id === head.pid)}
    <div class="narration">🏹 {hunter?.name || 'El Cazador'} tensa su arco por última vez…</div>
  {/if}
{:else if head.type === 'sirvienta'}
  {@const target = players.find((p) => p.id === head.targetId)}
  <!-- Vista IDÉNTICA para todos, también para la Sirvienta: su decisión vive
       dentro de su carta (👁 Mostrar mi rol), sin pantallas delatoras. -->
  <div class="actionpanel"><h3>⏳ El juicio se resuelve…</h3>
    <p class="hint">Un instante de silencio antes de revelar el destino de {target?.name || ''}. <Countdown deadline={head.deadline ?? 0} /></p></div>
{:else if head.type === 'alguacil_elect'}
  {#if my.alive}
    <div class="actionpanel"><h3>⭐ Elección del Alguacil</h3>
      <p class="hint">Debatid quién será el Alguacil (su voto vale doble) y tocadlo. Cualquiera registra el resultado.</p>
      <ActionGrid {players} selKey={key} />
      <button class="primary block" data-a="alguacil-pick" disabled={!selName} onclick={() => (sel1(key) ? guard(() => A.pickAlguacil(sel1(key)!)) : undefined)}>⭐ {selName ? `Nombrar Alguacil a ${selName}` : 'Nombrar Alguacil'}</button></div>
  {:else}
    <div class="narration">⭐ El pueblo elige a su Alguacil…</div>
  {/if}
{:else if head.type === 'alguacil_pick'}
  {#if my.id === head.pid}
    <div class="actionpanel"><h3>⭐ Tu último acto como Alguacil</h3>
      <p class="hint">Toca a tu sucesor.</p>
      <ActionGrid {players} selKey={key} canPick={notMe} />
      <button class="primary block" data-a="alguacil-pick" disabled={!selName} onclick={() => (sel1(key) ? guard(() => A.pickAlguacil(sel1(key)!)) : undefined)}>⭐ {selName ? `Nombrar sucesor a ${selName}` : 'Nombrar sucesor'}</button></div>
  {:else}
    <div class="narration">⭐ El Alguacil caído señala a su sucesor…</div>
  {/if}
{:else if head.type === 'cabeza_pick'}
  {#if my.id === head.pid}
    <div class="actionpanel"><h3>🐐 Tu sacrificio no será en vano</h3>
      <p class="hint">Regla oficial: anuncia en voz alta quiénes tendrán derecho a votar mañana (los demás callan en la votación). En la app, toca además a quien registrará esa decisión.</p>
      <ActionGrid {players} selKey={key} canPick={notMe} />
      <button class="primary block" data-a="cabeza-pick" disabled={!selName} onclick={() => (sel1(key) ? guard(() => A.cabezaPick(sel1(key))) : undefined)}>👉 {selName ? `Registrará el voto: ${selName}` : 'Será quien registre el voto'}</button>
      <button class="ghost block" data-a="cabeza-skip" onclick={() => guard(() => A.cabezaPick(null))}>Que vote todo el pueblo</button></div>
  {:else}
    <div class="narration">🐐 El Cabeza de Turco toma su última decisión…</div>
  {/if}
{/if}
