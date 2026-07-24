<script lang="ts">
  // Turno del jugador: elige cuál de sus dos cartas juega, su objetivo (si lo
  // pide) y —con el Guardia— qué carta adivina. Respeta la Condesa forzada.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { validTargets, playableIdx, countessForced } from '../engine';
  import { CARD_INFO, NEEDS_TARGET, VALUE } from '../cards';
  import type { Card } from '../cards';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { LoveLetterState } from '../types';

  const { game, my }: { game: LoveLetterState; my: PlayerDoc } = $props();
  const hand = $derived(game.hands[my.id] || []);
  const playable = $derived(playableIdx(game, my.id));
  const forced = $derived(countessForced(hand));

  let sel = $state<number | null>(null);
  let tgt = $state<string | null>(null);
  let gss = $state<Card | null>(null);
  // Al cambiar de carta elegida, resetea objetivo y adivinanza.
  $effect(() => { void sel; tgt = null; gss = null; });

  const card = $derived(sel !== null ? hand[sel] : null);
  const targets = $derived(card ? validTargets(game, my.id, card) : []);
  const needTarget = $derived(!!card && NEEDS_TARGET[card] && targets.length > 0);
  const guessable: Card[] = ['priest', 'baron', 'handmaid', 'prince', 'king', 'countess', 'princess'];
  const canPlay = $derived(
    sel !== null && playable.includes(sel)
    && (!needTarget || !!tgt)
    && !(card === 'guard' && tgt && !gss),
  );
  const nm = (pid: string) => game.names[pid] || '¿?';
</script>

<div class="actionpanel"><h3>🎴 Tu turno</h3>
  <p class="hint">Elige qué carta juegas. La otra se queda en tu mano.{forced ? ' (Con Rey/Príncipe + Condesa, debes jugar la Condesa.)' : ''}</p>
  <div class="btnrow">
    {#each hand as c, i (i)}
      <button class="{sel === i ? 'primary' : 'ghost'}" data-a="ll-card" data-p={String(i)}
        disabled={!playable.includes(i)} onclick={() => (sel = i)}>
        {CARD_INFO[c].emoji} {CARD_INFO[c].name} ({VALUE[c]})
      </button>
    {/each}
  </div>
  {#if card}
    <p class="small-note" style="margin:8px 0 2px">{CARD_INFO[card].short}</p>
    {#if needTarget}
      <p class="small-note" style="margin:6px 0 2px"><b>¿A quién?</b></p>
      <div class="btnrow" style="flex-wrap:wrap">
        {#each targets as t (t)}
          <button class="small {tgt === t ? 'primary' : 'ghost'}" data-a="ll-target" data-p={t} onclick={() => (tgt = t)}>{nm(t)}</button>
        {/each}
      </div>
    {:else if card && NEEDS_TARGET[card]}
      <p class="small-note">Nadie a quien apuntar (todos protegidos): se juega sin efecto.</p>
    {/if}
    {#if card === 'guard' && tgt}
      <p class="small-note" style="margin:6px 0 2px"><b>¿Qué carta tiene?</b></p>
      <div class="btnrow" style="flex-wrap:wrap">
        {#each guessable as gc (gc)}
          <button class="small {gss === gc ? 'primary' : 'ghost'}" data-a="ll-guess" data-p={gc} onclick={() => (gss = gc)}>{CARD_INFO[gc].emoji} {CARD_INFO[gc].name}</button>
        {/each}
      </div>
    {/if}
  {/if}
  <button class="primary block" style="margin-top:10px" data-a="ll-play" disabled={!canPlay}
    onclick={() => (canPlay && sel !== null ? guard(() => A.playCard(sel!, tgt, gss)) : undefined)}>
    ▶️ Jugar{card ? ` ${CARD_INFO[card].name}` : ''}
  </button>
</div>
