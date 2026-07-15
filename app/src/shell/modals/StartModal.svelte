<script lang="ts">
  // Empezar partida: elección de modo. Cada modo indica claramente (sin poder
  // editarse desde aquí) quién narra, quién dirige y quién recibe rol.
  import { app, me } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../games/hombres-lobo/actions';
  import { OFFICIAL_MIN_PLAYERS } from '../../games/hombres-lobo/roles';
  import { unlockAudio } from '../../core/audio/engine';
  import { play } from '../../core/audio/player';
  import type { PlayerDoc } from '../../core/sync/schema';

  const g = $derived(app.group);
  const meId = $derived(me()?.id);
  const meName = $derived(app.players.find((p) => p.id === meId)?.name ?? 'este dispositivo');
  // Narrador de los modos automáticos: el elegido en la mesa (o el creador).
  const remembered = $derived(app.players.some((p) => p.id === g?.lastNarratorId) ? g!.lastNarratorId : null);
  const narrator = $derived(remembered || meId || null);
  const narratorP = $derived(app.players.find((p) => p.id === narrator));
  const narratorPlays = $derived(!!narratorP && narratorP.isPlayer !== false);
  // Reciben rol: en auto, todos los marcados como jugadores; en guiado/manual,
  // esos mismos MENOS quien empieza (que dirige en persona y no juega).
  const autoPlayers = $derived(app.players.filter((p) => p.isPlayer !== false));
  const humanPlayers = $derived(app.players.filter((p) => p.isPlayer !== false && p.id !== meId));
  const names = (ps: PlayerDoc[]) => ps.map((p) => p.name).join(', ') || '(nadie)';

  function startAuto() {
    const chosen = narrator;
    // El gesto solo desbloquea el audio en el dispositivo que narra.
    if (chosen && chosen === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que empiece la partida.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startGame('auto', chosen));
  }
</script>

<h3>🎬 Empezar partida</h3>
<p class="small-note">Dispositivos conectados: <b>{app.players.length}</b>. Una vez empiece, nadie podrá entrar ni salir del grupo.</p>

<div class="card" style="border-color:var(--accent)">
  <h3>🤖 Modo automático</h3>
  <p class="small-note">La app dirige la partida con voz; nadie narra en persona.</p>
  <p class="small-note">🔊 Narra: <b>{narratorP?.name ?? '…'}{narrator === meId ? ' (este dispositivo)' : ''}</b> · 🧠 Dirige: <b>la app</b></p>
  <p class="small-note">🎮 Reciben rol: <b>{autoPlayers.length}</b> {narratorPlays ? '(el narrador también juega)' : '(el narrador solo pone la voz)'}<br><span style="opacity:.7">{names(autoPlayers)}</span></p>
  <button class="primary block" data-a="start-auto" onclick={startAuto}>🤖 Empezar en automático</button>
</div>

<div class="card">
  <h3>📖 Modo guiado</h3>
  <p class="small-note">Tú narras en persona (la app no habla) y tu pantalla te guía paso a paso; registras las decisiones.</p>
  <p class="small-note">🔊 Narra y 🧠 dirige: <b>{meName} (tú)</b> · no juegas</p>
  <p class="small-note">🎮 Reciben rol: <b>{humanPlayers.length}</b><br><span style="opacity:.7">{names(humanPlayers)}</span></p>
  <button class="violet block" data-a="start-guided" onclick={() => guard(() => A.startGame('guiado'))}>📖 Narrar yo (guiado)</button>
</div>

<div class="card">
  <h3>🎩 Modo manual</h3>
  <p class="small-note">Tú diriges sin guion: la app reparte los roles y tú marcas muertes, enamorados o el cambio del Ladrón.</p>
  <p class="small-note">🔊 Narra y 🧠 dirige: <b>{meName} (tú)</b> · no juegas</p>
  <p class="small-note">🎮 Reciben rol: <b>{humanPlayers.length}</b><br><span style="opacity:.7">{names(humanPlayers)}</span></p>
  <button class="ghost block" data-a="start-manual" onclick={() => guard(() => A.startGame('manual'))}>🎩 Narrar yo (manual)</button>
</div>

<p class="small-note">Reglas oficiales: de {OFFICIAL_MIN_PLAYERS} a 18 jugadores además del narrador{(g?.settings || {}).casual ? ' (modo casual activo: desde 3)' : ''}.</p>
<div id="form-error">
  {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
</div>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
