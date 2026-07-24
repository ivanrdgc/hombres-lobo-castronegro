<script lang="ts">
  // Fase de noche · postura 🍽️ MESA (B28).
  //
  // La regla que manda: EN REPOSO, los 12 móviles de la mesa enseñan LA MISMA
  // pantalla. Antes, el llamado veía su panel de acción y el resto «ojos
  // cerrados»: un lobo con los ojos abiertos sabía quién era la Vidente sin
  // leer una sola letra, solo por la forma del panel.
  //
  // Ahora la noche entera es una tarjeta neutra idéntica en todos los móviles
  // («👁 Abrir mi turno»). Quien la toca recibe su panel si la voz lo ha
  // llamado, y «no es tu turno» si no. Tocar, por tanto, no delata; y el panel
  // se cierra solo al terminar, al cambiar de paso o a los 12 s sin tocarlo.
  import { app, setFlash } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { NIGHT_STEPS, stepActors } from '../engine';
  import { e2eTestMode } from '../../../core/test-hooks';
  import { narr } from '../texts/corpus';
  import { autoHide } from './autohide.svelte';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
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
  // En los pasos con llamada por palabra clave, quien ya confirmó puede volver a
  // abrir su panel dentro del mismo paso: ahí está su palabra renovada.
  const kwConfirmed = $derived.by(() => {
    if (!my.alive) return false;
    if (stepId === 'encantados') return !!my.charmed && !!(game.acts.encantadosSeen || {})[my.id];
    if (stepId === 'enamorados') return !!my.lover && !!(game.acts.loversSeen || {})[my.id];
    if (stepId === 'infectado') return !!(game.acts.infectadoSeen || {})[my.id];
    return false;
  });
  const acting = $derived(isActor || kwConfirmed);
  const narrText = $derived.by(() => {
    if (stepId === 'durmiendo') return narr('noche_cae', `${game.seed}:n${game.night}`);
    const t = def && !def.silent ? narr(def.id, `${game.seed}:n${game.night}:s${game.stepIdx}:${def.id}`) : '';
    return t || 'La noche envuelve Castronegro…';
  });

  // ——— La puerta del turno ———
  let turnOpen = $state(false);
  let openedActing = $state(false);
  const touchTurn = autoHide(() => turnOpen, () => closeTurn());

  function closeTurn() {
    turnOpen = false;
    openedActing = false;
    // Los avisos del panel («toca antes a alguien») son del que actúa: no pueden
    // quedarse en la cabecera después de esconder el panel.
    if (app.flash) setFlash(null);
  }
  function openTurn() {
    openedActing = acting;
    turnOpen = true;
    touchTurn();
  }

  // Cambiar de paso, de noche o entrar en el repaso de roles cierra la puerta.
  const stepKey = $derived(`${game.night}:${game.stepIdx}:${game.refreshNonce || 0}:${game.roleRefresh ? 'rr' : ''}`);
  $effect(() => {
    void stepKey;
    turnOpen = false;
    openedActing = false;
  });
  // Y al terminar su turno, el panel se retira solo: no hay que acordarse de
  // esconderlo (era el gesto que más delataba en la mesa de pruebas).
  $effect(() => {
    if (turnOpen && openedActing && !acting) closeTurn();
  });

  // Lo que dice la tarjeta neutra, SOLO en función del paso: idéntica en los 12
  // móviles de la mesa (nunca en función de quién eres).
  const rest = $derived.by(() => {
    if (stepId === 'durmiendo') return { h: '😴 El pueblo se duerme', p: 'Cerrad los ojos. Dejad el móvil boca arriba: cuando la voz llame, se actúa desde aquí.' };
    if (stepId === 'amanecer') return { h: '🌅 Se acaba la noche', p: 'Ojos cerrados: la voz va a contar quién no ha pasado la noche.' };
    if (stepId === 'lobos_reconocen') return { h: '👂 Atención a la voz', p: 'Ojos cerrados: alguien está abriendo los suyos. No mires.' };
    if (stepId === 'enamorados' || stepId === 'encantados' || stepId === 'infectado')
      return { h: '👂 Atención a la voz', p: 'Ojos cerrados y oído atento: si suena una palabra clave, ábrelos con disimulo.' };
    return { h: '🌙 La voz llama a alguien…', p: 'Si te llama a ti —por tu rol o por tu palabra clave—, abre tu turno. Si no, ojos cerrados.' };
  });
  // Lo que ve quien abre sin que le toque: mismo formato que el panel de acción.
  const noTurn = $derived.by(() => {
    if (!my.alive) return { h: '💀 Estás muerto: mira y calla', p: 'Los muertos velan la noche con los ojos abiertos: puedes mirar, pero no hablar ni hacer señas.' };
    if (stepId === 'durmiendo') return { h: '😴 Todos a dormir', p: 'Todavía no hay nada que hacer: cierra los ojos.' };
    return { h: '🌙 No es tu turno', p: 'La voz llama a otro vecino… o a nadie: quién actúa es el secreto del juego y esta pantalla no lo dirá. Cierra los ojos; volverá a llamarte cuando toque.' };
  });
</script>

{#if game.roleRefresh && game.roleRefresh.closing}
  <div class="narration">😴 Todos habéis repasado vuestro rol. Cerrad los ojos de nuevo… la noche continúa donde estaba.</div>
  <PlayersGrid {players} title="🏘️ El pueblo" viewer={my} />
{:else if game.roleRefresh}
  <div class="narration">👁️ Pausa: todo Castronegro abre los ojos y revisa su rol y su palabra clave en secreto. La noche continuará donde estaba.</div>
  <!-- Una sola puerta (B34): la carta se abre en la pastilla 🎴, como en
       cualquier otra pantalla. Aquí el botón es el ACTO —confirmar— y por eso
       lleva otro verbo: nada de un segundo «ver mi carta» en el cuerpo. -->
  {#if my.alive && my.inGame && !refreshConf}
    <div class="actionpanel"><h3>🔑 Repasa tu carta</h3>
      <p class="hint">Ábrela abajo en <b>🎴 Mi carta</b>, memoriza rol y palabra clave, ciérrala y confirma aquí. La noche no sigue hasta que estéis todos.</p>
      <button class="primary block" data-a="confirm-role-refresh"
        onclick={() => guard(() => A.confirmRoleRefresh())}>✅ Repasada, estoy listo</button></div>
  {:else}
    <div class="actionpanel"><h3>⏳ {refreshPend.length ? `Se espera a ${refreshPend.length === 1 ? refreshPend[0] : `${refreshPend.length} jugadores`}` : '¡Listos!'}</h3>
      <p class="hint">{refreshPend.length ? `Falta${refreshPend.length > 1 ? 'n' : ''} por confirmar: ${refreshPend.join(', ')}. Tú ya estás: no toques nada más.` : 'Todo el mundo ha confirmado: la noche continúa donde estaba.'}</p></div>
    {#if rescueReady && refreshPend.length}
      <div class="card"><p class="small-note">📵 ¿Alguien se ha quedado sin móvil (pantalla apagada, sin batería)? La noche puede continuar sin él: se salta el paso en el que se atascó.</p>
        <button class="ghost block" data-a="skip-stuck-step" onclick={() => guard(() => A.forceAdvance(true))}>⏭️ Continuar sin él</button></div>
    {/if}
  {/if}
  <PlayersGrid {players} title="🏘️ El pueblo" viewer={my} />
{:else}
  <div class="narration">🌙 {stepId === 'amanecer' ? 'Los primeros rayos de sol acarician los tejados…' : narrText}</div>
  {#if turnOpen}
    <!-- Cualquier gesto dentro del panel (tocar, escribir la pregunta de la
         Gitana) reinicia la cuenta atrás: nadie pierde lo que está decidiendo. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div onpointerdown={touchTurn} onkeydown={touchTurn}>
      {#if acting}
        <!-- El panel del actor: la lista de objetivos YA es el pueblo entero
             (ActionGrid), sin parrilla duplicada debajo. -->
        <NightActionPanel stepId={stepId!} {group} {my} {players} />
      {:else}
        <div class="actionpanel"><h3>{noTurn.h}</h3><p class="hint">{noTurn.p}</p></div>
      {/if}
      <button class="ghost block" data-a="close-night-turn" onclick={closeTurn}>🙈 Ocultar (o espera: se oculta solo)</button>
    </div>
  {:else}
    <div class="actionpanel"><h3>{rest.h}</h3>
      <p class="hint">{rest.p}</p>
      <button class="primary block" data-a="open-night-turn" onclick={openTurn}>👁 Abrir mi turno</button>
      <p class="small-note">Toda la mesa ve esto mismo: nadie sabe a quién ha llamado la voz. Lo tuyo aparece al pedirlo y se oculta solo. ¿Se te ha olvidado quién eres? Tu carta está siempre abajo, en <b>🎴 Mi carta</b>.</p></div>
  {/if}
  {#if !(turnOpen && acting)}
    <PlayersGrid {players} title="🏘️ El pueblo" viewer={my} />
  {/if}
{/if}
