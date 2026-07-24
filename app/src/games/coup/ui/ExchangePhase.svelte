<script lang="ts">
  // Intercambio del Embajador: elegir 2 de 4 (o 1 de 3) con el efecto de cada
  // carta a la vista, marcado lo que ya era TUYO y lo que acaba de salir de la
  // corte, un contador de cuántas te faltan y un botón final que dice con qué te
  // quedas. Solo el interesado ve las opciones; los demás esperan sabiendo qué
  // pasa.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { CHARACTERS, COPIES } from '../chars';
  import CharRef from './CharRef.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CoupState } from '../types';

  const { game, my }: { game: CoupState; my: PlayerDoc } = $props();
  const ex = $derived(game.exchange);
  const mine = $derived(!!ex && ex.pid === my.id);
  // Las 2 últimas opciones son las robadas de la corte; las primeras, tu mano.
  const drawnFrom = $derived(ex ? ex.options.length - 2 : 0);

  // Copias ya boca arriba (público): decide si vale la pena quedarse un personaje.
  const shown = $derived.by(() => {
    const n = { duque: 0, asesino: 0, capitan: 0, embajador: 0, condesa: 0 };
    for (const pid of game.playerIds) for (const h of game.hands[pid] || []) if (h.lost) n[h.char] += 1;
    return n;
  });

  let keep = $state<number[]>([]);
  const full = $derived(!!ex && keep.length === ex.keep);
  const left = $derived(ex ? ex.keep - keep.length : 0);
  const kept = $derived(ex ? keep.map((i) => `${CHARACTERS[ex.options[i]].emoji} ${CHARACTERS[ex.options[i]].name}`) : []);
  function toggle(i: number) {
    if (!ex) return;
    if (keep.includes(i)) keep = keep.filter((x) => x !== i);
    else if (keep.length < ex.keep) keep = [...keep, i];
  }
</script>

{#if mine && ex}
  <div class="narration">🎭 Intercambio con la corte. Elige las <b>{ex.keep}</b> carta{ex.keep === 1 ? '' : 's'} que conservas; el resto vuelve a la corte.</div>
  <div class="actionpanel">
    <h3 style="margin-top:0">🎭 Elige {ex.keep} de {ex.options.length}</h3>
    <p class="hint">Nadie ve esta pantalla. Las que no elijas vuelven barajadas a la corte, así que también sirve para <b>deshacerte de un farol descubierto</b>.</p>
    {#each ex.options as char, i (i)}
      <button class="exopt {keep.includes(i) ? 'sel' : ''}" data-a="coup-keep" data-p={String(i)} onclick={() => toggle(i)}>
        <b>{keep.includes(i) ? '✔️ ' : ''}{CHARACTERS[char].emoji} {CHARACTERS[char].name}</b>
        <span class="eff">{CHARACTERS[char].power}</span>
        <span class="meta">{i < drawnFrom ? '🖐️ ya la tenías' : '🆕 recién sacada de la corte'} · {COPIES} copias{shown[char] ? ` · ${shown[char]} boca arriba` : ''}</span>
      </button>
    {/each}
    <p class="small-note" style="margin-bottom:0">
      {#if left > 0}Te falta{left === 1 ? '' : 'n'} <b>{left}</b> por elegir.{:else}Te quedas con <b>{kept.join(' y ')}</b>; el resto vuelve a la corte.{/if}
    </p>
    <button class="primary block" data-a="coup-exchange-confirm" disabled={!full}
      onclick={() => guard(() => A.exchangeKeep(keep))}>
      {full ? `🎭 Quedarme con ${kept.join(' y ')}` : `🎭 Elige ${left} carta${left === 1 ? '' : 's'} más`}
    </button>
    <CharRef {game} />
  </div>
{:else}
  <div class="narration">🎭 <b>{game.names[ex?.pid || ''] || '¿?'}</b> baraja con la corte y decide qué se queda…</div>
  <div class="card">
    <p class="hint">🎭 Ha robado 2 cartas de la corte y elige con cuáles se queda; las que devuelva vuelven barajadas. Nadie (ni la app) dirá cuáles eran: solo que ya no es el mismo de antes.</p>
    <CharRef {game} label="📖 Repasa la corte mientras esperas" />
  </div>
{/if}

<style>
  .exopt {
    display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 11px 12px;
    border-radius: var(--r-2); border: 1px solid var(--line-2); background: var(--card2);
    color: inherit; cursor: pointer; width: 100%; margin-bottom: 8px; min-height: 44px;
  }
  .exopt.sel { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; background: color-mix(in srgb, var(--accent) 12%, var(--card2)); }
  .exopt .eff { font-size: 0.82rem; color: var(--text); }
  .exopt .meta { font-size: 0.78rem; color: var(--muted); }
</style>
