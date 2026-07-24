<script lang="ts">
  // Fase de noche (port de nightPhase() de la v1): narración del paso en curso,
  // repaso de roles (open/confirm-role-refresh), panel de acción del actor y
  // panel neutral de palabras clave para los que no actúan.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { NIGHT_STEPS, stepActors } from '../engine';
  import { e2eTestMode } from '../../../core/test-hooks';
  import { narr } from '../texts/corpus';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import RoleCard from './RoleCard.svelte';
  import PlayersGrid from './PlayersGrid.svelte';
  import NightActionPanel from './NightActionPanel.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(group.game!);
  const players = $derived(app.players.filter((p) => p.inGame));

  // Repaso de roles: la noche está en pausa y todos los vivos revisan su carta.
  const refreshConf = $derived(!!(game.roleRefresh?.confirmed || {})[my.id]);
  const refreshPend = $derived(players.filter((p) => p.alive && !(game.roleRefresh?.confirmed || {})[p.id]).map((p) => p.name));

  // Rescate anti-bloqueo: el repaso exige confirmación de TODOS los vivos, así
  // que un móvil apagado lo congela para siempre. Tras un minuto, cualquiera
  // puede seguir sin él (cierra el repaso Y salta el paso que se atascó).
  const RESCUE_MS = e2eTestMode() ? 3000 : 60000;
  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 2500); return () => clearInterval(t); });
  const rescueReady = $derived(now - (game.roleRefresh?.startedAt || now) > RESCUE_MS);

  const stepId = $derived(game.steps[game.stepIdx]);
  const def = $derived(NIGHT_STEPS.find((s) => s.id === stepId));
  const actors = $derived(stepId ? stepActors(stepId, game, players) : null);
  const isActor = $derived(!!(actors && actors.includes(my.id) && my.alive));
  // En los pasos con llamada por palabra clave, quien ya confirmó CONSERVA su
  // panel: la palabra renovada (rotateKeyword) se enseña en ESA misma pantalla.
  const kwConfirmed = $derived.by(() => {
    if (!my.alive) return false;
    if (stepId === 'encantados') return !!my.charmed && !!(game.acts.encantadosSeen || {})[my.id];
    if (stepId === 'enamorados') return !!my.lover && !!(game.acts.loversSeen || {})[my.id];
    if (stepId === 'infectado') return !!(game.acts.infectadoSeen || {})[my.id];
    return false;
  });
  const narrText = $derived.by(() => {
    if (stepId === 'durmiendo') return narr('noche_cae', `${game.seed}:n${game.night}`);
    const t = def && !def.silent ? narr(def.id, `${game.seed}:n${game.night}:s${game.stepIdx}:${def.id}`) : '';
    return t || 'La noche envuelve Castronegro…';
  });
</script>

{#if game.roleRefresh && game.roleRefresh.closing}
  <div class="narration">😴 Todos habéis repasado vuestro rol. Cerrad los ojos de nuevo… la noche continúa donde estaba.</div>
  <PlayersGrid {players} title="🏘️ El pueblo" viewer={my} />
{:else if game.roleRefresh}
  <div class="narration">👁️ Pausa: todo Castronegro abre los ojos y revisa su rol y su palabra clave en secreto. La noche continuará donde estaba.</div>
  <!-- El rol solo se despliega bajo demanda (móviles desbloqueados sobre la mesa). -->
  {#if my.alive && my.inGame && !refreshConf}
    {#if app.ui.refreshOpen}
      <RoleCard player={my} {group} />
      <button class="primary block" data-a="confirm-role-refresh"
        onclick={() => guard(async () => { await A.confirmRoleRefresh(); app.ui.refreshOpen = false; app.ui.roleOpen = false; })}>✅ Revisado, estoy listo</button>
    {:else}
      <div class="card"><h3>🔑 Te toca a ti</h3>
        <p class="small-note">Toca para desplegar tu carta y tu palabra clave, repásalas y confirma. La noche no sigue hasta que estéis todos.</p>
        <button class="primary block" data-a="open-role-refresh" onclick={() => (app.ui.refreshOpen = true)}>🔑 Confirmar mi rol</button></div>
    {/if}
  {:else}
    <div class="actionpanel"><h3>⏳ {refreshPend.length ? `Se espera a ${refreshPend.length === 1 ? refreshPend[0] : `${refreshPend.length} jugadores`}` : '¡Listos!'}</h3>
      <p class="hint">{refreshPend.length ? `Falta${refreshPend.length > 1 ? 'n' : ''} por confirmar: ${refreshPend.join(', ')}. Tú ya estás: no toques nada más.` : 'Todo el mundo ha confirmado: la noche continúa donde estaba.'}</p></div>
    <div class="waitlist">Esperando a: {refreshPend.join(', ') || 'nadie, ¡seguimos!'}</div>
    {#if rescueReady && refreshPend.length}
      <div class="card"><p class="small-note">📵 ¿Alguien se ha quedado sin móvil (pantalla apagada, sin batería)? La noche puede continuar sin él: se salta el paso en el que se atascó.</p>
        <button class="ghost block" data-a="skip-stuck-step" onclick={() => guard(() => A.forceAdvance(true))}>⏭️ Continuar sin él</button></div>
    {/if}
  {/if}
  <PlayersGrid {players} title="🏘️ El pueblo" viewer={my} />
{:else}
  <div class="narration">🌙 {stepId === 'amanecer' ? 'Los primeros rayos de sol acarician los tejados…' : narrText}</div>
  <RoleCard player={my} {group} mini={true} />
  {#if isActor || kwConfirmed}
    <!-- El actor solo ve su panel: la lista de objetivos YA es el pueblo entero
         (ActionGrid), sin parrilla duplicada debajo. -->
    <NightActionPanel stepId={stepId!} {group} {my} {players} />
  {:else}
    {#if stepId === 'enamorados' || stepId === 'encantados' || stepId === 'infectado' || stepId === 'lobos_reconocen'}
      <!-- Pasos con palabras clave o reconocimiento físico: los que no actúan
           mantienen la vista en su pantalla con esta indicación neutral. -->
      <div class="actionpanel"><h3>👂 Atención al narrador</h3>
        <p class="hint">{#if stepId === 'lobos_reconocen'}Ojos cerrados: los lobos se están reconociendo. No mires.{:else}Ojos cerrados y oídos atentos. Si suena <b>tu palabra clave</b>, ábrelos con disimulo: tendrás un mensaje aquí.{/if}</p></div>
    {:else if stepId !== 'amanecer'}
      <!-- Resto de la noche: al que no le toca actuar también se le dice algo
           (antes se quedaba con la parrilla del pueblo y sin instrucción). El
           panel es IDÉNTICO para todos los que no actúan: no delata nada — por
           eso aquí NO se dice a quién se espera (sería el juego entero). -->
      <div class="actionpanel"><h3>{stepId === 'durmiendo' ? '😴 Todos a dormir' : (my.alive ? '🌙 No es tu turno: ojos cerrados' : '💀 Estás muerto: mira y calla')}</h3>
        <p class="hint">{stepId === 'durmiendo' ? 'Cierra los ojos.' : (my.alive ? 'La voz llama a otro vecino… o a nadie: quién actúa es el secreto del juego y esta pantalla no lo dirá.' : 'Los muertos velan la noche con los ojos abiertos: puedes mirar, pero no hablar ni hacer señas.')} {my.alive ? 'Deja el móvil boca arriba y desbloqueado: cuando te toque, tu pantalla te lo dirá.' : 'Abajo puedes tocar a cualquiera para descubrir su carta (solo la ves tú).'}</p>
        {#if my.alive}<p class="small-note">🎴 Mientras tanto puedes repasar tu carta y las reglas con el botón «Mi carta» de abajo a la derecha.</p>{/if}</div>
    {/if}
    <PlayersGrid {players} title="🏘️ El pueblo" viewer={my} />
  {/if}
{/if}
