<script lang="ts">
  // Panel de acción nocturna del actor del paso en curso.
  //
  // Contrato B25/B26 aplicado aquí:
  //   · Cada poder dice QUÉ HACE antes de elegir (y qué le queda: pociones,
  //     papeles, olfato…) — nunca solo el nombre del rol.
  //   · Elegir QUÉ y elegir A QUIÉN son dos pasos, siempre con «↩️ cambiar».
  //   · Nada irreversible de un solo toque: el botón final NOMBRA la consecuencia.
  //   · La referencia («📖 Cómo funciona tu poder») se consulta desde aquí, sin
  //     salir de la pantalla en la que se decide.
  //   · Lo deshabilitado explica por qué, en pantalla y en pequeño.
  //
  // La lista de objetivos es ActionGrid (el pueblo entero, elegibles tocables):
  // no hay una segunda parrilla debajo.
  // Nota: los roles vivos SIEMPRE despiertan aunque no puedan usar su poder
  // (pociones gastadas, olfato perdido, castigo del Anciano): su panel de
  // disimulo mantiene el comportamiento externo idéntico.
  import { app, setFlash } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ROLES, isWolfSide, isWolfTeamRole, aliveNeighbors } from '../roles';
  import type { RoleId } from '../roles';
  import { ROLE_HELP } from '../texts/role-help';
  import { GITANA_QUESTIONS } from '../engine';
  import { selIds, sel1 } from '../../../shell/selection';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import ActionGrid from './ActionGrid.svelte';

  const { stepId, group, my, players }: {
    stepId: string;
    group: GroupDoc;
    my: PlayerDoc;
    players: PlayerDoc[];
  } = $props();

  const game = $derived(group.game!);
  const key = $derived(`n${game.night}:${stepId}`);
  const sel = $derived(selIds(key));
  const selNames = $derived(sel.map((id) => players.find((p) => p.id === id)?.name || '').filter(Boolean));
  const sel1Name = $derived(selNames[0] ?? null);
  const nameOf = (pid: string | null | undefined) => players.find((p) => p.id === pid)?.name || '';
  const roleDef = (rid: RoleId | null | undefined) => (rid ? ROLES[rid] : undefined);

  const needSel = () => setFlash('Toca primero a un jugador de la lista.');

  // Texto de disimulo compartido cuando el pueblo mató al Anciano.
  const ANCIANO = 'La muerte del Anciano os arrebató los poderes. Que nadie lo note: espera un instante, disimula… y termina tu turno.';

  // Efecto de cada papel del Actor EN UNA LÍNEA (contrato: el botón dice lo que hace).
  const ACTOR_POWERS: { id: 'vidente' | 'defensor' | 'cuervo'; label: string; eff: string; plan: string }[] = [
    { id: 'vidente', label: '🔮 Ver un rol', eff: 'miras la carta de quien elijas (solo tú la ves)', plan: '🔮 Como la Vidente: verás en secreto la carta de quien elijas.' },
    { id: 'defensor', label: '🛡️ Proteger', eff: 'lo salvas del ataque de los lobos de esta noche', plan: '🛡️ Como el Defensor: a quien elijas no lo matarán los lobos esta noche (el veneno de la Bruja sí).' },
    { id: 'cuervo', label: '🐦‍⬛ Señalar (+2 votos)', eff: 'mañana cargará con 2 votos extra, y el pueblo lo sabrá', plan: '🐦‍⬛ Como el Cuervo: al amanecer se anuncia que carga con 2 votos extra en el juicio de hoy.' },
  ];

  const notMe = (p: PlayerDoc) => p.id !== my.id;

  // Vivos del pueblo, para contar de un vistazo lo que la mesa ya sabe.
  const aliveCount = $derived(players.filter((p) => p.alive).length);

  function cupidoShoot() {
    const s = selIds(key);
    if (s.length !== 2) { needSel(); return; }
    void guard(() => A.actCupido(s[0], s[1]));
  }

  function actorConfirm() {
    const t = sel1(key);
    if (!t) { needSel(); return; }
    const p = app.ui.actorPower as 'vidente' | 'defensor' | 'cuervo' | null;
    void guard(async () => { await A.actActor(p, t); app.ui.actorPower = null; });
  }

  // Trío que olfatea el Zorro: la casa elegida y sus dos vecinos VIVOS.
  const zorroTrio = $derived.by(() => {
    const t = sel1(key);
    if (!t) return [];
    return [players.find((p) => p.id === t), ...aliveNeighbors(players, t)]
      .filter((p): p is PlayerDoc => !!p);
  });

  function zorroSniff() {
    const t = sel1(key);
    if (!t) { needSel(); return; }
    const found = zorroTrio.some((p) => isWolfSide(p));
    void guard(() => A.actZorro(t, found));
  }

  function brujaDone() {
    const heal = app.ui.brujaHeal ? (game.acts.wolfVictim || null) : null;
    void guard(async () => { await A.actBruja(heal, sel1(key)); app.ui.brujaHeal = false; });
  }

  function gaiteroCharm() {
    // El Gaitero puede encantarse a sí mismo (regla de la casa: todos los roles
    // pueden incluirse salvo prohibición oficial expresa). Su victoria no lo
    // necesita — exige a todos los DEMÁS vivos — pero es una jugada legal.
    const targets = players.filter((p) => p.alive && !p.charmed);
    const maxSel = Math.min(2, targets.length);
    const s = selIds(key);
    if (s.length !== maxSel) { needSel(); return; }
    void guard(() => A.actGaitero(s));
  }

  let gitanaQ = $state('');
  // Elegir QUÉ preguntar y preguntarlo son dos gestos: la pregunta se marca y
  // el botón final la repite (los muertos solo responden una vez por noche).
  let gitanaPick = $state<number | null>(null);

  function gitanaAsk() {
    if (gitanaPick === null) { setFlash('Elige primero una pregunta.'); return; }
    void guard(() => A.actGitana(gitanaPick));
  }

  function gitanaCustom() {
    const q = gitanaQ.trim();
    if (!q) { setFlash('Escribe primero tu pregunta.'); return; }
    void guard(() => A.actGitanaCustom(q));
  }

  // Segundos gestos de las decisiones que marcan toda la partida.
  let ladronPick = $state<number | null>(null);
  let perroPick = $state<'aldeano' | 'lobo' | null>(null);

  // El panel sobrevive a algunos cambios de paso (dos pasos seguidos con el
  // mismo actor): al cambiar de paso o de noche, ninguna elección a medias
  // puede quedar armada — nada irreversible debe heredarse de otro turno.
  $effect(() => {
    void key;
    ladronPick = null;
    perroPick = null;
    gitanaPick = null;
    gitanaQ = '';
  });
</script>

<!-- Referencia plegada del propio poder: se consulta SIN salir del panel. -->
{#snippet ref(rid: RoleId, label: string)}
  {@const h = ROLE_HELP[rid]}
  {#if h}
    <details class="hlref">
      <summary data-a="hl-ref" data-p={rid}>📖 {label}</summary>
      <p class="small-note" style="margin-top:6px">🕐 {h.when}</p>
      <ol class="howlist">{#each h.steps as s, i (i)}<li>{s}</li>{/each}</ol>
      {#if h.tip}<p class="small-note">💡 {h.tip}</p>{/if}
    </details>
  {/if}
{/snippet}

<!-- Qué va a pasar exactamente, en claro, antes de confirmar. -->
{#snippet plan(txt: string)}
  <div class="hlplan">{txt}</div>
{/snippet}

{#if stepId === 'ladron'}
  {@const cc = game.centerCards || []}
  {@const bothWolves = cc.length === 2 && cc.every((r) => isWolfTeamRole(r))}
  {@const mine = my.role ? ROLES[my.role] : null}
  <div class="actionpanel"><h3>🃏 El Ladrón</h3>
    <p class="hint">Estas son las <b>dos cartas que sobraron</b> del reparto: nadie más las ve. {bothWolves ? 'Las dos son de lobo: las reglas te obligan a quedarte una.' : 'Puedes cambiar tu carta por una de ellas (la tuya se queda en el centro) o quedarte como estás.'}</p>
    <div class="centercards">
      {#each cc as r, i (i)}
        {#if r}
          <div class="cc {ladronPick === i ? 'picked' : ''}" data-a="act-ladron-take" data-p={i}
            onclick={() => (ladronPick = i)}
            role="button" tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') ladronPick = i; }}>
            <div style="font-size:2rem">{ROLES[r].emoji}</div><b>{ROLES[r].name}</b><div class="small-note">{ROLES[r].desc}</div>
            <div class="small-note">{ladronPick === i ? '✔️ elegida' : 'Tocar para elegirla'}</div>
          </div>
        {/if}
      {/each}
    </div>
    {#if ladronPick !== null && cc[ladronPick]}
      {@render plan(`🔄 Cambias tu carta${mine ? ` de ${mine.emoji} ${mine.name}` : ''} por ${ROLES[cc[ladronPick]!].emoji} ${ROLES[cc[ladronPick]!].name}. Es para toda la partida y no se deshace.`)}
      <button class="primary block" data-a="act-ladron-confirm" onclick={() => guard(() => A.actLadron(ladronPick))}>🃏 Quedarme {ROLES[cc[ladronPick]!].name}</button>
      <button class="ghost block" data-a="act-ladron-back" onclick={() => (ladronPick = null)}>↩️ Cambiar de carta</button>
    {:else if !bothWolves}
      <button class="ghost block" data-a="act-ladron-keep" onclick={() => guard(() => A.actLadron(null))}>✋ Me quedo mi carta{mine ? ` de ${mine.name}` : ''}</button>
    {/if}
    {@render ref('ladron', 'Cómo funciona el Ladrón')}
  </div>
{:else if stepId === 'cupido'}
  <div class="actionpanel"><h3>💘 Cupido</h3>
    <p class="hint">Toca a las <b>dos</b> personas que quedarán enamoradas para siempre (puedes incluirte). Si una muere, la otra muere de pena; si son de bandos distintos, su meta pasa a ser quedar los dos últimos.</p>
    <ActionGrid {players} max={2} selKey={key} />
    {#if sel.length === 2}{@render plan(`💘 Enamoras a ${selNames.join(' y ')}. Esta noche la voz los despertará por su palabra clave para decírselo; tú vuelves a ser un aldeano normal.`)}{/if}
    <button class="primary block" data-a="act-cupido" disabled={sel.length !== 2} onclick={cupidoShoot}>🏹 {sel.length === 2 ? `Enamorar a ${selNames.join(' y ')}` : 'Enamorar (elige a 2)'}</button>
    {#if sel.length !== 2}<p class="small-note">Te {2 - sel.length === 1 ? 'falta 1 persona' : 'faltan 2 personas'} por tocar.</p>{/if}
    {@render ref('cupido', 'Cómo funciona Cupido')}
  </div>
{:else if stepId === 'enamorados'}
  {@const partner = players.find((p) => p.lover && p.id !== my.id)}
  {@const loverConfirmed = !!(game.acts.loversSeen || {})[my.id]}
  <div class="actionpanel"><h3>💘 Estás enamorado/a</h3>
    <p class="hint">Tu media naranja es <b>{partner?.name || '…'}</b>. Si muere, tú también. Si sois de bandos distintos, vuestra meta es quedar los dos últimos.</p>
    {#if !loverConfirmed}
      {#if my.kwNext}
        <!-- La llamada quemó su palabra: la NUEVA se enseña junto al botón. -->
        <p class="hint">🔑 Te llamé por <b>«{my.keyword}»</b>: queda quemada. Tu <b>NUEVA</b> palabra clave, desde ya:</p>
        <p style="text-align:center;font-size:1.3rem;margin:8px 0"><b>«{my.kwNext}»</b></p>
        <p class="hint">Memorízala antes de confirmar: con ella te llamaré la próxima vez.</p>
      {:else if my.keyword}
        <p class="hint">🔑 Tu palabra clave no cambia: sigue siendo <b>«{my.keyword}»</b>.</p>
      {/if}
      <button class="primary block" data-a="act-lover-ok" onclick={() => guard(A.confirmLover)}>❤️ Entendido</button>
      <p class="small-note">Al confirmar, cierra los ojos: la noche sigue.</p>
    {:else}
      <p class="hint">✅ Confirmado.{#if my.keyword} Tu palabra clave{my.kwRenewedNight === game.night ? ' (renovada)' : ''}: <b>«{my.keyword}»</b>. La tienes siempre en tu carta (👁 Mostrar mi rol).{/if}</p>
    {/if}
  </div>
{:else if stepId === 'nino_salvaje'}
  <div class="actionpanel"><h3>🐾 El Niño Salvaje</h3>
    <p class="hint">Toca a tu <b>modelo a seguir</b>. Mientras viva, eres del pueblo; si muere, te transformas en hombre lobo en secreto (nadie lo sabrá, ni él). Es para toda la partida.</p>
    <ActionGrid {players} selKey={key} canPick={notMe} whyNot={(p) => (p.id === my.id ? 'no puedes ser tu propio modelo' : null)} />
    {#if sel1Name}{@render plan(`🌟 Tu modelo será ${sel1Name}. Si ${sel1Name} muere, la bestia despertará en ti.`)}{/if}
    <button class="primary block" data-a="act-nino" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actNinoSalvaje(sel1(key))) : needSel())}>🌟 {sel1Name ? `Mi modelo: ${sel1Name}` : 'Elegir modelo'}</button>
    {#if !sel1Name}<p class="small-note">Toca antes a alguien de la lista.</p>{/if}
    {@render ref('nino_salvaje', 'Cómo funciona el Niño Salvaje')}
  </div>
{:else if stepId === 'perro_lobo'}
  <div class="actionpanel"><h3>🐕 El Perro Lobo</h3>
    <p class="hint">Eliges tu bando <b>para toda la partida</b>, y no se deshace. Nadie más lo sabrá.</p>
    <div class="btnrow">
      <button class="{perroPick === 'aldeano' ? 'primary' : 'ghost'}" data-a="act-perro" data-p="aldeano" onclick={() => (perroPick = 'aldeano')}>🏡 Ser aldeano</button>
      <button class="{perroPick === 'lobo' ? 'violet' : 'ghost'}" data-a="act-perro" data-p="lobo" onclick={() => (perroPick = 'lobo')}>🐺 Unirme a los lobos</button>
    </div>
    <p class="small-note">🏡 <b>Aldeano</b>: duermes toda la noche y ganas con el pueblo. · 🐺 <b>Lobo</b>: despiertas cada noche con la manada, cazas con ellos y ganas con ellos.</p>
    {#if perroPick}
      {@render plan(perroPick === 'lobo'
        ? '🐺 Te unes a la manada: desde esta misma noche despiertas con los lobos y ganas con ellos.'
        : '🏡 Te quedas en el pueblo: sin poderes, pero ganas con los aldeanos.')}
      <button class="primary block" data-a="act-perro-confirm" onclick={() => guard(() => A.actPerroLobo(perroPick === 'lobo'))}>{perroPick === 'lobo' ? '🐺 Confirmar: me uno a los lobos' : '🏡 Confirmar: soy aldeano'}</button>
      <button class="ghost block" data-a="act-perro-back" onclick={() => (perroPick = null)}>↩️ Cambiar de bando</button>
    {:else}
      <p class="small-note">Elige uno de los dos y te pediré confirmación.</p>
    {/if}
    {@render ref('perro_lobo', 'Cómo funciona el Perro Lobo')}
  </div>
{:else if stepId === 'dos_hermanas'}
  <div class="actionpanel"><h3>👭 Las Dos Hermanas</h3>
    <p class="hint">Abrid los ojos con disimulo y reconoceos la una a la otra: sabrás que es inocente y nadie más lo sabrá. Cuando lo hayáis hecho, confirmad aquí.</p>
    <button class="primary block" data-a="act-hermana-ok" onclick={() => guard(A.confirmHermana)}>🤝 Nos hemos reconocido</button>
  </div>
{:else if stepId === 'tres_hermanos'}
  <div class="actionpanel"><h3>👨‍👨‍👦 Los Tres Hermanos</h3>
    <p class="hint">Abrid los ojos con disimulo y reconoceos entre vosotros: tenéis dos aliados seguros y nadie más lo sabe. Cuando lo hayáis hecho, confirmad aquí.</p>
    <button class="primary block" data-a="act-hermano-ok" onclick={() => guard(A.confirmHermano)}>🤝 Nos hemos reconocido</button>
  </div>
{:else if stepId === 'lobos_reconocen'}
  {@const packmates = players.filter((p) => p.alive && isWolfSide(p) && p.id !== my.id)}
  <div class="actionpanel"><h3>🐺 La manada se reconoce</h3>
    <p class="hint">El pueblo duerme con los ojos cerrados. {#if packmates.length}Tu manada: <b>{packmates.map((p) => p.name).join(', ')}</b>. Abrid los ojos en silencio, reconoceos… y confirmad aquí.{:else}Estás <b>solo</b> en la manada: nadie más abrirá los ojos. Confirma y la partida sigue.{/if}</p>
    <button class="danger block" data-a="act-lobos-reconocido" onclick={() => guard(A.confirmLoboReconocido)}>🐺 Nos hemos reconocido</button>
    <p class="small-note">Esta noche no se caza todavía: solo os miráis las caras.</p>
  </div>
{:else if stepId === 'actor'}
  {@const used = my.actorUsed || []}
  {@const actorLeft = ACTOR_POWERS.filter((p) => !used.includes(p.id))}
  {#if game.powersLost}
    <div class="actionpanel"><h3>🎭 El Actor</h3>
      <p class="hint">{ANCIANO}</p>
      <button class="primary block" data-a="act-actor-skip" onclick={() => guard(() => A.actActor(null, null))}>🌙 Terminar mi turno</button>
    </div>
  {:else if !actorLeft.length}
    <div class="actionpanel"><h3>🎭 El Actor</h3>
      <p class="hint">Tus tres papeles ya están interpretados: cada carta se descarta tras usarse. Que nadie lo note — repasa tus gestos, disimula… y termina tu turno.</p>
      <button class="primary block" data-a="act-actor-skip" onclick={() => guard(() => A.actActor(null, null))}>🌙 Terminar mi turno</button>
    </div>
  {:else if game.acts.actor && game.acts.actor.power === 'vidente' && game.acts.actor.target && !game.acts.actorSeen}
    {@const t = players.find((p) => p.id === game.acts.actor?.target)}
    {@const rr = t && t.role ? ROLES[t.role] : undefined}
    <div class="actionpanel"><h3>🎭🔮 El Actor como Vidente</h3>
      <p class="hint">Memoriza lo que ves y confirma.</p>
      <p style="margin:8px 0">{#if game.videnteBando}<b>{t?.name || ''}</b> {t && isWolfTeamRole(t.role) ? 'ES un 🐺 hombre lobo' : 'NO es un hombre lobo 🏡'}.{:else}<b>{t?.name || ''}</b> es {rr?.emoji || ''} <b>{rr?.name || ''}</b>.{/if}</p>
      <button class="primary block" data-a="act-actor-seen" onclick={() => guard(A.actActorSeen)}>✔️ Lo he visto</button>
    </div>
  {:else if !app.ui.actorPower}
    <div class="actionpanel"><h3>🎭 El Actor · elige papel</h3>
      <p class="hint">Interpretas <b>un</b> papel por noche y esa carta se descarta: te quedan <b>{actorLeft.length} de 3</b>.</p>
      <div class="hlpowers">
        {#each actorLeft as p (p.id)}
          <button class="hlpower" data-a="act-actor-power" data-p={p.id} onclick={() => { app.ui.actorPower = p.id; app.ui.sel = null; }}>
            <span class="hlpname">{p.label}</span>
            <span class="hlpeff">{p.eff}</span>
          </button>
        {/each}
      </div>
      {#if used.length}
        <!-- Descartados: se ENSEÑAN (sin botón mudo) para que no haya que recordarlos. -->
        <p class="small-note">🚫 Ya interpretados, no se repiten: {ACTOR_POWERS.filter((p) => used.includes(p.id)).map((p) => p.label).join(' · ')}</p>
      {/if}
      <button class="ghost block" data-a="act-actor-skip" onclick={() => guard(() => A.actActor(null, null))}>🚫 No actuar esta noche (no gastas ningún papel)</button>
      {@render ref('actor', 'Cómo funciona el Actor')}
    </div>
  {:else}
    {@const cur = ACTOR_POWERS.find((p) => p.id === app.ui.actorPower)}
    <div class="actionpanel"><h3>🎭 El Actor: {cur?.label}</h3>
      {@render plan(cur?.plan || '')}
      <button class="ghost block small" style="margin:8px 0" data-a="act-actor-power" data-p="" onclick={() => { app.ui.actorPower = null; app.ui.sel = null; }}>↩️ Cambiar papel</button>
      <p class="hint">Ahora toca a tu objetivo.</p>
      <!-- Como los roles que imita: nada prohíbe actuar sobre uno mismo, y
           como defensor no puede repetir al protegido de anoche. -->
      <ActionGrid {players} selKey={key}
        canPick={app.ui.actorPower === 'defensor' ? (p) => p.id !== my.protectedLast : () => true}
        whyNot={(p) => (p.id === my.protectedLast ? 'protegido anoche: no se repite' : null)} />
      <button class="primary block" data-a="act-actor-confirm" disabled={!sel1Name} onclick={actorConfirm}>🎭 {sel1Name ? `Actuar sobre ${sel1Name}` : 'Actuar'}</button>
      {#if !sel1Name}<p class="small-note">Toca antes a alguien de la lista.</p>{/if}
    </div>
  {/if}
{:else if stepId === 'defensor'}
  {#if game.powersLost}
    <div class="actionpanel"><h3>🛡️ El Defensor</h3>
      <p class="hint">{ANCIANO}</p>
      <button class="primary block" data-a="act-defensor-skip" onclick={() => guard(() => A.actDefensor(null))}>🌙 Terminar mi turno</button>
    </div>
  {:else}
    {@const last = nameOf(my.protectedLast)}
    <div class="actionpanel"><h3>🛡️ El Defensor</h3>
      <p class="hint">Tu escudo salva a quien elijas <b>del ataque de los lobos de esta noche</b> — contra el veneno de la Bruja no protege. Puedes protegerte a ti.</p>
      {#if last}<p class="small-note">🚫 Anoche protegiste a <b>{last}</b>: las reglas no dejan repetir dos noches seguidas, así que hoy aparece atenuado.</p>{/if}
      <ActionGrid {players} selKey={key} canPick={(p) => p.id !== my.protectedLast}
        whyNot={(p) => (p.id === my.protectedLast ? 'protegido anoche: no se repite' : null)} />
      {#if sel1Name}{@render plan(`🛡️ ${sel1Name} sobrevivirá esta noche si los lobos lo eligen. Nadie sabrá que fuiste tú.`)}{/if}
      <button class="primary block" data-a="act-defensor" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actDefensor(sel1(key))) : needSel())}>🛡️ {sel1Name ? `Proteger a ${sel1Name}` : 'Proteger'}</button>
      {#if !sel1Name}<p class="small-note">Toca antes a alguien de la lista para activar el botón.</p>{/if}
      <button class="ghost block" data-a="act-defensor-skip" onclick={() => guard(() => A.actDefensor(null))}>No proteger a nadie</button>
      {@render ref('defensor', 'Cómo funciona el Defensor')}
    </div>
  {/if}
{:else if stepId === 'vidente'}
  {#if game.acts.videnteTarget !== undefined && game.acts.videnteTarget !== null && !game.acts.videnteSeen}
    {@const t = players.find((p) => p.id === game.acts.videnteTarget)}
    {@const rr = t && t.role ? ROLES[t.role] : undefined}
    {@const esLobo = !!(t && isWolfTeamRole(t.role))}
    <div class="actionpanel"><h3>🔮 La Vidente</h3>
      <p class="hint">Memoriza lo que ves y confirma. La partida seguirá unos segundos después, con disimulo.</p>
      <div class="rolecard" style="margin:8px 0">
        {#if game.videnteBando}<span class="remoji">{esLobo ? '🐺' : '🏡'}</span><span class="rname">{t?.name || ''}</span>
          <div class="rteam">{esLobo ? 'ES UN HOMBRE LOBO' : 'NO es un hombre lobo'}</div>
        {:else}<span class="remoji">{rr?.emoji || '❔'}</span><span class="rname">{t?.name || ''}</span>
          <div class="rteam">es {rr?.emoji || ''} {rr?.name || ''}</div>{/if}
      </div>
      <button class="primary block" data-a="act-vidente-seen" onclick={() => guard(A.actVidenteSeen)}>✔️ Lo he visto</button>
      <p class="small-note">Queda anotado en tu carta (👁 Mostrar mi rol): no hace falta que lo memorices.</p>
    </div>
  {:else if game.powersLost}
    <div class="actionpanel"><h3>🔮 La Vidente</h3>
      <p class="hint">{ANCIANO}</p>
      <button class="primary block" data-a="act-vidente-skip" onclick={() => guard(() => A.actVidente(null))}>🌙 Terminar mi turno</button>
    </div>
  {:else}
    {@const log = my.videnteLog || []}
    <div class="actionpanel"><h3>🔮 La Vidente</h3>
      <p class="hint">Esta noche verás {game.videnteBando ? 'solo si esa persona es hombre lobo o no' : 'la carta exacta'} de quien toques. Lo ves <b>solo tú</b>: si lo cantas de día, los lobos irán a por ti.</p>
      {#if log.length}
        <!-- Lo que YA sabes, delante: nadie debería tener que recordar sus visiones. -->
        <p class="small-note">🔮 Ya has visto: {#each log as e, i (i)}{i ? ' · ' : ''}{nameOf(e.pid)} {e.role !== undefined ? `= ${roleDef(e.role)?.emoji || ''} ${roleDef(e.role)?.name || '¿?'}` : (e.wolf ? '= 🐺 LOBO' : '= 🏡 no lobo')}{/each}</p>
      {/if}
      <ActionGrid {players} selKey={key} />
      {#if sel1Name}{@render plan(`🔮 Verás ${game.videnteBando ? `si ${sel1Name} es hombre lobo` : `la carta de ${sel1Name}`}, solo en tu pantalla.`)}{/if}
      <button class="primary block" data-a="act-vidente" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actVidente(sel1(key))) : needSel())}>🔮 {sel1Name ? `Ver el rol de ${sel1Name}` : 'Ver un rol'}</button>
      {#if !sel1Name}<p class="small-note">Toca antes a alguien de la lista.</p>{/if}
      {@render ref('vidente', 'Cómo funciona la Vidente')}
    </div>
  {/if}
{:else if stepId === 'zorro'}
  {#if game.acts.zorroTarget !== undefined && game.acts.zorroTarget !== null && !game.acts.zorroSeen}
    <div class="actionpanel"><h3>🦊 El Zorro</h3>
      <p class="hint">Memoriza el resultado y confirma.</p>
      <p style="margin:8px 0">{#if game.acts.zorroResult}🐺 ¡Tu olfato detecta rastro de <b>hombre lobo</b> en ese trío de casas!{:else}🍃 No hay rastro de lobo en ese trío… y tu olfato se ha agotado.{/if}</p>
      <button class="primary block" data-a="act-zorro-seen" onclick={() => guard(A.actZorroSeen)}>✔️ Lo he visto</button>
    </div>
  {:else if game.powersLost || my.powers?.zorro === false}
    <div class="actionpanel"><h3>🦊 El Zorro</h3>
      <p class="hint">{game.powersLost ? ANCIANO : 'Tu olfato se agotó aquella noche sin rastro. Que nadie lo sepa: husmea el aire un momento, disimula… y pasa.'}</p>
      <button class="primary block" data-a="act-zorro-skip" onclick={() => guard(() => A.actZorro(null, false))}>🌙 Terminar mi turno</button>
    </div>
  {:else}
    <div class="actionpanel"><h3>🦊 El Zorro</h3>
      <p class="hint">Olfateas <b>tres casas de golpe</b>: la que toques y sus dos vecinas vivas (puedes tocarte a ti). Sabrás si hay algún lobo entre las tres, pero no cuál. <b>Si no hay ninguno, pierdes el olfato para siempre.</b></p>
      <ActionGrid {players} selKey={key} />
      {#if zorroTrio.length}
        {@render plan(`🦊 Olfatearás a ${zorroTrio.map((p) => p.name).join(', ')}. Si no hay lobo entre ellos, tu olfato se agota.`)}
      {/if}
      <button class="primary block" data-a="act-zorro" disabled={!sel1Name} onclick={zorroSniff}>🦊 {sel1Name ? `Olfatear la casa de ${sel1Name}` : 'Olfatear'}</button>
      {#if !sel1Name}<p class="small-note">Toca antes una casa de la lista para activar el botón.</p>{/if}
      <button class="ghost block" data-a="act-zorro-skip" onclick={() => guard(() => A.actZorro(null, false))}>No olfatear (conservas el olfato)</button>
      {@render ref('zorro', 'Cómo funciona el Zorro')}
    </div>
  {/if}
{:else if stepId === 'cuervo'}
  {#if game.powersLost}
    <div class="actionpanel"><h3>🐦‍⬛ El Cuervo</h3>
      <p class="hint">{ANCIANO}</p>
      <button class="primary block" data-a="act-cuervo-skip" onclick={() => guard(() => A.actCuervo(null))}>🌙 Terminar mi turno</button>
    </div>
  {:else}
    <div class="actionpanel"><h3>🐦‍⬛ El Cuervo</h3>
      <p class="hint">Al amanecer, la voz anunciará <b>ante todo el pueblo</b> que tu señalado carga con <b>2 votos extra</b> en el juicio de hoy. Nadie sabrá que fuiste tú (puedes señalarte a ti para despistar).</p>
      <ActionGrid {players} selKey={key} />
      {#if sel1Name}{@render plan(`🐦‍⬛ Mañana el pueblo sabrá que ${sel1Name} arranca el juicio con 2 votos en contra.`)}{/if}
      <button class="primary block" data-a="act-cuervo" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actCuervo(sel1(key))) : needSel())}>🐦‍⬛ {sel1Name ? `Señalar a ${sel1Name}` : 'Señalar'}</button>
      {#if !sel1Name}<p class="small-note">Toca antes a alguien de la lista para activar el botón.</p>{/if}
      <button class="ghost block" data-a="act-cuervo-skip" onclick={() => guard(() => A.actCuervo(null))}>No señalar a nadie</button>
      {@render ref('cuervo', 'Cómo funciona el Cuervo')}
    </div>
  {/if}
{:else if stepId === 'lobos'}
  {@const pack = players.filter((p) => p.alive && isWolfSide(p))}
  <!-- La manada puede devorar a cualquiera… incluso a uno de los suyos. -->
  <div class="actionpanel"><h3>🐺 Los Hombres Lobo</h3>
    {#if my.infected}<p class="hint">🧛 El mordisco del Padre de los Lobos te unió a la manada: conservas tu carta, pero cazas y ganas con los lobos.</p>{/if}
    {#if my.transformed}<p class="hint">🐾 Tu modelo murió y la bestia despertó en ti: desde ahora cazas y ganas con la manada.</p>{/if}
    <p class="hint">Manada ({pack.length} de {aliveCount} vivos): <b>{pack.map((p) => p.name).join(', ')}</b>. Poneos de acuerdo <b>en silencio</b>, con la mirada: el <b>primero</b> que confirme decide por todos y no hay vuelta atrás.</p>
    <ActionGrid {players} selKey={key} />
    {#if sel1Name}{@render plan(`🩸 La manada devora a ${sel1Name}. Si lo protegieron o resiste, amanecerá vivo… y nadie sabrá por qué.`)}{/if}
    <button class="danger block" data-a="act-lobos" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actLobos(sel1(key))) : needSel())}>🩸 {sel1Name ? `Devorar a ${sel1Name}` : 'Devorar'}</button>
    <button class="ghost block" data-a="act-lobos-nadie" onclick={() => guard(() => A.actLobos(null))}>🤷 No nos ponemos de acuerdo (nadie muere)</button>
    {#if !sel1Name}<p class="small-note">Toca antes a la presa en la lista.</p>{/if}
    {@render ref('hombre_lobo', 'Cómo funciona la manada')}
  </div>
{:else if stepId === 'infecto_decision'}
  {@const v = players.find((p) => p.id === game.acts.wolfVictim)}
  <div class="actionpanel"><h3>🧛 El Infecto Padre de los Lobos</h3>
    <p class="hint">La manada va a devorar a <b>{v?.name || '…'}</b>. Puedes infectarlo en su lugar (<b>una sola vez por partida</b>): no muere, conserva su carta y sus poderes, pero pasa a cazar y ganar con los lobos.</p>
    <p class="small-note">🔑 Si lo infectas, esta misma noche lo despertaré por su palabra clave para contárselo. Las noches sin infección llamo una palabra señuelo: así nadie sabrá si has usado tu poder.</p>
    <div class="btnrow"><button class="violet" data-a="act-infecto" data-p="si" onclick={() => guard(() => A.actInfecto(true))}>🧛 Infectar a {v?.name || '…'}</button><button class="danger" data-a="act-infecto" data-p="no" onclick={() => guard(() => A.actInfecto(false))}>🩸 Devorar sin más</button></div>
    {@render ref('infecto', 'Cómo funciona el Infecto')}
  </div>
{:else if stepId === 'infectado'}
  {@const infConfirmed = !!(game.acts.infectadoSeen || {})[my.id]}
  <div class="actionpanel"><h3>🧛 El Infecto Padre de los Lobos te ha mordido</h3>
    {#if !infConfirmed}
      <p class="hint">NO has muerto: su mordisco te convierte en <b>hombre lobo en secreto</b>. Conservas tu carta y tus poderes, pero desde ahora cazas y ganas con la manada. La próxima noche, cuando la voz despierte a los hombres lobo, abre los ojos con ellos: os reconoceréis en silencio.</p>
      {#if my.kwNext}
        <!-- Con Gaitero en juego, la llamada quemó su palabra: la NUEVA se
             enseña junto al botón (podría volver a ser llamado al encantarlo). -->
        <p class="hint">🔑 Te llamé por <b>«{my.keyword}»</b>: queda quemada. Tu <b>NUEVA</b> palabra clave, desde ya:</p>
        <p style="text-align:center;font-size:1.3rem;margin:8px 0"><b>«{my.kwNext}»</b></p>
        <p class="hint">Memorízala antes de confirmar: con ella te llamaré la próxima vez.</p>
      {:else if my.keyword}
        <!-- Sin nadie que pueda volver a llamarlo, su palabra no rota. -->
        <p class="hint">🔑 Tu palabra clave no cambia: sigue siendo <b>«{my.keyword}»</b>.</p>
      {/if}
      <button class="violet block" data-a="act-infectado-ok" onclick={() => guard(A.confirmInfectado)}>🧛 Entendido</button>
    {:else}
      <p class="hint">✅ Confirmado. Desde la próxima noche despiertas y cazas con la manada.{#if my.keyword} Tu palabra clave{my.kwRenewedNight === game.night ? ' (renovada)' : ''}: <b>«{my.keyword}»</b>. La tienes siempre en tu carta (👁 Mostrar mi rol).{/if}</p>
    {/if}
  </div>
{:else if stepId === 'lobo_feroz'}
  {@const v = nameOf(game.acts.wolfVictim)}
  <div class="actionpanel"><h3>🐺🔥 El Gran Lobo Feroz</h3>
    <p class="hint">Ningún lobo ha muerto aún: mientras la manada siga intacta, cada noche puedes devorar tú solo a una <b>segunda</b> víctima.{#if v} La manada ya se lleva a <b>{v}</b>.{/if}</p>
    <ActionGrid {players} selKey={key} canPick={(p) => p.id !== game.acts.wolfVictim}
      whyNot={(p) => (p.id === game.acts.wolfVictim ? 'ya es la presa de la manada' : null)} />
    {#if sel1Name}{@render plan(`🩸 Esta noche caen dos: ${v ? `${v} y ${sel1Name}` : sel1Name}. La Bruja solo se entera de la presa de la manada.`)}{/if}
    <button class="danger block" data-a="act-feroz" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actFeroz(sel1(key))) : needSel())}>🩸 {sel1Name ? `Devorar también a ${sel1Name}` : 'Devorar también'}</button>
    {#if !sel1Name}<p class="small-note">Toca antes a la segunda presa para activar el botón.</p>{/if}
    <button class="ghost block" data-a="act-feroz-skip" onclick={() => guard(() => A.actFeroz(null))}>Contener el hambre (solo muere la presa de la manada)</button>
    {@render ref('lobo_feroz', 'Cómo funciona el Lobo Feroz')}
  </div>
{:else if stepId === 'lobo_albino'}
  <div class="actionpanel"><h3>🌕 El Hombre Lobo Albino</h3>
    <p class="hint">Una noche de cada dos puedes traicionar: devora a un miembro de <b>tu propia manada</b>. Ganas en solitario si acabas siendo el único superviviente.</p>
    <ActionGrid {players} selKey={key} canPick={(p) => isWolfSide(p) && p.id !== my.id}
      whyNot={(p) => (p.id === my.id ? 'no puedes devorarte a ti' : 'no es de la manada')} />
    {#if sel1Name}{@render plan(`🩸 Traicionas a ${sel1Name}: amanecerá muerto y la manada no sabrá quién fue.`)}{/if}
    <button class="danger block" data-a="act-albino" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actAlbino(sel1(key))) : needSel())}>🩸 {sel1Name ? `Traicionar a ${sel1Name}` : 'Traicionar'}</button>
    {#if !sel1Name}<p class="small-note">Toca antes a un lobo de tu manada para activar el botón.</p>{/if}
    <button class="ghost block" data-a="act-albino-skip" onclick={() => guard(() => A.actAlbino(null))}>Ser leal (por ahora)</button>
    {@render ref('lobo_albino', 'Cómo funciona el Albino')}
  </div>
{:else if stepId === 'bruja'}
  {@const victim = players.find((p) => p.id === game.acts.wolfVictim)}
  {@const canHeal = my.powers?.heal !== false && !game.powersLost}
  {@const canPoison = my.powers?.poison !== false && !game.powersLost}
  {#if !canHeal && !canPoison}
    <div class="actionpanel"><h3>🧪 La Bruja</h3>
      <p class="hint">{game.powersLost ? ANCIANO : 'Tus dos pociones ya están gastadas. Que nadie lo sepa: remueve el caldero vacío, disimula… y termina tu turno.'}</p>
      <button class="primary block" data-a="act-bruja-done" onclick={brujaDone}>🧪 Terminar mi turno</button>
    </div>
  {:else}
    <div class="actionpanel"><h3>🧪 La Bruja</h3>
      <!-- Qué queda en el caldero, siempre a la vista: son dos usos ÚNICOS. -->
      <p class="hint">Tu caldero: <b>💚 vida</b> — {canHeal ? 'disponible, salva a la víctima de esta noche' : '🚫 gastada'} · <b>☠️ muerte</b> — {canPoison ? 'disponible, mata a quien elijas' : '🚫 gastada'}. Cada poción se usa <b>una sola vez en toda la partida</b>.</p>
      <p class="hint">{#if canHeal}{#if victim}🐺 Los lobos han atacado a <b>{victim.name}</b>.{:else}🌫️ Esta noche los lobos no han elegido víctima: no hay nadie a quien curar.{/if}{:else}Tu poción de vida ya está gastada; la noche solo te ofrece el veneno.{/if}</p>
      {#if victim && canHeal}
        <div class="settingrow"><div class="sinfo"><div class="sname">💚 Usar poción de vida con {victim.name}</div>
          <div class="sdesc">Amanecerá vivo y nadie sabrá por qué. Gastas la poción para siempre.</div></div>
          <div class="switch {app.ui.brujaHeal ? 'on' : ''}" data-a="act-bruja-heal-toggle"
            onclick={() => (app.ui.brujaHeal = !app.ui.brujaHeal)}
            role="button" tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') app.ui.brujaHeal = !app.ui.brujaHeal; }}></div></div>
      {/if}
      {#if canPoison}
        <p class="hint" style="margin-top:8px">☠️ <b>Poción de muerte</b> (opcional): toca a quién envenenar y morirá al amanecer. Ni el Defensor ni el Anciano lo evitan. Puedes envenenarte a ti misma.</p>
        <!-- Sin exclusiones: la bruja puede envenenarse a sí misma (también la
             noche en que los lobos la han elegido a ella). -->
        <ActionGrid {players} selKey={key} />
      {/if}
      {@render plan(`Al terminar tu turno: ${[
        canHeal ? (app.ui.brujaHeal && victim ? `💚 salvas a ${victim.name} (gastas la poción)` : '💚 no usas la poción de vida') : null,
        canPoison ? (sel1Name ? `☠️ envenenas a ${sel1Name} (gastas la poción)` : '☠️ no usas el veneno') : null,
      ].filter(Boolean).join(' · ')}.`)}
      <button class="primary block" data-a="act-bruja-done" onclick={brujaDone}>{sel1Name ? `☠️ Envenenar a ${sel1Name} y terminar` : '🧪 Terminar mi turno'}</button>
      {@render ref('bruja', 'Cómo funciona la Bruja')}
    </div>
  {/if}
{:else if stepId === 'gaitero'}
  {@const targets = players.filter((p) => p.alive && !p.charmed)}
  {@const charmed = players.filter((p) => p.alive && p.charmed)}
  {@const maxSel = Math.min(2, targets.length)}
  {#if maxSel === 0}
    <!-- Todo el pueblo vivo ya está encantado: sin nadie a quien tocar, el
         botón de encantar solo podía quedar roto («Encantar a » sin nombres). -->
    <div class="actionpanel"><h3>🎶 El Gaitero</h3>
      <p class="hint">No queda nadie por encantar: todo el pueblo baila ya a tu son. Disimula un instante y termina tu turno.</p>
      <button class="violet block" data-a="act-gaitero" onclick={() => guard(() => A.actGaitero([]))}>🎶 Terminar mi turno</button>
    </div>
  {:else}
    <div class="actionpanel"><h3>🎶 El Gaitero</h3>
      <p class="hint">Encanta a <b>{maxSel}</b> {maxSel > 1 ? 'jugadores' : 'jugador'} con tu música (puedes encantarte a ti mismo). Ellos NO sabrán quién eres; solo que están encantados.</p>
      <!-- Marcador de victoria: es información que solo él tiene y tendría que
           ir contando de cabeza noche tras noche. -->
      <p class="small-note">🏆 Vas <b>{charmed.length} de {aliveCount}</b> vivos encantados. Ganas en solitario cuando lo estén todos los DEMÁS ({Math.max(0, targets.filter((p) => p.id !== my.id).length)} por encantar).</p>
      <ActionGrid {players} max={maxSel} selKey={key} canPick={(p) => !p.charmed}
        whyNot={(p) => (p.charmed ? '🎶 ya encantado' : null)} />
      {#if sel.length === maxSel}{@render plan(`🎶 Encantas a ${selNames.join(' y ')}. Esta noche la voz los despertará por su palabra clave, sin decirles quién eres.`)}{/if}
      <button class="violet block" data-a="act-gaitero" disabled={sel.length !== maxSel} onclick={gaiteroCharm}>🎶 {sel.length === maxSel ? `Encantar a ${selNames.join(' y ')}` : `Encantar (elige ${maxSel})`}</button>
      {#if sel.length !== maxSel}<p class="small-note">Te {maxSel - sel.length === 1 ? 'falta 1' : `faltan ${maxSel - sel.length}`} por tocar.</p>{/if}
      {@render ref('gaitero', 'Cómo funciona el Gaitero')}
    </div>
  {/if}
{:else if stepId === 'encantados'}
  {@const others = players.filter((p) => p.alive && p.charmed && p.id !== my.id)}
  {@const encConfirmed = !!(game.acts.encantadosSeen || {})[my.id]}
  <div class="actionpanel"><h3>🎶 El Gaitero te ha encantado</h3>
    {#if !encConfirmed}
      <p class="hint">{#if others.length}Abrid los ojos con disimulo y reconoceos. Encantados: <b>{others.map((p) => p.name).join(', ')}</b>. Si todo el pueblo acaba encantado, el Gaitero gana. Cuando os hayáis reconocido, confirmad.{:else}Eres el único encantado por ahora. Si todo el pueblo acaba encantado, el Gaitero gana. Confirma y la noche sigue.{/if}</p>
      <p class="small-note">Estar encantado no cambia tu bando ni tu carta: sigues jugando con los tuyos… salvo que el Gaitero os encante a todos.</p>
      {#if my.kwNext}
        <!-- La palabra nueva se enseña AQUÍ, junto al botón: se reservó al
             sonar la música (kwNext) y el relevo se consuma al confirmar. -->
        <p class="hint">🔑 Te llamé por <b>«{my.keyword}»</b>: queda quemada. Tu <b>NUEVA</b> palabra clave, desde ya:</p>
        <p style="text-align:center;font-size:1.3rem;margin:8px 0"><b>«{my.kwNext}»</b></p>
        <p class="hint">Memorízala antes de confirmar: con ella te llamaré la próxima vez.</p>
      {:else if my.keyword}
        <p class="hint">🔑 Tu palabra clave no cambia: sigue siendo <b>«{my.keyword}»</b>.</p>
      {/if}
      <button class="primary block" data-a="act-encantado-ok" onclick={() => guard(A.confirmEncantado)}>🎶 Entendido</button>
    {:else}
      <p class="hint">✅ Confirmado.{#if my.keyword} Tu palabra clave{my.kwRenewedNight === game.night ? ' (renovada)' : ''}: <b>«{my.keyword}»</b>. La tienes siempre en tu carta (👁 Mostrar mi rol).{/if}</p>
    {/if}
  </div>
{:else if stepId === 'gitana'}
  {#if game.powersLost}
    <div class="actionpanel"><h3>🔯 La Gitana</h3>
      <p class="hint">{ANCIANO}</p>
      <button class="primary block" data-a="act-gitana-skip" onclick={() => guard(() => A.actGitana(null))}>🌙 Terminar mi turno</button>
    </div>
  {:else}
    {@const dead = players.filter((p) => p.alive === false)}
    <div class="actionpanel"><h3>🔯 La Gitana</h3>
      <!-- La lista de preguntas hechas existe en el motor (GITANA_QUESTIONS) y
           la ficha del rol la promete: aquí se ofrece de verdad, con el texto
           libre como alternativa. -->
      <p class="hint">Elige una pregunta de <b>sí o no</b>… o escribe la tuya. Al amanecer, la voz la hará en alto y <b>todos los muertos</b> se pondrán de acuerdo y responderán a la vez, a coro: sí o no. Lo oirá todo el pueblo.</p>
      {#if dead.length}
        <p class="small-note">👻 Pueden responderte {dead.length} muerto{dead.length > 1 ? 's' : ''}: {dead.map((p) => p.name).join(', ')}.</p>
      {:else}
        <p class="small-note">👻 Todavía no ha muerto nadie: sin espíritus no hay respuesta. Quizá te convenga guardar la pregunta.</p>
      {/if}
      {#each GITANA_QUESTIONS as q, i (i)}
        <button class="{gitanaPick === i ? 'primary' : 'ghost'} block" data-a="act-gitana-q" data-p={i} onclick={() => (gitanaPick = i)}>{gitanaPick === i ? '✅' : '🕯️'} {q}</button>
      {/each}
      {#if gitanaPick !== null}
        {@render plan(`🕯️ Al amanecer los muertos responderán, delante de todos: «${GITANA_QUESTIONS[gitanaPick]}»`)}
        <button class="primary block" data-a="act-gitana-ask" onclick={gitanaAsk}>🕯️ Preguntar esto a los espíritus</button>
      {/if}
      <p class="hint" style="margin-top:8px">✍️ O escribe la tuya:</p>
      <input type="text" id="gitana-q" maxlength="140" placeholder="Tu pregunta de sí o no…" autocomplete="off" bind:value={gitanaQ} />
      <button class="primary block" data-a="act-gitana-custom" onclick={gitanaCustom}>🕯️ Preguntar lo que he escrito</button>
      <button class="ghost block" data-a="act-gitana-skip" onclick={() => guard(() => A.actGitana(null))}>No preguntar nada esta noche</button>
      {@render ref('gitana', 'Cómo funciona la Gitana')}
    </div>
  {/if}
{/if}

<style>
  /* Lo que va a pasar, en claro y antes de confirmar (contrato B25 · punto 2). */
  .hlplan {
    margin: 10px 0 8px; padding: 10px 12px; border-radius: var(--r-1);
    border: 1px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    font-size: 0.9rem; line-height: 1.4;
  }
  /* Poderes elegibles: nombre + efecto en una línea, nunca el nombre solo. */
  .hlpowers { display: flex; flex-direction: column; gap: 8px; }
  .hlpower {
    display: block; width: 100%; text-align: left; padding: 11px 12px; min-height: 44px;
    border-radius: var(--r-1); border: 1px solid var(--line-2, var(--border)); background: var(--card2);
  }
  .hlpname { display: block; font-weight: 700; font-size: 0.98rem; color: var(--moon); }
  .hlpeff { display: block; font-size: 0.8rem; color: var(--muted); margin-top: 3px; line-height: 1.35; }
  /* Referencia plegada DENTRO del panel: nadie sale de donde está decidiendo. */
  .hlref { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 8px; }
  .hlref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); min-height: 24px; }
  .centercards .cc.picked { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, var(--card2)); }
</style>
