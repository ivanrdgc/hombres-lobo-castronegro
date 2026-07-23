<script lang="ts">
  // Intercambio del Embajador: la app le muestra sus cartas ocultas + 2 de la
  // corte; elige cuáles conserva (tantas como influencias tenga) y devuelve el
  // resto. Solo el interesado ve las opciones; los demás esperan.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { CHARACTERS } from '../chars';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CoupState } from '../types';

  const { game, my }: { game: CoupState; my: PlayerDoc } = $props();
  const ex = $derived(game.exchange);
  const mine = $derived(!!ex && ex.pid === my.id);

  let keep = $state<number[]>([]);
  const full = $derived(!!ex && keep.length === ex.keep);
  function toggle(i: number) {
    if (!ex) return;
    if (keep.includes(i)) keep = keep.filter((x) => x !== i);
    else if (keep.length < ex.keep) keep = [...keep, i];
  }
</script>

{#if mine && ex}
  <div class="narration">🎭 Intercambio con la corte. Elige las <b>{ex.keep}</b> carta{ex.keep === 1 ? '' : 's'} que conservas; el resto vuelve a la corte.</div>
  <div class="actionpanel">
    {#each ex.options as char, i (i)}
      <button class="exopt {keep.includes(i) ? 'sel' : ''}" data-a="coup-keep" data-p={String(i)} onclick={() => toggle(i)}>
        <b>{CHARACTERS[char].emoji} {CHARACTERS[char].name}</b>
        <span>{keep.includes(i) ? '✔️ conservar' : CHARACTERS[char].power}</span>
      </button>
    {/each}
    <button class="primary block" data-a="coup-exchange-confirm" disabled={!full}
      onclick={() => guard(() => A.exchangeKeep(keep))}>🎭 Conservar estas {ex.keep} y devolver el resto</button>
  </div>
{:else}
  <div class="narration">🎭 <b>{game.names[ex?.pid || ''] || '¿?'}</b> baraja con la corte y decide qué se queda…</div>
{/if}

<style>
  .exopt { display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line, #2a2f45); background: var(--card, #171a2b); color: inherit; cursor: pointer; width: 100%; margin-bottom: 8px; }
  .exopt.sel { border-color: var(--accent, #d8a24a); box-shadow: 0 0 0 1px var(--accent, #d8a24a) inset; }
  .exopt span { font-size: 0.8rem; color: var(--muted, #97a); }
</style>
