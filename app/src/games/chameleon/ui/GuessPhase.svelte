<script lang="ts">
  // Pillaron al Camaleón: su última baza es señalar en la rejilla la palabra
  // secreta. Solo actúa el Camaleón; los demás miran (y, si no responde en un
  // buen rato, pueden resolver la ronda para que la mesa no se quede colgada).
  //
  // Pasada de UI: el Camaleón ve QUÉ se juega, en qué ORDEN habló la mesa (sus
  // pistas fueron habladas: la app no las guarda, pero el orden es la mitad del
  // recuerdo) y un botón que nombra su apuesta.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { GUESS_GRACE_MS, clueOrder } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ChameleonState } from '../types';
  import Grid from './Grid.svelte';

  const { game, my }: { game: ChameleonState; my: PlayerDoc } = $props();
  const amCham = $derived(my.id === game.chameleonId);
  const inGame = $derived(game.playerIds.includes(my.id));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const spoke = $derived(clueOrder(game).map(nm));
  let pick = $state<number | null>(null);

  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 5000); return () => clearInterval(t); });
  const canResolve = $derived(inGame && !amCham && now - (game.phaseAt || 0) > GUESS_GRACE_MS);
</script>

<div class="narration">🎯 ¡{nm(game.chameleonId)} era el Camaleón! Aún puede escapar si adivina la palabra secreta.</div>

{#if amCham}
  <div class="actionpanel"><h3>🦎 Tu última bala</h3>
    <p class="hint">Señala en la rejilla la palabra que crees que era la secreta.</p>
    <div class="stake">
      <p class="sline">✅ <b>Si aciertas</b> → escapas por la puerta grande: ganas la ronda y te llevas 1 punto.</p>
      <p class="sline">❌ <b>Si fallas</b> → gana el grupo: 1 punto para cada uno de los demás.</p>
    </div>
    <!-- Las pistas se dijeron en voz alta (la app no las guarda): lo que sí
         puede recordarte es en qué orden habló cada cual. -->
    <p class="small-note" style="margin-bottom:0">🗣️ Hablaron por este orden: <b>{spoke.join(' → ')}</b>. Repasa quién dijo qué antes de apostar.</p>
    <Grid grid={game.grid} guess={pick} selectable={true} onpick={(i) => (pick = i)} />
    <button class="danger block" data-a="ch-guess-confirm" disabled={pick === null} onclick={() => (pick !== null ? guard(() => A.chameleonGuess(pick!)) : undefined)}>🎯 {pick !== null ? `Apostar por «${game.grid[pick]}»` : 'Toca primero una palabra'}</button>
    {#if pick !== null}
      <div style="text-align:center;margin-top:8px">
        <button class="small ghost" data-a="ch-guess-clear" onclick={() => (pick = null)}>↩️ Cambiar de palabra</button>
      </div>
    {:else}
      <p class="small-note" style="text-align:center;margin-top:8px">El botón se activa en cuanto marques una casilla, y dirá cuál apuestas.</p>
    {/if}
  </div>
{:else}
  <div class="card">
    <h3 style="margin-bottom:2px">⌛ Está apostando</h3>
    <p class="small-note" style="margin:0">Vosotros sabéis la palabra: ni la digáis ni se la señaléis. Solo {nm(game.chameleonId)} puede tocar la rejilla.</p>
    <Grid grid={game.grid} />
    <p class="small-note">🗣️ Las pistas fueron, por orden: <b>{spoke.join(' → ')}</b>.</p>
    {#if canResolve}
      <p class="small-note">⏱️ Lleva un buen rato sin señalar nada (móvil bloqueado, se ha levantado…).</p>
      <button class="ghost block" data-a="ch-resolve-guess" onclick={() => guard(A.resolveNoGuess)}>⏱️ Dar la ronda por resuelta (cuenta como fallo)</button>
    {/if}
  </div>
{/if}

<style>
  .stake {
    margin: 4px 0 10px; padding: 9px 12px; border-radius: 10px;
    border: 1px solid var(--accent, #f2b552);
    background: color-mix(in srgb, var(--accent, #f2b552) 10%, transparent);
  }
  .stake .sline { font-size: 0.84rem; margin: 5px 0; color: var(--muted, #a9a6c0); }
</style>
