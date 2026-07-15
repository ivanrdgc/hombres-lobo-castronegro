<script lang="ts">
  // Empezar partida: elección de modo. El orden de la mesa ya no se confirma
  // aquí (los roles de vecindad avisan en el modal de roles); el narrador se
  // elige en la mesa y aquí solo se informa de quién será.
  import { app, me } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../games/hombres-lobo/actions';
  import { OFFICIAL_MIN_PLAYERS } from '../../games/hombres-lobo/roles';
  import { unlockAudio } from '../../core/audio/engine';
  import { play } from '../../core/audio/player';

  const g = $derived(app.group);
  const n = $derived(app.players.length);
  const meId = $derived(me()?.id);
  const remembered = $derived(app.players.some((p) => p.id === g?.lastNarratorId) ? g!.lastNarratorId : null);
  const narrator = $derived(remembered || meId || null);
  const narratorP = $derived(app.players.find((p) => p.id === narrator));
  const narratorPlays = $derived(!!narratorP && narratorP.isPlayer !== false);
  const playingCount = $derived(app.players.filter((p) => p.isPlayer !== false).length);

  function startAuto() {
    const chosen = narrator;
    // El gesto solo desbloquea el audio en el dispositivo que narra.
    if (chosen && chosen === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'El pueblo de Castronegro abre sus puertas.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startGame('auto', chosen));
  }
</script>

<h3>🎬 Empezar partida</h3>
<p class="small-note">Dispositivos conectados: <b>{n}</b>. Una vez empiece, nadie podrá entrar ni salir del grupo.</p>
<div class="card" style="border-color:var(--accent)">
  <h3>🤖 Modo automático</h3>
  <p class="small-note">La app dirige la partida con voz, sin narrador humano.</p>
  <p class="small-note">🔊 Narrará <b>{narratorP?.name ?? '…'}{narrator === meId ? ' (este dispositivo)' : ''}</b> · <b>{playingCount}</b> jugará{playingCount === 1 ? '' : 'n'}. {narratorPlays
    ? 'El narrador está marcado como jugador: narrará y además jugará con rol desde el mismo móvil.'
    : 'No juega: solo pone la voz (ideal para una tele o un altavoz).'} Para cambiar quién narra, tócalo en la lista de dispositivos de la mesa.</p>
  <button class="primary block" data-a="start-auto" onclick={startAuto}>🤖 Empezar en automático</button>
</div>
<div class="card">
  <h3>📖 Modo guiado</h3>
  <p class="small-note">Tú (este dispositivo) narras en persona y la app no habla: tu pantalla te guía paso a paso y registras las decisiones. Los jugadores solo ven su carta. Tú no juegas.</p>
  <button class="violet block" data-a="start-guided" onclick={() => guard(() => A.startGame('guiado'))}>📖 Narrar yo (guiado)</button>
</div>
<div class="card">
  <h3>🎩 Modo manual</h3>
  <p class="small-note">Tú (este dispositivo) diriges sin guion: la app reparte los roles, te los muestra y marcas muertes, enamorados o el cambio del Ladrón. Tú no juegas.</p>
  <button class="ghost block" data-a="start-manual" onclick={() => guard(() => A.startGame('manual'))}>🎩 Narrar yo (manual)</button>
</div>
<p class="small-note">El narrador no recibe rol. Reglas oficiales: de {OFFICIAL_MIN_PLAYERS} a 18 jugadores además del narrador{(g?.settings || {}).casual ? ' (modo casual activo: desde 3)' : ''}.</p>
<div id="form-error">
  {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
</div>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
