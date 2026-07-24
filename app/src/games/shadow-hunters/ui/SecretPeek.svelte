<script lang="ts">
  // 🍽️ POSTURA DE MESA (B28) + UNA SOLA PUERTA (B34). En Shadow Hunters el móvil
  // vive PLANO sobre la mesa: se habla, se acusa y solo se coge en tu turno. El
  // vecino lo ve de reojo, así que tu personaje NO puede estar pintado en
  // ninguna pantalla en reposo… y por eso se abre desde UN solo sitio: la
  // pastilla flotante «🎴 Mi carta», idéntica en todos los móviles y presente en
  // todas las pantallas. Antes había tres botones distintos para lo mismo (uno
  // en el cuerpo de la partida, otro dentro del paso de revelarte y otro más
  // aquí dentro): esta pieza es ya solo lo que hay DETRÁS de la pastilla.
  //   1) Entra DESTAPADA: pulsar la pastilla ya fue el gesto, no se piden dos.
  //   2) Se vuelve a tapar sola (12 s, o al cambiar el turno o la fase) y al
  //      tocarla; tapada deja el 👁 para volver a mirarla sin cerrar la pastilla.
  //   3) Si YA te has revelado, tu identidad es pública (sale destapada en el
  //      tablero de todos): entonces se queda a la vista, sin gesto ni cuenta
  //      atrás. Cualquiera puede deducirlo mirando el tablero.
  import { CHARS, FACTION_LABEL, powerEffect } from '../chars';
  import type { ShadowHState } from '../types';

  const { game, pid }: { game: ShadowHState; pid: string } = $props();

  const inGame = $derived(game.playerIds.includes(pid) && !!game.chars[pid]);
  const c = $derived(inGame ? CHARS[game.chars[pid]] : null);
  const revealed = $derived(inGame && !!game.revealed[pid]);
  let open = $state(true);

  // Se tapa sola: nadie se deja la carta abierta sobre la mesa por descuido.
  $effect(() => { if (!open) return; const t = setTimeout(() => (open = false), 12000); return () => clearTimeout(t); });
  // …y al cambiar el turno o la fase, que es cuando el móvil vuelve a la mesa.
  // La comparación va contra una variable NO reactiva a propósito: el doc de la
  // partida se reemplaza entero en cada snapshot, así que mirar solo la
  // identidad del objeto cerraría la carta cada vez que cualquiera actúa. El
  // primer pase solo TOMA NOTA del contexto: si no, taparía de entrada la carta
  // que la pastilla acaba de destapar.
  let ctxSeen: string | null = null;
  $effect(() => {
    const ctx = `${game.turn}|${game.phase}`;
    if (ctx === ctxSeen) return;
    const first = ctxSeen === null;
    ctxSeen = ctx;
    if (!first) open = false;
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
    <p class="small-note" style="margin-top:8px">Ya no hay nada que tapar: sales destapado en el tablero de todos.</p>
  </div>
{:else if !open}
  <button class="ghost block" data-a="sh-peek" onclick={() => (open = true)}>👁 Volver a mirarla</button>
  <p class="small-note" style="text-align:center;margin:6px 0 0">Se ha tapado sola. Esta pastilla es igual en todos los móviles: nadie sabe si la has abierto.</p>
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
      <div class="rdesc" style="margin-top:6px">La pastilla es la misma para todos justo por esto: tocarla no delata a nadie.</div>
    {/if}
    <p class="small-note" style="margin-top:8px">🙈 Se tapa sola en unos segundos; toca la carta para taparla ya.</p>
  </div>
{/if}

<style>
  /* Mismo alto y mismo hueco que el botón cerrado: al abrirse y cerrarse la
     pantalla no «salta», que también se lee de lejos. */
  .shpeek { margin: 10px 0; cursor: pointer; }
</style>
