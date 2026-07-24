<script lang="ts">
  // Resoluciones pendientes del día: disparo del Cazador, decisión de la
  // Sirvienta (con cuenta atrás), Alguacil y Cabeza de Turco. Las que piden
  // elegir jugador usan ActionGrid (una sola lista, confirmación con nombre).
  // B25/B26: cada panel dice qué está en juego ANTES de elegir, el botón nombra
  // la consecuencia, y quien NO decide sabe a quién se espera (por su nombre) y
  // qué puede ir haciendo mientras.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { selIds, sel1 } from '../../../shell/selection';
  import { e2eTestMode } from '../../../core/test-hooks';
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
  const notHead = (p: PlayerDoc) => p.id !== head.pid;
  // Registrador designado por el Cabeza de Turco: nunca el Tonto del Pueblo ya
  // descubierto (no vota, y designarlo dejaba el juicio de mañana sin nadie).
  const canRegister = (p: PlayerDoc) => p.id !== head.pid && !p.revealedTonto;

  // Respaldo anti-atasco: si el dispositivo del que debe decidir lleva un rato
  // sin responder, cualquier VIVO puede registrar su decisión (dicha en voz
  // alta en la mesa). El contador es local y se reinicia con cada pendiente.
  const STALE_MS = e2eTestMode() ? 3000 : 45000;
  let now = $state(Date.now());
  let seenAt = $state(Date.now());
  let seenKey = $state('');
  $effect(() => { const t = setInterval(() => (now = Date.now()), 2500); return () => clearInterval(t); });
  $effect(() => {
    const k = `${head.type}:${head.pid ?? ''}:${head.targetId ?? ''}`;
    if (k !== seenKey) { seenKey = k; seenAt = Date.now(); }
  });
  const stale = $derived(!!my.alive && now - seenAt > STALE_MS);
  const headName = $derived(players.find((p) => p.id === head.pid)?.name || 'ese jugador');
</script>

{#if head.type === 'cazador'}
  {#if my.id === head.pid}
    <div class="actionpanel"><h3>🏹 ¡Tu última flecha!</h3>
      <p class="hint">Has caído, pero puedes llevarte a alguien contigo: quien elijas muere <b>ahora mismo</b>, delante de todos. Si es un enamorado, su pareja morirá de pena.</p>
      <ActionGrid {players} selKey={key} canPick={notMe} whyNot={(p) => (p.id === my.id ? 'ya estás muerto' : null)} />
      {#if selName}<div class="pplan">🏹 Disparas a <b>{selName}</b> a la vista de todo el pueblo. No se deshace.</div>{/if}
      <button class="danger block" data-a="cazador-shoot" disabled={!selName} onclick={() => (sel1(key) ? guard(() => A.hunterShoot(sel1(key))) : undefined)}>🏹 {selName ? `Disparar a ${selName}` : 'Disparar'}</button>
      <button class="ghost block" data-a="cazador-skip" onclick={() => guard(() => A.hunterShoot(null))}>No disparar (tu flecha se pierde)</button>
      {#if !selName}<p class="small-note">Toca antes a alguien de la lista… o decide no disparar. La partida está parada esperándote.</p>{/if}</div>
  {:else}
    {@const hunter = players.find((p) => p.id === head.pid)}
    <div class="narration">🏹 {hunter?.name || 'El Cazador'} tensa su arco por última vez…</div>
    <div class="actionpanel"><h3>⏳ Se espera a {hunter?.name || 'el Cazador'}</h3>
      <p class="hint">Está eligiendo en su móvil a quién se lleva por delante. Tú no tienes nada que tocar: mirad a ver qué cara pone.</p></div>
    {#if stale}
      <div class="actionpanel"><h3>📵 ¿{headName} no puede con su móvil?</h3>
        <p class="hint">Que diga en voz alta a quién dispara (o que no dispara) y cualquiera lo registra aquí.</p>
        <ActionGrid {players} selKey={key} canPick={notHead} />
        <button class="danger block" data-a="cazador-shoot" disabled={!selName} onclick={() => (sel1(key) ? guard(() => A.hunterShoot(sel1(key))) : undefined)}>🏹 {selName ? `Registrar: dispara a ${selName}` : 'Registrar su disparo'}</button>
        <button class="ghost block" data-a="cazador-skip" onclick={() => guard(() => A.hunterShoot(null))}>Registrar: no dispara</button></div>
    {/if}
  {/if}
{:else if head.type === 'sirvienta'}
  {@const target = players.find((p) => p.id === head.targetId)}
  <!-- Vista IDÉNTICA para todos, también para la Sirvienta: su decisión vive
       dentro de su carta (👁 Mostrar mi rol), sin pantallas delatoras. -->
  <div class="actionpanel"><h3>⏳ El juicio se resuelve…</h3>
    <p class="hint">Un instante de silencio antes de revelar el destino de {target?.name || ''}. Nadie tiene nada que tocar: sigue solo. <Countdown deadline={head.deadline ?? 0} /></p></div>
{:else if head.type === 'alguacil_elect'}
  {#if my.alive}
    <div class="actionpanel"><h3>⭐ Elección del Alguacil</h3>
      <p class="hint">El pueblo elige a su Alguacil <b>a mano alzada</b>: su voto valdrá <b>doble</b> en todos los juicios y, si muere, nombrará a su sucesor. Debatid, decidid y tocadlo aquí: <b>cualquiera</b> registra el resultado y es definitivo.</p>
      <ActionGrid {players} selKey={key} />
      {#if selName}<div class="pplan">⭐ <b>{selName}</b> será el Alguacil hasta que muera.</div>{/if}
      <button class="primary block" data-a="alguacil-pick" disabled={!selName} onclick={() => (sel1(key) ? guard(() => A.pickAlguacil(sel1(key)!)) : undefined)}>⭐ {selName ? `Nombrar Alguacil a ${selName}` : 'Nombrar Alguacil'}</button>
      {#if !selName}<p class="small-note">Toca antes al elegido en la lista.</p>{/if}</div>
  {:else}
    <div class="narration">⭐ El pueblo elige a su Alguacil…</div>
    <div class="actionpanel"><h3>⏳ Se espera al pueblo</h3>
      <p class="hint">💀 Los muertos no eligen Alguacil. Cualquiera de los vivos registrará el resultado.</p></div>
  {/if}
{:else if head.type === 'alguacil_pick'}
  {#if my.id === head.pid}
    <div class="actionpanel"><h3>⭐ Tu último acto como Alguacil</h3>
      <p class="hint">La banda pasa a quien tú digas: su voto valdrá doble a partir de ahora. Elígelo bien — es tu última palabra.</p>
      <ActionGrid {players} selKey={key} canPick={notMe} whyNot={(p) => (p.id === my.id ? 'ya estás muerto' : null)} />
      {#if selName}<div class="pplan">⭐ <b>{selName}</b> hereda la banda: su voto valdrá doble.</div>{/if}
      <button class="primary block" data-a="alguacil-pick" disabled={!selName} onclick={() => (sel1(key) ? guard(() => A.pickAlguacil(sel1(key)!)) : undefined)}>⭐ {selName ? `Nombrar sucesor a ${selName}` : 'Nombrar sucesor'}</button>
      {#if !selName}<p class="small-note">Toca antes a tu sucesor. El pueblo está esperándote.</p>{/if}</div>
  {:else}
    <div class="narration">⭐ El Alguacil caído señala a su sucesor…</div>
    <div class="actionpanel"><h3>⏳ Se espera a {headName}</h3>
      <p class="hint">Está eligiendo en su móvil quién hereda la banda (voto doble). Nada que tocar por ahora.</p></div>
    {#if stale}
      <div class="actionpanel"><h3>📵 ¿{headName} no puede con su móvil?</h3>
        <p class="hint">Que diga en voz alta a quién nombra sucesor y cualquiera lo registra.</p>
        <ActionGrid {players} selKey={key} canPick={notHead} />
        <button class="primary block" data-a="alguacil-pick" disabled={!selName} onclick={() => (sel1(key) ? guard(() => A.pickAlguacil(sel1(key)!)) : undefined)}>⭐ {selName ? `Registrar sucesor: ${selName}` : 'Registrar su sucesor'}</button></div>
    {/if}
  {/if}
{:else if head.type === 'cabeza_pick'}
  {#if my.id === head.pid}
    <div class="actionpanel"><h3>🐐 Tu sacrificio no será en vano</h3>
      <p class="hint">Has muerto por el empate y te queda una última palabra sobre el juicio de mañana.</p>
      <p class="small-note">📢 <b>En la mesa</b>: anuncia en voz alta quiénes tendrán derecho a votar mañana (los demás callan). <br />📱 <b>En la app</b>: toca además a la única persona que podrá registrar esa decisión.</p>
      <ActionGrid {players} selKey={key} canPick={canRegister} whyNot={(p) => (p.id === head.pid ? 'ya estás muerto' : '🤪 Tonto descubierto: no puede registrar')} />
      {#if selName}<div class="pplan">👉 Mañana, solo <b>{selName}</b> podrá anotar el juicio en la app.</div>{/if}
      <button class="primary block" data-a="cabeza-pick" disabled={!selName} onclick={() => (sel1(key) ? guard(() => A.cabezaPick(sel1(key))) : undefined)}>👉 {selName ? `Registrará el voto: ${selName}` : 'Será quien registre el voto'}</button>
      <button class="ghost block" data-a="cabeza-skip" onclick={() => guard(() => A.cabezaPick(null))}>Que vote todo el pueblo (sin designar a nadie)</button></div>
  {:else}
    <div class="narration">🐐 El Cabeza de Turco toma su última decisión…</div>
    <div class="actionpanel"><h3>⏳ Se espera a {headName}</h3>
      <p class="hint">Está decidiendo quién tendrá voto mañana. Escuchad lo que anuncie en voz alta.</p></div>
    {#if stale}
      <div class="actionpanel"><h3>📵 ¿{headName} no puede con su móvil?</h3>
        <p class="hint">Que diga en voz alta su decisión y cualquiera la registra.</p>
        <ActionGrid {players} selKey={key} canPick={canRegister} />
        <button class="primary block" data-a="cabeza-pick" disabled={!selName} onclick={() => (sel1(key) ? guard(() => A.cabezaPick(sel1(key))) : undefined)}>👉 {selName ? `Registrará el voto: ${selName}` : 'Registrar su designado'}</button>
        <button class="ghost block" data-a="cabeza-skip" onclick={() => guard(() => A.cabezaPick(null))}>Registrar: que vote todo el pueblo</button></div>
    {/if}
  {/if}
{/if}

<style>
  /* Lo que va a pasar al confirmar, en claro (mismo lenguaje que la noche). */
  .pplan {
    margin: 10px 0 8px; padding: 10px 12px; border-radius: var(--r-1);
    border: 1px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    font-size: 0.9rem; line-height: 1.4;
  }
</style>
