<script lang="ts">
  // Selector de un código de 3 cifras distintas del 1 al 4. Cada fila coloca UNA
  // pista concreta: lo que se decide es «¿a qué palabra apuntaba marea?», no
  // «¿cuál es la cifra 1?». De ahí que la fila la mande la pista (con su texto
  // delante) y que los botones digan «palabra nº 3» —el error clásico de la mesa
  // es confundir «la 1.ª pista» con «la palabra nº 1»—. Las cifras que ya ha
  // pedido otra pista no se apagan en mudo: dicen cuál se las llevó.
  //
  // Chivatos (B28): interceptar y descifrar usan EXACTAMENTE la misma rejilla
  // (2×2, mismos bloques, mismo alto, mismos colores). Antes, interceptando
  // salían 4 botones pelados en una fila y descifrando 4 botones altos con la
  // palabra: desde el otro lado de la mesa se leía la silueta y se sabía qué
  // estaba haciendo el rival. Ahora cada botón tiene siempre tres renglones —el
  // número, la palabra (o «¿?» si no la conoces) y lo que ya se dijo para ese
  // número— y solo cambia el texto, que de lejos no se lee.
  const { value = [0, 0, 0], clues = [], options = null, notes = [], onchange }: {
    value?: number[];
    /** Las 3 pistas en su orden: cada una manda en su fila. */
    clues?: string[];
    /** Nombre de cada palabra 1..4, si quien elige las conoce (su propio equipo). */
    options?: string[] | null;
    /** Pistas que el equipo que transmite ya dio para cada número (1..4). */
    notes?: string[];
    onchange: (code: [number, number, number]) => void;
  } = $props();

  const ORD = ['1.ª', '2.ª', '3.ª'];
  function set(pos: number, digit: number) {
    const next = [...value];
    next[pos] = digit;
    onchange([next[0], next[1], next[2]]);
  }
  /** ¿Qué OTRA pista se ha quedado ya con esa palabra? (el código no repite). */
  const takenBy = (digit: number, pos: number) => value.findIndex((v, i) => i !== pos && v === digit);
</script>

<div class="codepick">
  {#each [0, 1, 2] as pos (pos)}
    <div class="cprow" class:done={!!value[pos]}>
      <div class="cplabel">
        <span class="cpord">{ORD[pos]} pista</span>
        <span class="cpclue">«{clues[pos] ?? ''}»</span>
        <span class="cpask">¿a qué palabra apunta?</span>
      </div>
      <div class="cpopts">
        {#each [1, 2, 3, 4] as d (d)}
          {@const busy = takenBy(d, pos)}
          <button class="cpopt" class:sel={value[pos] === d} data-a="de-digit" data-p={`${pos}-${d}`}
            disabled={busy >= 0} onclick={() => set(pos, d)}>
            <span class="cpn">{value[pos] === d ? '✓ ' : ''}nº {d}</span>
            {#if options?.[d - 1]}<span class="cpw">{options[d - 1]}</span>{:else}<span class="cpw secret">¿?</span>{/if}
            <span class="cpnote">{notes[d - 1] || '—'}</span>
            {#if busy >= 0}<span class="cpbusy">la pide la {ORD[busy]}</span>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .codepick { display: flex; flex-direction: column; gap: 10px; margin: 8px 0; }
  .cprow { border: 1px solid var(--border, #333); border-radius: 12px; padding: 8px 9px 9px; background: color-mix(in srgb, var(--bg-1, #12141f) 70%, transparent); }
  .cprow.done { border-color: var(--accent, #c8a24a); }
  .cplabel { display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px; margin-bottom: 7px; }
  .cpord { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: var(--moon, #ffd98a); }
  .cpclue { font-size: 1.02rem; font-weight: 800; }
  .cpask { font-size: 0.76rem; color: var(--muted, #a9a6c0); }
  /* Misma rejilla intercepte quien intercepte: 2×2 siempre. */
  .cpopts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .cpopt {
    min-height: 58px; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 1px; padding: 7px 6px; line-height: 1.15; text-align: center;
    background: var(--card2, #222639); border: 1px solid var(--border, #333); border-radius: 10px; color: var(--text, #eceaf6);
  }
  .cpopt .cpn { font-size: 0.74rem; font-weight: 700; opacity: 0.8; }
  .cpopt .cpw { font-size: 0.88rem; font-weight: 800; overflow-wrap: anywhere; }
  .cpopt .cpw.secret { opacity: 0.5; }
  .cpopt .cpnote { font-size: 0.64rem; color: var(--muted, #a9a6c0); overflow-wrap: anywhere; }
  .cpopt .cpbusy { font-size: 0.62rem; color: var(--muted, #a9a6c0); overflow-wrap: anywhere; }
  /* Elegida: marcada con ✓ y un borde firme, NO un bloque dorado encendido. Un
     relleno brillante se lee desde el otro lado de la mesa y regalaba al rival
     la apuesta a medio hacer; así se ve perfecto en la mano y se apaga a un
     metro (B28, chivatos). */
  .cpopt.sel { background: color-mix(in srgb, var(--accent, #c8a24a) 20%, var(--card2, #222639)); border-color: var(--accent, #c8a24a); box-shadow: inset 0 0 0 1px var(--accent, #c8a24a); }
  .cpopt.sel .cpn { opacity: 1; color: var(--moon, #ffd98a); }
  .cpopt:disabled { opacity: 0.5; }
</style>
