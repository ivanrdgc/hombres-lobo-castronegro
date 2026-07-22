<script lang="ts">
  // Poder presidencial: mirar los 3 próximos decretos, investigar la lealtad de
  // alguien, convocar elección especial o ejecutar. Solo actúa el Presidente;
  // el resultado sensible (mirar/investigar) se muestra únicamente en su móvil.
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
  const pick = $derived(sel1('sh-power'));
  const nm = (pid: string | null) => (pid && game.names[pid]) || '¿?';
  const ICON = (p: string) => (p === 'liberal' ? '🕊️' : '🐷');
</script>

<div class="narration">⚡ {nm(power.by)} ejerce un poder presidencial: {POWER_LABEL[power.type]}.</div>

{#if amActor}
  {#if power.type === 'peek'}
    <div class="actionpanel"><h3>🔮 Los tres próximos decretos</h3>
      <p class="hint">Solo tú los ves (en el orden en que saldrán). Memorízalos y continúa.</p>
      <div class="policies">{#each game.peek || [] as pol, i (i)}<div class="policy {pol}"><span class="picon">{ICON(pol)}</span></div>{/each}</div>
      <button class="primary block" data-a="sh-peek-done" onclick={() => guard(A.powerPeekDone)}>✅ Continuar</button>
    </div>
  {:else if power.type === 'investigate'}
    {#if game.investigateResult}
      <div class="actionpanel"><h3>🔎 Lealtad de {nm(game.investigateResult.target)}</h3>
        <p style="text-align:center;font-size:1.2rem;margin:8px 0">{game.investigateResult.faction === 'fascist' ? '🐷 Afiliación FASCISTA' : '🕊️ Afiliación LIBERAL'}</p>
        <p class="hint">Solo tú lo ves. (Ojo: Hitler aparece como fascista, pero no sabrás si es Hitler o un fascista normal.)</p>
        <button class="primary block" data-a="sh-invest-done" onclick={() => guard(A.powerInvestigateDone)}>✅ Continuar</button>
      </div>
    {:else}
      <div class="actionpanel"><h3>🔎 Investigar lealtad</h3>
        <p class="hint">Elige a quién investigar (no puedes repetir a un ya investigado). Verás su afiliación solo tú.</p>
        <ShGrid {players} selKey="sh-power" exclude={[my.id, ...game.investigated]} presidentId={presidentId(game)} />
        <button class="primary block" data-a="sh-investigate" disabled={!pick} onclick={() => (pick ? guard(() => A.powerInvestigate(pick)) : undefined)}>🔎 {pick ? `Investigar a ${nm(pick)}` : 'Elige a quién'}</button>
      </div>
    {/if}
  {:else if power.type === 'special'}
    <div class="actionpanel"><h3>🗳️ Elección especial</h3>
      <p class="hint">Elige quién será el próximo Presidente (elección especial, por una vez).</p>
      <ShGrid {players} selKey="sh-power" exclude={[my.id]} presidentId={presidentId(game)} />
      <button class="primary block" data-a="sh-special" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.powerSpecialElection(pick); clearSel(); }) : undefined)}>🗳️ {pick ? `Que presida ${nm(pick)}` : 'Elige Presidente'}</button>
    </div>
  {:else if power.type === 'execution'}
    <div class="actionpanel"><h3>💀 Ejecución</h3>
      <p class="hint">Elige a quién ejecutar. Si resulta ser Hitler, ¡ganan los liberales!</p>
      <ShGrid {players} selKey="sh-power" exclude={[my.id]} presidentId={presidentId(game)} />
      <button class="danger block" data-a="sh-execute" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.powerExecute(pick); clearSel(); }) : undefined)}>💀 {pick ? `Ejecutar a ${nm(pick)}` : 'Elige a quién'}</button>
    </div>
  {/if}
{:else}
  <div class="card"><p class="hint">⚡ El Presidente <b>{nm(power.by)}</b> ejerce su poder…</p></div>
{/if}

<style>
  .policies { display: flex; gap: 10px; justify-content: center; margin: 8px 0; }
  .policy { width: 64px; aspect-ratio: 0.7; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 2px solid var(--border, #333); }
  .policy .picon { font-size: 1.8rem; }
  .policy.liberal { border-color: #3a86b0; background: #12293a; }
  .policy.fascist { border-color: #b0603a; background: #2f1a12; }
</style>
