<script lang="ts">
  // Carta PRIVADA (bando, rol y sala) con TRES estados, porque en Two Rooms el
  // móvil cambia de postura a mitad de ronda (B28):
  //  · REPOSO — plegada. Durante la ronda se negocia de pie y el móvil acaba
  //    plano o en el bolsillo: todos los móviles enseñan exactamente lo mismo.
  //  · OJEADA (👁) — se abre a petición y se AUTO-OCULTA a los 12 s, como el
  //    resto de juegos de mesa: consultarla no puede dejar el color del bando
  //    encendido en una pantalla que se deja caer sobre la mesa.
  //  · ENSEÑAR (🤝) — pantalla COMPLETA para poner el móvil delante de otra
  //    persona: sin reloj, sin tablero, sin diario, letra legible a un palmo.
  //    Tiene las dos caras del juego real —solo el color y la carta entera— y,
  //    a propósito, NO se auto-oculta: enseñar es un trato que dura lo que dura
  //    y que la carta se esfumara a mitad de intercambio rompía la jugada.
  // Se abre siempre por la cara MENOS comprometida (el color): destapar el rol
  // es una segunda decisión, no un descuido.
  import type { TwoRoomsState } from '../types';

  const { game, pid, mini = false }: { game: TwoRoomsState; pid: string; mini?: boolean } = $props();
  const team = $derived(game.teams[pid]);
  const role = $derived(game.roles[pid]);
  const teamBig = $derived(team === 'blue' ? '🔵 EQUIPO AZUL' : '🔴 EQUIPO ROJO');
  const roleBig = $derived(role === 'president' ? '🎖️ PRESIDENTE' : role === 'bomber' ? '💣 BOMBARDERO' : '🎴 CARTA NORMAL');

  let open = $state(!mini);
  /** Cara que se está enseñando; `null` = la carta no está en manos de nadie. */
  let show = $state<'color' | 'full' | null>(null);
  // Cambio de fase = la carta se guarda. Se compara contra el valor anterior en
  // vez de reaccionar al objeto entero: el doc de la partida se reemplaza en
  // cada snapshot y eso cerraría la pantalla de enseñar cada pocos segundos.
  let lastPhase = '';

  function toggle() { if (mini) open = !open; }

  // La OJEADA se oculta sola; la pantalla de ENSEÑAR queda excluida (y su
  // cuenta atrás se reinicia al guardarla).
  $effect(() => {
    if (!mini || !open || show) return;
    const t = setTimeout(() => (open = false), 12000);
    return () => clearTimeout(t);
  });

  $effect(() => {
    const p = game.phase;
    if (p === lastPhase) return;
    lastPhase = p;
    show = null;
    if (mini) open = false;
  });
</script>

{#if show}
  <!-- ENSEÑAR: se come la pantalla entera. Lo de alrededor (reloj, salas,
       diario) es público y sigue ahí al guardarla; aquí estorba y encima roba
       el sitio que necesita el bando para leerse desde donde está el otro. -->
  <div class="trshow" role="dialog" aria-modal="true" aria-label="Enseñando mi carta">
    {#if show === 'color'}
      <div class="trface {team}" data-a="tr-color">
        <span class="showteam">{teamBig}</span>
        <span class="showsub">Solo el bando · el rol no sale en pantalla</span>
      </div>
    {:else}
      <div class="trface {team}" data-a="tr-show-card">
        <span class="showteam">{teamBig}</span>
        <span class="showrole">{roleBig}</span>
        <span class="showsub">Carta entera · bando y rol</span>
      </div>
    {/if}
    <div class="showbar">
      {#if show === 'color'}
        <button class="block" data-a="tr-show-full" onclick={() => (show = 'full')}>🎴 Enseñar también el rol</button>
      {:else}
        <button class="block" data-a="tr-show-color" onclick={() => (show = 'color')}>🎨 Volver a solo el color</button>
      {/if}
      <button class="primary block" data-a="tr-show-close" onclick={() => (show = null)}>✋ Guardar la carta</button>
      <p class="small-note" style="text-align:center;margin:2px 0 0">No se apaga sola: guárdala tú cuando hayáis acabado.</p>
    </div>
  </div>
{:else if mini && !open}
  <!-- REPOSO: los dos botones son idénticos en todos los móviles. -->
  <div class="trrest">
    <button class="small ghost" data-a="tr-peek" onclick={toggle}>👁 Ver mi carta</button>
    <button class="small ghost" data-a="tr-show-open" onclick={() => (show = 'color')}>🤝 Enseñársela a alguien</button>
  </div>
{:else}
  <div class="trcard {team}" data-a="tr-card" role="button" tabindex="0"
    onclick={toggle} onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}>
    <span class="teamline">{team === 'blue' ? '🔵 Equipo AZUL' : '🔴 Equipo ROJO'}</span>
    <!-- Las cuatro descripciones se parecen en largo y el bloque tiene alto
         fijo: la SILUETA de la carta abierta no puede delatar el rol de lejos. -->
    {#if role === 'president'}
      <span class="rolebig">🎖️ Eres el PRESIDENTE</span>
      <span class="roledesc">Acaba la partida lejos del Bombardero. Los azules te protegen… si te encuentran.</span>
    {:else if role === 'bomber'}
      <span class="rolebig">💣 Eres el BOMBARDERO</span>
      <span class="roledesc">Acaba la última ronda en la MISMA sala que el Presidente. Y ¡boom!</span>
    {:else}
      <span class="rolebig">🎴 Carta normal</span>
      <span class="roledesc">{team === 'blue' ? 'Protege al Presidente: que no acabe con el Bombardero.' : 'Cuela al Bombardero en la sala del Presidente.'}</span>
    {/if}
    <span class="roomline">🚪 {game.phase === 'reveal' ? 'Empiezas' : 'Estás'} en la Sala {game.room[pid] + 1}</span>
    {#if mini}<p class="small-note" style="margin:6px 0 0">Solo tú ves esto. Se ocultará sola en unos segundos; toca la carta para guardarla ya.</p>{/if}
  </div>
  <!-- Enseñar es EL mecanismo del juego: las dos maneras, juntas y a un toque
       de la carta, sin tener que adivinar que se hace con la pantalla. -->
  <div class="trrest">
    <button class="small ghost" data-a="tr-color-only" onclick={() => (show = 'color')}>🎨 Enseñar solo el color</button>
    <button class="small ghost" data-a="tr-show-open" onclick={() => (show = 'full')}>🤝 Enseñar la carta entera</button>
  </div>
{/if}

<style>
  .trcard { display: flex; flex-direction: column; gap: 4px; border-radius: 12px; padding: 12px 14px; margin: 8px 0 6px; border: 1px solid var(--line, #2a2f45); background: var(--card, #171a2b); cursor: pointer; }
  .trcard.blue { border-color: #4a6ba8; box-shadow: 0 0 0 1px #4a6ba8 inset; }
  .trcard.red { border-color: #a84a5a; box-shadow: 0 0 0 1px #a84a5a inset; }
  .teamline { font-weight: 700; }
  .rolebig { font-size: 1.05rem; font-weight: 700; margin-top: 2px; }
  .roledesc { font-size: 0.84rem; color: var(--muted, #97a); min-height: 2.6em; }
  .roomline { margin-top: 4px; font-weight: 600; }
  /* Fila de botones idéntica en reposo y bajo la carta: mismo alto, mismo par
     de opciones para todo el mundo. */
  .trrest { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 8px 0 10px; }

  /* ——— Pantalla de ENSEÑAR ——— */
  .trshow {
    position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; gap: 10px;
    padding: 10px 10px calc(10px + env(safe-area-inset-bottom, 0px));
    background: var(--bg-0, #0b0c14); overscroll-behavior: contain; touch-action: manipulation;
  }
  .trface {
    flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; text-align: center; border-radius: 18px; border: 3px solid; padding: 16px;
  }
  .trface.blue { background: #12336e; border-color: #6f9bea; color: #eef4ff; }
  .trface.red { background: #5c1526; border-color: #f0778c; color: #ffeef2; }
  /* Tamaños pensados para leerse A UN PALMO y de reojo por el de enfrente. */
  .showteam { font-size: clamp(2rem, 11vw, 3.6rem); font-weight: 900; line-height: 1.05; letter-spacing: 0.01em; }
  .showrole { font-size: clamp(1.4rem, 7.5vw, 2.4rem); font-weight: 800; line-height: 1.1; }
  .showsub { font-size: clamp(0.8rem, 3.4vw, 1rem); opacity: 0.85; }
  .showbar { flex: 0 0 auto; display: flex; flex-direction: column; gap: 8px; }
  .showbar button { margin-top: 0; }
</style>
