<script lang="ts">
  // Turno del jugador, en pasos y con las reglas SIEMPRE delante: nadie debería
  // tener que recordar qué hace cada carta ni cuántas quedan.
  //   1) Tus dos cartas, cada una como tarjeta con valor, copias y efecto entero
  //      (la bloqueada por la Condesa dice POR QUÉ lo está).
  //   2) Elegida una: «qué va a pasar», el objetivo, y —con el Guardia— la
  //      adivinanza; todo reversible con «↩️ Cambiar de carta».
  //   3) Plegada al fondo, la referencia de las 8 cartas con lo que ya ha salido.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { validTargets, playableIdx, countessForced, outCounts } from '../engine';
  import { CARD_INFO, NEEDS_TARGET, VALUE, PLAN, ASK_TARGET } from '../cards';
  import type { Card } from '../cards';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { LoveLetterState } from '../types';

  const { game, my }: { game: LoveLetterState; my: PlayerDoc } = $props();
  const hand = $derived(game.hands[my.id] || []);
  const playable = $derived(playableIdx(game, my.id));
  const forced = $derived(countessForced(hand));
  const out = $derived(outCounts(game));
  const ALL = Object.keys(CARD_INFO) as Card[];

  let sel = $state<number | null>(null);
  let tgt = $state<string | null>(null);
  let gss = $state<Card | null>(null);
  // Al cambiar de carta elegida, resetea objetivo y adivinanza.
  $effect(() => { void sel; tgt = null; gss = null; });

  const card = $derived(sel !== null ? hand[sel] : null);
  // La carta que NO juegas: es la que se queda en tu mano, la que pelea el duelo
  // del Barón y la que cambia el Rey. Decidir sin verla es imposible.
  const kept = $derived(sel !== null && hand.length > 1 ? hand[1 - sel] : null);
  const targets = $derived(card ? validTargets(game, my.id, card) : []);
  const needTarget = $derived(!!card && NEEDS_TARGET[card] && targets.length > 0);
  // El Guardia no puede adivinar «Guardia»: se ofrecen las otras siete.
  const guessable = $derived(ALL.filter((c) => c !== 'guard'));
  const paused = $derived(!!game.paused);
  const canPlay = $derived(
    !paused
    && sel !== null && playable.includes(sel)
    && (!needTarget || !!tgt)
    && !(card === 'guard' && tgt && !gss),
  );
  const nm = (pid: string) => (pid === my.id ? 'Tú' : game.names[pid] || '¿?');
  /** Igual que `nm`, pero como complemento: «sobre ti», no «sobre Tú». */
  const nmObj = (pid: string) => (pid === my.id ? 'ti mismo' : game.names[pid] || '¿?');
  // Quién NO aparece en la lista de objetivos, y por qué (nunca una ausencia muda).
  const shielded = $derived(game.playerIds.filter((p) => p !== my.id && game.alive[p] && game.protected[p]));
  const copies = (c: Card) => `${CARD_INFO[c].count} en el mazo · ya ${out[c] === 1 ? 'ha salido' : 'han salido'} ${out[c]}`;
  // Resumen de lo elegido, para leerlo antes de confirmar.
  const summary = $derived(!card ? '' : `${CARD_INFO[card].emoji} ${CARD_INFO[card].name}`
    + (tgt ? ` sobre ${nmObj(tgt)}` : '')
    + (gss ? `, diciendo que tiene ${CARD_INFO[gss].emoji} ${CARD_INFO[gss].name}` : ''));
  // Por qué NO se puede confirmar todavía (nunca un botón gris mudo).
  const why = $derived(
    paused ? '⏸️ La partida está en pausa: reanúdala arriba para poder jugar.'
      : needTarget && !tgt ? 'Elige antes a quién apuntas.'
        : 'Elige qué carta crees que tiene.');
</script>

<div class="actionpanel">
  <h3>🎴 Tu turno · {sel === null ? 'paso 1 de 2: ¿qué juegas?' : 'paso 2 de 2: confirma'}</h3>

  {#if paused}<p class="llwarn">⏸️ Partida en pausa: puedes mirar y decidir, pero no se juega hasta que alguien la reanude.</p>{/if}
  {#if sel === null}
    <p class="hint">Tienes dos cartas: juegas UNA (con su efecto) y la otra se queda en tu mano. Toca la que quieras jugar.</p>
    <div class="llhand">
      {#each hand as c, i (i)}
        {@const locked = !playable.includes(i)}
        <button class="llcard {locked ? 'locked' : ''}" data-a="ll-card" data-p={String(i)}
          disabled={locked} onclick={() => (sel = i)}>
          <div class="llhead"><span class="llemo">{CARD_INFO[c].emoji}</span>
            <span class="llname">{CARD_INFO[c].name}</span><span class="llval">valor {VALUE[c]}</span></div>
          <div class="llcount">{copies(c)}</div>
          <div class="lleff">{CARD_INFO[c].short}</div>
          {#if locked && forced}
            <div class="lllock">🔒 Bloqueada: con el Rey o el Príncipe en la mano, la Condesa es OBLIGATORIA.</div>
          {/if}
        </button>
      {/each}
    </div>
  {:else if card}
    <div class="llchosen">
      <div class="llhead"><span class="llemo">{CARD_INFO[card].emoji}</span>
        <span class="llname">{CARD_INFO[card].name}</span><span class="llval">valor {VALUE[card]}</span></div>
      <div class="lleff">{PLAN[card]}</div>
      {#if kept}
        <div class="llkept">🖐 Te quedas con <b>{CARD_INFO[kept].emoji} {CARD_INFO[kept].name} (valor {VALUE[kept]})</b>{#if card === 'baron'} — es la que pelea el duelo{:else if card === 'king'} — es la que entregas a cambio{/if}.</div>
      {/if}
    </div>
    <button class="ghost block pick" style="margin:8px 0" data-a="ll-back" onclick={() => (sel = null)}>↩️ Cambiar de carta</button>

    {#if needTarget}
      <p class="small-note" style="margin:10px 0 2px"><b>{ASK_TARGET[card]}</b></p>
      <div class="btnrow" style="flex-wrap:wrap">
        {#each targets as t (t)}
          <button class="pick {tgt === t ? 'primary' : 'ghost'}" data-a="ll-target" data-p={t} onclick={() => (tgt = t)}>{tgt === t ? '✅ ' : ''}{nm(t)}</button>
        {/each}
      </div>
      {#if shielded.length}
        <p class="small-note" style="margin:6px 0 0">🛡️ No sale{shielded.length > 1 ? 'n' : ''} {shielded.map(nm).join(', ')}: la Doncella {shielded.length > 1 ? 'los protege' : 'lo protege'} hasta su próximo turno.</p>
      {/if}
    {:else if NEEDS_TARGET[card]}
      <p class="small-note" style="margin-top:10px">🛡️ No queda nadie a quien apuntar (todos protegidos por la Doncella): la carta se juega sin efecto.</p>
    {:else}
      <p class="small-note" style="margin-top:10px">Esta carta no elige objetivo: solo confirma.</p>
    {/if}

    {#if card === 'guard' && tgt}
      <p class="small-note" style="margin:10px 0 2px"><b>¿Qué carta crees que tiene {nm(tgt)}?</b> Si aciertas, queda fuera.</p>
      <div class="btnrow" style="flex-wrap:wrap">
        {#each guessable as gc (gc)}
          <button class="pick {gss === gc ? 'primary' : 'ghost'}" data-a="ll-guess" data-p={gc} onclick={() => (gss = gc)}>
            {CARD_INFO[gc].emoji} {CARD_INFO[gc].name} ({VALUE[gc]}) · quedan {CARD_INFO[gc].count - out[gc]}
          </button>
        {/each}
      </div>
    {/if}

    {#if card === 'princess'}
      <p class="llwarn">⚠️ Jugar la Princesa te deja FUERA de la ronda al instante. Solo tiene sentido si no te queda otra.</p>
    {/if}
    {#if summary}<p class="small-note" style="margin-top:12px">▶️ Vas a jugar: <b>{summary}</b>.</p>{/if}
    <button class="primary block" style="margin-top:6px" data-a="ll-play" disabled={!canPlay}
      onclick={() => (canPlay && sel !== null ? guard(() => A.playCard(sel!, tgt, gss)) : undefined)}>
      ▶️ Jugar {CARD_INFO[card].emoji} {CARD_INFO[card].name}{tgt ? ` sobre ${nmObj(tgt)}` : ''}
    </button>
    {#if !canPlay}
      <p class="small-note" style="margin-top:6px">{why}</p>
    {/if}
  {/if}

  <details class="llref">
    <summary data-a="ll-ref">📖 Las 8 cartas del mazo (16 cartas) y lo que ya ha salido</summary>
    {#each ALL as c (c)}
      <div class="settingrow">
        <div class="sinfo">
          <div class="sname">{CARD_INFO[c].emoji} {CARD_INFO[c].name} ({VALUE[c]})<span style="opacity:.65;font-weight:400"> · {copies(c)}</span></div>
          <div class="sdesc">{CARD_INFO[c].short}</div>
        </div>
      </div>
    {/each}
    <p class="small-note" style="margin-top:8px">Cuenta lo que ya ha salido para deducir qué queda: los descartes de la fila de jugadores son públicos.</p>
  </details>
</div>

<style>
  /* Móvil primero (B26·9): nada esencial por debajo de 0,8 rem y todo lo tocable
     con 44 px de alto. Las tarjetas son grandes a propósito: se juegan con el
     móvil en la mano y el pulgar. */
  .llhand { display: flex; flex-direction: column; gap: 8px; }
  .llcard {
    display: block; width: 100%; text-align: left; padding: 12px; min-height: 44px;
    border-radius: var(--r-2); border: 1px solid var(--line-2); background: var(--card2);
  }
  .llcard.locked { opacity: 0.6; border-style: dashed; }
  .llchosen {
    padding: 12px; border-radius: var(--r-2);
    border: 1px solid var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--card2));
  }
  .llhead { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .llemo { font-size: 1.6rem; }
  .llname { font-size: 1.05rem; font-weight: 700; color: var(--moon); }
  .llval { font-size: 0.8rem; color: var(--muted); }
  .llcount { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }
  .lleff { font-size: 0.88rem; color: var(--text); margin-top: 6px; white-space: normal; }
  .lllock { font-size: 0.8rem; color: var(--moon); margin-top: 8px; }
  .llkept { font-size: 0.82rem; color: var(--text); margin-top: 8px; opacity: 0.92; }
  .llwarn {
    font-size: 0.82rem; color: var(--moon); margin: 10px 0 0; padding: 8px 10px;
    border-radius: var(--r-1); border: 1px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
  /* Objetivos y adivinanzas: pastillas cómodas, no botones «small» de 34 px. */
  .pick { min-height: 44px; padding: 10px 12px; font-size: 0.85rem; border-radius: 10px; }
  .llref { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 8px; }
  .llref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); padding: 12px 0; }
  .llref .sdesc { font-size: 0.8rem; }
</style>
