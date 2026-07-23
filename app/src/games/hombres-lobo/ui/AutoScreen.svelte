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
  import RevealPhase from './RevealPhase.svelte';
  import NightPhase from './NightPhase.svelte';
  import DayPhase from './DayPhase.svelte';
  import EndPhase from './EndPhase.svelte';
  import PlayersGrid from './PlayersGrid.svelte';
  import RolesStrip from './RolesStrip.svelte';
  import LogPanel from './LogPanel.svelte';
  import GameMenu from './GameMenu.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(group.game!);
  // Solo pedimos activar si el audio NO suena ya (estado real del AudioContext).
  const needsUnlock = $derived(!app.ui.audioReady && !app.ui.muted);

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que empiece la partida.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
</script>

{#if !my.inGame && game.phase !== 'end'}
  <!-- Dispositivo que no juega: narrador-altavoz o espectador. Ambos siguen la
       partida y tienen el menú ⋯ (pausar/terminar) por si quien jugaba no está. -->
  <div class="topbar">
    <h2>{group.name}</h2>
    <PhaseChip {game} />
    <GameMenu {group} />
  </div>
  <Flash />
  {#if isMaster()}
    <div class="card" style="text-align:center">
      <span class="moon">🔊</span>
      <h3>Este dispositivo narra la partida</h3>
      <p class="small-note">Déjalo con la pantalla encendida y el volumen alto: nadie necesita tocarlo.</p>
      {#if needsUnlock}<button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la narración</button>{/if}
    </div>
  {:else}
    <div class="card" style="text-align:center">
      <span class="moon">👀</span>
      <h3>Hay una partida en curso</h3>
      <p class="small-note">Este dispositivo no juega esta partida: puedes seguirla desde aquí. Si quien jugaba no está, cualquiera puede pausarla o terminarla desde el menú ⋯.</p>
    </div>
    <NarratorPresence {group} />
  {/if}
  {#if game.paused}
    <div class="card" style="text-align:center;border-color:var(--accent)">
      <h3>⏸️ Partida en pausa</h3>
      <p class="small-note">La pausó <b>{game.paused.name || 'alguien'}</b>.</p>
      <button class="primary block" data-a="resume-game" onclick={() => guard(A.resumeGame)}>▶️ Reanudar la partida</button>
    </div>
  {/if}
  <PlayersGrid players={app.players.filter((p) => p.inGame)} title="🏘️ El pueblo" viewer={my} />
  <RolesStrip {game} />
  <LogPanel {game} />
{:else}
  <div class="topbar">
    <h2>{group.name}</h2>
    <PhaseChip {game} />
    <GameMenu {group} />
  </div>
  {#if !my.alive && game.phase !== 'end' && my.inGame}<div class="flash">{my.causeOfDeath === 'abandono' ? '🚪 Has abandonado la partida: el pueblo sigue sin ti.' : '💀 Has muerto. Sigue mirando en silencio… y no desveles nada.'}</div>{/if}
  <Flash />
  <NarratorPresence {group} />
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
  {#if game.phase !== 'end'}<RolesStrip {game} />{/if}
  <LogPanel {game} />
{/if}
