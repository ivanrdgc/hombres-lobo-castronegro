<script lang="ts">
  // El tiempo se agotó: acusaciones por turnos desde el repartidor. En tu
  // turno, señalas a un sospechoso o pasas; cada acusación se vota igual, y la
  // mesa puede saltar el turno de quien no responde.
  // Como en la ronda, aquí no asoma nada que dependa de tu carta: la jugada del
  // espía sigue viva, pero dentro de la carta, que se abre SOLO por la pastilla
  // flotante 🎴 que usan todos (B28/B34).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { timeupOrder } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';
  import MesaStrip from './MesaStrip.svelte';
  import Libreta from './Libreta.svelte';

  const { game, my }: { game: EspiaState; my: PlayerDoc } = $props();

  const inRound = $derived(game.playerIds.includes(my.id));
  const order = $derived(timeupOrder(game));
  const turnPid = $derived(game.timeupTurn !== null ? order[game.timeupTurn] : null);
  const myTurn = $derived(!game.vote && !game.paused && turnPid === my.id);
  const left = $derived(game.timeupTurn === null ? 0 : Math.max(0, order.length - game.timeupTurn - 1));

  // Elegir a quién y confirmar, dos gestos (la acusación cierra la ronda si
  // sale unánime): si pierdo el turno, la elección caduca sola.
  let picked = $state<string | null>(null);
  const pick = $derived(myTurn ? picked : null);
  const pickName = $derived(pick ? game.names[pick] || '¿?' : null);

  function accuseNow() {
    if (!pick) return;
    const target = pick;
    void guard(async () => { await A.timeupAccuse(target); picked = null; });
  }
</script>

<div class="narration">⏰ ¡Se acabó el tiempo! Nadie habla más del caso: se acusa por turnos. {#if turnPid && !game.vote}Le toca a <b>{game.names[turnPid] || '¿?'}</b>.{/if}</div>

<MesaStrip {game} myId={my.id} />

{#if inRound}<Libreta {game} />{/if}

{#if myTurn}
  <div class="actionpanel"><h3>👉 Tu turno: acusa o pasa</h3>
    {#if !pick}
      <p class="hint">Aquí acusa todo el mundo, aunque ya gastara su acusación con el reloj en marcha. Pasar no cuesta nada.</p>
      <div class="players">
        {#each game.playerIds.filter((id) => id !== my.id) as pid (pid)}
          <div class="player selectable" data-a="espia-tu-pick" data-p={pid}
            onclick={() => (picked = pid)}
            role="button" tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') picked = pid; }}>
            <span class="pname">{game.names[pid] || pid}</span>
          </div>
        {/each}
      </div>
      <button class="ghost block" style="margin-top:10px" data-a="espia-tu-pass" onclick={() => guard(A.timeupPass)}>🤐 Paso</button>
      <p class="small-note" style="margin-top:6px">Quedan {left} turno{left === 1 ? '' : 's'} después del tuyo. Si pasáis todos sin condenar a nadie, el espía se marcha de rositas (+2).</p>
    {:else}
      <div class="plan">
        <p class="pnow">▶️ Vas a acusar a <b>{pickName}</b>.</p>
        <ul>
          <li>Votáis todos menos {pickName}; tu voto ya cuenta como «sí».</li>
          <li>✅ <b>Unanimidad</b>: se revela su carta y la ronda TERMINA. Si era el espía, +1 para cada agente (y +1 extra para ti); si era inocente, gana el espía (+4).</li>
          <li>❌ <b>Un solo «no»</b>: la acusación cae y el turno pasa al siguiente.</li>
        </ul>
      </div>
      <button class="ghost block small" style="margin:10px 0 6px" data-a="espia-tu-back" onclick={() => (picked = null)}>↩️ Cambiar de sospechoso</button>
      <button class="danger block" data-a="espia-tu-accuse" onclick={accuseNow}>👉 Acusar a {pickName}</button>
    {/if}
  </div>
{:else if !game.vote && !game.paused && turnPid}
  <div class="card">
    <p style="margin:0 0 4px">⌛ Esperando a <b>{game.names[turnPid] || '¿?'}</b>: acusa o pasa, y después le toca al siguiente en orden de mesa.</p>
    {#if inRound}
      <!-- Desatasco: sin esto, un móvil apagado obligaba a borrar la partida. -->
      <button class="small ghost" data-a="espia-tu-skip" onclick={() => guard(A.timeupSkip)}>⏭️ Saltar su turno</button>
      <p class="small-note">Úsalo si se ha quedado en blanco o si su móvil no responde: cuenta como que pasa.</p>
    {/if}
  </div>
{/if}

<style>
  .plan { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r-1); padding: 10px 12px; }
  .plan .pnow { margin: 0 0 6px; font-size: 0.95rem; }
  .plan ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
  .plan li { font-size: 0.86rem; color: var(--muted); line-height: 1.45; }
</style>
