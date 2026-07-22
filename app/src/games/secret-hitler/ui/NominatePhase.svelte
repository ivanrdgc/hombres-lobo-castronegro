<script lang="ts">
  // El Presidente nomina Canciller entre los elegibles (la app aplica los
  // límites de mandato). Los demás miran su carta y esperan.
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf, presidentId, eligibleChancellors } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';
  import ShGrid from './ShGrid.svelte';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: SHState; my: PlayerDoc } = $props();
  const pres = $derived(presidentId(game));
  const amPres = $derived(my.id === pres);
  const inGame = $derived(game.playerIds.includes(my.id));
  const eligible = $derived(eligibleChancellors(game));
  const players = $derived(playersOf(game));
  const excluded = $derived(game.playerIds.filter((pid) => !eligible.includes(pid)));
  const pick = $derived(sel1('sh-nom'));
  const nm = (pid: string) => game.names[pid] || '¿?';
</script>

{#if amPres}
  <div class="actionpanel"><h3>🤝 Nomina Canciller</h3>
    <p class="hint">Eres el Presidente. Elige a tu Canciller (los atenuados no pueden por límite de mandato o por estar fuera). La mesa lo votará.</p>
    <ShGrid {players} selKey="sh-nom" exclude={excluded} presidentId={pres} chancellorId={game.lastChancellor} />
    <button class="primary block" data-a="sh-nominate" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.nominateChancellor(pick); clearSel(); }) : undefined)}>🤝 {pick ? `Nominar a ${nm(pick)}` : 'Elige Canciller'}</button>
  </div>
{:else}
  <div class="card"><p class="hint">🪙 <b>{nm(pres)}</b> está eligiendo Canciller…</p></div>
{/if}
{#if inGame}<RoleCard {game} pid={my.id} mini={true} />{/if}
