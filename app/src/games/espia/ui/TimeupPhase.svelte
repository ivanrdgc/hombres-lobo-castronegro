<script lang="ts">
  // El tiempo se agotó: acusaciones por turnos desde el repartidor. En tu
  // turno, señala a un sospechoso o pasa; cada acusación se vota igual.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { timeupOrder } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';
  import SpyCard from './SpyCard.svelte';

  const { game, my }: { game: EspiaState; my: PlayerDoc } = $props();

  const order = $derived(timeupOrder(game));
  const turnPid = $derived(game.timeupTurn !== null ? order[game.timeupTurn] : null);
  const myTurn = $derived(!game.vote && turnPid === my.id);

  let pick = $state<string | null>(null);
  const pickName = $derived(pick ? game.names[pick] || '' : null);

  function accuseNow() {
    if (!pick) return;
    const target = pick;
    void guard(async () => { await A.timeupAccuse(target); pick = null; });
  }
</script>

<div class="narration">⏰ ¡Se acabó el tiempo! Nadie habla más del caso: acusaciones por turnos. {#if turnPid && !game.vote}Turno de <b>{game.names[turnPid] || '¿?'}</b>.{/if}</div>
{#if game.playerIds.includes(my.id)}<SpyCard {game} pid={my.id} mini={true} />{/if}

{#if myTurn}
  <div class="actionpanel"><h3>👉 Tu acusación</h3>
    <p class="hint">Señala a tu sospechoso (se vota con unanimidad) o pasa el turno.</p>
    <div class="players">
      {#each game.playerIds.filter((id) => id !== my.id) as pid (pid)}
        <div class="player selectable {pick === pid ? 'selected' : ''}" data-a="espia-tu-pick" data-p={pid}
          onclick={() => (pick = pick === pid ? null : pid)}
          role="button" tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') pick = pick === pid ? null : pid; }}>
          <span class="pname">{game.names[pid] || pid}</span>
        </div>
      {/each}
    </div>
    <button class="danger block" data-a="espia-tu-accuse" disabled={!pick} onclick={accuseNow}>👉 {pickName ? `Acusar a ${pickName}` : 'Acusar'}</button>
    <button class="ghost block" data-a="espia-tu-pass" onclick={() => guard(A.timeupPass)}>🤐 Paso</button>
  </div>
{:else if !game.vote && turnPid}
  <div class="waitlist">Esperando la acusación de {game.names[turnPid] || '¿?'}…</div>
{/if}
