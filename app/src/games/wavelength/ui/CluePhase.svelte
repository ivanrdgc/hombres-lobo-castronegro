<script lang="ts">
  // Fase de pista. Dos pantallas de POSTURA opuesta (B28):
  //  · El Psíquico sostiene el móvil MIRANDO HACIA ÉL, como una mano de cartas:
  //    su objetivo (número + lado) está siempre a la vista, sin gestos, en
  //    cuerpo cómodo a 30 cm pero ilegible desde el otro lado de la mesa; la
  //    diana pintada, que sí canta a lo lejos, va tapada tras «mantén pulsado».
  //    Encima, un aviso PERMANENTE de que esa pantalla no la ve nadie más.
  //  · El resto es pantalla de EQUIPO: el dial público, grande, sin nada que
  //    tocar todavía. Lo que están esperando ya lo dice la cabecera («escucha
  //    la pista de X»), así que aquí no se repite: solo el dial y por qué está
  //    vacío.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { psychicId, targetHint } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { WavelengthState } from '../types';
  import Dial from './Dial.svelte';

  const { game, my }: { game: WavelengthState; my: PlayerDoc } = $props();
  const iAmPsychic = $derived(psychicId(game) === my.id);
  const inTeam = $derived(game.playerIds.includes(my.id) && !iAmPsychic);
  const psychicName = $derived(game.names[psychicId(game)] || '¿?');
  // El número solo, en una mesa, no dice nada: se traduce al extremo al que tira.
  const aim = $derived.by(() => {
    const h = targetHint(game);
    return h === 'el centro' ? 'justo en el centro del dial' : `del lado de «${h}»`;
  });
  let clue = $state('');
</script>

{#if iAmPsychic}
  <!-- Aviso permanente (se queda pegado arriba al hacer scroll): esta pantalla
       es de una sola persona. En un juego cooperativo cuesta recordarlo —«son
       los míos»—, pero si la ve alguien del equipo la ronda ya no vale. -->
  <div class="privacy" data-a="wl-private">
    🙈 <b>Pantalla privada:</b> móvil hacia ti, como una mano de cartas. Si alguien te ve el objetivo
    —aunque sea de los tuyos—, la ronda ya no vale.
  </div>

  <div class="actionpanel"><h3>🔮 Una idea que caiga en tu objetivo</h3>

    <p class="aim">🎯 Tu objetivo está en <b>{game.target}</b> de 100, {aim}.</p>

    <Dial spectrumId={game.spectrumId} target={game.target} legend="bands" secret={true} />

    <p class="hint">Dila <b>en voz alta y una sola vez</b>: sin números, sin señalar y sin poner caras.</p>

    <label for="wl-clue-text">✍️ Apúntala (opcional): la mesa la releerá mientras debate.</label>
    <input id="wl-clue-text" type="text" data-a="wl-clue-text" bind:value={clue} maxlength="60"
      placeholder="p. ej. «una sauna»" autocomplete="off" />

    <button class="primary block" data-a="wl-clue-done" onclick={() => guard(() => A.giveClue(clue))}>💬 Ya he dado la pista{clue.trim() ? ` («${clue.trim()}»)` : ''}</button>
    <button class="ghost block" data-a="wl-new-spectrum" onclick={() => guard(A.newSpectrum)}>🔀 Cambiar espectro y objetivo (no gasta la ronda)</button>

    <details class="ref">
      <summary data-a="wl-ref-clue">📖 Qué vale como pista y qué no</summary>
      <p class="small-note">Vale: una idea, una cosa, un nombre, una escena («una sauna», «mi primer coche»). Cuanto más concreta, mejor os leeréis.</p>
      <p class="small-note">No vale: números o posiciones («un 80», «casi al tope»), señalar el dial, ni nada que se salga del espectro de la ronda.</p>
      <p class="small-note">Después de darla, calla: ni aclaraciones ni gestos. La puntuación es del equipo, y también tuya: 4 puntos en el centro de la diana, 3 cerca, 2 rozando y 0 fuera.</p>
    </details>
  </div>
{:else}
  <div class="card">
    <p class="small-note" style="margin:0 0 2px">📡 El dial de la ronda. El objetivo está en algún punto de la barra y no lo veis: {psychicName} es el único que lo ve.</p>
    <Dial spectrumId={game.spectrumId} />
    <p class="small-note" style="margin-top:2px">
      {inTeam
        ? '🙈 Y no miréis su móvil: lleva la diana tapada, pero la destapa para apuntar. Si alguien se la ve, la ronda se cae.'
        : '👀 Verás el dial y la pista, pero no el objetivo, y no podrás mover la marca.'}
    </p>
  </div>
{/if}

<style>
  /* El aviso de postura, pegado arriba: si se va con el scroll deja de avisar
     justo cuando el Psíquico está más metido pensando la pista. */
  .privacy {
    position: sticky; top: 0; z-index: 3;
    background: color-mix(in srgb, var(--danger) 22%, var(--bg-1));
    border: 1px solid var(--danger); border-radius: var(--r-1);
    padding: 10px 12px; margin: 10px 0 0; font-size: 0.88rem; line-height: 1.35;
    box-shadow: var(--shadow-1);
  }
  .privacy b { color: var(--moon); }
  /* Cómodo EN LA MANO (30 cm), no un cartel: un número enorme se leería desde
     la otra punta de la mesa y sería el peor chivato de todos. */
  .aim { background: color-mix(in srgb, var(--accent) 14%, var(--card2)); border: 1px solid var(--accent);
    border-radius: 10px; padding: 8px 12px; margin: 8px 0 10px; font-size: 0.95rem; }
  .aim b { font-size: 1.45rem; color: var(--moon); }
  .ref { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px; }
  .ref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); }
</style>
