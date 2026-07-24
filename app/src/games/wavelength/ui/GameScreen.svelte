<script lang="ts">
  // Pantalla de partida de «Wavelength»: qué te toca ahora + contexto + la fase.
  import { app, isMaster } from '../../../core/sync/store.svelte';
  import { wavelengthGame } from '../actions';
  import { psychicId } from '../engine';
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
  // Progreso hacia la meta: sin esto, «Ronda 4» no dice si queda una o cinco.
  // Es también el ÚNICO sitio donde se dice la ronda (antes salía además en un
  // chip de la cabecera, diciendo lo mismo dos veces).
  const prog = $derived.by(() => {
    const g = game.goal;
    if (!g) return null;
    const done = g.kind === 'rounds' ? game.round : game.teamScore;
    return { done, n: g.n, pct: Math.max(0, Math.min(100, Math.round((done / g.n) * 100))),
      txt: g.kind === 'rounds' ? `Ronda ${Math.min(done, g.n)} de ${g.n}` : `${done} de ${g.n} puntos de equipo` };
  });
  // Qué se espera de MÍ, en una línea, en cualquier fase: es lo primero de la
  // pantalla, antes que ningún dato.
  const mine = $derived.by(() => {
    if (game.paused) return ''; // ya lo cuenta la tarjeta de pausa, justo encima
    const inGame = game.playerIds.includes(my.id);
    if (game.phase === 'clue') return iAmPsychic ? '🔮 Te toca: da tu pista en voz alta.'
      : inGame ? `👂 Escucha la pista de ${psychic} (aún no se toca el dial).` : `👀 Miras de espectador: ${psychic} está pensando su pista.`;
    if (game.phase === 'guess') return iAmPsychic ? '🤐 Tu trabajo ya está hecho: ahora calla y disfruta.'
      : inGame ? '🎚️ Te toca con el equipo: debatid y colocad el marcador.' : '👀 Miras de espectador: el equipo coloca el marcador.';
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

<!-- Cabecera de partida: primero QUÉ TOCA (lo que se lee de un vistazo) y
     debajo el contexto — quién es el Psíquico, el total del equipo y cuánto
     falta para la meta. El espectro NO se repite aquí: lo dicen los dos
     extremos del propio dial, que es donde se mira. -->
{#if game.phase !== 'end'}
  <div class="card hdr">
    {#if mine}<p class="mine">{mine}</p>{/if}
    <div class="ctx">
      <span class="chip">🔮 Psíquico: <b>&nbsp;{iAmPsychic ? 'tú' : psychic}</b></span>
      <div class="score" data-a="wl-team-score"><b>{game.teamScore}</b><span>puntos de equipo</span></div>
    </div>
    {#if prog}
      <div class="goal">
        <div class="gbar"><i style="width:{prog.pct}%"></i></div>
        <p class="small-note" style="margin:3px 0 0">🏁 {prog.txt}</p>
      </div>
    {:else}
      <p class="small-note" style="margin:8px 0 0">♾️ Ronda {game.round} · sin meta: jugáis las que queráis (se termina desde el menú ⋯).</p>
    {/if}
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
  .hdr { padding: 12px 14px; }
  /* «Qué se espera de MÍ»: lo primero de la pantalla, la misma frase en el
     mismo sitio en las cuatro fases, para no tener que buscarla. */
  .mine { font-size: 1rem; font-weight: 600; color: var(--text); line-height: 1.3; }
  .ctx { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
  .ctx .chip { flex: 1; min-width: 0; }
  .hdr .chip b { color: var(--text); font-weight: 700; }
  /* El total del equipo es EL marcador de un juego cooperativo: número grande,
     legible desde el otro lado de la mesa (es público: no delata nada). */
  .score { display: flex; align-items: center; gap: 7px; flex: 0 0 auto; }
  .score b { font-size: 2rem; font-weight: 800; color: var(--moon); line-height: 1; }
  .score span { font-size: 0.72rem; color: var(--muted); line-height: 1.1; max-width: 62px; }
  .goal { margin-top: 8px; }
  .gbar { height: 6px; border-radius: 999px; background: var(--card2); border: 1px solid var(--border); overflow: hidden; }
  .gbar i { display: block; height: 100%; background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 65%, transparent), var(--accent)); }
</style>
