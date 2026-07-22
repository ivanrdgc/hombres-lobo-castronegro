<script lang="ts">
  // El Bien ganó 3 misiones: el Asesino tiene la última palabra. Señala a quien
  // crea Merlín; si acierta, gana el Mal. Solo actúa el Asesino; los demás miran.
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf, assassinId } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';
  import AvGrid from './AvGrid.svelte';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const assassin = $derived(assassinId(game));
  const amAssassin = $derived(my.id === assassin);
  // Objetivos: cualquiera del Bien (excluye a los malvados conocidos y a sí mismo).
  const players = $derived(playersOf(game).filter((p) => p.id !== assassin));
  const key = 'av-assassin';
  const pick = $derived(sel1(key));
  const nm = (pid: string) => game.names[pid] || '¿?';
</script>

<div class="narration">🗡️ El Bien ha completado tres misiones… pero el Asesino aún puede robar la victoria si encuentra a Merlín.</div>

{#if amAssassin}
  <div class="actionpanel"><h3>🗡️ Tu última bala</h3>
    <p class="hint">Señala a quien creas que es <b>Merlín</b>. Si aciertas, el Mal gana la partida; si fallas, gana el Bien.</p>
    <AvGrid {players} selKey={key} />
    <button class="danger block" data-a="av-assassinate" disabled={!pick} onclick={() => (pick ? guard(async () => { await A.assassinate(pick); clearSel(); }) : undefined)}>🗡️ {pick ? `Acusar a ${nm(pick)} de ser Merlín` : 'Señala a Merlín'}</button>
  </div>
{:else}
  <div class="card"><p class="hint">🗡️ El Asesino medita su golpe: busca a Merlín entre vosotros…</p></div>
{/if}
