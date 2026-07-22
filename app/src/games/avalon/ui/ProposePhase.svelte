<script lang="ts">
  // Fase de propuesta: el LÍDER elige quiénes van a la misión; los demás miran.
  import { guard } from '../../../core/sync/guard';
  import { selIds, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf, leaderId } from '../engine';
  import { teamSize } from '../roles';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';
  import AvGrid from './AvGrid.svelte';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const players = $derived(playersOf(game));
  const leader = $derived(leaderId(game));
  const amLeader = $derived(my.id === leader);
  const inGame = $derived(game.playerIds.includes(my.id));
  const size = $derived(teamSize(game.playerIds.length, game.quest));
  const key = $derived(`av-team:q${game.quest}:t${game.voteTrack}`);
  const sel = $derived(selIds(key));
  const nm = (pid: string) => game.names[pid] || '¿?';

  function propose() {
    if (sel.length !== size) return;
    void guard(async () => { await A.proposeTeam(sel); clearSel(); });
  }
</script>

{#if amLeader}
  <div class="actionpanel"><h3>🧭 Formas el equipo · Misión {game.quest}</h3>
    <p class="hint">Eres el líder. Elige a <b>{size}</b> caballero{size === 1 ? '' : 's'} para la misión (puedes incluirte). Toda la mesa votará tu propuesta.</p>
    <AvGrid {players} selKey={key} max={size} leaderId={leader} />
    <button class="primary block" data-a="av-propose" disabled={sel.length !== size} onclick={propose}>⚔️ {sel.length === size ? `Proponer a ${sel.map(nm).join(', ')}` : `Elige a ${size} (${sel.length}/${size})`}</button>
  </div>
{:else}
  <div class="card"><p class="hint">🧭 <b>{nm(leader)}</b> está formando el equipo de la misión {game.quest} ({size} caballero{size === 1 ? '' : 's'}). Prepárate para votar.</p></div>
{/if}
{#if inGame}<RoleCard {game} pid={my.id} mini={true} />{/if}
