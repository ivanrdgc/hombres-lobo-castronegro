<script lang="ts">
  // Turno del jugador, en pasos y con las reglas SIEMPRE delante: nadie debería
  // tener que recordar qué hace cada carta ni cuántas quedan.
  //   1) Tus dos cartas, cada una como tarjeta con valor, copias y efecto entero
  //      (la bloqueada por la Condesa dice POR QUÉ lo está).
  //   2) Elegida una: «qué va a pasar», el objetivo, y —con el Guardia— la
  //      adivinanza; todo reversible con «↩️ Cambiar de carta».
  //   3) Plegada al fondo, la referencia de las 8 cartas con lo que ya ha salido.
  // Con el MODO DIFÍCIL (`track = false`, B33) las cartas siguen diciendo cuántas
  // copias trae el mazo, pero la app ya no cuenta cuáles han salido: ni en la
  // mano, ni en las adivinanzas del Guardia, ni en la referencia.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { validTargets, playableIdx, countessForced, outCounts } from '../engine';
  import { CARD_INFO, NEEDS_TARGET, VALUE, PLAN, ASK_TARGET, copiesNote, deckNote } from '../cards';
  import type { Card } from '../cards';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { LoveLetterState } from '../types';
  import CardFace from './CardFace.svelte';

  const { game, my, track = true }: { game: LoveLetterState; my: PlayerDoc; track?: boolean } = $props();
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
  const copies = (c: Card) => copiesNote(c, out[c], track);
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
  <h3>🎴 Tu turno · {sel === null ? '1 de 2: ¿qué juegas?' : '2 de 2: confirma'}</h3>

  {#if paused}<p class="llwarn">⏸️ Partida en pausa: puedes mirar y decidir, pero no se juega hasta que alguien la reanude.</p>{/if}
  {#if sel === null}
    <p class="hint">Juegas una; la otra se queda en tu mano.</p>
    <div class="llhand">
      {#each hand as c, i (i)}
        {@const locked = !playable.includes(i)}
        <button class="llpick" data-a="ll-card" data-p={String(i)} disabled={locked} onclick={() => (sel = i)}>
          <CardFace card={c} tone={locked ? 'locked' : 'mine'}
            foot={`${copies(c)}${locked && forced ? ' · 🔒 obligatorio descartar la Condesa mientras tengas el Rey o el Príncipe' : ''}`} />
        </button>
      {/each}
    </div>
  {:else if card}
    <CardFace {card} tone="chosen" effect={PLAN[card]}
      foot={kept ? `🖐 Te quedas con ${CARD_INFO[kept].emoji} ${CARD_INFO[kept].name} (valor ${VALUE[kept]})${card === 'baron' ? ' — es la que pelea el duelo' : card === 'king' ? ' — es la que entregas a cambio' : ''}.` : ''} />
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
      <!-- Dos columnas: las siete entran sin empujar el botón de confirmar fuera
           de la pantalla, y cada una dice lo que la mesa deja saber — cuántas
           siguen sin verse, o solo cuántas trae el mazo en modo difícil. -->
      <div class="llguess">
        {#each guessable as gc (gc)}
          {@const left = CARD_INFO[gc].count - out[gc]}
          <button class="pick {gss === gc ? 'primary' : 'ghost'} {track && !left ? 'none' : ''}" data-a="ll-guess" data-p={gc} onclick={() => (gss = gc)}>
            <span class="gname">{CARD_INFO[gc].emoji} {CARD_INFO[gc].name} ({VALUE[gc]})</span>
            <span class="gleft">
              {#if !track}{deckNote(gc)}{:else if left === 0}ya han salido todas{:else if left === 1}queda 1 sin salir{:else}quedan {left} sin salir{/if}
            </span>
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

  <!-- La referencia entera, plegada DENTRO del panel (B26·4): decidir no obliga
       a salir de esta pantalla. -->
  <details class="llref">
    <summary data-a="ll-ref">📖 Las 8 cartas del mazo</summary>
    {#each ALL as c (c)}
      <div class="settingrow">
        <div class="sinfo">
          <div class="sname">{CARD_INFO[c].emoji} {CARD_INFO[c].name} ({VALUE[c]})<span style="opacity:.65;font-weight:400"> · {copies(c)}</span></div>
          <div class="sdesc">{CARD_INFO[c].short}</div>
        </div>
      </div>
    {/each}
  </details>
</div>

<style>
  /* Móvil primero (B26·9): nada esencial por debajo de 0,8 rem y todo lo tocable
     con 44 px de alto. Las cartas son grandes a propósito: se juegan con el
     móvil en la mano y el pulgar (B28 · postura de mano). */
  /* Título de una línea: el panel entero tiene que caber sin desplazar (B29·7). */
  .actionpanel h3 { font-size: 1.05rem; }
  .llhand { display: flex; flex-direction: column; gap: 8px; }
  /* El botón no pinta nada: la carta entera ES la zona de toque. */
  .llpick { display: block; width: 100%; padding: 0; border: none; background: none; text-align: left; }
  .llpick:disabled { cursor: default; }
  .llpick:active:not(:disabled) { transform: scale(0.99); }
  .llwarn {
    font-size: 0.82rem; color: var(--moon); margin: 10px 0 0; padding: 8px 10px;
    border-radius: var(--r-1); border: 1px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
  /* Objetivos y adivinanzas: pastillas cómodas, no botones «small» de 34 px. */
  .pick { min-height: 44px; padding: 10px 12px; font-size: 0.85rem; border-radius: 10px; }
  /* Las siete adivinanzas, en dos columnas: caben sin empujar el ▶️ Jugar. */
  .llguess { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 6px; }
  .llguess .pick { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; }
  .gname { font-size: 0.88rem; font-weight: 700; }
  .gleft { font-size: 0.8rem; font-weight: 400; opacity: 0.85; }
  .llguess .pick.none { opacity: 0.5; }
  .llref { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 8px; }
  .llref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); padding: 12px 0; }
  .llref .sdesc { font-size: 0.8rem; }
</style>
