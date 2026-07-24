<script lang="ts">
  // Fase de pista: SOLO el Psíquico ve el objetivo (la diana en su dial) y da la
  // pista en voz alta; el resto espera sin ver el objetivo. Puede apuntarla para
  // que la mesa la relea durante el debate (él no puede repetirla) y cambiar de
  // espectro si el par no le inspira nada, sin gastar la ronda.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { psychicId, targetHint } from '../engine';
  import { spectrumById } from '../spectrums';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { WavelengthState } from '../types';
  import Dial from './Dial.svelte';

  const { game, my }: { game: WavelengthState; my: PlayerDoc } = $props();
  const iAmPsychic = $derived(psychicId(game) === my.id);
  const inTeam = $derived(game.playerIds.includes(my.id) && !iAmPsychic);
  const psychicName = $derived(game.names[psychicId(game)] || '¿?');
  const spec = $derived(spectrumById(game.spectrumId));
  // El número solo, en una mesa, no dice nada: se traduce al extremo al que tira.
  const aim = $derived.by(() => {
    const h = targetHint(game);
    return h === 'el centro' ? 'justo en el centro del dial' : `del lado de «${h}»`;
  });
  let clue = $state('');
</script>

{#if iAmPsychic}
  <div class="actionpanel"><h3>🔮 Eres el Psíquico de esta ronda</h3>
    <p class="hint">Solo tú ves la diana. Tienes que meter al equipo en ella con UNA idea dicha en voz alta.</p>

    <p class="aim">🎯 Tu objetivo está en <b>{game.target}</b> de 100, {aim}.</p>

    <Dial spectrumId={game.spectrumId} target={game.target} legend="bands" />

    <ol class="steps">
      <li>Piensa algo que, en este dial, caiga <b>justo en la franja verde</b> (no en el lado, en la franja).</li>
      <li>Dilo <b>en voz alta una sola vez</b>: sin números, sin señalar el dial y sin poner caras.</li>
      <li>Apúntala abajo si quieres y pulsa <b>«Ya he dado la pista»</b>: entonces el equipo podrá mover el marcador.</li>
    </ol>

    <label for="wl-clue-text">✍️ Apunta tu pista (opcional): quedará a la vista de todos mientras debaten.</label>
    <input id="wl-clue-text" type="text" data-a="wl-clue-text" bind:value={clue} maxlength="60"
      placeholder="p. ej. «una sauna»" autocomplete="off" />
    <p class="small-note" style="margin-top:4px">Escribirla evita el «¿qué había dicho?» a los treinta segundos: tú ya no podrás repetirla.</p>

    <button class="primary block" data-a="wl-clue-done" onclick={() => guard(() => A.giveClue(clue))}>💬 Ya he dado la pista{clue.trim() ? ` («${clue.trim()}»)` : ''}</button>
    <button class="ghost block" data-a="wl-new-spectrum" onclick={() => guard(A.newSpectrum)}>🔀 Cambiar espectro y objetivo (no gasta la ronda)</button>
    <p class="small-note" style="margin-top:4px">Úsalo si este par no te sugiere nada: sale otro espectro con otra diana y sigues siendo tú el Psíquico.</p>

    <details class="ref">
      <summary data-a="wl-ref-clue">📖 Qué vale como pista y qué no</summary>
      <p class="small-note">Vale: una idea, una cosa, un nombre, una escena («una sauna», «mi primer coche»). Cuanto más concreta, mejor os leeréis.</p>
      <p class="small-note">No vale: números o posiciones («un 80», «casi al tope»), señalar el dial, ni nada que se salga del espectro de la ronda.</p>
      <p class="small-note">Después de darla, calla: ni aclaraciones ni gestos. La puntuación es del equipo, y también tuya: 4 puntos en el centro de la diana, 3 cerca, 2 rozando y 0 fuera.</p>
    </details>
  </div>
{:else}
  <div class="narration">🔮 <b>{psychicName}</b> está mirando la diana y buscando su pista… Escuchad con atención: solo la dirá una vez.</div>
  <div class="card">
    <p class="small-note" style="margin:0 0 2px">📡 El dial de esta ronda va de <b>{spec?.left ?? '0'}</b> (0) a <b>{spec?.right ?? '100'}</b> (100). El objetivo es secreto: está en algún punto de la barra.</p>
    <Dial spectrumId={game.spectrumId} />
    <p class="small-note" style="margin-top:2px">
      {inTeam
        ? '⏳ Nada que tocar aún. Cuando dé la pista se abrirá el marcador y podréis debatir y moverlo entre todos.'
        : '👀 Miras de espectador: verás el dial y la pista, pero no el objetivo ni podrás mover el marcador.'}
    </p>
  </div>
{/if}

<style>
  .aim { background: color-mix(in srgb, var(--accent) 14%, var(--card2)); border: 1px solid var(--accent);
    border-radius: 10px; padding: 8px 12px; margin: 8px 0 10px; font-size: 0.95rem; }
  .steps { margin: 10px 0 4px; padding-left: 20px; display: flex; flex-direction: column; gap: 6px;
    font-size: 0.88rem; color: var(--text); }
  .ref { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px; }
  .ref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); }
</style>
