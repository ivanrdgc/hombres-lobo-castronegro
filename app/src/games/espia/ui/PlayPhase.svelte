<script lang="ts">
  // La ronda en marcha. Es un juego de MESA (B28): el móvil se queda plano y
  // manda la conversación, así que la pantalla en reposo es la MISMA en todos
  // los dispositivos —reloj, turno, mesa, la libreta y el 🛑 de acusar— y nada
  // que dependa de tu carta aparece aquí: tu carta se abre SOLO por la pastilla
  // flotante 🎴 (B34), idéntica para el espía y para un agente.
  // Cualquier dispositivo intenta timeUp() cuando el reloj llega a cero
  // (transacción «primero gana»: sin conductor único).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';
  import Timer from './Timer.svelte';
  import MesaStrip from './MesaStrip.svelte';
  import Libreta from './Libreta.svelte';

  const { game, my, spectator }: { game: EspiaState; my: PlayerDoc; spectator: boolean } = $props();

  const inRound = $derived(!spectator && game.playerIds.includes(my.id));
  const live = $derived(game.phase === 'play' && !game.vote && !game.paused);
  const canAccuse = $derived(inRound && live && !game.accusedUsed[my.id]);

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
<!-- El recordatorio de cómo se pregunta solo cuando toca preguntar: con una
     votación abierta o en pausa manda ese panel, y dejarlo aquí decía a la mesa
     que siguiera el interrogatorio con el reloj congelado. -->
{#if live}
  {#if opening}
    <div class="narration">❓ Abre el interrogatorio <b>{game.names[game.dealerId] || '¿?'}</b>, llamando a alguien por su nombre. Quien responde, pregunta después.</div>
  {:else}
    <div class="narration">❓ Pregunta quien acaba de responder, a quien quiera. Sin devolvérsela a quien te preguntó y sin nombrar el lugar.</div>
  {/if}
{/if}

<MesaStrip {game} myId={my.id} />

{#if inRound}
  <Libreta {game} />

  {#if canAccuse}
    <div class="actionpanel"><h3>🛑 ¿Sospechas de alguien?</h3>
      {#if !pick}
        <p class="hint">Paras el reloj y la mesa vota. <b>Una sola vez por ronda</b>: se gasta aunque voten que no.</p>
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
        <!-- El 🛑 de la lista NO se explica aquí otra vez: la tira de la mesa,
             justo encima, ya dice qué significa (un dato, un sitio · B29). -->
      {:else}
        <div class="plan">
          <p class="pnow">▶️ Vas a parar el reloj y acusar a <b>{pickName}</b>.</p>
          <ul>
            <li>Votáis todos menos {pickName}; tu voto ya cuenta como «sí».</li>
            <li>✅ <b>Unanimidad</b>: se revela su carta y la ronda TERMINA. Si era el espía, +1 para cada agente (y +1 extra para ti); si era inocente, gana el espía (+4).</li>
            <li>❌ <b>Un solo «no»</b>: la acusación cae, el reloj sigue corriendo… y la tuya queda gastada igual.</li>
          </ul>
        </div>
        <button class="ghost block small" style="margin:10px 0 6px" data-a="espia-accuse-back" onclick={() => (picked = null)}>↩️ Cambiar de sospechoso</button>
        <button class="danger block" data-a="espia-accuse" onclick={accuseNow}>🛑 Parar el reloj y acusar a {pickName}</button>
      {/if}
    </div>
  {:else if live && game.accusedUsed[my.id]}
    <div class="card">
      <p class="small-note" style="margin:0">🛑 <b>Ya has gastado tu acusación.</b> Sigues preguntando, respondiendo y votando las de los demás; si el reloj llega a cero, todos vuelven a acusar por turnos.</p>
    </div>
  {/if}
{/if}

<style>
  .plan { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r-1); padding: 10px 12px; }
  .plan .pnow { margin: 0 0 6px; font-size: 0.95rem; }
  .plan ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
  .plan li { font-size: 0.86rem; color: var(--muted); line-height: 1.45; }
</style>
