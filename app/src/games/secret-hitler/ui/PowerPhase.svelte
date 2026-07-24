<script lang="ts">
  // Poder presidencial: mirar los 3 próximos decretos, investigar la lealtad de
  // alguien, convocar elección especial o ejecutar. Cada poder se explica DONDE
  // se usa: qué hace, quién lo verá y qué pasará después; las fichas dicen por
  // qué se pueden elegir o no, y el botón final nombra la consecuencia. Solo
  // actúa el Presidente; lo sensible (mirar/investigar) vive en su móvil.
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf, presidentId } from '../engine';
  import { POWER_LABEL } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';
  import ShGrid from './ShGrid.svelte';

  const { game, my }: { game: SHState; my: PlayerDoc } = $props();
  const power = $derived(game.power!);
  const amActor = $derived(my.id === power.by);
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
    <div class="actionpanel"><h3>🔮 Los tres próximos decretos</h3>
      <p class="hint">El decreto fascista que acabáis de promulgar te da este poder: ves, en secreto y EN ORDEN, las tres cartas de arriba del mazo. Son las que robará el próximo Presidente… salvo que el mazo se rebaraje antes (pasa cuando quedan menos de 3).</p>
      <div class="policies">
        {#each game.peek || [] as pol, i (i)}
          <div class="policy {pol}"><span class="picon">{ICON(pol)}</span><span class="plab">{ORD[i]}</span><span class="plab">{LABEL(pol)}</span></div>
        {/each}
      </div>
      <p class="small-note">Nadie más las verá y no quedarán en la crónica: lo que cuentes a la mesa (o te calles) es cosa tuya. Al continuar, la presidencia pasa al siguiente.</p>
      <button class="primary block" data-a="sh-peek-done" onclick={() => guard(A.powerPeekDone)}>✅ Ya las he memorizado · seguir</button>
    </div>
  {:else if power.type === 'investigate'}
    {#if game.investigateResult}
      <div class="actionpanel"><h3>🔎 Lealtad de {nm(game.investigateResult.target)}</h3>
        <p class="result {game.investigateResult.faction}">{game.investigateResult.faction === 'fascist' ? '🐷 Afiliación FASCISTA' : '🕊️ Afiliación LIBERAL'}</p>
        <p class="hint">Solo lo ves tú: no queda en el tablero ni en la crónica. Ojo: Hitler también sale como «fascista», así que esto no distingue a Hitler de un fascista normal.</p>
        <p class="small-note">Puedes contarlo, callártelo o mentir: la mesa solo tiene tu palabra. Al continuar, la presidencia pasa al siguiente.</p>
        <button class="primary block" data-a="sh-invest-done" onclick={() => guard(A.powerInvestigateDone)}>✅ Continuar</button>
      </div>
    {:else}
      <div class="actionpanel"><h3>🔎 Investigar lealtad</h3>
        <p class="hint">Elige a quién investigar: verás su afiliación (🕊️ liberal o 🐷 fascista) <b>solo tú</b>, aquí mismo. No se puede investigar dos veces a la misma persona.</p>
        <ShGrid {players} {selKey} exclude={[my.id, ...game.investigated]} presidentId={presidentId(game)} why={why('investigate')} />
        {#if pick}
          <p class="plan">▶️ Vas a ver la afiliación de <b>{nm(pick)}</b>. Recuerda: Hitler aparece como «fascista».</p>
          <button class="ghost block small" style="margin:8px 0" data-a="sh-power-back" onclick={() => clearSel()}>↩️ Cambiar de persona</button>
        {/if}
        <button class="primary block" data-a="sh-investigate" disabled={!pick} onclick={() => (pick ? guard(() => A.powerInvestigate(pick)) : undefined)}>🔎 {pick ? `Investigar a ${nm(pick)}` : 'Elige a quién'}</button>
        {#if !pick}<p class="small-note">Toca antes a alguien de la lista (los atenuados explican por qué no se puede).</p>{/if}
      </div>
    {/if}
  {:else if power.type === 'special'}
    <div class="actionpanel"><h3>🗳️ Elección especial</h3>
      <p class="hint">Eliges a dedo quién presidirá la PRÓXIMA ronda (por una vez): nominará Canciller y la mesa lo votará como siempre. Después, la rotación normal sigue por quien te tocaba a ti, así que nadie se salta su turno.</p>
      <ShGrid {players} {selKey} exclude={[my.id]} presidentId={presidentId(game)} why={why('special')} />
      {#if pick}
        <p class="plan">▶️ <b>{nm(pick)}</b> presidirá la próxima ronda y nominará Canciller. Es público: lo verá toda la mesa.</p>
        <button class="ghost block small" style="margin:8px 0" data-a="sh-power-back" onclick={() => clearSel()}>↩️ Cambiar de persona</button>
      {/if}
      <button class="primary block" data-a="sh-special" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.powerSpecialElection(pick); clearSel(); }) : undefined)}>🗳️ {pick ? `Que presida ${nm(pick)}` : 'Elige Presidente'}</button>
      {#if !pick}<p class="small-note">Toca antes a alguien de la lista.</p>{/if}
    </div>
  {:else if power.type === 'execution'}
    <div class="actionpanel"><h3>💀 Ejecución</h3>
      <p class="hint">Matas a un jugador: queda fuera para siempre —no vuelve a votar ni a gobernar— y su carta NO se destapa hasta el final. Es público e irreversible.</p>
      <p class="danger-note">Si resulta ser Hitler, la partida acaba en el acto: 🕊️ ganan los liberales. Si te equivocas, quedan menos votos para frenar a los fascistas.</p>
      <ShGrid {players} {selKey} exclude={[my.id]} presidentId={presidentId(game)} why={why('execution')} />
      {#if pick}
        <p class="plan">▶️ Vas a ejecutar a <b>{nm(pick)}</b>: quedará fuera de la partida y nadie sabrá qué carta tenía (salvo que sea Hitler y se acabe todo).</p>
        <button class="ghost block small" style="margin:8px 0" data-a="sh-power-back" onclick={() => clearSel()}>↩️ Cambiar de persona</button>
      {/if}
      <button class="danger block" data-a="sh-execute" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.powerExecute(pick); clearSel(); }) : undefined)}>💀 {pick ? `Ejecutar a ${nm(pick)}` : 'Elige a quién'}</button>
      {#if !pick}<p class="small-note">Toca antes a alguien de la lista.</p>{/if}
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

<style>
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
  .plan {
    margin-top: 10px; padding: 10px 12px; border-radius: var(--r-2);
    border: 1px solid var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--card2));
    font-size: 0.9rem; line-height: 1.4;
  }
  .danger-note {
    margin: 6px 0; padding: 8px 10px; border-radius: 8px; font-size: 0.9rem;
    background: color-mix(in srgb, var(--danger) 16%, var(--bg-1)); border: 1px solid var(--danger);
  }
</style>
