<script lang="ts">
  // Pantalla de partida en modo automático (port de autoScreen() de la v1),
  // con spectatorScreen y narratorOnlyScreen inline: topbar con chip de fase y
  // pausa, aviso de muerte, panel del narrador, cuerpo por fase, crónica y
  // barra de herramientas.
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import NarratorPresence from '../../../shell/NarratorPresence.svelte';
  import PhaseChip from './PhaseChip.svelte';
  import NarratorPanel from './NarratorPanel.svelte';
  import RevealPhase from './RevealPhase.svelte';
  import NightPhase from './NightPhase.svelte';
  import DayPhase from './DayPhase.svelte';
  import EndPhase from './EndPhase.svelte';
  import PlayersGrid from './PlayersGrid.svelte';
  import LogPanel from './LogPanel.svelte';
  import MasterTools from './MasterTools.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(group.game!);
  const needsUnlock = $derived(!app.ui.voiceUnlocked && !app.ui.muted);
  // Como en la v1: el panel del narrador acompaña al cuerpo de la partida si el
  // dispositivo no juega (en la práctica, las pantallas mínimas de arriba lo
  // cubren antes; se conserva por paridad con autoScreen()).
  const showNarratorPanel = $derived(!my.inGame && game.phase !== 'end' && !game.paused);

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'El pueblo de Castronegro abre sus puertas.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
</script>

{#if !my.inGame && game.phase !== 'end' && isMaster()}
  <!-- Narrador que no juega (tele/altavoz): solo el aviso + la voz del juego. -->
  <div class="topbar"><h2>{group.name}</h2><span class="chip">🔊 Narrador</span></div>
  <div class="card" style="text-align:center">
    <span class="moon">🔊</span>
    <h3>Este dispositivo narra la partida</h3>
    <p class="small-note">Hay una partida en curso. Deja este dispositivo con la pantalla encendida y el volumen alto: nadie necesita tocarlo.</p>
    {#if needsUnlock}<button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la narración</button>{/if}
  </div>
{:else if !my.inGame && game.phase !== 'end'}
  <!-- Dispositivo que no juega ni narra: solo el aviso de partida en curso. -->
  <div class="topbar"><h2>{group.name}</h2><span class="chip">🌙 En curso</span></div>
  <div class="card" style="text-align:center">
    <span class="moon">🌙</span>
    <h3>Hay una partida en curso</h3>
    <p class="small-note">Este dispositivo no participa. La pantalla cambiará sola cuando termine.</p>
  </div>
{:else}
  <div class="topbar">
    <h2>{group.name}</h2>
    <PhaseChip {game} />
    {#if game.phase !== 'end' && !game.paused}<button class="small ghost" data-a="pause-game" onclick={() => guard(A.pauseGame)}>⏸️</button>{/if}
  </div>
  {#if !my.alive && game.phase !== 'end' && my.inGame}<div class="flash">💀 Has muerto. Sigue mirando en silencio… y no desveles nada.</div>{/if}
  <Flash />
  <NarratorPresence {group} />
  {#if showNarratorPanel}<NarratorPanel {group} />{/if}
  {#if game.paused && game.phase !== 'end'}
    <!-- Pausa global: se congela todo hasta que alguien reanude. -->
    <div class="card" style="text-align:center;border-color:var(--accent)">
      <h3>⏸️ Partida en pausa</h3>
      <p class="small-note">La pausó <b>{game.paused.name || 'alguien'}</b>. Narración, temporizadores y acciones quedan congelados.</p>
      <button class="primary block" data-a="resume-game" onclick={() => guard(A.resumeGame)}>▶️ Reanudar la partida</button></div>
    <PlayersGrid players={app.players.filter((p) => p.inGame)} title="🏘️ El pueblo" viewer={my} />
  {:else if game.phase === 'reveal'}
    <RevealPhase {group} {my} />
  {:else if game.phase === 'night'}
    <NightPhase {group} {my} />
  {:else if game.phase === 'day'}
    <DayPhase {group} {my} />
  {:else if game.phase === 'end'}
    <EndPhase {group} {my} />
  {/if}
  <LogPanel {game} />
  <MasterTools {group} />
{/if}
