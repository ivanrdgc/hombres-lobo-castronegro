<script lang="ts">
  // Poder presidencial: mirar los 3 próximos decretos, investigar la lealtad de
  // alguien, convocar elección especial o ejecutar. Cada poder se explica DONDE
  // se usa: qué hace, quién lo verá y qué pasará después; las fichas dicen por
  // qué se pueden elegir o no, y el botón final nombra la consecuencia.
  //
  // Postura 🍽️ MESA con momento de mano (B28): elegir a quién investigar o a
  // quién ejecutar es público (acaba en la crónica), así que se hace en la
  // pantalla de la fase; pero lo que SOLO ve el Presidente —las tres cartas del
  // 🔮 y la lealtad del 🔎— no se pinta solo: vive en la cortina de privacidad,
  // que se cierra sola y no deja rastro. Los demás ven la misma tarjeta neutra
  // en todos los móviles.
  import { untrack } from 'svelte';
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf, presidentId } from '../engine';
  import { POWER_LABEL } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';
  import ShGrid from './ShGrid.svelte';
  import MyCard from './MyCard.svelte';
  import PrivacySheet from './PrivacySheet.svelte';

  const { game, my }: { game: SHState; my: PlayerDoc } = $props();
  const power = $derived(game.power!);
  const amActor = $derived(my.id === power.by);
  const inGame = $derived(game.playerIds.includes(my.id));
  const players = $derived(playersOf(game));
  // Clave de selección propia de ESTE poder: si no, la ficha marcada al
  // investigar hace tres rondas reaparecía ya elegida en la ejecución —y el
  // botón de matar quedaba activo sin que el Presidente tocara a nadie.
  const selKey = $derived(`sh-power:${power.type}:${game.fascistPolicies}`);
  const pick = $derived(sel1(selKey));
  const nm = (pid: string | null) => (pid && game.names[pid]) || '¿?';
  const ICON = (p: string) => (p === 'liberal' ? '🕊️' : '🐷');
  const LABEL = (p: string) => (p === 'liberal' ? 'Liberal' : 'Fascista');
  const ORD = ['1.ª', '2.ª', '3.ª'];
  const result = $derived(game.investigateResult);

  // La cortina se cierra al cambiar de poder o de respuesta (comparando el
  // valor: el doc de la partida se rehace en cada snapshot de la mesa).
  let open = $state(false);
  const scene = $derived(`${power.type}:${result?.target || ''}`);
  let lastScene = untrack(() => scene);
  $effect(() => {
    if (scene === lastScene) return;
    lastScene = scene;
    open = false;
  });

  // Motivo, por jugador, de que se pueda o no elegir (nunca una ficha gris muda).
  function why(kind: 'investigate' | 'special' | 'execution'): Record<string, string> {
    return Object.fromEntries(game.playerIds.map((pid): [string, string] => {
      if (!game.alive[pid]) return [pid, '💀 Ejecutado: fuera de la partida.'];
      if (pid === my.id) return [pid, kind === 'special' ? '🪙 Eres tú: presides ahora, no puedes convocarte.' : 'Eres tú: no vale elegirte.'];
      if (kind === 'investigate' && game.investigated.includes(pid)) return [pid, '🔎 Ya fue investigado antes: no se repite.'];
      if (kind === 'investigate') return [pid, '✅ Se puede investigar.'];
      if (kind === 'special') return [pid, '✅ Puede presidir la próxima ronda.'];
      return [pid, '✅ Se puede ejecutar.'];
    }));
  }
</script>

<div class="narration">⚡ {nm(power.by)} ejerce un poder presidencial: {POWER_LABEL[power.type]}.</div>

{#if amActor}
  {#if power.type === 'peek'}
    <div class="actionpanel"><h3>🔮 Mira el futuro del mazo</h3>
      <p class="hint">El decreto fascista que acabáis de promulgar te deja ver, en secreto y EN ORDEN, las tres cartas de arriba del mazo: las que robará el próximo Presidente (salvo que el mazo se rebaraje antes, cuando quedan menos de 3).</p>
      <button class="primary block" data-a="sh-open-peek" onclick={() => (open = true)}>👁 Ver las tres cartas y continuar</button>
      <p class="why">Nadie más las verá y no quedan en la crónica: lo que cuentes a la mesa —o te calles— es cosa tuya.</p>
    </div>
  {:else if power.type === 'investigate'}
    {#if result}
      <div class="actionpanel"><h3>🔎 Lealtad de {nm(result.target)}</h3>
        <p class="hint">Ya tienes la respuesta. Ábrela con el móvil hacia ti: solo la ves tú y no queda en el tablero ni en la crónica.</p>
        <button class="primary block" data-a="sh-open-loyalty" onclick={() => (open = true)}>👁 Ver su afiliación y continuar</button>
        <p class="why">Puedes contarla, callártela o mentir: la mesa solo tiene tu palabra.</p>
      </div>
    {:else}
      <div class="actionpanel"><h3>🔎 Investiga una lealtad</h3>
        <p class="hint">Elige a quién investigar: verás su afiliación (🕊️ liberal o 🐷 fascista) <b>solo tú</b>. Ojo, Hitler sale como «fascista»: esto no lo distingue de un fascista normal. No se puede repetir persona.</p>
        <ShGrid {players} {selKey} exclude={[my.id, ...game.investigated]} presidentId={presidentId(game)} why={why('investigate')} />
        {#if pick}
          <button class="ghost block small" style="margin:8px 0" data-a="sh-power-back" onclick={() => clearSel()}>↩️ Cambiar de persona</button>
        {/if}
        <button class="primary block" data-a="sh-investigate" disabled={!pick} onclick={() => (pick ? guard(() => A.powerInvestigate(pick)) : undefined)}>🔎 {pick ? `Investigar a ${nm(pick)}` : 'Toca antes a alguien de la lista'}</button>
        <p class="why">Que investigas a alguien es público (queda en la crónica); el resultado, no.</p>
      </div>
    {/if}
  {:else if power.type === 'special'}
    <div class="actionpanel"><h3>🗳️ Convoca una elección especial</h3>
      <p class="hint">Eliges a dedo quién presidirá la PRÓXIMA ronda (por una vez): nominará Canciller y la mesa lo votará como siempre. Después la rotación sigue por quien te tocaba a ti, así que nadie se salta su turno.</p>
      <ShGrid {players} {selKey} exclude={[my.id]} presidentId={presidentId(game)} why={why('special')} />
      {#if pick}
        <button class="ghost block small" style="margin:8px 0" data-a="sh-power-back" onclick={() => clearSel()}>↩️ Cambiar de persona</button>
      {/if}
      <button class="primary block" data-a="sh-special" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.powerSpecialElection(pick); clearSel(); }) : undefined)}>🗳️ {pick ? `Que presida ${nm(pick)}` : 'Toca antes a alguien de la lista'}</button>
      <p class="why">Es público: lo verá toda la mesa en cuanto lo hagas.</p>
    </div>
  {:else if power.type === 'execution'}
    <div class="actionpanel"><h3>💀 Ejecuta a alguien</h3>
      <p class="hint">Queda fuera para siempre —no vuelve a votar ni a gobernar— y su carta NO se destapa hasta el final. Es público e irreversible.</p>
      <p class="danger-note">Si resulta ser Hitler, la partida acaba en el acto: 🕊️ ganan los liberales. Si te equivocas, quedan menos votos para frenar a los fascistas.</p>
      <ShGrid {players} {selKey} exclude={[my.id]} presidentId={presidentId(game)} why={why('execution')} />
      {#if pick}
        <button class="ghost block small" style="margin:8px 0" data-a="sh-power-back" onclick={() => clearSel()}>↩️ Cambiar de persona</button>
      {/if}
      <button class="danger block" data-a="sh-execute" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.powerExecute(pick); clearSel(); }) : undefined)}>💀 {pick ? `Ejecutar a ${nm(pick)}` : 'Toca antes a alguien de la lista'}</button>
    </div>
  {/if}
{:else}
  <div class="card"><h3>⚡ Poder presidencial</h3>
    <p class="hint">El Presidente <b>{nm(power.by)}</b> está usando en su móvil: {POWER_LABEL[power.type]}.</p>
    <p class="small-note">
      {#if power.type === 'peek'}Ve las tres cartas de arriba del mazo. Nadie más las verá: lo que cuente después es palabra suya.
      {:else if power.type === 'investigate'}Verá la afiliación de alguien, y solo él. Puede contarla, callársela o mentir — y Hitler le saldría como «fascista» sin más.
      {:else if power.type === 'special'}Elegirá a dedo quién preside la próxima ronda; lo veréis todos en cuanto lo haga.
      {:else}Va a ejecutar a alguien: quedará fuera de la partida y no volverá a votar. Si es Hitler, se acaba la partida.
      {/if}
    </p>
  </div>
{/if}

<!-- Cortina: lo que SOLO ve el Presidente. 20 s (cada toque reinicia la cuenta):
     es memorizar, no decidir. -->
{#if open && amActor && power.type === 'peek'}
  <PrivacySheet title="🔮 Las tres de arriba del mazo" hold={20000} onclose={() => (open = false)}>
    <p class="lead">En este orden: es lo que robará el próximo Presidente.</p>
    <div class="policies">
      {#each game.peek || [] as pol, i (i)}
        <div class="policy {pol}"><span class="picon">{ICON(pol)}</span><span class="plab">{ORD[i]}</span><span class="plab">{LABEL(pol)}</span></div>
      {/each}
    </div>
    <button class="primary block" data-a="sh-peek-done" onclick={() => guard(A.powerPeekDone)}>✅ Memorizadas · pasar la presidencia</button>
  </PrivacySheet>
{/if}

{#if open && amActor && power.type === 'investigate' && result}
  <PrivacySheet title="🔎 Lealtad de {nm(result.target)}" hold={20000} onclose={() => (open = false)}>
    <p class="result {result.faction}">{result.faction === 'fascist' ? '🐷 Afiliación FASCISTA' : '🕊️ Afiliación LIBERAL'}</p>
    <p class="lead">Hitler también sale como «fascista»: esto no lo distingue de un fascista normal.</p>
    <button class="primary block" data-a="sh-invest-done" onclick={() => guard(A.powerInvestigateDone)}>✅ Ya lo he visto · pasar la presidencia</button>
  </PrivacySheet>
{/if}

{#if inGame}<MyCard {game} pid={my.id} />{/if}

<style>
  .lead { margin: 6px 0 10px; font-size: 0.88rem; color: var(--muted); line-height: 1.4; }
  .why { margin-top: 8px; font-size: 0.8rem; color: var(--muted); line-height: 1.35; }
  .policies { display: flex; gap: 10px; justify-content: center; margin: 8px 0; }
  .policy {
    flex: 1; max-width: 92px; padding: 10px 6px; display: flex; flex-direction: column; align-items: center; gap: 2px;
    border-radius: 10px; border: 2px solid var(--border, #333);
  }
  .policy .picon { font-size: 1.8rem; }
  .policy .plab { font-size: 0.8rem; color: var(--muted); }
  .policy.liberal { border-color: #3a86b0; background: #12293a; }
  .policy.fascist { border-color: #b0603a; background: #2f1a12; }
  .result { text-align: center; font-size: 1.2rem; font-weight: 700; margin: 8px 0; padding: 10px; border-radius: var(--r-2); }
  .result.liberal { border: 2px solid #3a86b0; background: #12293a; }
  .result.fascist { border: 2px solid #b0603a; background: #2f1a12; }
  .danger-note {
    margin: 6px 0; padding: 8px 10px; border-radius: 8px; font-size: 0.9rem;
    background: color-mix(in srgb, var(--danger) 16%, var(--bg-1)); border: 1px solid var(--danger);
  }
</style>
