<script lang="ts">
  // Misión: cada miembro del equipo juega en secreto Éxito o Fracaso. El Bien
  // solo puede jugar Éxito (la app se lo impide sabotear); el Mal elige. La app
  // baraja las cartas: nadie sabe quién falló, solo cuántos.
  //
  // POSTURA DE MESA (B28) — este es el momento más delicado del juego, porque
  // los móviles del equipo están sobre la mesa y todos se miran entre sí. Antes,
  // la pantalla del Bien y la del Mal NO eran iguales: el leal veía un «💥
  // Sabotear 🔒» gris y un solo botón ancho; el malvado, dos botones vivos uno
  // al lado del otro. Verlo gris de reojo bastaba para descartar a alguien.
  // Ahora las dos pantallas son IDÉNTICAS hasta que el jugador toca:
  //   · los mismos dos botones vivos (✅ Éxito / 💥 Sabotaje) en el mismo sitio;
  //   · el mismo texto, palabra por palabra (nada de «estás en el Mal»);
  //   · al tocar 💥, el leal —y solo él, en su mano— recibe el «no puedes», que
  //     además se borra solo; el malvado recibe el segundo toque de confirmar.
  // La lección de «el Bien no puede sabotear» está en el recuadro PÚBLICO de
  // arriba, que es igual en todos los móviles y lo lee también quien no va en la
  // misión (que es quien tiene que deducir con ella).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { isEvil, requiredFails } from '../roles';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const inGame = $derived(game.playerIds.includes(my.id));
  const onTeam = $derived(game.team.includes(my.id));
  const iPlayed = $derived(game.questCards[my.id] !== undefined);
  const amEvil = $derived(inGame && isEvil(game.roles[my.id]));
  const submitted = $derived(game.team.filter((pid) => game.questCards[pid] !== undefined).length);
  const req = $derived(requiredFails(game.playerIds.length, game.quest));
  const nm = (pid: string) => game.names[pid] || '¿?';
  // El equipo es público: decir quién no ha jugado aún no filtra su carta.
  const pend = $derived(game.team.filter((pid) => game.questCards[pid] === undefined).map(nm));

  // Elección armada (pendiente de confirmar) y aviso de «no puedes sabotear».
  // Los dos se borran solos: un móvil devuelto a la mesa a medio confirmar sería
  // exactamente el chivato que estamos cerrando.
  let armed: 'ok' | 'fail' | null = $state(null);
  let refused = $state(false);
  $effect(() => {
    if (!armed) return;
    const t = setTimeout(() => (armed = null), 12000);
    return () => clearTimeout(t);
  });
  $effect(() => {
    if (!refused) return;
    const t = setTimeout(() => (refused = false), 6000);
    return () => clearTimeout(t);
  });

  function choose(kind: 'ok' | 'fail') {
    refused = false;
    // El Bien toca el mismo botón que el Mal; la negativa llega solo a su mano.
    if (kind === 'fail' && !amEvil) { armed = null; refused = true; return; }
    armed = kind;
  }
  function send() {
    const ok = armed !== 'fail';
    armed = null;
    void guard(() => A.questCard(ok));
  }
</script>

<!-- Quién va y qué la hunde, en un solo sitio (antes lo repetían la línea de
     narración, esta caja y el propio panel de acción). -->
<div class="reqbox" data-a="av-quest-what">
  <span class="reqbig">Misión {game.quest} · van {game.team.map(nm).join(', ')}</span>
  <span class="reqline">{req === 2 ? '💥 Hacen falta DOS cartas de sabotaje para hundirla (una sola no basta).' : '💥 Basta UNA carta de sabotaje para hundirla.'}</span>
  <!-- La regla que la mesa entera usa para deducir vive aquí, en el recuadro
       PÚBLICO (idéntico en todos los móviles), y no dentro del panel de quien
       actúa: la decía solo el equipo, que es justo quien no la necesita. -->
  <span class="reqline">🏰 El Bien no puede sabotear: si esta misión fracasa, el traidor iba DENTRO del equipo — seguro.</span>
  <span class="reqline">Se anunciará cuántos sabotajes hubo, nunca de quién.</span>
</div>

{#if onTeam && !iPlayed}
  <!-- Panel IDÉNTICO para el Bien y para el Mal mientras nadie toca: mismos
       botones, mismo texto, mismo alto (lo comprueba el e2e comparando letra a
       letra la pantalla de un leal con la de un malvado). Y «carta de misión»
       siempre con apellido: «mi carta» (a secas) es la lealtad que enseña la
       pastilla 🎴, y son dos cosas distintas (B34: un nombre por cosa) — por eso
       el título tampoco lleva ya el emoji 🎴. -->
  <div class="actionpanel" data-a="av-quest-panel"><h3>⚔️ Juega tu carta de misión</h3>
    <p class="hint">Coge el móvil, elige en secreto y déjalo otra vez boca arriba: nadie sabrá qué carta echó cada uno.</p>
    <div class="btnrow">
      <button class="primary {armed === 'ok' ? 'armed' : ''}" data-a="av-quest" data-p="ok" onclick={() => choose('ok')}>✅ Éxito</button>
      <button class="danger {armed === 'fail' ? 'armed' : ''}" data-a="av-quest" data-p="fail" onclick={() => choose('fail')}>💥 Sabotaje</button>
    </div>
    {#if armed}
      <button class="{armed === 'ok' ? 'primary' : 'danger'} block" data-a="av-quest-confirm" onclick={send}>
        {armed === 'ok' ? '✅ Confirmar: la misión sale bien' : '💥 Confirmar: hundir la misión'}
      </button>
      <p class="small-note">{armed === 'ok'
        ? 'Suma para el Bien. Si eres del Mal, además te tapa.'
        : req === 2 ? 'Suma un sabotaje: esta misión solo cae si otro también sabotea.' : 'Basta esta carta para que la misión FRACASE.'} Toca el otro botón para cambiar; si sueltas el móvil, la elección se desarma sola.</p>
    {:else if refused}
      <!-- La negativa llega DESPUÉS del toque y solo a quien lo dio, y se borra
           sola: nada de un botón gris permanente que delate al leal. -->
      <p class="small-note refused" data-a="av-quest-refused">🏰 Tu lealtad es del BIEN: la app no te deja sabotear ni queriendo, así que tu carta de misión solo puede ser ✅ Éxito. Este aviso lo ves solo tú y desaparece solo.</p>
    {:else}
      <p class="small-note">Los dos botones salen igual en TODOS los móviles del equipo: tocar uno u otro no delata nada, y la carta de misión no se juega hasta que confirmas.</p>
    {/if}
  </div>
{:else if onTeam}
  <div class="card"><p class="hint">✅ Tu carta de misión está echada. Faltan {game.team.length - submitted} del equipo.</p>
    {#if pend.length}<p class="small-note" data-a="av-quest-pending">⏳ Falta{pend.length === 1 ? '' : 'n'} por jugar su carta de misión: <b>{pend.join(', ')}</b>.</p>{/if}</div>
{:else}
  <div class="card"><p class="hint">👀 No vas en esta misión: {submitted}/{game.team.length} cartas jugadas. Nadie fuera del equipo puede hacer nada ahora.</p>
    {#if pend.length}<p class="small-note" data-a="av-quest-pending">⏳ Falta{pend.length === 1 ? '' : 'n'} por jugar su carta de misión: <b>{pend.join(', ')}</b>.</p>{/if}
    <p class="small-note">Mientras tanto: recuerda quién votó a favor de este equipo — si sale mal, ahí está la pista.</p></div>
{/if}

<style>
  .reqbox {
    display: flex; flex-direction: column; gap: 3px; margin: 10px 0 0;
    border: 1px solid var(--accent, #c8a24a); border-radius: var(--r-2, 14px);
    background: color-mix(in srgb, var(--accent, #c8a24a) 12%, transparent);
    padding: 10px 12px;
  }
  .reqbig { font-size: 1.06rem; font-weight: 700; }
  .reqline { font-size: 0.8rem; color: var(--muted); }
  /* La marca de «armado» va DENTRO del botón que el jugador acaba de tocar: es
     un estado de su mano, dura 12 s y no cambia el tamaño del panel. */
  .armed { outline: 2px solid var(--moon, #cfc0ff); outline-offset: 1px; }
  .refused {
    margin-top: 10px; padding: 9px 11px; border-radius: 10px; line-height: 1.35;
    border: 1px solid var(--border, #333);
    background: color-mix(in srgb, var(--accent, #c8a24a) 10%, transparent);
  }
</style>
