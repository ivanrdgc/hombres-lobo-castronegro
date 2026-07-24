<script lang="ts">
  // 🍽️ POSTURA DE MESA (B28). En Shadow Hunters el móvil vive PLANO sobre la
  // mesa: se habla, se acusa y solo se coge en tu turno. El vecino lo ve de
  // reojo, así que tu personaje NO puede estar pintado en ninguna pantalla en
  // reposo. Esta pieza es la única puerta a lo tuyo y cumple tres cosas:
  //   1) En reposo es idéntica en todos los móviles: mismo botón, mismo texto,
  //      mismo alto. Tampoco delata si eres jugador o espectador (quien no
  //      tiene personaje lo descubre al tocarlo, como el resto).
  //   2) Lo secreto sale tras un gesto TUYO y se vuelve a tapar solo: a los
  //      12 s, al cambiar el turno o al cambiar la fase.
  //   3) Si YA te has revelado, tu identidad es pública (está en el tablero de
  //      todos): entonces se queda a la vista a propósito, sin gesto. Esa es la
  //      única diferencia legítima entre pantallas, y cualquiera la puede
  //      deducir mirando el tablero.
  import { CHARS, FACTION_LABEL, powerEffect } from '../chars';
  import type { ShadowHState } from '../types';

  const {
    game, pid, label = '👁 Ver mi personaje en secreto', compact = false,
  }: { game: ShadowHState; pid: string; label?: string; compact?: boolean } = $props();

  const inGame = $derived(game.playerIds.includes(pid) && !!game.chars[pid]);
  const c = $derived(inGame ? CHARS[game.chars[pid]] : null);
  const revealed = $derived(inGame && !!game.revealed[pid]);
  let open = $state(false);

  // Se tapa sola: nadie se deja la carta abierta sobre la mesa por descuido.
  $effect(() => { if (!open) return; const t = setTimeout(() => (open = false), 12000); return () => clearTimeout(t); });
  // …y al cambiar el turno o la fase, que es cuando el móvil vuelve a la mesa.
  // La comparación va contra una variable NO reactiva a propósito: el doc de la
  // partida se reemplaza entero en cada snapshot, así que mirar solo la
  // identidad del objeto cerraría la carta cada vez que cualquiera actúa.
  let ctxSeen = '';
  $effect(() => {
    const ctx = `${game.turn}|${game.phase}`;
    if (ctx === ctxSeen) return;
    ctxSeen = ctx;
    open = false;
  });
</script>

{#if revealed && c}
  <div class="rolecard shpeek" data-a="sh-secret">
    <span class="remoji">{c.emoji}</span>
    <div class="rteam">🎭 Ya te has revelado: esto lo sabe toda la mesa</div>
    <span class="rname">{c.name} · {FACTION_LABEL[c.faction]}</span>
    <div class="rdesc" style="margin-top:6px">⚡ Tu poder, gastado al revelarte: {powerEffect(c)}</div>
    {#if c.goal}<div class="rdesc">🧭 Tu objetivo propio: {c.goal}</div>{/if}
    <div class="rdesc">❤️ {game.hp[pid]} de {game.maxHp} puntos de vida.</div>
    <p class="small-note" style="margin-top:8px">Tu carta ya es pública: puedes dejar el móvil a la vista sin problema.</p>
  </div>
{:else if !open}
  <button class="ghost block" data-a="sh-peek" onclick={() => (open = true)}>{label}</button>
  {#if !compact}
    <p class="small-note" style="text-align:center;margin:6px 0 0">Igual en todos los móviles: nadie sabe si lo has mirado.</p>
  {/if}
{:else}
  <!-- Tocar la carta la tapa ya: el gesto de «guardarla» es el mismo que el de
       dejar el móvil boca abajo en la mesa de verdad. -->
  <div class="rolecard shpeek" data-a="sh-secret" role="button" tabindex="0"
    onclick={() => (open = false)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') open = false; }}>
    {#if c}
      <span class="remoji">{c.emoji}</span>
      <div class="rteam">🤫 Tu personaje: solo lo ves tú</div>
      <span class="rname">{c.name} · {FACTION_LABEL[c.faction]}</span>
      <div class="rdesc" style="margin-top:6px">⚡ Tu poder, de un solo uso al revelarte: {powerEffect(c)}</div>
      {#if c.goal}<div class="rdesc">🧭 Tu objetivo propio: {c.goal}</div>{/if}
      <div class="rdesc">❤️ {game.hp[pid]} de {game.maxHp} puntos de vida.</div>
    {:else}
      <span class="remoji">👀</span>
      <div class="rteam">Sigues la partida de espectador</div>
      <span class="rname">No tienes personaje</span>
      <div class="rdesc" style="margin-top:6px">El botón es el mismo para todos justo por esto: tocarlo no delata a nadie.</div>
    {/if}
    <p class="small-note" style="margin-top:8px">🙈 Se tapa sola en unos segundos; toca la carta para taparla ya.</p>
  </div>
{/if}

<style>
  /* Mismo alto y mismo hueco que el botón cerrado: al abrirse y cerrarse la
     pantalla no «salta», que también se lee de lejos. */
  .shpeek { margin: 10px 0; cursor: pointer; }
</style>
