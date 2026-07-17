<script lang="ts">
  // Ronda en marcha: cronómetro, carta propia mini, acusación (una por
  // jugador), la apuesta del espía y la parrilla pública de localizaciones.
  // Cualquier dispositivo intenta timeUp() cuando el reloj llega a cero
  // (transacción «primero gana»: sin conductor único).
  import { guard } from '../../../core/sync/guard';
  import { app } from '../../../core/sync/store.svelte';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';
  import Timer from './Timer.svelte';
  import SpyCard from './SpyCard.svelte';
  import LugaresGrid from './LugaresGrid.svelte';

  const { game, my, spectator }: { game: EspiaState; my: PlayerDoc; spectator: boolean } = $props();

  const inRound = $derived(!spectator && game.playerIds.includes(my.id));
  const canAccuse = $derived(inRound && game.phase === 'play' && !game.vote && !game.accusedUsed[my.id]);
  const spy = $derived(inRound && my.id === game.spyId);

  let pick = $state<string | null>(null);
  const pickName = $derived(pick ? game.names[pick] || '' : null);

  function accuseNow() {
    if (!pick) return;
    const target = pick;
    void guard(async () => { await A.accuse(target); pick = null; });
  }

  // Reloj a cero: cualquier dispositivo dispara la tanda de acusaciones.
  $effect(() => {
    const t = setInterval(() => {
      if (game.phase === 'play' && !game.vote && game.deadline !== null && Date.now() >= game.deadline + 400) {
        void guard(A.timeUp);
      }
    }, 1000);
    return () => clearInterval(t);
  });
</script>

<Timer {game} />
{#if game.phase === 'play'}
  <div class="narration">❓ Pregunta <b>{game.names[game.dealerId] || '¿?'}</b> primero; el interrogado pregunta después. Prohibido devolver la pregunta y prohibido nombrar el lugar.</div>
{/if}

{#if inRound}
  <SpyCard {game} pid={my.id} mini={true} />

  {#if canAccuse}
    <div class="actionpanel"><h3>🛑 ¿Sospechas de alguien?</h3>
      <p class="hint">Puedes parar el reloj UNA vez por ronda. Si la mesa no es unánime, la habrás gastado para nada.</p>
      <div class="players">
        {#each game.playerIds.filter((id) => id !== my.id) as pid (pid)}
          <div class="player selectable {pick === pid ? 'selected' : ''}" data-a="espia-accuse-pick" data-p={pid}
            onclick={() => (pick = pick === pid ? null : pid)}
            role="button" tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') pick = pick === pid ? null : pid; }}>
            <span class="pname">{game.names[pid] || pid}</span>
            {#if game.accusedUsed[pid]}<span class="badge" title="Ya ha usado su acusación">🛑</span>{/if}
          </div>
        {/each}
      </div>
      <button class="danger block" data-a="espia-accuse" disabled={!pick} onclick={accuseNow}>🛑 {pickName ? `Parar el reloj y acusar a ${pickName}` : 'Parar el reloj y acusar'}</button>
    </div>
  {:else if inRound && game.phase === 'play' && !game.vote && game.accusedUsed[my.id]}
    <p class="small-note" style="text-align:center">🛑 Ya has gastado tu acusación de esta ronda.</p>
  {/if}

  {#if spy && game.phase === 'play' && !game.vote}
    <div class="card" style="border-color:var(--accent)">
      <p class="small-note" style="margin-top:0">🎭 Solo tú ves esto: cuando creas saber el lugar, revélate y adivina. La ronda termina, aciertes o falles.</p>
      <button class="violet block" data-a="espia-guess-open" onclick={() => (app.ui.modal = { type: 'espia-guess' })}>🎭 Revelarme y adivinar el lugar</button>
    </div>
  {/if}
{/if}

<div class="card">
  <h3>📍 Localizaciones posibles</h3>
  <LugaresGrid />
</div>
