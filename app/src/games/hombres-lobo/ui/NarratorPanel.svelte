<script lang="ts">
  // Panel para el máster en modo automático (port de narratorPanel() de la v1):
  // su dispositivo narra, él no juega. Ojo: esta pantalla suele estar a la
  // vista de la mesa — de noche se muestra el ROL al que se espera, no el
  // nombre (el nombre solo bajo demanda, «¿quién es?»).
  import { app } from '../../../core/sync/store.svelte';
  import { stepActors } from '../engine';
  import { STEP_LABELS, PENDING_LABELS } from './labels';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc } from '../../../core/sync/schema';

  const { group }: { group: GroupDoc } = $props();

  const game = $derived(group.game!);

  type Info =
    | { kind: 'text'; text: string }
    | { kind: 'waiting'; label: string }
    | { kind: 'waiting-who'; label: string; names: string }
    | null;

  const info: Info = $derived.by(() => {
    const players = app.players.filter((p) => p.inGame);
    if (game.phase === 'reveal') {
      const pend = players.filter((p) => !p.roleSeen).map((p) => p.name);
      return { kind: 'text', text: pend.length ? `⏳ Falta que confirmen su rol: ${pend.join(', ')}` : '✅ Todos han visto su rol.' };
    }
    if (game.phase === 'night' && game.roleRefresh) {
      const pend = players.filter((p) => p.alive && !(game.roleRefresh!.confirmed || {})[p.id]).map((p) => p.name);
      return { kind: 'text', text: `👁️ Repaso de roles en curso. Faltan: ${pend.join(', ') || 'nadie'}` };
    }
    if (game.phase === 'night') {
      const stepId = game.steps[game.stepIdx];
      const actors = stepId ? stepActors(stepId, game, players) : null;
      if (stepId === 'amanecer') return { kind: 'text', text: '🌅 Resolviendo el amanecer…' };
      if (actors && actors.length) {
        const label = STEP_LABELS[stepId] || stepId;
        if (app.ui.narratorWho) {
          const names = actors.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean);
          return { kind: 'waiting-who', label, names: names.join(', ') };
        }
        return { kind: 'waiting', label };
      }
      return { kind: 'text', text: '🌫️ Paso sin acción (avanzará solo)…' };
    }
    if (game.phase === 'day') {
      const head = (game.pending || [])[0];
      return {
        kind: 'text',
        text: head ? `⏳ Pendiente: ${PENDING_LABELS[head.type] || head.type}`
          : (game.votesLeft || 0) > 0 ? '🗳️ Votación del pueblo abierta.'
            : '🌆 El día termina, la noche llegará enseguida…',
      };
    }
    return null;
  });

  // Solo pedimos activar si el audio NO suena ya (estado real del AudioContext).
  const needsUnlock = $derived(!app.ui.audioReady && !app.ui.muted);

  let whoTimer: ReturnType<typeof setTimeout> | undefined;

  function narratorWho() {
    app.ui.narratorWho = true;
    clearTimeout(whoTimer);
    whoTimer = setTimeout(() => {
      app.ui.narratorWho = false;
    }, 8000);
  }

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'El pueblo de Castronegro abre sus puertas.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
</script>

<div class="card"><h3>🎙️ Eres el narrador</h3>
  <p class="small-note">Tu dispositivo dirige la partida con su voz: mantén la pantalla encendida y el volumen alto. No juegas con rol; desde la barra inferior puedes repetir la última locución o terminar la partida.</p>
  {#if needsUnlock}
    <div class="flash">🔊 Toca para activar la voz del narrador en este dispositivo.</div>
    <button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la narración</button>
  {/if}
  {#if info}
    <p style="margin-top:6px">
      {#if info.kind === 'text'}{info.text}{:else if info.kind === 'waiting-who'}⏳ Esperando a <b>{info.label}</b>: {info.names} <small>(se ocultará en unos segundos)</small>{:else}⏳ Esperando a <b>{info.label}</b> <button class="small ghost" data-a="narrator-who" onclick={narratorWho}>¿quién es?</button>{/if}
    </p>
  {/if}
</div>
