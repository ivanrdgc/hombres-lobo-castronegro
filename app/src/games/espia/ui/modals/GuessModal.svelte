<script lang="ts">
  // La apuesta del espía: se revela y señala una localización. Termina la
  // ronda, acierte o falle — así que el premio y el riesgo se leen ANTES de
  // elegir, y confirmar es un segundo gesto que nombra el lugar.
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
  import { espiaGame } from '../../actions';
  import { locationById } from '../../locations';
  import { loadMarks, marksKey } from '../../marks';
  import LugaresGrid from '../LugaresGrid.svelte';

  // Los tachones locales de la ronda salen en gris: son el trabajo del espía.
  // Se leen una vez al abrir el modal (viven en este móvil, no en la partida).
  const g0 = espiaGame(viewGroup());
  const marks = g0 ? loadMarks(marksKey(g0.startedAt, g0.round)) : {};
  const crossedN = Object.keys(marks).length;

  let pick = $state<string | null>(null);
  const pickLoc = $derived(locationById(pick));

  function confirm() {
    if (!pick) return;
    const id = pick;
    void guard(async () => { await A.spyGuess(id); app.ui.modal = null; });
  }
</script>

<h3>🎭 Revelarte y adivinar el lugar</h3>
<p class="small-note" style="margin-top:2px">Vas a anunciar a la mesa que eres el espía y a señalar dónde crees que estáis. <b>La ronda termina ahí</b>, aciertes o falles.</p>
<ul class="bet">
  <li>✅ Si <b>aciertas</b>: +4 para ti y ganas la ronda.</li>
  <li>❌ Si <b>fallas</b>: cada agente se lleva +1.</li>
  <li>⏳ Si te lo callas y nadie te condena: +2 al agotarse el tiempo.</li>
</ul>

<LugaresGrid selectable={true} selected={pick} crossed={marks} onPick={(id) => (pick = pick === id ? null : id)} />
{#if crossedN}<p class="small-note">Los {crossedN} en gris son los que TÚ has tachado; puedes elegirlos igual si cambias de idea.</p>{/if}

{#if pickLoc}
  <p class="small-note" style="margin-top:12px">▶️ Vas a declarar que estáis en <b>{pickLoc.emoji} {pickLoc.name}</b>. No hay vuelta atrás.</p>
  <button class="violet block" data-a="espia-guess-confirm" onclick={confirm}>🎭 Es {pickLoc.emoji} {pickLoc.name}</button>
{:else}
  <p class="small-note" style="margin-top:12px">👆 Toca el lugar que creas y aparecerá el botón para confirmarlo.</p>
{/if}
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Sigo disimulando</button>

<style>
  .bet { margin: 8px 0 12px; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
  .bet li { font-size: 0.85rem; color: var(--muted); line-height: 1.45; }
</style>
