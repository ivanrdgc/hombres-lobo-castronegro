<script lang="ts">
  // Día: como en Los Hombres Lobo, UNA persona registra la decisión del pueblo
  // (condenar a alguien —puedes incluirte— o perdonar). Si el condenado resulta
  // ser el Cazador, dispara su flecha (pendiente, como allí).
  //
  // Postura 🍽️ MESA (B28): el debate se hace con los móviles en la mesa, así que
  // esta pantalla es IDÉNTICA para todos los que juegan. No depende de tu carta
  // ni de lo que viste anoche: lo tuyo vive tras la pastilla «🎴 Mi carta»
  // —única puerta durante la partida (B34)—, que se oculta sola. B29: primero lo
  // que hay que hacer ahora (registrar el veredicto), y las reglas del recuento
  // plegadas al pie.
  //
  // Solo la ven quienes JUEGAN: a los espectadores GameScreen les da su propia
  // tarjeta antes de llegar aquí.
  import { guard } from '../../../core/sync/guard';
  import { sel1, selIds } from '../../../shell/selection';
  import * as A from '../actions';
  import { playersOf } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';
  import DebateTimer from './DebateTimer.svelte';
  import UnaGrid from './UnaGrid.svelte';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

  const players = $derived(playersOf(game));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const hunter = $derived(game.pendingHunter || null);
  // El pueblo puede condenar a varios (empate → mueren todos) o a nadie (perdón).
  const voteSel = $derived(selIds('una-vote'));
  const hunterSel = $derived(sel1('una-hunter'));
  // El perdón cierra la partida de un toque y sin selección previa: se confirma.
  let pardonArmed = $state(false);
</script>

<div class="narration">☀️ Amanece y nadie ha muerto… pero puede que alguien ya no sea quien era. Debatid quién esconde colmillos.</div>

<DebateTimer {game} />

{#if hunter}
  <!-- Flecha del Cazador: la registra el propio Cazador (su carta ya es pública). -->
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
  <div class="actionpanel"><h3>⚖️ Registrar el veredicto</h3>
    <p class="hint">Al agotarse el reloj: alguien cuenta hasta tres, <b>todos señaláis a la vez</b> y <b>una sola persona</b> lo anota aquí. Se anota una vez, acaba la partida y se destapan todas las cartas.</p>
    <p class="ask">¿A quién ha señalado más gente?</p>
    <UnaGrid {players} selKey="una-vote" max={players.length} />
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
    <details class="unaref">
      <summary data-a="una-vote-rules">📖 Empates, perdón y a quién se puede votar</summary>
      <ul class="rl">
        <li><b>Puedes marcarte a ti.</b> En Una Noche es una jugada más.</li>
        <li><b>Empate:</b> marca a varios y caen todos los empatados.</li>
        <li><b>Nadie sacó más de un voto:</b> el pueblo perdona y no muere nadie.</li>
        <li><b>Cazador:</b> si el condenado lo era (por su carta final), la app le pide su flecha antes de cerrar.</li>
      </ul>
    </details>
  </div>
{:else}
  <div class="actionpanel"><h3>⚖️ Veredicto registrado</h3>
    <p class="hint">{game.lynched && game.lynched.length ? `El pueblo condena a ${game.lynched.map(nm).join(', ')}.` : 'El pueblo ha perdonado.'} Resolviendo…</p></div>
{/if}

<style>
  .ask { margin: 10px 0 0; font-size: 0.95rem; font-weight: 600; color: var(--moon); }
  .why { margin-top: 6px; font-size: 0.8rem; color: var(--muted); }
  .unaref { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px; }
  .unaref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); }
  .rl { margin: 6px 0 0; padding-left: 1.15rem; color: var(--muted); font-size: 0.82rem; }
  .rl li { margin: 5px 0; line-height: 1.35; }
</style>
