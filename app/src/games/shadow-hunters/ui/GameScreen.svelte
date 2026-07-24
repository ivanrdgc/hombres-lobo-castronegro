<script lang="ts">
  // Pantalla de partida de «Shadow Hunters»: tablero + turno + pista + fin.
  import { app, isMaster, matchOf } from '../../../core/sync/store.svelte';
  import { shadowHGame, clearPista } from '../actions';
  import { guard } from '../../../core/sync/guard';
  import { PISTAS } from '../chars';
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
  const nm = (pid: string) => game.names[pid] || '¿?';
  const inGame = $derived(game.playerIds.includes(my.id) && !!matchOf(my.id));
  const myTurn = $derived(game.turn === my.id && game.phase === 'turn' && game.alive[my.id]);
  const needsUnlock = $derived(isMaster() && !app.ui.audioReady && !app.ui.muted);
  // La pista en curso: quien la RECIBE lee el texto completo; quien la dio ve
  // la confirmación (también con el texto: la carta la leen ambos).
  const pistaMine = $derived(game.pista && (game.pista.target === my.id || game.pista.by === my.id) ? game.pista : null);
  // 🍽️ MESA: el aviso sale en TODAS las pantallas, pero el texto solo se abre
  // tras un gesto y se vuelve a tapar solo. `denied` es lo que ve quien no es de
  // los dos al tocarlo: así tocar el aviso tampoco delata (y desaparece solo).
  let pistaOpen = $state(false);
  let pistaDenied = $state(false);
  function openPista() { if (pistaMine) pistaOpen = true; else pistaDenied = true; }
  // Se cierra al cambiar DE CARTA (no en cada snapshot: el doc de la partida se
  // reemplaza entero cada vez que alguien actúa, y eso cerraría el texto en las
  // narices de quien lo está leyendo). El acuse de recibo del otro no cuenta.
  let pistaSeen = '';
  $effect(() => {
    const sig = game.pista ? `${game.pista.by}|${game.pista.idx}` : '';
    if (sig === pistaSeen) return;
    pistaSeen = sig;
    pistaOpen = false; pistaDenied = false;
  });
  $effect(() => {
    if (!pistaOpen && !pistaDenied) return;
    const t = setTimeout(() => { pistaOpen = false; pistaDenied = false; }, 12000);
    return () => clearTimeout(t);
  });
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
  <!-- Orden de la pantalla (B29): lo que hay que hacer AHORA arriba (la pista
       pendiente, luego tu turno o a quién se espera) y solo entonces el
       contexto público (tablero) y el diario. Tu carta NO se pinta aquí: en un
       juego de mesa se abre desde un único sitio, la pastilla 🎴 (B34). -->

  <!-- La pista sigue a la vista en pausa a propósito: leerla no es actuar (y
       `clearPista` va con allowPaused). Solo se retira cuando la han acusado los
       DOS, para que quien la da no se la borre a quien la recibe.
       🍽️ MESA: el aviso se pinta en TODAS las pantallas y con el mismo texto —
       antes aparecía solo en dos móviles y su sola presencia decía a quién le
       había tocado. Lo secreto es QUÉ pone, y eso vive tras el botón.
       B34: esto NO es «ver mi carta», es una acción, así que se rotula por lo
       que hace («leer la pista»). -->
  {#if game.pista}
    {@const acked = (game.pista.ack || []).includes(my.id)}
    <div class="card pistacard">
      <h3 style="margin:0 0 2px">🔮 Hay una pista sin leer</h3>
      <p class="small-note" style="margin:0">La leen solo quien la da y quien la recibe; la mesa oye únicamente el resultado. Este aviso sale igual en los {game.playerIds.length} móviles.</p>
      {#if !pistaOpen}
        <button class="primary block" style="margin-top:10px" data-a="sh-pista-peek" onclick={openPista}>🔮 Leer la pista (se tapa sola)</button>
        {#if pistaDenied}
          <p class="small-note" style="margin:8px 0 0">🤫 Esta no es tuya: la leen quien la da y quien la recibe. Por eso el botón está en todas las pantallas — tocarlo no delata a nadie.</p>
        {/if}
      {:else if pistaMine}
        {@const otro = pistaMine.by === my.id ? pistaMine.target : pistaMine.by}
        {@const soyTarget = pistaMine.target === my.id}
        <p class="small-note" style="margin:8px 0 0">🤫 Solo la leéis dos: {nm(otro)} y tú.</p>
        <div class="pistatxt">«{PISTAS[pistaMine.idx].text}»</div>
        <p style="margin:8px 0 0">{pistaEfecto}</p>
        <p class="small-note" style="margin:6px 0 0">La mesa solo ha oído el resultado («{pistaMine.outcome}»), nunca la pista: {soyTarget ? `lo que ${nm(otro)} deduzca de tu bando lo sabe solo ${nm(otro)}… y ahora decide si lo cuenta o miente.` : `lo que deduzcas de ${nm(otro)} lo sabes solo tú: cuéntalo, cállalo o miente.`}</p>
        {#if acked}
          <p class="small-note" style="margin:8px 0 0">✅ Ya la has leído: el aviso se retira cuando {nm(otro)} pulse también «Entendido».</p>
          <button class="ghost block small" style="margin-top:8px" data-a="sh-pista-hide" onclick={() => (pistaOpen = false)}>🙈 Taparla ya</button>
        {:else}
          <button class="primary block" style="margin-top:10px" data-a="sh-pista-ok" onclick={() => guard(clearPista)}>👍 Entendido, retirar la pista</button>
        {/if}
      {/if}</div>
  {/if}

  <!-- En pausa el panel de acciones NO se pinta: sus botones no responden (la
       transacción se descarta) y verlos ahí hacía creer que la app se colgó. -->
  {#if myTurn && !game.paused}
    <TurnPanel {game} {my} />
  {:else if !myTurn}
    <!-- Quien no actúa también necesita saber qué pasa y a quién se espera: sin
         esta línea la espera parecía una pantalla muerta. -->
    <div class="narration">⏳ Juega <b>{nm(game.turn)}</b>: dará una pista, atacará, descansará o se revelará. Escucha y sospecha; cuando te toque, tus cuatro acciones saldrán aquí.</div>
  {/if}
  {#if inGame && !game.alive[my.id]}<p class="small-note" style="text-align:center">☠️ Estás fuera y tu personaje quedó destapado. Mira cómo acaba.</p>{/if}
  {#if !inGame}<p class="small-note" style="text-align:center">👀 Miras de espectador: no juegas esta partida.</p>{/if}

  <!-- «La mesa» ya es el modal de dispositivos del menú ⋯: este tablero cuenta
       cómo va la PARTIDA (vidas y destapados). Un nombre por cosa. -->
  <div class="card"><h3 style="margin:0 0 4px">🩸 Cómo va la partida</h3><PlayersBoard {game} {my} /></div>
{/if}

{#if game.log && game.log.length}
  <div class="card"><h3>📜 Lo que ha pasado</h3>
    <div class="log" bind:this={logEl}>{#each game.log as l, i (i)}<p>{l.txt}</p>{/each}</div></div>
{/if}

<CardFab modal="sh-mycard" />

<style>
  /* La pista es LO que se juega aquí: se pinta como una carta, no como un aviso
     más, y con el texto grande (se lee de una ojeada y se pasa). */
  .pistacard { border-color: #c8a24a; }
  .pistatxt {
    margin: 10px 0 0; padding: 12px; border-radius: var(--r-2);
    border: 1px dashed #c8a24a; background: color-mix(in srgb, #c8a24a 12%, var(--card2));
    font-size: 1.02rem; font-weight: 700; color: var(--moon); text-align: center;
  }
</style>
