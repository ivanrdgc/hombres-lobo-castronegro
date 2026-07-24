<script lang="ts">
  // Pantalla de partida de «Wavelength»: cabecera + espectro público + fase.
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { wavelengthGame } from '../actions';
  import { psychicId } from '../engine';
  import { spectrumById } from '../spectrums';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import CluePhase from './CluePhase.svelte';
  import GuessPhase from './GuessPhase.svelte';
  import ResultPhase from './ResultPhase.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(wavelengthGame(group)!);
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  const psychic = $derived(game.names[psychicId(game)] || '¿?');
  const iAmPsychic = $derived(psychicId(game) === my.id);
  const spec = $derived(spectrumById(game.spectrumId));
  // Progreso hacia la meta: sin esto, «Ronda 4» no dice si queda una o cinco.
  const prog = $derived.by(() => {
    const g = game.goal;
    if (!g) return null;
    const done = g.kind === 'rounds' ? game.round : game.teamScore;
    return { done, n: g.n, pct: Math.max(0, Math.min(100, Math.round((done / g.n) * 100))),
      txt: g.kind === 'rounds' ? `Ronda ${Math.min(done, g.n)} de ${g.n}` : `${done} de ${g.n} puntos de equipo` };
  });
  // Qué se espera de MÍ, en una línea, en cualquier fase.
  const mine = $derived.by(() => {
    if (game.paused) return ''; // ya lo cuenta la tarjeta de pausa, justo encima
    const inGame = game.playerIds.includes(my.id);
    if (game.phase === 'clue') return iAmPsychic ? '🔮 Te toca: mira la diana y da tu pista en voz alta.'
      : inGame ? `👂 Escucha la pista de ${psychic} (aún no se toca el dial).` : `👀 Miras de espectador: ${psychic} está pensando su pista.`;
    if (game.phase === 'guess') return iAmPsychic ? '🤐 Tu trabajo ya está hecho: ahora calla y disfruta.'
      : inGame ? '🎚️ Te toca con el equipo: debatid y colocad el marcador.' : `👀 Miras de espectador: el equipo coloca el marcador.`;
    if (game.phase === 'result') return '🎯 Ronda resuelta: cualquiera puede lanzar la siguiente.';
    return '';
  });

  function unlockVoice() {
    unlockAudio();
    play({ id: 'unlock', segments: [{ kind: 'clip', text: 'La voz está lista.' }] }).catch(() => {});
    app.ui.voiceUnlocked = true;
  }
  let logEl: HTMLElement | null = $state(null);
  $effect(() => { void (game.log || []).length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
</script>

<div class="topbar">
  <h2>📡 Wavelength</h2>
  <span class="chip">{game.goal?.kind === 'rounds' ? `Ronda ${Math.min(game.round, game.goal.n)}/${game.goal.n}` : `Ronda ${game.round}`}</span>
  <GameMenu {game} {my} />
</div>
<Flash />

{#if needsUnlock}
  <div class="card" style="text-align:center"><span class="moon">🔊</span><h3>Este dispositivo pone la voz</h3>
    <button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la voz</button></div>
{/if}
{#if game.paused}
  <div class="card" style="text-align:center"><span class="moon">⏸️</span><h3>Partida en pausa</h3>
    <p class="small-note">La ha pausado {game.paused.name || 'alguien'}. Nadie puede actuar hasta reanudar (menú ⋯).</p></div>
{/if}

<!-- Cabecera de partida: el espectro de la ronda (lo único público del dial),
     quién es el Psíquico, qué se espera de MÍ y cuánto falta para la meta. -->
{#if game.phase !== 'end'}
  <div class="card hdr">
    <p class="spec"><span class="pl">{spec?.left ?? '0'}</span><span class="ar">↔</span><span class="pl r">{spec?.right ?? '100'}</span></p>
    <p class="specnote">📡 Espectro de la ronda: el dial va de 0 (izquierda) a 100 (derecha).</p>
    <div class="chips">
      <span class="chip">🔮 Psíquico: <b>&nbsp;{iAmPsychic ? 'tú' : psychic}</b></span>
      <span class="chip">🏆 Equipo: <b>&nbsp;{game.teamScore}</b></span>
    </div>
    {#if prog}
      <div class="goal">
        <div class="gbar"><i style="width:{prog.pct}%"></i></div>
        <p class="small-note" style="margin:3px 0 0">🏁 {prog.txt} · meta: {game.goal?.label.toLowerCase()}</p>
      </div>
    {:else}
      <p class="small-note" style="margin:8px 0 0">♾️ Sin meta: jugáis las rondas que queráis (se termina desde el menú ⋯).</p>
    {/if}
    {#if mine}<p class="mine">{mine}</p>{/if}
  </div>
{/if}

<!-- En pausa se ocultan los paneles: si no, los botones seguían ahí y `tx`
     descartaba la acción en silencio (parecía que la app se había colgado). -->
{#if game.paused}
  <div class="narration">⏸️ Todo esperando. Al reanudar, la ronda sigue justo donde estaba.</div>
{:else if game.phase === 'clue'}
  <CluePhase {game} {my} />
{:else if game.phase === 'guess'}
  <GuessPhase {game} {my} />
{:else if game.phase === 'result'}
  <ResultPhase {game} {my} />
{:else if game.phase === 'end'}
  <EndPhase {game} {my} />
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="wl-mycard" />

<style>
  /* El espectro es lo primero que hay que leer: en la mesa real es la carta que
     está en el centro, no un renglón de letra pequeña. */
  .hdr { padding: 12px 14px; }
  .spec { display: flex; align-items: center; gap: 8px; }
  .spec .pl { flex: 1; min-width: 0; font-size: 1.05rem; font-weight: 800; color: var(--moon); line-height: 1.15; }
  .spec .pl.r { text-align: right; }
  .spec .ar { color: var(--muted); font-size: 0.9rem; }
  .specnote { color: var(--muted); font-size: 0.8rem; margin-top: 3px; }
  .hdr .chips { margin-top: 8px; }
  .hdr .chip b { color: var(--text); font-weight: 700; }
  .goal { margin-top: 8px; }
  .gbar { height: 6px; border-radius: 999px; background: var(--card2); border: 1px solid var(--border); overflow: hidden; }
  .gbar i { display: block; height: 100%; background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 65%, transparent), var(--accent)); }
  /* La línea «qué se espera de MÍ»: la misma en las cuatro fases y siempre en el
     mismo sitio, para no tener que buscarla. */
  .mine { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 0.88rem; color: var(--text); }
</style>
