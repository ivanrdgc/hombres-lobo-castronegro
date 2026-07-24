<script lang="ts">
  // La ventana de reacción es el momento más confuso de Coup, así que la
  // pantalla responde a las cuatro preguntas por orden: QUÉ HA PASADO (quién
  // declara qué, diciendo ser quién, y qué ocurre si nadie lo impide), QUÉ PUEDO
  // HACER YO (con lo que me juego escrito debajo de cada botón), un segundo
  // gesto que nombra la consecuencia antes de comprometer una influencia, y
  // QUIÉN FALTA por contestar. Quien no puede reaccionar lee POR QUÉ.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ACTIONS, charName, charLabel } from '../chars';
  import { allowedReactions, reactorsOf } from '../engine';
  import CharRef from './CharRef.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CoupState, Character } from '../types';

  const { game, my }: { game: CoupState; my: PlayerDoc } = $props();
  const nm = (pid: string | null | undefined) => (pid && game.names[pid]) || '¿?';

  const mine = $derived(allowedReactions(game, my.id));
  const iReacted = $derived(game.reactions[my.id] !== undefined);
  const canReact = $derived(mine.challenge || mine.block);
  const reactors = $derived(reactorsOf(game));
  // «tú» en la lista de quien falta: leer tu propio nombre no te dice que te
  // están esperando a ti.
  const waiting = $derived(reactors.filter((pid) => game.reactions[pid] === undefined)
    .map((pid) => (pid === my.id ? 'tú' : nm(pid))));
  const p = $derived(game.pending);
  const iAmTarget = $derived(!!p && p.target === my.id);
  const blockPhase = $derived(game.phase === 'block');
  const challengingBlock = $derived(game.phase === 'challengeBlock' && !!game.block);

  const prompt = $derived.by(() => {
    if (challengingBlock && game.block) {
      const what = p?.type === 'ayuda' ? 'la ayuda exterior' : p?.type === 'asesinar' ? 'el asesinato' : 'el robo';
      return `🛡️ ${nm(game.block.by)} bloquea ${what} diciendo ser ${charName(game.block.claim)}.`;
    }
    if (!p) return '';
    const tgt = p.target ? ` a ${nm(p.target)}` : '';
    if (game.phase === 'challengeAction') {
      return `${ACTIONS[p.type].emoji} ${nm(p.actor)} declara ${ACTIONS[p.type].name}${tgt} diciendo ser ${charName(p.claim!)}.`;
    }
    // block: sin desafío a la acción
    if (p.type === 'ayuda') return `🤝 ${nm(p.actor)} pide ayuda exterior (+2).`;
    if (p.type === 'asesinar') return `🗡️ ${nm(p.actor)} intenta asesinar${tgt}.`;
    return `⚓ ${nm(p.actor)} intenta robar${tgt}.`;
  });

  // Qué pasa si esta ventana se cierra sin que nadie mueva un dedo.
  const outcome = $derived.by(() => {
    if (!p) return '';
    if (challengingBlock) {
      const extra = p.type === 'asesinar' ? ' (las 3 monedas del asesino ya están pagadas y no vuelven)' : '';
      return `el bloqueo aguanta y la jugada de ${nm(p.actor)} se anula${extra}.`;
    }
    if (p.type === 'impuestos') return `${nm(p.actor)} cobra 3 monedas.`;
    if (p.type === 'ayuda') return `${nm(p.actor)} cobra 2 monedas.`;
    if (p.type === 'robar') return `${nm(p.actor)} le quita hasta 2 monedas a ${nm(p.target)}.`;
    if (p.type === 'asesinar') return `${nm(p.target)} descubre una influencia.`;
    return `${nm(p.actor)} cambia cartas con la corte.`;
  });

  const question = $derived(
    challengingBlock ? '¿Desafías el bloqueo?'
      : blockPhase ? '¿Lo bloqueas?'
        : '¿Desafías el farol?',
  );

  // El «paso» dice QUÉ se está aceptando: en la ventana de desafío de un
  // asesinato, un «lo dejo pasar» genérico se lee como «acepto morir».
  const passLabel = $derived.by(() => {
    if (game.phase === 'challengeAction') return '👍 No lo desafío';
    if (challengingBlock) return '👍 Acepto el bloqueo';
    const t = p?.type;
    if (t === 'asesinar') return '👍 Paso, me lo como';
    if (t === 'robar') return '👍 Paso, que me robe';
    return '👍 No la bloqueo';
  });
  const passRisk = $derived.by(() => {
    if (game.phase === 'challengeAction') return `Aceptas su palabra: si nadie más desafía, ${outcome}`;
    if (challengingBlock) return `Das el bloqueo por bueno: ${outcome}`;
    return `No lo cortas: ${outcome}`;
  });

  // Desafiar siempre se juega una influencia: el aviso vale para las DOS
  // ventanas de desafío (a la acción y al bloqueo).
  const challengeRisk = $derived(
    game.phase === 'challengeAction'
      ? `Si ${nm(p?.actor)} NO tiene ${charName(p?.claim || 'duque')}, pierde una influencia y su jugada se cae. Si la enseña, la influencia la pierdes TÚ (y él roba carta nueva).`
      : `Si ${nm(game.block?.by)} NO tiene ${charName(game.block?.claim || 'duque')}, pierde una influencia y la jugada sigue adelante. Si la enseña, la influencia la pierdes TÚ.`,
  );
  const blockRisk = 'Bloquear es otra declaración: cualquiera puede desafiarla y, si faroleabas, pierdes una influencia.';

  // Por qué esta ventana no me pide nada (nunca un panel mudo).
  const whyNot = $derived.by(() => {
    if (!p) return '';
    if (p.actor === my.id) return 'Es tu jugada la que está en el aire: ahora deciden los demás.';
    if (blockPhase && p.type !== 'ayuda') return `Solo la víctima puede bloquear: le toca a ${nm(p.target)}.`;
    if (challengingBlock && game.block?.by === my.id) return 'Has sido tú quien ha bloqueado: ahora deciden si te desafían.';
    return 'No te toca reaccionar en esta ventana.';
  });

  // Segundo gesto antes de comprometer una influencia (desafiar y bloquear son
  // apuestas; el «👍» de pasar, que es lo seguro, sigue a un toque).
  let armed = $state<'challenge' | Character | null>(null);
  $effect(() => { void game.phase; void game.log.length; armed = null; });
  function doBlock(claim: Character) { guard(() => A.block(claim)); }
</script>

<div class="narration">{prompt}</div>

<div class="card recap">
  <h3 style="margin-top:0">❗ Qué está pasando</h3>
  {#if challengingBlock && game.block}
    <p class="rline">🛡️ <b>{nm(game.block.by)}</b> dice ser <b>{charLabel(game.block.claim)}</b> para cortar la jugada de <b>{nm(p?.actor)}</b>.</p>
  {:else if p}
    <p class="rline">{ACTIONS[p.type].emoji} <b>{nm(p.actor)}</b> declara <b>{ACTIONS[p.type].name}</b>{p.target ? ` contra ${nm(p.target)}` : ''}{p.claim ? ` diciendo ser ${charLabel(p.claim)}` : ''}.</p>
    <p class="rline">🗣️ {p.claim ? 'Eso —tener esa carta— es lo único que se le puede desafiar.' : 'No dice tener ningún personaje: no hay farol que desafiar, solo se puede bloquear.'}</p>
  {/if}
  <p class="rline">➡️ Si nadie lo impide, {outcome}</p>
  {#if iAmTarget && !challengingBlock}
    <p class="rline mine">🎯 La víctima eres <b>tú</b>.</p>
  {/if}
  <p class="small-note">
    {#if waiting.length}⏳ Falta por contestar: <b>{waiting.join(', ')}</b>.{:else}✅ Todos han contestado.{/if}
    {#if reactors.length > waiting.length}
      · Ya han contestado: {reactors.filter((pid) => game.reactions[pid] !== undefined).map((pid) => `${nm(pid)} ${game.reactions[pid] === 'pass' ? '👍' : game.reactions[pid] === 'challenge' ? '❗' : '🛡️'}`).join(', ')}.
    {/if}
  </p>
</div>

{#if canReact && !iReacted}
  <div class="actionpanel">
    {#if armed === null}
      <h3 style="margin-top:0">{question}</h3>
      {#if mine.challenge}
        <button class="danger block" style="margin-top:0" data-a="coup-challenge-pick" onclick={() => (armed = 'challenge')}>❗ Desafiar el farol</button>
        <p class="orisk">{challengeRisk}</p>
      {/if}
      {#each mine.blockClaims as claim (claim)}
        <button class="block" data-a="coup-block-pick" data-p={claim} onclick={() => (armed = claim)}>🛡️ Bloquear · digo ser {charLabel(claim)}</button>
        <p class="orisk">{blockRisk}</p>
      {/each}
      <button class="ghost block" data-a="coup-pass" onclick={() => guard(A.pass)}>{passLabel}</button>
      <p class="orisk">{passRisk}</p>
    {:else if armed === 'challenge'}
      <h3 style="margin-top:0">❗ Vas a desafiar</h3>
      <p class="orisk big">{challengeRisk}</p>
      <button class="ghost block small" data-a="coup-react-back" onclick={() => (armed = null)}>↩️ Mejor no, volver</button>
      <button class="danger block" data-a="coup-challenge" onclick={() => guard(A.challenge)}>
        ❗ Desafiar a {challengingBlock ? nm(game.block?.by) : nm(p?.actor)}: enseña {charName((challengingBlock ? game.block?.claim : p?.claim) || 'duque')} o pierde una influencia
      </button>
    {:else}
      {@const claim = armed}
      <h3 style="margin-top:0">🛡️ Vas a bloquear como {charLabel(claim)}</h3>
      <p class="orisk big">{blockRisk} Si el bloqueo aguanta, la jugada de {nm(p?.actor)} se anula{p?.type === 'asesinar' ? ' (pero las 3 monedas que pagó no vuelven)' : ''}.</p>
      <button class="ghost block small" data-a="coup-react-back" onclick={() => (armed = null)}>↩️ Mejor no, volver</button>
      <button class="block" data-a="coup-block" data-p={claim} onclick={() => doBlock(claim)}>🛡️ Declarar {charLabel(claim)} y cortar la jugada</button>
    {/if}
    <CharRef {game} label="📖 ¿Quién bloquea qué? · copias ya descubiertas" />
  </div>
{:else if iReacted}
  <div class="card">
    <p class="hint">✅ Ya has contestado ({game.reactions[my.id] === 'pass' ? 'has pasado' : game.reactions[my.id] === 'challenge' ? 'has desafiado' : 'has bloqueado'}).
      {#if waiting.length}Esperando a <b>{waiting.join(', ')}</b>.{:else}La ventana se está cerrando…{/if}</p>
    <CharRef {game} label="📖 Repasa la corte mientras esperas" />
  </div>
{:else}
  <div class="card">
    <p class="hint">⏳ {whyNot} {#if waiting.length}Falta por contestar: <b>{waiting.join(', ')}</b>.{/if}</p>
    <CharRef {game} label="📖 Repasa la corte mientras esperas" />
  </div>
{/if}

<style>
  .recap { border-left: 3px solid var(--accent2); }
  .rline { margin: 4px 0; font-size: 0.92rem; }
  .rline.mine { color: var(--moon); }
  .orisk { font-size: 0.8rem; color: var(--muted); margin: 4px 2px 2px; }
  .orisk.big { font-size: 0.88rem; color: var(--text); }
</style>
