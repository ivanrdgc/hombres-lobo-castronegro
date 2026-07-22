<script lang="ts">
  // Día: como en Los Hombres Lobo, UNA persona registra la decisión del pueblo
  // (condenar a alguien —puedes incluirte— o perdonar). Si el condenado resulta
  // ser el Cazador, dispara su flecha (pendiente, como allí). Tu carta inicial
  // se puede volver a consultar (con el aviso de que pudo cambiar).
  import { guard } from '../../../core/sync/guard';
  import { sel1 } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';
  import MyCard from './MyCard.svelte';
  import UnaGrid from './UnaGrid.svelte';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

  const players = $derived(playersOf(game));
  const inGame = $derived(game.playerIds.includes(my.id));
  const myCard = $derived(game.originalRole[my.id]);
  const nm = (pid: string) => game.names[pid] || '¿?';
  const hunter = $derived(game.pendingHunter || null);
</script>

<div class="narration">☀️ Es de día. Debatid quién esconde colmillos. Cuando el pueblo decida, que alguien registre la condena (o el perdón).</div>

{#if inGame}<MyCard role={myCard} />{/if}

{#if hunter}
  <!-- Flecha del Cazador: la registra el propio Cazador o el narrador. -->
  {#if my.id === hunter}
    <div class="actionpanel"><h3>🏹 ¡Eras el Cazador!</h3>
      <p class="hint">Te han linchado, pero tu flecha aún vuela: llévate a alguien contigo (puedes no disparar).</p>
      <UnaGrid {players} selKey="una-hunter" exclude={[my.id]} />
      <button class="danger block" data-a="una-hunter-shoot" disabled={!sel1('una-hunter')} onclick={() => (sel1('una-hunter') ? guard(() => A.hunterShoot(sel1('una-hunter'))) : undefined)}>🏹 {sel1('una-hunter') ? `Disparar a ${nm(sel1('una-hunter'))}` : 'Disparar'}</button>
      <button class="ghost block" data-a="una-hunter-skip" onclick={() => guard(() => A.hunterShoot(null))}>No disparar</button>
    </div>
  {:else}
    <div class="narration">🏹 {nm(hunter)} era el Cazador: su flecha busca una última víctima…</div>
  {/if}
{:else if game.lynched == null}
  <!-- Nadie ha registrado aún: cualquiera en juego lo hace. -->
  {#if inGame}
    <div class="actionpanel"><h3>⚖️ Registrar la decisión del pueblo</h3>
      <p class="hint">Debatid y, cuando os pongáis de acuerdo, tocad a quién condenar (puedes votarte a ti) o perdonad. Lo registra una sola persona.</p>
      <UnaGrid {players} selKey="una-vote" />
      <button class="danger block" data-a="una-vote" disabled={!sel1('una-vote')} onclick={() => (sel1('una-vote') ? guard(() => A.castVote(sel1('una-vote'))) : undefined)}>⚖️ {sel1('una-vote') ? `Condenar a ${nm(sel1('una-vote'))}` : 'Condenar al elegido'}</button>
      <button class="ghost block" data-a="una-vote-nadie" onclick={() => guard(() => A.castVote('nadie'))}>🕊️ El pueblo perdona (nadie muere)</button>
    </div>
  {:else}
    <div class="card"><p class="hint">👀 El pueblo debate y decide a quién condenar…</p></div>
  {/if}
{:else}
  <div class="actionpanel"><h3>⚖️ Decisión registrada</h3>
    <p class="hint">{game.lynched === 'nadie' ? 'El pueblo ha perdonado.' : `El pueblo condena a ${nm(game.lynched)}.`} Resolviendo…</p></div>
{/if}
