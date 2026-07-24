<script lang="ts">
  // Alguien debe descubrir (perder) una influencia. Solo el afectado elige cuál
  // revela, y con lo que implica escrito: qué poder pierde, qué información
  // regala a la mesa y cuántas influencias le quedan después. Destapar es
  // irreversible, así que va en dos gestos (elegir → confirmar).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { CHARACTERS, CHAR_LOSS, COPIES } from '../chars';
  import { influenceCount } from '../engine';
  import CharRef from './CharRef.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CoupState } from '../types';

  const { game, my }: { game: CoupState; my: PlayerDoc } = $props();
  const loser = $derived(game.losing[0]?.pid || null);
  const mine = $derived(loser === my.id);
  const reasonTxt: Record<string, string> = {
    golpe: 'por el golpe de Estado', asesinato: 'por el asesinato',
    desafio: 'por perder el desafío', bloqueo: 'por el bloqueo mentiroso',
  };
  const reason = $derived(game.losing[0] ? reasonTxt[game.losing[0].reason] : '');
  // Índices de las cartas AÚN ocultas (las que puede descubrir).
  const options = $derived((game.hands[my.id] || []).map((h, i) => ({ ...h, i })).filter((x) => !x.lost));
  const left = $derived(Math.max(0, influenceCount(game, my.id) - 1));

  const shown = $derived.by(() => {
    const n = { duque: 0, asesino: 0, capitan: 0, embajador: 0, condesa: 0 };
    for (const pid of game.playerIds) for (const h of game.hands[pid] || []) if (h.lost) n[h.char] += 1;
    return n;
  });

  let pick = $state<number | null>(null);
  const picked = $derived(pick !== null ? (game.hands[my.id] || [])[pick] : null);
  // Si la cola encadena otra pérdida, la elección anterior ya no vale.
  $effect(() => { void game.log.length; void loser; pick = null; });
</script>

{#if mine}
  <div class="narration">💥 Pierdes una influencia {reason}. Elige qué carta descubres (queda fuera de juego).</div>
  <div class="actionpanel">
    {#if pick === null || !picked}
      <h3 style="margin-top:0">💥 ¿Cuál descubres?</h3>
      <p class="hint">La que elijas queda <b>boca arriba para siempre</b>: pierdes su poder y toda la mesa sabrá que la tenías. Te quedará{left === 1 ? '' : 'n'} <b>{left}</b> influencia{left === 1 ? '' : 's'}{left === 1 ? ': la siguiente pérdida te elimina' : ''}.</p>
      {#each options as card (card.i)}
        <button class="loseopt" data-a="coup-lose" data-p={String(card.i)} onclick={() => (pick = card.i)}>
          <b>{CHARACTERS[card.char].emoji} {CHARACTERS[card.char].name}</b>
          <span class="eff">{CHARACTERS[card.char].power}</span>
          <span class="meta">Si la descubres: {CHAR_LOSS[card.char]}</span>
          <span class="meta">{COPIES} copias en la corte{shown[card.char] ? ` · ${shown[card.char]} ya boca arriba` : ''}</span>
        </button>
      {/each}
    {:else}
      <h3 style="margin-top:0">💥 Vas a descubrir {CHARACTERS[picked.char].emoji} {CHARACTERS[picked.char].name}</h3>
      <p class="hint">Al destaparla, {CHAR_LOSS[picked.char]} No hay vuelta atrás.</p>
      <button class="ghost block small" data-a="coup-lose-back" onclick={() => (pick = null)}>↩️ Elegir la otra</button>
      <button class="danger block" data-a="coup-lose-confirm"
        onclick={() => (pick !== null ? guard(() => A.chooseLoss(pick!)) : undefined)}>
        💥 Descubrir {CHARACTERS[picked.char].emoji} {CHARACTERS[picked.char].name}
      </button>
    {/if}
    <CharRef {game} />
  </div>
{:else}
  <div class="narration">💥 <b>{game.names[loser || ''] || '¿?'}</b> tiene que descubrir una influencia {reason}…</div>
  <div class="card">
    <p class="hint">⏳ Está eligiendo cuál de sus cartas destapa. En cuanto lo haga, quedará boca arriba en el tablero para toda la partida: es información que conviene recordar.</p>
    <CharRef {game} label="📖 Repasa la corte mientras esperas" />
  </div>
{/if}

<style>
  .loseopt {
    display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 11px 12px;
    border-radius: var(--r-2); border: 1px solid var(--line-2); background: var(--card2);
    color: inherit; cursor: pointer; width: 100%; margin-bottom: 8px; min-height: 44px;
  }
  .loseopt .eff { font-size: 0.82rem; color: var(--text); }
  .loseopt .meta { font-size: 0.8rem; color: var(--muted); }
</style>
