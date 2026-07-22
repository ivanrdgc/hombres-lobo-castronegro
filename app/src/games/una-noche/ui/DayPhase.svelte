<script lang="ts">
  // Día: como en Los Hombres Lobo, UNA persona registra la decisión del pueblo
  // (condenar a alguien —puedes incluirte— o perdonar). Si el condenado resulta
  // ser el Cazador, dispara su flecha (pendiente, como allí). Tu carta inicial
  // se puede volver a consultar (con el aviso de que pudo cambiar).
  import { guard } from '../../../core/sync/guard';
  import { sel1, selIds } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';
  import MyCard from './MyCard.svelte';
  import UnaGrid from './UnaGrid.svelte';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

  const players = $derived(playersOf(game));
  const inGame = $derived(game.playerIds.includes(my.id));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const hunter = $derived(game.pendingHunter || null);
  // El pueblo puede condenar a varios (empate → mueren todos) o a nadie (perdón).
  const voteSel = $derived(selIds('una-vote'));
  const hunterSel = $derived(sel1('una-hunter'));
</script>

<div class="narration">☀️ Es de día. Debatid quién esconde colmillos. Cuando el pueblo decida, que alguien registre la condena (o el perdón).</div>

{#if inGame}<MyCard {game} pid={my.id} />{/if}

{#if hunter}
  <!-- Flecha del Cazador: la registra el propio Cazador o el narrador. -->
  {#if my.id === hunter}
    <div class="actionpanel"><h3>🏹 ¡Eras el Cazador!</h3>
      <p class="hint">Te han linchado, pero tu flecha aún vuela: llévate a alguien contigo (puedes no disparar).</p>
      <UnaGrid {players} selKey="una-hunter" exclude={[my.id]} />
      <button class="danger block" data-a="una-hunter-shoot" disabled={!hunterSel} onclick={() => (hunterSel ? guard(() => A.hunterShoot(hunterSel)) : undefined)}>🏹 {hunterSel ? `Disparar a ${nm(hunterSel)}` : 'Disparar'}</button>
      <button class="ghost block" data-a="una-hunter-skip" onclick={() => guard(() => A.hunterShoot(null))}>No disparar</button>
    </div>
  {:else}
    <div class="narration">🏹 {nm(hunter)} era el Cazador: su flecha busca una última víctima…</div>
  {/if}
{:else if game.lynched == null}
  <!-- Nadie ha registrado aún: cualquiera en juego lo hace. -->
  {#if inGame}
    <div class="actionpanel"><h3>⚖️ Registrar la decisión del pueblo</h3>
      <p class="hint">Debatid y, cuando os pongáis de acuerdo, señalad a quién condena el pueblo (puedes votarte a ti). Si hubo <b>empate</b>, marcad a <b>varios</b>: caen todos. O perdonad y que no muera nadie. Lo registra una sola persona.</p>
      <UnaGrid {players} selKey="una-vote" max={players.length} />
      <button class="danger block" data-a="una-vote" disabled={!voteSel.length} onclick={() => (voteSel.length ? guard(() => A.castVote(voteSel)) : undefined)}>⚖️ {voteSel.length > 1 ? `Condenar a ${voteSel.length} (empate)` : voteSel.length === 1 ? `Condenar a ${nm(voteSel[0])}` : 'Condenar a los señalados'}</button>
      <button class="ghost block" data-a="una-vote-nadie" onclick={() => guard(() => A.castVote([]))}>🕊️ El pueblo perdona (nadie muere)</button>
    </div>
  {:else}
    <div class="card"><p class="hint">👀 El pueblo debate y decide a quién condenar…</p></div>
  {/if}
{:else}
  <div class="actionpanel"><h3>⚖️ Decisión registrada</h3>
    <p class="hint">{game.lynched && game.lynched.length ? `El pueblo condena a ${game.lynched.map(nm).join(', ')}.` : 'El pueblo ha perdonado.'} Resolviendo…</p></div>
{/if}
