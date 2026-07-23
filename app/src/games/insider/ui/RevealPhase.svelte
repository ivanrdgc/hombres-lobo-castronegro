<script lang="ts">
  // Reparto de Insider: cada cual mira su carta y confirma. El Maestro (público)
  // pone el reloj en marcha cuando todos han confirmado.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { InsiderState } from '../types';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: InsiderState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const amMaster = $derived(my.id === game.masterId);
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map((pid) => game.names[pid] || pid));
  const masterName = $derived(game.names[game.masterId] || '¿?');
  const starterName = $derived(game.names[game.playerIds[game.starterIdx]] || '¿?');
</script>

<div class="narration">🤫 Ronda {game.round}. El Maestro es <b>{masterName}</b> (lo sabéis todos). Mirad vuestra carta: sabréis si sois del equipo, el Insider… o el propio Maestro.</div>

{#if inGame && !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <MyCard {game} pid={my.id} />
    <button class="primary block" data-a="ins-seen" onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo tengo</button>
  {:else}
    <div class="card"><p class="small-note">🎴 Tu carta está lista. Mírala sin que nadie vea tu pantalla y confirma.</p>
      <button class="primary block" data-a="ins-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta</button></div>
  {/if}
{:else if pend.length}
  <div class="waitlist">Esperando a que confirmen: {pend.join(', ')}</div>
{:else if amMaster}
  <div class="card"><h3>⏱ Todos listos</h3>
    <p class="small-note">{Math.round(game.durationMs / 60000)} minutos de preguntas. Empieza preguntando <b>{starterName}</b>; tú respondes sí, no o no lo sé.</p>
    <button class="primary block" data-a="ins-begin" onclick={() => guard(A.beginQuestions)}>⏱ Poner el reloj en marcha</button></div>
{:else}
  <div class="card"><h3>⏱ Todos listos</h3>
    <p class="small-note">Esperando a que el Maestro (<b>{masterName}</b>) ponga el reloj en marcha. Empezará preguntando <b>{starterName}</b>.</p></div>
{/if}
