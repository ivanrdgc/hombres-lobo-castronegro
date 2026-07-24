<script lang="ts">
  // «🎴 Mi personaje + referencia» (B19/B21): tu identidad secreta, su poder y
  // la chuleta de TODOS los personajes posibles. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { shadowHGame } from '../../actions';
  import { CHARS, FACTION_LABEL, charRefRows, pistaRefRows, factionSummary } from '../../chars';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? shadowHGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const c = $derived(inGame ? CHARS[game!.chars[my!.id]] : null);
  // Las mismas filas que el desplegable «📖» del panel de acción: la chuleta se
  // consulta desde donde se decide y desde aquí, y dice siempre lo mismo.
  const rows = charRefRows();
  // El mazo de pistas es público en el original: saber qué 8 cartas hay es
  // media deducción (si ves una cura, sabes que solo 4 cartas curan y a quién).
  const pistaRows = pistaRefRows();
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
  <p class="small-note" style="margin:8px 0 0"><b>{factionSummary(game.playerIds.length)}</b> El reparto es público; lo secreto es quién es quién. El resto de personajes se quedan fuera.</p>
  <RefRows title="📖 Todos los personajes posibles" {rows} />
  <RefRows title="🔮 Las 8 cartas de pista" rows={pistaRows} />
  <p class="small-note" style="margin:8px 0 0">Siempre son estas ocho: solo la leéis quien la da y quien la recibe, y la mesa ve el resultado. Si te deja a 0, mueres.</p>
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
