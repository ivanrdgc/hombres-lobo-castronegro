<script lang="ts">
  // Dial de Wavelength: barra 0..100. Muestra la DIANA (bandas 2/3/4) solo si
  // `target` viene dado (la ve el Psíquico, y todos al final). `marker` pinta la
  // marca del equipo. `selectable` lo hace arrastrable para colocar la marca.
  import { spectrumById } from '../spectrums';

  const { spectrumId, target = null, marker = null, selectable = false, value = 50, onpick = null }: {
    spectrumId: string;
    target?: number | null;
    marker?: number | null;
    selectable?: boolean;
    value?: number;
    onpick?: ((v: number) => void) | null;
  } = $props();

  const spec = $derived(spectrumById(spectrumId));
  // Bandas de la diana (en % del dial), centradas en target.
  const band = (half: number) => target === null ? null
    : { left: Math.max(0, target - half), width: Math.min(100, target + half) - Math.max(0, target - half) };
  const b2 = $derived(band(15));
  const b3 = $derived(band(9));
  const b4 = $derived(band(4));

  let barEl: HTMLElement | null = $state(null);
  function pickFrom(clientX: number) {
    if (!selectable || !onpick || !barEl) return;
    const r = barEl.getBoundingClientRect();
    onpick(Math.max(0, Math.min(100, Math.round(((clientX - r.left) / r.width) * 100))));
  }
  let dragging = $state(false);
</script>

<div class="dial">
  <div class="ends"><span>{spec?.left ?? '0'}</span><span>{spec?.right ?? '100'}</span></div>
  <div
    class="bar {selectable ? 'sel' : ''}"
    bind:this={barEl}
    data-a="wl-bar"
    role={selectable ? 'slider' : 'presentation'}
    aria-valuenow={selectable ? value : undefined}
    tabindex={selectable ? 0 : -1}
    onpointerdown={(e) => { if (selectable) { dragging = true; barEl?.setPointerCapture(e.pointerId); pickFrom(e.clientX); } }}
    onpointermove={(e) => { if (dragging) pickFrom(e.clientX); }}
    onpointerup={() => (dragging = false)}
    onkeydown={(e) => { if (!selectable || !onpick) return; if (e.key === 'ArrowLeft') onpick(Math.max(0, value - 2)); if (e.key === 'ArrowRight') onpick(Math.min(100, value + 2)); }}
  >
    {#if b2}<div class="zone z2" style="left:{b2.left}%;width:{b2.width}%"></div>{/if}
    {#if b3}<div class="zone z3" style="left:{b3.left}%;width:{b3.width}%"></div>{/if}
    {#if b4}<div class="zone z4" style="left:{b4.left}%;width:{b4.width}%"></div>{/if}
    {#if target !== null}<div class="needle target" style="left:{target}%"></div>{/if}
    {#if marker !== null}<div class="needle mark" style="left:{marker}%" data-a="wl-marker"></div>{/if}
    {#if selectable}<div class="needle pick" style="left:{value}%"></div>{/if}
  </div>
</div>

<style>
  .dial { margin: 10px 0; }
  .ends { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: var(--muted, #9aa); margin-bottom: 4px; }
  .bar { position: relative; height: 42px; border-radius: 10px; border: 1px solid var(--border, #333);
    background: linear-gradient(90deg, #24314a, #3a2f4a); overflow: hidden; touch-action: none; }
  .bar.sel { cursor: ew-resize; }
  .zone { position: absolute; top: 0; bottom: 0; }
  .z2 { background: #2f5d3a; }
  .z3 { background: #3f7d49; }
  .z4 { background: #57b06a; }
  .needle { position: absolute; top: -3px; bottom: -3px; width: 3px; transform: translateX(-50%); border-radius: 2px; }
  .needle.target { background: #ffd76a; box-shadow: 0 0 6px #ffd76a; }
  .needle.mark { background: #e86a6a; box-shadow: 0 0 6px #e86a6a; }
  .needle.pick { background: #fff; box-shadow: 0 0 6px #fff; }
</style>
