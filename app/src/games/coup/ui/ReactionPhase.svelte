<script lang="ts">
  // Ventanas de reacción de Coup: desafiar una acción, bloquearla o desafiar un
  // bloqueo. Cada reactor decide (desafiar / bloquear / paso); la app avanza en
  // cuanto alguien actúa o cuando todos han pasado.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ACTIONS, CHARACTERS, charName } from '../chars';
  import { allowedReactions, reactorsOf } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CoupState, Character } from '../types';

  const { game, my }: { game: CoupState; my: PlayerDoc } = $props();
  const nm = (pid: string | null | undefined) => (pid && game.names[pid]) || '¿?';

  const mine = $derived(allowedReactions(game, my.id));
  const iReacted = $derived(game.reactions[my.id] !== undefined);
  const canReact = $derived(mine.challenge || mine.block);
  const waiting = $derived(reactorsOf(game).filter((pid) => game.reactions[pid] === undefined).map(nm));

  const prompt = $derived.by(() => {
    const p = game.pending;
    if (game.phase === 'challengeBlock' && game.block) {
      const what = p?.type === 'ayuda' ? 'la ayuda exterior' : p?.type === 'asesinar' ? 'el asesinato' : 'el robo';
      return `🛡️ ${nm(game.block.by)} bloquea ${what} diciendo ser ${charName(game.block.claim)}.`;
    }
    if (!p) return '';
    const tgt = p.target ? ` a ${nm(p.target)}` : '';
    if (game.phase === 'challengeAction') {
      return `${ACTIONS[p.type].emoji} ${nm(p.actor)} declara ${ACTIONS[p.type].name}${tgt} diciendo ser ${charName(p.claim!)}.`;
    }
    // block: sin desafío a la acción
    if (p.type === 'ayuda') return `🤝 ${nm(p.actor)} pide ayuda exterior (+2).`;
    if (p.type === 'asesinar') return `🗡️ ${nm(p.actor)} intenta asesinar${tgt}.`;
    return `⚓ ${nm(p.actor)} intenta robar${tgt}.`;
  });

  const question = $derived(
    game.phase === 'challengeBlock' ? '¿Desafías el bloqueo?'
      : game.phase === 'block' ? '¿Lo bloqueas?'
        : '¿Desafías el farol?',
  );

  function doBlock(claim: Character) { guard(() => A.block(claim)); }
</script>

<div class="narration">{prompt}</div>

{#if canReact && !iReacted}
  <div class="actionpanel">
    <h3 style="margin-top:0">{question}</h3>
    {#if mine.challenge}
      <button class="danger block" data-a="coup-challenge" onclick={() => guard(A.challenge)}>❗ Desafiar</button>
    {/if}
    {#each mine.blockClaims as claim (claim)}
      <button class="block" data-a="coup-block" data-p={claim} onclick={() => doBlock(claim)}>🛡️ Bloquear · digo ser {CHARACTERS[claim].emoji} {charName(claim)}</button>
    {/each}
    <button class="ghost block" data-a="coup-pass" onclick={() => guard(A.pass)}>👍 Paso (lo dejo pasar)</button>
    {#if game.phase === 'challengeAction'}<p class="small-note">Si desafías y mentía, pierde una influencia; si decía la verdad, la pierdes tú.</p>{/if}
  </div>
{:else if iReacted}
  <div class="card"><p class="hint">✅ Ya has reaccionado. Esperando a: {waiting.join(', ') || '…'}</p></div>
{:else}
  <div class="card"><p class="hint">⏳ Esperando la reacción de: {waiting.join(', ') || '…'}</p></div>
{/if}
