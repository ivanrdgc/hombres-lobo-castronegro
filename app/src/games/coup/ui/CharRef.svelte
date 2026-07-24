<script lang="ts">
  // Chuleta de la corte, PLEGADA dentro del panel donde se decide (nadie debería
  // salir de la pantalla en la que está decidiendo). Además del poder de cada
  // personaje muestra cuántas copias están ya boca arriba: dato público que es
  // justo el que dice si un farol es creíble.
  import { CHARACTERS, CHAR_ORDER, COPIES } from '../chars';
  import type { CoupState } from '../types';

  const { game, label = '📖 Los 5 personajes: quién hace qué y quién bloquea qué' }:
    { game: CoupState; label?: string } = $props();

  const shown = $derived.by(() => {
    const n = { duque: 0, asesino: 0, capitan: 0, embajador: 0, condesa: 0 };
    for (const pid of game.playerIds) {
      for (const h of game.hands[pid] || []) if (h.lost) n[h.char] += 1;
    }
    return n;
  });
</script>

<details class="cref">
  <summary data-a="coup-ref">{label}</summary>
  {#each CHAR_ORDER as c (c)}
    <div class="settingrow">
      <div class="sinfo">
        <div class="sname">{CHARACTERS[c].emoji} {CHARACTERS[c].name}<span class="copies">
          · {COPIES} copias{shown[c] ? ` · ${shown[c]} ya boca arriba` : ' · ninguna descubierta'}</span></div>
        <div class="sdesc">{CHARACTERS[c].power}</div>
      </div>
    </div>
  {/each}
  <p class="small-note">🪙 Sin personaje (y sin desafío posible): <b>Renta</b> +1 imparable, <b>Ayuda exterior</b> +2 que corta el 🎩 Duque, y <b>Golpe de Estado</b> por 7 monedas, que no se desafía ni se bloquea.</p>
  <p class="small-note">Cuanta más copias de un personaje haya boca arriba, menos creíble es quien dice tenerlo.</p>
</details>

<style>
  .cref { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 8px; }
  .cref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); padding: 6px 0; }
  .copies { opacity: 0.65; font-weight: 400; }
</style>
