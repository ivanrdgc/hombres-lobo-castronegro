<script lang="ts">
  // Reproductor del tutorial: pasos con texto, visual de muestra (imita la
  // pantalla real), pregunta interactiva opcional y lectura en voz alta (▶️,
  // solo fuera de partida, como los «cómo se juega»). Navegación ‹ ›.
  import { app, viewGroup, state as sync } from '../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../explain-audio';
  import { whoLine } from './types';
  import type { DemoScript } from './types';

  const { demo }: { demo: DemoScript } = $props();

  let i = $state(0);
  let picked = $state<number | null>(null);
  const n = $derived(demo.steps.length);
  const step = $derived(demo.steps[i]);
  const canPlay = $derived(viewGroup()?.status !== 'playing');
  const audioKey = $derived(`demo:${demo.id}:${i}`);
  const audio = $derived(localAudioState(audioKey));

  function stopAudio() {
    const part = sync.ui.explainAudio?.part;
    if (part && part.startsWith(`demo:${demo.id}:`)) toggleLocalSpeech(part, []);
  }
  function go(delta: number) {
    stopAudio();
    i = Math.max(0, Math.min(n - 1, i + delta));
    picked = null;
  }
  function close() {
    stopAudio();
    app.ui.modal = null;
  }
  $effect(() => () => stopAudio()); // al cerrar el modal, silencio
</script>

<div style="display:flex;align-items:center;gap:8px">
  <h3 style="flex:1;margin:0">{demo.emoji} Tutorial de {demo.name}</h3>
  <button class="small ghost" data-a="close-modal" aria-label="Cerrar" title="Cerrar" onclick={close}>✖</button>
</div>
<p class="small-note" style="margin:4px 0 10px">Paso {i + 1} de {n} · {'●'.repeat(i + 1)}{'○'.repeat(n - i - 1)}</p>

<div style="display:flex;align-items:center;gap:8px;margin-top:2px">
  <h3 style="flex:1;margin:0;font-size:1.05rem">{step.icon} {step.title}</h3>
  {#if canPlay}
    {#if audio === 'playing'}
      <button class="small ghost" data-a="demo-play" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech(audioKey, [])}>⏹️</button>
    {:else if audio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="demo-play" aria-label="Escuchar este paso" title="Escuchar" style="font-size:1.05rem;line-height:1" onclick={() => toggleLocalSpeech(audioKey, [step.title, ...(step.who ? [whoLine(step.who)] : []), ...step.text])}>▶️</button>
    {/if}
  {/if}
</div>
{#if step.who}
  <div class="demo-who" data-a="demo-who">🎬 <b>{step.who.actor}.</b> <span class="dw-others">Mientras, {step.who.others}</span></div>
{/if}
{#each step.text as p, pi (pi)}<p class="small-note" style="margin:7px 0">{p}</p>{/each}

{#if step.visual}
  {@const v = step.visual}
  <div style="margin:10px 0;pointer-events:none" aria-hidden="true">
    {#if v.kind === 'card'}
      <div class="card" style="text-align:center;margin:0;border:1px dashed color-mix(in srgb, currentColor 35%, transparent)">
        <span style="font-size:2.1rem;line-height:1">{v.emoji}</span>
        <h3 style="margin:4px 0">{v.title}</h3>
        {#each v.lines || [] as l, li (li)}<p class="small-note" style="margin:4px 0">{l}</p>{/each}
      </div>
    {:else if v.kind === 'chips'}
      <div class="players" style="justify-content:center">
        {#each v.chips as c, ci (ci)}
          <div class="player {c.hl ? 'selected' : ''}" style={c.dim ? 'opacity:.45' : ''}>
            <span class="pname">{c.emoji ? c.emoji + ' ' : ''}{c.name}</span>
            {#if c.badge}<span class="badge">{c.badge}</span>{/if}
          </div>
        {/each}
      </div>
    {:else if v.kind === 'buttons'}
      <div style="display:flex;flex-direction:column;gap:6px">
        {#each v.buttons as b, bi (bi)}
          <button class="{b.kind || 'primary'} block" tabindex="-1">{b.label}</button>
        {/each}
      </div>
    {:else if v.kind === 'board'}
      <div class="card" style="margin:0">
        {#each v.rows as r, ri (ri)}
          <div class="settingrow" style="align-items:center">
            <div class="sinfo"><div class="sname">{r.label}</div></div>
            <b>{r.value}</b>
          </div>
        {/each}
      </div>
    {:else if v.kind === 'log'}
      <div class="card" style="margin:0"><div class="log">
        {#each v.lines as l, li (li)}<p>{l}</p>{/each}
      </div></div>
    {:else if v.kind === 'grid'}
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px">
        {#each v.words as w, wi (wi)}
          <div class="player" style="justify-content:center;text-align:center;{wi === v.hl ? 'outline:2px solid currentColor;font-weight:700' : ''}">
            <span class="pname" style="font-size:.82rem">{wi === v.hl ? '🎯 ' : ''}{w}</span>
          </div>
        {/each}
      </div>
    {:else if v.kind === 'screens'}
      <div class="demoscreens">
        {#each v.panes as pane, pi (pi)}
          <div class="demoscreen">
            <div class="ds-title">📱 {pane.title}</div>
            {#each pane.lines as l, li (li)}<p class="small-note" style="margin:4px 0">{l}</p>{/each}
            {#each pane.buttons || [] as b, bi (bi)}
              <button class="{b.kind || 'primary'} block" style="margin-top:4px" tabindex="-1">{b.label}</button>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
    {#if (v.kind === 'chips' || v.kind === 'buttons') && v.caption}
      <p class="small-note" style="text-align:center;margin:5px 0 0;opacity:.75">{v.caption}</p>
    {:else if v.kind === 'screens'}
      <p class="small-note" style="text-align:center;margin:5px 0 0;opacity:.75">— cada pantalla, tal como la ve cada uno —</p>
    {:else}
      <p class="small-note" style="text-align:center;margin:5px 0 0;opacity:.75">— así se ve en pantalla —</p>
    {/if}
  </div>
{/if}

{#if step.ask}
  <div class="actionpanel" style="margin-top:10px"><h3 style="margin-top:0">🤔 {step.ask.prompt}</h3>
    <div style="display:flex;flex-direction:column;gap:6px">
      {#each step.ask.choices as c, ci (ci)}
        <button class="{picked === ci ? (c.good ? 'primary' : 'danger') : 'ghost'} block" data-a="demo-choice" data-p={String(ci)} onclick={() => (picked = ci)}>{c.label}</button>
      {/each}
    </div>
    {#if picked !== null}
      <p class="small-note" style="margin:8px 0 0">{step.ask.choices[picked].good ? '✅' : '💡'} {step.ask.choices[picked].reply}</p>
    {/if}
  </div>
{/if}

<div class="btnrow" style="margin-top:14px">
  <button class="ghost" data-a="demo-prev" disabled={i === 0} onclick={() => go(-1)}>‹ Anterior</button>
  {#if i < n - 1}
    <button class="primary" data-a="demo-next" style="flex:1" onclick={() => go(1)}>Siguiente ›</button>
  {:else}
    <button class="primary" data-a="demo-done" style="flex:1" onclick={close}>🎉 ¡Listo, a jugar!</button>
  {/if}
</div>

<style>
  .demo-who {
    margin: 8px 0 2px; padding: 7px 10px; border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    border-left: 4px solid #c8a24a; background: color-mix(in srgb, #c8a24a 9%, transparent);
    font-size: 0.86rem; line-height: 1.35;
  }
  .demo-who .dw-others { opacity: 0.8; }
  .demoscreens { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
  .demoscreen {
    border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
    border-radius: 14px; padding: 8px 10px 10px;
    background: color-mix(in srgb, currentColor 5%, transparent);
  }
  .ds-title { font-size: 0.8rem; font-weight: 800; margin-bottom: 4px; border-bottom: 1px dashed color-mix(in srgb, currentColor 30%, transparent); padding-bottom: 4px; }
</style>
