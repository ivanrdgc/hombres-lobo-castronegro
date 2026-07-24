<script lang="ts">
  // Fin de ronda: cada sala vota a quién manda de rehén a la otra. Solo votas a
  // gente de TU sala. La app intercambia a los más votados de cada sala. El voto
  // tiene PLAZO (el reloj lo pinta GameScreen) y, con la mayoría votada, se
  // puede cerrar a mano: nadie se queda colgado por un móvil apagado.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { sel1, clearSel } from '../../../shell/selection';
  import * as A from '../actions';
  import { roomMembers, roomOf, pendingInRoom, majorityVotedInRoom, hostagesPerRoom } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { TwoRoomsState } from '../types';

  const { game, my }: { game: TwoRoomsState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const myRoom = $derived(inGame ? roomOf(game, my.id) : 0);
  const other = $derived(myRoom === 0 ? 1 : 0);
  const mates = $derived(inGame ? roomMembers(game, myRoom) : []);
  const iVoted = $derived(game.hVotes[my.id] !== undefined);
  const hostages = $derived(hostagesPerRoom(game));
  const votedCount = (r: 0 | 1) => roomMembers(game, r).filter((pid) => game.hVotes[pid] !== undefined).length;
  const pick = $derived(sel1('tr-hostage'));
  const nm = (pid: string) => game.names[pid] || '¿?';
  const choose = (pid: string) => (app.ui.sel = { key: 'tr-hostage', ids: [pid] });
  // A quién falta por votar EN TU SALA (los de la otra no son asunto tuyo).
  const pending = $derived(inGame ? pendingInRoom(game, myRoom).map(nm) : []);
  const canClose = $derived(inGame && game.picks[myRoom] === null && majorityVotedInRoom(game, myRoom));
  // Cerrar la votación deja fuera a quien no ha votado: se pide un segundo
  // gesto, y el botón final dice a quién se va a dejar sin voz.
  let confirmClose = $state(false);
  $effect(() => { if (!canClose) confirmClose = false; });

  // Vencido el plazo, cualquier dispositivo cierra las dos votaciones.
  $effect(() => {
    const t = setInterval(() => {
      if (game.phase === 'hostages' && !game.paused && game.deadline !== null && Date.now() >= game.deadline + 400) {
        void guard(A.hostagesTimeUp);
      }
    }, 1000);
    return () => clearInterval(t);
  });
</script>

<div class="narration">🗳️ Fin de la ronda {game.round}. Cada sala decide, por votación y a ciegas, {hostages === 1 ? 'a quién manda de rehén' : `qué ${hostages} personas manda de rehén`} a la otra sala.</div>

<div class="card">
  <!-- Solo «decidido»: en la mesa las dos salas eligen sin saber lo de enfrente
       (los nombres salen juntos, en el intercambio). -->
  <p class="small-note" style="margin:0">🚪 Sala 1: {votedCount(0)}/{roomMembers(game, 0).length} votos{game.picks[0] ? ' · decidido ✔️' : ''}</p>
  <p class="small-note" style="margin:4px 0 0">🚪 Sala 2: {votedCount(1)}/{roomMembers(game, 1).length} votos{game.picks[1] ? ' · decidido ✔️' : ''}</p>
  {#if inGame && pending.length}
    <p class="small-note" style="margin:6px 0 0">⏳ En tu sala falta por votar: {pending.join(', ')}.</p>
    <!-- Punto de fuga si el móvil de alguien ya no responde: nunca un «espera y
         reza» sin salida. -->
    <p class="small-note" style="margin:4px 0 0">Si a alguien se le ha apagado el móvil, sácalo de la partida desde ⋯ → 🪑 La mesa.</p>
  {/if}
</div>

{#if inGame && game.picks[myRoom] !== null}
  <div class="card"><p class="hint">✅ Tu sala ya ha decidido. {game.picks[other] === null ? 'Falta la otra sala: en cuanto cierre, se anuncia el intercambio.' : 'Preparaos para el intercambio.'}</p></div>
{:else if inGame && !iVoted}
  <div class="actionpanel"><h3>¿A quién mandáis de tu sala (Sala {myRoom + 1})?</h3>
    <p class="small-note" style="margin:0 0 6px">Solo puedes votar a alguien de TU sala (tú incluido, si te ofreces).</p>
    <div class="players">
      {#each mates as pid (pid)}
        <div class="player selectable {pick === pid ? 'selected' : ''}" data-a="tr-hostage" data-p={pid}
          onclick={() => choose(pid)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') choose(pid); }}>
          <span class="pname">{nm(pid)}{pid === my.id ? ' (tú)' : ''}</span>{#if pick === pid}<span>✔️</span>{/if}
        </div>
      {/each}
    </div>
    <!-- Elegir y confirmar van separados, y antes de confirmar se dice en claro
         qué pasa si sale elegido. -->
    {#if pick}
      <p class="small-note" style="margin:8px 0 0">🗳️ Si {nm(pick)} es {hostages === 1 ? 'el más votado' : `de los ${hostages} más votados`} de tu sala, cruzará a la Sala {other + 1}. Tu voto es secreto y no se puede cambiar.</p>
    {/if}
    <button class="primary block" data-a="tr-hostage-confirm" disabled={!pick}
      onclick={() => (pick ? guard(async () => { await A.castHostageVote(pick); clearSel(); }) : undefined)}>🗳️ {pick ? `Votar a ${nm(pick)}` : 'Elige a quién mandar'}</button>
    {#if !pick}<p class="small-note" style="margin:6px 0 0">Toca antes a alguien de la lista.</p>{/if}

    <!-- La referencia, DENTRO del panel donde se decide: nadie debería salir de
         esta pantalla para recordar cómo funciona el voto. -->
    <details class="trref">
      <summary data-a="tr-ref">📖 Cómo funciona este voto</summary>
      <p class="small-note">Cada sala vota por su cuenta y a ciegas: hasta que las DOS no han decidido no se dice a quién manda ninguna.</p>
      <p class="small-note">Cruzan {hostages === 1 ? 'una persona' : `${hostages} personas`} por sala (una de cada cuatro, mínimo una). Empate en cabeza: decide el orden de la mesa.</p>
      <p class="small-note">La votación se cierra sola cuando ha votado TODA tu sala. Si alguien no puede votar, con la mayoría echada aparece «🔒 Cerrar la votación»; y si nadie hace nada, el reloj de arriba la cierra con los votos que haya.</p>
      <p class="small-note">Tras el intercambio no corre el reloj: os colocáis con calma y arrancáis la siguiente ronda con un botón.</p>
    </details>
  </div>
{:else if inGame}
  <div class="card"><p class="hint">✅ Tu voto está echado. {pending.length ? `Falta ${pending.join(', ')}: la votación se cierra cuando haya votado toda tu sala.` : 'Esperando a la otra sala…'}</p></div>
{:else}
  <div class="card"><p class="hint">👀 Las salas están decidiendo sus rehenes. No votas: eres espectador.</p></div>
{/if}

{#if canClose}
  {#if !confirmClose}
    <button class="ghost block" data-a="tr-close-vote" onclick={() => (confirmClose = true)}>🔒 Cerrar la votación de la Sala {myRoom + 1}</button>
    <p class="small-note" style="text-align:center">Ya ha votado la mayoría: si alguien no puede votar (móvil apagado, se ha ausentado), cerrad sin él.</p>
  {:else}
    <div class="card">
      <p class="hint">Se cerrará la votación de tu sala con los votos que hay. {pending.length ? `${pending.join(', ')} se ${pending.length === 1 ? 'queda' : 'quedan'} sin votar.` : ''} No tiene vuelta atrás.</p>
      <button class="primary block" data-a="tr-close-vote-confirm" onclick={() => guard(A.closeRoomVote)}>🔒 Cerrar sin {pending.length ? pending.join(', ') : 'los que faltan'}</button>
      <button class="ghost block" data-a="tr-close-vote-cancel" onclick={() => (confirmClose = false)}>↩️ Seguir esperando</button>
    </div>
  {/if}
{/if}

<style>
  .trref { margin-top: 14px; border-top: 1px solid var(--line, #2a2f45); padding-top: 8px; }
  .trref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent, #d8a24a); }
</style>
