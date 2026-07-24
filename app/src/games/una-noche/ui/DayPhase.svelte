<script lang="ts">
  // Día: como en Los Hombres Lobo, UNA persona registra la decisión del pueblo
  // (condenar a alguien —puedes incluirte— o perdonar). Si el condenado resulta
  // ser el Cazador, dispara su flecha (pendiente, como allí). Tu carta inicial
  // se puede volver a consultar (con el aviso de que pudo cambiar).
  // La pantalla explica CÓMO se vota (todos a la vez), quién registra, qué
  // significan el empate y el perdón, y nombra la consecuencia antes de cerrar.
  import { guard } from '../../../core/sync/guard';
  import { sel1, selIds } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';
  import DebateTimer from './DebateTimer.svelte';
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
  // El perdón cierra la partida de un toque y sin selección previa: se confirma.
  let pardonArmed = $state(false);
</script>

<div class="narration">☀️ Es de día. Nadie ha muerto esta noche… pero puede que alguien ya no sea quien era. Debatid quién esconde colmillos.</div>

<DebateTimer {game} />

{#if inGame}<MyCard {game} pid={my.id} />{/if}

{#if hunter}
  <!-- Flecha del Cazador: la registra el propio Cazador o el narrador. -->
  {#if my.id === hunter}
    <div class="actionpanel"><h3>🏹 ¡Eras el Cazador!</h3>
      <p class="hint">Te han linchado (contaba tu carta FINAL), pero tu flecha aún vuela: te llevas a alguien contigo. La regla de la mesa dice que caiga <b>a quien tú señalaste</b> en la votación… y también puedes no disparar.</p>
      <p class="ask">¿A quién te llevas por delante?</p>
      <!-- Solo se puede disparar a quien sigue en pie: los ya caídos, fuera. -->
      <UnaGrid {players} selKey="una-hunter" exclude={[my.id, ...(game.deaths || [])]} />
      <button class="danger block" data-a="una-hunter-shoot" disabled={!hunterSel} onclick={() => (hunterSel ? guard(() => A.hunterShoot(hunterSel)) : undefined)}>🏹 {hunterSel ? `Disparar a ${nm(hunterSel)}` : 'Disparar'}</button>
      {#if !hunterSel}<p class="why">Marca antes a quién te llevas (los ya caídos no aparecen).</p>{/if}
      <button class="ghost block" data-a="una-hunter-skip" onclick={() => guard(() => A.hunterShoot(null))}>🕊️ No disparar a nadie</button>
    </div>
  {:else}
    <div class="narration">🏹 {nm(hunter)} era el Cazador: su flecha busca una última víctima…</div>
  {/if}
{:else if game.lynched == null}
  <!-- Nadie ha registrado aún: cualquiera en juego lo hace. -->
  {#if inGame}
    <div class="actionpanel"><h3>⚖️ La votación del pueblo</h3>
      <ol class="howvote">
        <li>Debatid hasta que se agote el reloj de arriba.</li>
        <li>Alguien cuenta hasta tres y <b>TODOS señaláis a la vez</b> con el dedo. Nadie se guarda el voto para ver por dónde van los demás.</li>
        <li>Después, <b>una sola persona</b> —da igual quién— registra aquí abajo lo que salió. Se registra una vez y es definitivo.</li>
      </ol>
      <p class="ask">Marca a quien salió más señalado</p>
      <p class="hint">Puedes marcarte a ti. ¿<b>Empate</b>? Marca a varios: caen todos. ¿Nadie sacó más de un voto? Entonces el pueblo perdona (abajo).</p>
      <UnaGrid {players} selKey="una-vote" max={players.length} />
      <p class="small-note">⚠️ Al registrarlo se acaba la partida: se destapan TODAS las cartas y se ve quién ganó.</p>
      <button class="danger block" data-a="una-vote" disabled={!voteSel.length} onclick={() => (voteSel.length ? guard(() => A.castVote(voteSel)) : undefined)}>⚖️ {voteSel.length > 1 ? `Condenar a ${voteSel.length} (empate): ${voteSel.map(nm).join(', ')}` : voteSel.length === 1 ? `Condenar a ${nm(voteSel[0])}` : 'Condenar a los señalados'}</button>
      {#if !voteSel.length}<p class="why">Marca antes a quién condena el pueblo… o pulsa «el pueblo perdona».</p>{/if}
      {#if !pardonArmed}
        <button class="ghost block" data-a="una-vote-nadie" onclick={() => (pardonArmed = true)}>🕊️ El pueblo perdona (nadie muere)</button>
      {:else}
        <!-- Un toque cerraba la partida y destapaba TODAS las cartas: se pregunta. -->
        <p class="why">⚠️ Perdonar CIERRA la partida y destapa todas las cartas. ¿Seguro que el pueblo no condena a nadie?</p>
        <button class="danger block" data-a="una-vote-nadie-ok" onclick={() => guard(() => A.castVote([]))}>🕊️ Sí: que no muera nadie</button>
        <button class="ghost block" data-a="una-vote-nadie-no" onclick={() => (pardonArmed = false)}>↩️ Mejor no, seguimos debatiendo</button>
      {/if}
      <p class="small-note">🎴 Justo debajo tienes todas las cartas de la partida: tócalas para recordar qué hace cada una.</p>
    </div>
  {:else}
    <div class="card"><h3>👀 Miras la partida</h3>
      <p class="hint">El pueblo debate y decide a quién condenar. La decisión la registra alguien que juega; tú puedes seguir el debate desde aquí… y morderte la lengua.</p></div>
  {/if}
{:else}
  <div class="actionpanel"><h3>⚖️ Decisión registrada</h3>
    <p class="hint">{game.lynched && game.lynched.length ? `El pueblo condena a ${game.lynched.map(nm).join(', ')}.` : 'El pueblo ha perdonado.'} Resolviendo…</p></div>
{/if}

<style>
  .howvote { margin: 4px 0 2px; padding-left: 1.2rem; color: var(--muted); font-size: 0.85rem; }
  .howvote li { margin: 5px 0; line-height: 1.35; }
  .ask { margin: 10px 0 0; font-size: 0.95rem; font-weight: 600; color: var(--moon); }
  .why { margin-top: 6px; font-size: 0.8rem; color: var(--muted); }
</style>
