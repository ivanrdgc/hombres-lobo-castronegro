<script lang="ts">
  // Selector de un código de 3 cifras distintas del 1 al 4. Cada fila elige una
  // cifra; las ya usadas se deshabilitan para que el código sea válido.
  const { value = [0, 0, 0], onchange }: {
    value?: number[];
    onchange: (code: [number, number, number]) => void;
  } = $props();

  function set(pos: number, digit: number) {
    const next = [...value];
    next[pos] = digit;
    onchange([next[0], next[1], next[2]]);
  }
  const used = (digit: number, pos: number) => value.some((v, i) => i !== pos && v === digit);
</script>

<div class="codepick">
  {#each [0, 1, 2] as pos (pos)}
    <div class="cprow">
      <span class="cplabel">Cifra {pos + 1}</span>
      <div class="btnrow">
        {#each [1, 2, 3, 4] as d (d)}
          <button class="small {value[pos] === d ? 'primary' : 'ghost'}" data-a="de-digit" data-p={`${pos}-${d}`}
            disabled={used(d, pos)} onclick={() => set(pos, d)}>{d}</button>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .codepick { display: flex; flex-direction: column; gap: 6px; margin: 6px 0; }
  .cprow { display: flex; align-items: center; gap: 8px; }
  .cplabel { font-size: 0.8rem; font-weight: 700; min-width: 58px; }
</style>
