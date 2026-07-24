<script lang="ts">
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { topicName } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ChameleonState } from '../types';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: ChameleonState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map((pid) => game.names[pid] || pid));
</script>

<div class="narration">🦎 Tema: <b>{topicName(game.topicId)}</b>. Estudiad la rejilla de arriba. Mirad vuestra carta: sabréis la palabra secreta… o que sois el Camaleón.</div>

{#if inGame && !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <MyCard {game} pid={my.id} />
    <button class="primary block" data-a="ch-seen" onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo tengo</button>
  {:else}
    <div class="card"><h3 style="margin-bottom:2px">🎴 Tu carta está lista</h3>
      <p class="small-note" style="margin:0">Te dirá la palabra secreta… o que eres el Camaleón. Mírala sin que nadie vea tu pantalla y confirma; podrás volver a consultarla durante toda la ronda.</p>
      <button class="primary block" data-a="ch-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta</button></div>
  {/if}
{:else if pend.length}
  <!-- Ni pantalla muda ni callejón sin salida: quién falta, por nombre, y qué
       puedo ir haciendo mientras. -->
  <div class="card"><h3 style="margin-bottom:2px">⏳ Esperando a {pend.join(', ')}</h3>
    <p class="small-note" style="margin:0">{inGame ? 'Tú ya has visto la tuya. Ve leyendo la rejilla de arriba: cuanto mejor la conozcas, mejor pista darás.' : '👀 Miras de espectador: la mesa está viendo sus cartas.'}</p></div>
  {#if inGame}<MyCard {game} pid={my.id} mini={true} />{/if}
{:else}
  <div class="card"><h3 style="margin-bottom:2px">🗣️ Todos habéis visto vuestra carta</h3>
    <p class="small-note" style="margin:0">Empieza dando pista <b>{game.names[game.playerIds[game.starterIdx]] || '¿?'}</b> y seguís por orden de mesa: una sola palabra en voz alta cada uno. Cualquiera puede arrancar la vuelta.</p>
    <button class="primary block" data-a="ch-begin" onclick={() => guard(A.beginClues)}>🗣️ Empezar las pistas</button></div>
  {#if inGame}<MyCard {game} pid={my.id} mini={true} />{/if}
{/if}
