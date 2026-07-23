<script lang="ts">
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { topicName } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ChameleonState } from '../types';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: ChameleonState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map((pid) => game.names[pid] || pid));
</script>

<div class="narration">🦎 Tema: <b>{topicName(game.topicId)}</b>. Estudiad la rejilla de arriba. Mirad vuestra carta: sabréis la palabra secreta… o que sois el Camaleón.</div>

{#if inGame && !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <MyCard {game} pid={my.id} />
    <button class="primary block" data-a="ch-seen" onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo tengo</button>
  {:else}
    <div class="card"><p class="small-note">🎴 Tu carta está lista. Mírala sin que nadie vea tu pantalla y confirma.</p>
      <button class="primary block" data-a="ch-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta</button></div>
  {/if}
{:else if pend.length}
  <div class="waitlist">Esperando a que confirmen: {pend.join(', ')}</div>
{:else}
  <div class="card"><h3>🗣️ Listos</h3>
    <p class="small-note">Empieza dando pista <b>{game.names[game.playerIds[game.starterIdx]] || '¿?'}</b>; una palabra cada uno, por turnos.</p>
    <button class="primary block" data-a="ch-begin" onclick={() => guard(A.beginClues)}>🗣️ Empezar las pistas</button></div>
{/if}
