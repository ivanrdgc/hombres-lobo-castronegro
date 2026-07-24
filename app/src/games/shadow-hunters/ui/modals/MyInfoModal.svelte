<script lang="ts">
  // «🎴 Mi personaje + referencia» (B19/B21): tu identidad secreta, su poder y
  // la chuleta de TODOS los personajes posibles. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { shadowHGame } from '../../actions';
  import { CHARS, FACTION_LABEL } from '../../chars';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? shadowHGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const c = $derived(inGame ? CHARS[game!.chars[my!.id]] : null);
  const rows = Object.values(CHARS).map((ch) => ({
    emoji: ch.emoji,
    name: ch.name,
    note: FACTION_LABEL[ch.faction],
    desc: ch.power + (ch.goal ? ` Objetivo: ${ch.goal}` : ''),
  }));
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu personaje</h3>
  {#if inGame && c}
    <div class="rolecard"><span class="remoji">{c.emoji}</span>
      <span class="rname">{c.name} · {FACTION_LABEL[c.faction]}</span>
      <div class="rdesc">{c.power}{c.goal ? ` Objetivo: ${c.goal}` : ''}
        {#if game.revealed[my.id]}<br />🎭 Ya estás revelado ante la mesa.{:else}<br />🤫 Nadie más lo sabe: guárdalo.{/if}</div></div>
    <p class="small-note" style="margin:6px 0 0">❤️ Vida: {game.hp[my.id]} de {game.maxHp}.</p>
  {:else}
    <p class="small-note">👀 Miras de espectador: sin personaje propio.</p>
  {/if}
  <RefRows title="📖 Todos los personajes posibles" {rows} />
  <p class="small-note" style="margin:8px 0 0">Según cuántos juguéis hay 2-3 Cazadores, 2-3 Sombras y 0-2 neutrales en la mesa; el resto de personajes se quedan fuera.</p>
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
