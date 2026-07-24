<script lang="ts">
  // Pantalla de partida de «Shadow Hunters»: tablero + turno + pista + fin.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { shadowHGame, clearPista } from '../actions';
  import { guard } from '../../../core/sync/guard';
  import { PISTAS } from '../chars';
  import { charOf } from '../engine';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import CardFab from '../../../shell/CardFab.svelte';
  import GameMenu from './GameMenu.svelte';
  import PlayersBoard from './PlayersBoard.svelte';
  import TurnPanel from './TurnPanel.svelte';
  import EndPhase from './EndPhase.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();
  const game = $derived(shadowHGame(group)!);
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const myTurn = $derived(game.turn === my.id && game.phase === 'turn' && game.alive[my.id]);
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  // La pista en curso: quien la RECIBE lee el texto completo; quien la dio ve
  // la confirmación (también con el texto: la carta la leen ambos).
  const pistaMine = $derived(game.pista && (game.pista.target === my.id || game.pista.by === my.id) ? game.pista : null);
  // Qué acaba de pasarle a quien la recibió, dicho en claro: el `outcome` del
  // motor va en tercera persona y quien la recibe no sabía si era sobre él.
  const pistaEfecto = $derived.by(() => {
    const p = pistaMine;
    if (!p) return '';
    const t = p.target; const yo = t === my.id;
    const quien = yo ? 'Tú' : game.names[t] || '¿?';
    const vida = `${game.hp[t]} de ${game.maxHp}`;
    const fuera = !game.alive[t];
    if (p.outcome.startsWith('pierde')) {
      return fuera
        ? `💥 La carta ${yo ? 'te' : 'le'} ha dejado a 0: ${yo ? 'quedas' : `${quien} queda`} fuera de la partida.`
        : `💥 ${quien} ${yo ? 'pierdes' : 'pierde'} 1 punto de vida: ${yo ? 'te quedan' : 'le quedan'} ${vida}.`;
    }
    if (p.outcome.startsWith('se cura')) return `💚 ${quien} ${yo ? 'te curas' : 'se cura'} 1 punto de vida: ${yo ? 'tienes' : 'tiene'} ${vida}.`;
    return `➖ No ${yo ? 'te' : 'le'} afecta: ${yo ? 'tu' : 'su'} vida no cambia (${vida}).`;
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
  <h2>🌘 Shadow Hunters</h2>
  <GameMenu {game} {my} />
</div>
<Flash />

{#if needsUnlock}
  <div class="card" style="text-align:center"><span class="moon">🔊</span><h3>Este dispositivo pone la voz</h3>
    <button class="primary block" data-a="unlock-voice" onclick={unlockVoice}>🔊 Activar la voz</button></div>
{/if}
{#if game.paused}
  <div class="card" style="text-align:center"><span class="moon">⏸️</span><h3>Partida en pausa</h3>
    <p class="small-note">La ha pausado {game.paused.name || 'alguien'}. Nadie puede actuar: los botones vuelven al reanudar (⋯ → ▶️ Reanudar).</p></div>
{/if}

{#if game.phase === 'end'}
  <EndPhase {game} {my} />
{:else}
  <div class="card"><PlayersBoard {game} {my} /></div>

  <!-- La carta de pista sigue a la vista en pausa a propósito: leerla no es
       actuar (y `clearPista` va con allowPaused). Solo se retira cuando la han
       acusado los DOS, para que quien la da no se la borre a quien la recibe. -->
  {#if pistaMine}
    {@const acked = (pistaMine.ack || []).includes(my.id)}
    {@const otro = pistaMine.by === my.id ? pistaMine.target : pistaMine.by}
    {@const soyTarget = pistaMine.target === my.id}
    <div class="card pistacard">
      <h3 style="margin:0 0 2px">🔮 {soyTarget ? `Pista de ${game.names[pistaMine.by] || '¿?'} para ti` : `Tu pista para ${game.names[pistaMine.target] || '¿?'}`}</h3>
      <p class="small-note" style="margin:0">🤫 Esta carta solo la leéis dos: {soyTarget ? `${game.names[pistaMine.by] || '¿?'} y tú` : `${game.names[pistaMine.target] || '¿?'} y tú`}.</p>
      <div class="pistatxt">«{PISTAS[pistaMine.idx].text}»</div>
      <p style="margin:8px 0 0">{pistaEfecto}</p>
      <p class="small-note" style="margin:6px 0 0">La mesa solo ha oído el resultado («{pistaMine.outcome}»), nunca la carta: {soyTarget ? `lo que ${game.names[pistaMine.by] || '¿?'} pueda deducir de tu bando lo sabe solo ${game.names[pistaMine.by] || '¿?'}… y ahora decide si lo cuenta o miente.` : `lo que puedas deducir de ${game.names[pistaMine.target] || '¿?'} lo sabes solo tú: cuéntalo, cállalo o miente.`}</p>
      {#if acked}
        <p class="small-note" style="margin:8px 0 0">✅ Ya la has leído. Se queda en pantalla hasta que {game.names[otro] || '¿?'} también pulse «Entendido».</p>
      {:else}
        <button class="primary block" style="margin-top:10px" data-a="sh-pista-ok" onclick={() => guard(clearPista)}>👍 Entendido, quitar la carta</button>
      {/if}</div>
  {/if}

  <!-- En pausa el panel de acciones NO se pinta: sus botones no responden (la
       transacción se descarta) y verlos ahí hacía creer que la app se colgó. -->
  {#if myTurn && !game.paused}
    <TurnPanel {game} {my} />
  {:else if !myTurn}
    <!-- Quien no actúa también necesita saber qué pasa, a quién se espera y qué
         puede ir haciendo: sin esta línea la espera parecía una pantalla muerta. -->
    <div class="narration">⏳ Le toca a <b>{game.names[game.turn] || '¿?'}</b>: puede dar una pista secreta, atacar con los dados, descansar… o revelarse y usar su poder. Cuando te toque, aquí saldrán tus cuatro acciones.</div>
    {#if inGame && game.alive[my.id]}
      {@const c = charOf(game, my.id)}
      <p class="small-note" style="text-align:center">Tú: {c.emoji} {c.name} · ❤️ {game.hp[my.id]} de {game.maxHp} · {game.revealed[my.id] ? '🎭 identidad pública' : '🤫 identidad oculta'}. Mientras esperas: repasa el tablero o abre «🎴 Mi carta».</p>
    {/if}
  {/if}
  {#if inGame && !game.alive[my.id]}<p class="small-note" style="text-align:center">☠️ Estás fuera: tu personaje quedó destapado. Mira cómo acaba.</p>{/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Sigues la partida de espectador (sin ver identidades ocultas).</p>{/if}
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Diario</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="sh-mycard" />

<style>
  /* La carta de pista es LO que se juega aquí: se pinta como una carta, no como
     un aviso más, y con el texto grande (se lee de una ojeada y se pasa). */
  .pistacard { border-color: #c8a24a; }
  .pistatxt {
    margin: 10px 0 0; padding: 12px; border-radius: var(--r-2);
    border: 1px dashed #c8a24a; background: color-mix(in srgb, #c8a24a 12%, var(--card2));
    font-size: 1.02rem; font-weight: 700; color: var(--moon); text-align: center;
  }
</style>
