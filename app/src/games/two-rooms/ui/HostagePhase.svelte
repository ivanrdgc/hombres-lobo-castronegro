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

  // La PAPELETA va cerrada. Aquí se vota de pie y hombro con hombro dentro de
  // la sala: con la lista desplegada, el vecino al que estás señalando lo lee
  // de reojo (nombre resaltado, ✔️ y un botón que dice «Votar a Fulano»). Se
  // abre con un gesto, se tapa con la mano y se cierra sola a los 30 s si te
  // distraes — la elección no se pierde, vive en la selección de la mesa.
  let ballot = $state(false);
  $effect(() => {
    if (!ballot) return;
    void pick; // cada toque en la lista reinicia la cuenta: nadie se queda a medias
    const t = setTimeout(() => (ballot = false), 30000);
    return () => clearTimeout(t);
  });
  $effect(() => { if (iVoted) ballot = false; });

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

<!-- Qué toca ahora, arriba y en una frase; el recuento va DEBAJO, que es
     contexto para esperar, no para decidir (B29). -->
<div class="narration">🗳️ Se acabó el tiempo. Cada sala elige {hostages === 1 ? 'a quién manda de rehén' : `a las ${hostages} personas que manda de rehenes`} a la otra, y lo hace a ciegas: hasta que no hayan cerrado las dos, no se dice nada.</div>

{#if inGame && game.picks[myRoom] !== null}
  <div class="card"><p class="hint">✅ Tu sala ya ha decidido. {game.picks[other] === null ? 'Falta la otra sala: en cuanto cierre, se anuncia el intercambio.' : 'Preparaos para el intercambio.'}</p></div>
{:else if inGame && !iVoted && !ballot}
  <!-- Reposo del voto: idéntico en todos los móviles de la sala. Quien mira de
       reojo ve que te toca votar, no a quién estás mirando. -->
  <div class="actionpanel"><h3>🗳️ Te toca votar (Sala {myRoom + 1})</h3>
    <p class="hint">Tu voto es SECRETO dentro de tu sala. Abre la papeleta, tápala con la mano y ciérrala al confirmar.</p>
    <button class="primary block" data-a="tr-ballot" onclick={() => (ballot = true)}>🗳️ Abrir mi papeleta</button>
  </div>
{:else if inGame && !iVoted}
  <div class="actionpanel"><h3>🗳️ ¿A quién mandas de rehén? (Sala {myRoom + 1})</h3>
    <p class="small-note" style="margin:0 0 6px">🙈 Tapa la pantalla: esta lista delata tu voto. Solo puedes votar a alguien de TU sala (tú incluido, si te ofreces).</p>
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
    <!-- Salir sin votar: si alguien se te acerca, tapar la papeleta no puede
         obligarte a echar el voto antes de tiempo. -->
    <button class="ghost block" data-a="tr-ballot-hide" onclick={() => (ballot = false)}>🙈 Tapar la papeleta (aún no voto)</button>

    <!-- La referencia, DENTRO del panel donde se decide: nadie debería salir de
         esta pantalla para recordar cómo funciona el voto. -->
    <details class="trref">
      <summary data-a="tr-ref">📖 Cómo funciona este voto</summary>
      <p class="small-note">Cruzan {hostages === 1 ? 'una persona' : `${hostages} personas`} por sala (una de cada cuatro, mínimo una). Empate en cabeza: decide el orden de la mesa.</p>
      <p class="small-note">La votación se cierra sola cuando ha votado TODA tu sala. Si alguien no puede votar, con la mayoría echada aparece «🔒 Cerrar la votación»; y si nadie hace nada, el reloj de arriba la cierra con los votos que haya.</p>
      <p class="small-note">Tras el intercambio no corre el reloj: os colocáis con calma y arrancáis la siguiente ronda con un botón.</p>
    </details>
  </div>
{:else if inGame}
  <div class="card"><p class="hint">✅ Tu voto está echado. {pending.length ? `Falta ${pending.join(', ')}: la votación se cierra cuando haya votado toda tu sala.` : 'Esperando a la otra sala…'}</p></div>
{/if}

<!-- Contexto de la espera: cuánto lleva votado cada sala. Nunca a QUIÉN vota
     nadie (las dos salas eligen sin saber lo de enfrente; los nombres salen
     juntos, en el intercambio). -->
<div class="card">
  <p class="small-note" style="margin:0">🚪 Sala 1: {votedCount(0)}/{roomMembers(game, 0).length} votos{game.picks[0] ? ' · decidido ✔️' : ''}</p>
  <p class="small-note" style="margin:4px 0 0">🚪 Sala 2: {votedCount(1)}/{roomMembers(game, 1).length} votos{game.picks[1] ? ' · decidido ✔️' : ''}</p>
  {#if inGame && pending.length}
    <p class="small-note" style="margin:6px 0 0">⏳ En tu sala falta por votar: {pending.join(', ')}.</p>
    <!-- Punto de fuga si el móvil de alguien ya no responde: nunca un «espera y
         reza» sin salida. -->
    <p class="small-note" style="margin:4px 0 0">Si a alguien se le ha apagado el móvil, sácalo de la partida desde ⋯ → 🪑 La mesa.</p>
  {/if}
</div>

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
