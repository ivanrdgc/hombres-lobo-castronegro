<script lang="ts">
  // Dial de Wavelength: barra 0..100 con marcas de escala. Muestra la DIANA
  // (bandas 2/3/4) solo si `target` viene dado (la ve el Psíquico, y todos al
  // final). `marker` pinta la marca fijada. `selectable` lo hace arrastrable:
  // pomo gordo para el pulgar, botones ±1 para afinar y el número FUERA de
  // donde va el dedo (una aguja de 3 px no se agarra ni se lee en un móvil
  // pasando de mano en mano, y un número bajo el pulgar no se lee nunca).
  import { spectrumById } from '../spectrums';

  const {
    spectrumId, target = null, marker = null, selectable = false, value = 50,
    onpick = null, onpickend = null, legend = null,
  }: {
    spectrumId: string;
    target?: number | null;
    marker?: number | null;
    selectable?: boolean;
    value?: number;
    onpick?: ((v: number) => void) | null;
    /** Fin del gesto: es cuando se publica la marca (no en cada píxel). */
    onpickend?: ((v: number) => void) | null;
    /** Pie explicativo: `bands` (la diana y lo que puntúa) o `result` (leyenda
     *  de agujas: cuál es el objetivo y cuál vuestra marca). */
    legend?: 'bands' | 'result' | null;
  } = $props();

  const spec = $derived(spectrumById(spectrumId));
  // Bandas de la diana (en % del dial), centradas en target.
  const band = (half: number) => target === null ? null
    : { left: Math.max(0, target - half), width: Math.min(100, target + half) - Math.max(0, target - half) };
  const b2 = $derived(band(15));
  const b3 = $derived(band(9));
  const b4 = $derived(band(4));
  // «63» a secas no dice nada en una mesa: se traduce al extremo del espectro.
  const lean = $derived.by(() => {
    const l = spec?.left ?? '0', r = spec?.right ?? '100';
    if (value <= 20) return `casi al tope de «${l}»`;
    if (value <= 42) return `tirando a «${l}»`;
    if (value < 58) return 'casi en el centro';
    if (value < 80) return `tirando a «${r}»`;
    return `casi al tope de «${r}»`;
  });
  const dist = $derived(target !== null && marker !== null ? Math.abs(target - marker) : null);

  let barEl: HTMLElement | null = $state(null);
  let dragging = $state(false);
  let last = value;

  function posFrom(clientX: number): number | null {
    if (!selectable || !onpick || !barEl) return null;
    const r = barEl.getBoundingClientRect();
    return Math.max(0, Math.min(100, Math.round(((clientX - r.left) / r.width) * 100)));
  }
  function move(clientX: number) {
    const v = posFrom(clientX);
    if (v === null) return;
    last = v;
    onpick?.(v);
  }
  // pointercancel/lostpointercapture: si el sistema se lleva el gesto (una
  // llamada, un scroll robado), sin esto `dragging` se quedaba en true y el
  // dial seguía moviéndose con el dedo levantado.
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    onpickend?.(last);
  }
  function nudge(delta: number) {
    if (!selectable || !onpick) return;
    last = Math.max(0, Math.min(100, value + delta));
    onpick(last);
    onpickend?.(last);
  }
</script>

<div class="dial">
  {#if selectable}
    <!-- Afinar sin arrastrar: la diana central mide ±4, así que el último
         punto decide entre 4 y 3 y con el pulgar no se clava. -->
    <div class="tuner">
      <button class="tick-btn" data-a="wl-nudge" data-p="-1" aria-label="Un punto a la izquierda"
        disabled={value <= 0} onclick={() => nudge(-1)}>−1</button>
      <div class="tv"><b data-a="wl-value">{value}</b><span>{lean}</span></div>
      <button class="tick-btn" data-a="wl-nudge" data-p="1" aria-label="Un punto a la derecha"
        disabled={value >= 100} onclick={() => nudge(1)}>+1</button>
    </div>
  {/if}

  <!-- Los extremos, pegados a la barra; los números 0/50/100 van debajo, en la
       escala (repetirlos aquí dejaba un «100» huérfano con nombres largos). -->
  <div class="ends">
    <span class="e"><i>◀</i>{spec?.left ?? ''}</span>
    <span class="e r">{spec?.right ?? ''}<i>▶</i></span>
  </div>

  <div class="track {selectable ? 'pad' : ''}">
    {#if selectable}
      <div class="bubble" style="left:clamp(24px,{value}%,calc(100% - 24px))">{value}</div>
    {/if}
    <div
      class="bar {selectable ? 'sel' : ''}"
      bind:this={barEl}
      data-a="wl-bar"
      role={selectable ? 'slider' : 'presentation'}
      aria-label={selectable ? 'Marca del equipo en el dial, de 0 a 100' : undefined}
      aria-valuemin={selectable ? 0 : undefined}
      aria-valuemax={selectable ? 100 : undefined}
      aria-valuenow={selectable ? value : undefined}
      aria-valuetext={selectable ? `${value} de 100, ${lean}` : undefined}
      tabindex={selectable ? 0 : -1}
      onpointerdown={(e) => { if (selectable) { dragging = true; barEl?.setPointerCapture(e.pointerId); move(e.clientX); } }}
      onpointermove={(e) => { if (dragging) move(e.clientX); }}
      onpointerup={endDrag}
      onpointercancel={endDrag}
      onlostpointercapture={endDrag}
      onkeydown={(e) => { if (e.key === 'ArrowLeft') nudge(-1); if (e.key === 'ArrowRight') nudge(1); }}
    >
      <div class="fill">
        {#if b2}<div class="zone z2" style="left:{b2.left}%;width:{b2.width}%"></div>{/if}
        {#if b3}<div class="zone z3" style="left:{b3.left}%;width:{b3.width}%"></div>{/if}
        {#if b4}<div class="zone z4" style="left:{b4.left}%;width:{b4.width}%"></div>{/if}
        <div class="tick mid" style="left:50%"></div>
        <div class="tick small" style="left:25%"></div>
        <div class="tick small" style="left:75%"></div>
      </div>
      {#if target !== null}<div class="needle target" style="left:{target}%"><i class="pin"></i></div>{/if}
      {#if marker !== null}<div class="needle mark" style="left:{marker}%" data-a="wl-marker"><i class="pin down"></i></div>{/if}
      {#if selectable}
        <div class="needle pick" style="left:{value}%"></div>
        <div class="knob {dragging ? 'on' : ''}" style="left:{value}%"><i class="grip"></i></div>
      {/if}
    </div>
    <div class="scale">
      <span class="s-l">0</span><span class="s-m">50</span><span class="s-r">100</span>
    </div>
  </div>

  {#if legend === 'bands' && target !== null}
    <p class="lg">
      <span class="li">🎯 diana en <b>{target}</b></span>
      <span class="li"><i class="sw s4"></i> centro <b>4</b></span>
      <span class="li"><i class="sw s3"></i> <b>3</b></span>
      <span class="li"><i class="sw s2"></i> <b>2</b></span>
      <span class="li"><i class="sw s0"></i> fuera <b>0</b></span>
    </p>
  {:else if legend === 'result'}
    <p class="lg">
      {#if target !== null}<span class="li"><i class="key tgt"></i> aguja amarilla = objetivo <b>{target}</b></span>{/if}
      {#if marker !== null}<span class="li"><i class="key mk"></i> aguja roja = marca del equipo <b>{marker}</b></span>{/if}
      {#if dist !== null}<span class="li">📏 a <b>{dist}</b> del centro</span>{/if}
      <span class="li"><i class="sw s4"></i> 4</span>
      <span class="li"><i class="sw s3"></i> 3</span>
      <span class="li"><i class="sw s2"></i> 2</span>
      <span class="li"><i class="sw s0"></i> 0</span>
    </p>
  {/if}
</div>

<style>
  .dial { margin: 10px 0; }

  /* ——— Lectura y ajuste fino (solo cuando se puede mover) ——— */
  .tuner { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .tuner .tv { flex: 1; text-align: center; line-height: 1.15; min-width: 0; }
  .tuner .tv b { display: block; font-size: 1.9rem; font-weight: 800; color: var(--moon, #fff); }
  .tuner .tv span { display: block; font-size: 0.8rem; color: var(--muted, #9aa); }
  .tick-btn {
    min-width: 52px; min-height: 44px; padding: 0; font-size: 1rem; font-weight: 800;
    background: var(--card2, #222639); border: 1px solid var(--line-2, #3b4060); color: var(--text, #fff);
  }
  .tick-btn:disabled { opacity: 0.35; }

  /* ——— Extremos: la palabra Y su número, que es lo que dice la app ——— */
  .ends { display: flex; justify-content: space-between; gap: 10px; font-size: 0.82rem; font-weight: 700; color: var(--muted, #9aa); margin-bottom: 5px; }
  /* La flecha, como elemento aparte: con nombres largos se quedaba sola en una
     segunda línea. */
  .ends .e { display: flex; align-items: flex-start; gap: 4px; max-width: 48%; }
  .ends .e.r { justify-content: flex-end; text-align: right; }
  .ends .e i { flex: 0 0 auto; font-style: normal; color: var(--ink-3, #6f6c8a); }

  .track { position: relative; }
  /* Sitio para la burbuja cuando la hay (el dial de solo lectura no la lleva). */
  .track.pad { padding-top: 28px; }
  /* El número, encima del pomo pero FUERA de la barra: donde no llega el dedo. */
  .bubble {
    position: absolute; top: 24px; transform: translate(-50%, -100%);
    background: var(--moon, #ffd98a); color: #241a05; font-weight: 800; font-size: 0.95rem;
    padding: 3px 10px; border-radius: 999px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    pointer-events: none; white-space: nowrap;
  }
  .bubble::after {
    content: ''; position: absolute; left: 50%; bottom: -4px; width: 8px; height: 8px;
    background: var(--moon, #ffd98a); transform: translateX(-50%) rotate(45deg);
  }
  .bar { position: relative; height: 44px; border-radius: 10px; border: 1px solid var(--border, #333); touch-action: none; }
  .bar.sel { cursor: ew-resize; height: 58px; }
  .bar:focus-visible { outline: none; box-shadow: var(--focus, 0 0 0 3px rgba(242, 181, 82, 0.4)); }
  /* La capa de color se recorta sola; las agujas y el pomo viven FUERA de ella
     para poder sobresalir de la barra. */
  .fill { position: absolute; inset: 0; border-radius: 9px; overflow: hidden;
    background: linear-gradient(90deg, #212c42, #2b2740 55%, #3a2f4a); }
  .zone { position: absolute; top: 0; bottom: 0; }
  .z2 { background: #2d5a3c; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14); }
  .z3 { background: #40875a; }
  .z4 { background: #63c47f; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35); }
  .tick { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(255, 255, 255, 0.18); }
  .tick.mid { width: 2px; margin-left: -1px; background: rgba(255, 255, 255, 0.5); }
  .tick.small { top: 34%; bottom: 34%; }

  .needle { position: absolute; top: -5px; bottom: -5px; width: 3px; transform: translateX(-50%); border-radius: 2px; pointer-events: none; }
  .needle .pin { position: absolute; left: 50%; top: -7px; width: 11px; height: 11px; border-radius: 50%; transform: translateX(-50%); background: inherit; border: 1px solid rgba(0, 0, 0, 0.4); }
  .needle .pin.down { top: auto; bottom: -7px; }
  .needle.target { background: #ffd76a; box-shadow: 0 0 6px #ffd76a; }
  .needle.mark { background: #e86a6a; box-shadow: 0 0 6px #e86a6a; }
  .needle.pick { background: #fff; box-shadow: 0 0 6px #fff; }

  .knob {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 46px; height: 46px; border-radius: 50%;
    background: radial-gradient(circle at 50% 32%, #fff, #d9d9e4);
    border: 2px solid rgba(0, 0, 0, 0.3); box-shadow: 0 3px 10px rgba(0, 0, 0, 0.55);
    display: flex; align-items: center; justify-content: center; pointer-events: none;
    transition: transform var(--t-fast, 140ms);
  }
  /* Estrías: se ve que ESO es lo que se agarra (y no tapa ningún número). */
  .knob .grip { width: 14px; height: 20px; border-radius: 2px;
    background: repeating-linear-gradient(90deg, #6f6c8a 0 2px, transparent 2px 5px); }
  .knob.on { transform: translate(-50%, -50%) scale(1.14); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6); }

  .scale { position: relative; height: 16px; margin-top: 3px; font-size: 0.8rem; color: var(--muted, #9aa); }
  .scale span { position: absolute; top: 0; }
  .s-l { left: 0; }
  .s-m { left: 50%; transform: translateX(-50%); font-weight: 700; }
  .s-r { right: 0; }

  /* ——— Pie: qué significan los colores (sin esto, el dial es un adorno) ——— */
  .lg { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 10px; margin-top: 6px; font-size: 0.8rem; color: var(--muted, #9aa); }
  .li { white-space: nowrap; }
  .lg b { color: var(--text, #fff); }
  .sw, .key { display: inline-block; vertical-align: -1px; margin-right: 2px; width: 12px; height: 12px; border-radius: 3px; }
  .s4 { background: #63c47f; }
  .s3 { background: #40875a; }
  .s2 { background: #2d5a3c; }
  .s0 { background: #2b2740; border: 1px solid var(--border, #333); }
  .key { width: 6px; height: 14px; border-radius: 2px; }
  .tgt { background: #ffd76a; }
  .mk { background: #e86a6a; }
</style>
