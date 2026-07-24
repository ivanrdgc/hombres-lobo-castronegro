<script lang="ts">
  // Ronda en marcha. La pantalla tiene que contestar sin pensar: cuánto queda,
  // quién abrió el interrogatorio, a quién puedo acusar y QUÉ ME CUESTA
  // hacerlo (la acusación se gasta aunque el voto caiga). Debajo, la jugada del
  // espía con su premio y su riesgo, y las 30 localizaciones a mano.
  // Cualquier dispositivo intenta timeUp() cuando el reloj llega a cero
  // (transacción «primero gana»: sin conductor único).
  import { guard } from '../../../core/sync/guard';
  import { app } from '../../../core/sync/store.svelte';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';
  import Timer from './Timer.svelte';
  import SpyCard from './SpyCard.svelte';
  import MesaStrip from './MesaStrip.svelte';
  import LugaresPanel from './LugaresPanel.svelte';

  const { game, my, spectator }: { game: EspiaState; my: PlayerDoc; spectator: boolean } = $props();

  const inRound = $derived(!spectator && game.playerIds.includes(my.id));
  const live = $derived(game.phase === 'play' && !game.vote && !game.paused);
  const canAccuse = $derived(inRound && live && !game.accusedUsed[my.id]);
  const spy = $derived(inRound && my.id === game.spyId);

  // Elegir a quién y confirmar son dos gestos: nada irreversible de un toque.
  // Si entretanto se abre una votación o cambia la fase, la elección caduca
  // (al volver se decide de cero).
  let picked = $state<string | null>(null);
  const pick = $derived(canAccuse ? picked : null);
  const pickName = $derived(pick ? game.names[pick] || '¿?' : null);

  function accuseNow() {
    if (!pick) return;
    const target = pick;
    void guard(async () => { await A.accuse(target); picked = null; });
  }

  // Reloj a cero: cualquier dispositivo dispara la tanda de acusaciones.
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => {
      now = Date.now();
      if (game.phase === 'play' && !game.vote && !game.paused && game.deadline !== null && Date.now() >= game.deadline + 400) {
        void guard(A.timeUp);
      }
    }, 1000);
    return () => clearInterval(t);
  });

  // El aviso de quién abre el interrogatorio caduca: pasado el primer minuto
  // (o en cuanto alguien acusa) las preguntas ya van libres y dejar «Pregunta
  // Ana primero» todo el reloj engaña a las mesas novatas.
  const opening = $derived(
    game.voteSeq === 0 && game.deadline !== null && game.durationMs - (game.deadline - now) < 60000,
  );
</script>

<Timer {game} />
{#if game.phase === 'play'}
  {#if opening}
    <div class="narration">❓ Abre el interrogatorio <b>{game.names[game.dealerId] || '¿?'}</b>, llamando a alguien por su nombre. Quien responde, pregunta después.</div>
  {:else}
    <div class="narration">❓ Turno libre: quien responde, pregunta a quien quiera. Prohibido devolver la pregunta a quien te la acaba de hacer y prohibido nombrar el lugar.</div>
  {/if}
{/if}

<MesaStrip {game} myId={my.id} />

{#if inRound}
  <SpyCard {game} pid={my.id} mini={true} />

  {#if canAccuse}
    <div class="actionpanel"><h3>🛑 ¿Sospechas de alguien?</h3>
      {#if !pick}
        <p class="hint">Puedes parar el reloj <b>una sola vez en toda la ronda</b>: se gasta al usarla, aunque la mesa vote que no. Toca a quien sospeches y te digo qué pasará.</p>
        <div class="players">
          {#each game.playerIds.filter((id) => id !== my.id) as pid (pid)}
            <div class="player selectable" data-a="espia-accuse-pick" data-p={pid}
              onclick={() => (picked = pid)}
              role="button" tabindex="0"
              onkeydown={(e) => { if (e.key === 'Enter') picked = pid; }}>
              <span class="pname">{game.names[pid] || pid}</span>
              {#if game.accusedUsed[pid]}<span class="badge">🛑 ya acusó</span>{/if}
            </div>
          {/each}
        </div>
        <!-- El 🛑 de la lista se leía como «este es sospechoso»: en móvil no hay
             title que valga, así que la marca se explica a la vista. -->
        {#if game.playerIds.some((id) => id !== my.id && game.accusedUsed[id])}
          <p class="small-note" style="margin:8px 0 0">🛑 ya acusó = ya usó SU acusación de esta ronda. No dice nada de su culpabilidad y puedes acusarla igual.</p>
        {/if}
      {:else}
        <div class="plan">
          <p class="pnow">▶️ Vas a parar el reloj y acusar a <b>{pickName}</b>.</p>
          <ul>
            <li>Votáis todos menos {pickName}; tu voto ya cuenta como «sí».</li>
            <li>✅ <b>Si todos dicen que sí</b>: se revela su carta y la ronda TERMINA. Si era el espía, +1 para cada agente (y +1 extra para ti). Si era inocente, gana el espía (+4).</li>
            <li>❌ <b>Si alguien dice que no</b>: la acusación cae, el reloj sigue corriendo… y la tuya queda gastada igual.</li>
          </ul>
        </div>
        <button class="ghost block small" style="margin:10px 0 6px" data-a="espia-accuse-back" onclick={() => (picked = null)}>↩️ Cambiar de sospechoso</button>
        <button class="danger block" data-a="espia-accuse" onclick={accuseNow}>🛑 Parar el reloj y acusar a {pickName}</button>
      {/if}
    </div>
  {:else if live && game.accusedUsed[my.id]}
    <div class="card">
      <p class="small-note" style="margin:0">🛑 <b>Ya has gastado tu acusación de esta ronda.</b> Sigues preguntando y respondiendo, y votas las acusaciones de los demás. Si el reloj llega a cero, todos vuelven a acusar por turnos.</p>
    </div>
  {/if}

  {#if spy && live}
    <div class="card" style="border-color:var(--accent)">
      <h3 style="margin-top:0">🎭 Tu jugada de espía</h3>
      <p class="small-note" style="margin-top:0">Solo tú ves esto. Cuando creas saber dónde estáis, puedes revelarte y señalar el lugar: la ronda TERMINA ahí mismo.</p>
      <ul class="bet">
        <li>✅ Si <b>aciertas</b>: +4 y ganas la ronda.</li>
        <li>❌ Si <b>fallas</b>: la ronda acaba y cada agente se lleva +1.</li>
        <li>⏳ Si no la usas y nadie te condena: +2 al agotarse el tiempo.</li>
      </ul>
      <button class="violet block" data-a="espia-guess-open" onclick={() => (app.ui.modal = { type: 'espia-guess' })}>🎭 Revelarme y adivinar el lugar</button>
      <p class="small-note">Aún puedes echarte atrás: primero eliges el lugar y confirmas.</p>
    </div>
  {/if}
{/if}

<LugaresPanel {game} {spy} />

<style>
  .plan { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r-1); padding: 10px 12px; }
  .plan .pnow { margin: 0 0 6px; font-size: 0.95rem; }
  .plan ul, .bet { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
  .plan li, .bet li { font-size: 0.86rem; color: var(--muted); line-height: 1.45; }
  .bet { margin: 8px 0 10px; }
</style>
