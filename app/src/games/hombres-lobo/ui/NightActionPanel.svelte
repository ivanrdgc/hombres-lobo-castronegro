<script lang="ts">
  // Panel de acción nocturna del actor del paso en curso. La lista de objetivos
  // es ActionGrid (el pueblo entero, elegibles tocables): no hay una segunda
  // parrilla debajo, y el botón de confirmar dice el nombre elegido y queda
  // deshabilitado hasta que haya elección. Dos toques por acción.
  // Nota: los roles vivos SIEMPRE despiertan aunque no puedan usar su poder
  // (pociones gastadas, olfato perdido, castigo del Anciano): su panel de
  // disimulo mantiene el comportamiento externo idéntico.
  import { app, setFlash } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ROLES, isWolfSide, isWolfTeamRole, aliveNeighbors } from '../roles';
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

  const needSel = () => setFlash('Toca primero a un jugador de la lista.');

  // Texto de disimulo compartido cuando el pueblo mató al Anciano.
  const ANCIANO = 'La muerte del Anciano os arrebató los poderes. Que nadie lo note: espera un instante, disimula… y termina tu turno.';

  const ACTOR_POWERS: ['vidente' | 'defensor' | 'cuervo', string][] = [
    ['vidente', '🔮 Ver un rol'], ['defensor', '🛡️ Proteger'], ['cuervo', '🐦‍⬛ Señalar (+2 votos)'],
  ];

  const notMe = (p: PlayerDoc) => p.id !== my.id;

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

  function zorroSniff() {
    const t = sel1(key);
    if (!t) { needSel(); return; }
    const trio = [players.find((p) => p.id === t), ...aliveNeighbors(players, t)]
      .filter((p): p is PlayerDoc => !!p);
    const found = trio.some((p) => isWolfSide(p));
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

  function gitanaCustom() {
    const q = gitanaQ.trim();
    if (!q) { setFlash('Escribe primero tu pregunta.'); return; }
    void guard(() => A.actGitanaCustom(q));
  }
</script>

{#if stepId === 'ladron'}
  {@const cc = game.centerCards || []}
  {@const bothWolves = cc.length === 2 && cc.every((r) => isWolfTeamRole(r))}
  <div class="actionpanel"><h3>🃏 El Ladrón</h3>
    <p class="hint">{bothWolves ? 'Las dos cartas son de lobo: debes quedarte una.' : 'Puedes cambiar tu carta por una del centro o quedarte como estás.'}</p>
    <div class="centercards">
      {#each cc as r, i (i)}
        {#if r}
          <div class="cc" data-a="act-ladron-take" data-p={i}
            onclick={() => guard(() => A.actLadron(i))}
            role="button" tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') guard(() => A.actLadron(i)); }}>
            <div style="font-size:2rem">{ROLES[r].emoji}</div><b>{ROLES[r].name}</b><div class="small-note">{ROLES[r].desc}</div>
          </div>
        {/if}
      {/each}
    </div>
    {#if !bothWolves}<button class="ghost block" data-a="act-ladron-keep" onclick={() => guard(() => A.actLadron(null))}>✋ Me quedo mi carta</button>{/if}
  </div>
{:else if stepId === 'cupido'}
  <div class="actionpanel"><h3>💘 Cupido</h3>
    <p class="hint">Toca a las dos personas que quedarán enamoradas para siempre (puedes incluirte).</p>
    <ActionGrid {players} max={2} selKey={key} />
    <button class="primary block" data-a="act-cupido" disabled={sel.length !== 2} onclick={cupidoShoot}>🏹 {sel.length === 2 ? `Enamorar a ${selNames.join(' y ')}` : 'Enamorar (elige a 2)'}</button>
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
      {/if}
      <button class="primary block" data-a="act-lover-ok" onclick={() => guard(A.confirmLover)}>❤️ Entendido</button>
    {:else}
      <p class="hint">✅ Confirmado.{#if my.keyword} Tu palabra clave{my.kwRenewedNight === game.night ? ' (renovada)' : ''}: <b>«{my.keyword}»</b>. La tienes siempre en tu carta (👁 Mostrar mi rol).{/if}</p>
    {/if}
  </div>
{:else if stepId === 'nino_salvaje'}
  <div class="actionpanel"><h3>🐾 El Niño Salvaje</h3>
    <p class="hint">Toca a tu modelo a seguir. Si muere, te convertirás en hombre lobo.</p>
    <ActionGrid {players} selKey={key} canPick={notMe} />
    <button class="primary block" data-a="act-nino" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actNinoSalvaje(sel1(key))) : needSel())}>🌟 {sel1Name ? `Mi modelo: ${sel1Name}` : 'Elegir modelo'}</button>
  </div>
{:else if stepId === 'perro_lobo'}
  <div class="actionpanel"><h3>🐕 El Perro Lobo</h3>
    <p class="hint">Elige tu destino para toda la partida.</p>
    <div class="btnrow"><button class="primary" data-a="act-perro" data-p="aldeano" onclick={() => guard(() => A.actPerroLobo(false))}>🏡 Ser aldeano</button><button class="violet" data-a="act-perro" data-p="lobo" onclick={() => guard(() => A.actPerroLobo(true))}>🐺 Unirme a los lobos</button></div>
  </div>
{:else if stepId === 'dos_hermanas'}
  <div class="actionpanel"><h3>👭 Las Dos Hermanas</h3>
    <p class="hint">Abrid los ojos con disimulo y reconoceos la una a la otra. Cuando lo hayáis hecho, confirmad aquí.</p>
    <button class="primary block" data-a="act-hermana-ok" onclick={() => guard(A.confirmHermana)}>🤝 Nos hemos reconocido</button>
  </div>
{:else if stepId === 'tres_hermanos'}
  <div class="actionpanel"><h3>👨‍👨‍👦 Los Tres Hermanos</h3>
    <p class="hint">Abrid los ojos con disimulo y reconoceos entre vosotros. Cuando lo hayáis hecho, confirmad aquí.</p>
    <button class="primary block" data-a="act-hermano-ok" onclick={() => guard(A.confirmHermano)}>🤝 Nos hemos reconocido</button>
  </div>
{:else if stepId === 'lobos_reconocen'}
  {@const packmates = players.filter((p) => p.alive && isWolfSide(p) && p.id !== my.id)}
  <div class="actionpanel"><h3>🐺 La manada se reconoce</h3>
    <p class="hint">El pueblo duerme con los ojos cerrados. {#if packmates.length}Tu manada: <b>{packmates.map((p) => p.name).join(', ')}</b>. Abrid los ojos en silencio, reconoceos… y confirmad aquí.{:else}Estás <b>solo</b> en la manada: nadie más abrirá los ojos. Confirma y la partida sigue.{/if}</p>
    <button class="danger block" data-a="act-lobos-reconocido" onclick={() => guard(A.confirmLoboReconocido)}>🐺 Nos hemos reconocido</button>
  </div>
{:else if stepId === 'actor'}
  {@const actorLeft = ACTOR_POWERS.filter(([p]) => !(my.actorUsed || []).includes(p))}
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
    <div class="actionpanel"><h3>🎭 El Actor</h3>
      <p class="hint">Elige el papel que interpretarás esta noche. Cada carta se descarta tras usarse{(my.actorUsed || []).length ? ` (te quedan ${actorLeft.length})` : ''}.</p>
      <div class="btnrow">{#each actorLeft as [p, l] (p)}<button class="violet" data-a="act-actor-power" data-p={p} onclick={() => { app.ui.actorPower = p; app.ui.sel = null; }}>{l}</button>{/each}</div>
      <button class="ghost block" data-a="act-actor-skip" onclick={() => guard(() => A.actActor(null, null))}>🚫 No actuar esta noche</button>
    </div>
  {:else}
    <div class="actionpanel"><h3>🎭 El Actor: {ACTOR_POWERS.find(([p]) => p === app.ui.actorPower)?.[1]}</h3>
      <p class="hint">Ahora toca a tu objetivo.</p>
      <!-- Como los roles que imita: nada prohíbe actuar sobre uno mismo, y
           como defensor no puede repetir al protegido de anoche. -->
      <ActionGrid {players} selKey={key} canPick={app.ui.actorPower === 'defensor' ? (p) => p.id !== my.protectedLast : () => true} />
      <button class="primary block" data-a="act-actor-confirm" disabled={!sel1Name} onclick={actorConfirm}>🎭 {sel1Name ? `Actuar sobre ${sel1Name}` : 'Actuar'}</button>
      <button class="ghost block" data-a="act-actor-power" data-p="" onclick={() => { app.ui.actorPower = null; app.ui.sel = null; }}>↩️ Cambiar papel</button>
    </div>
  {/if}
{:else if stepId === 'defensor'}
  {#if game.powersLost}
    <div class="actionpanel"><h3>🛡️ El Defensor</h3>
      <p class="hint">{ANCIANO}</p>
      <button class="primary block" data-a="act-defensor-skip" onclick={() => guard(() => A.actDefensor(null))}>🌙 Terminar mi turno</button>
    </div>
  {:else}
    <div class="actionpanel"><h3>🛡️ El Defensor</h3>
      <p class="hint">Toca a quién proteger esta noche (no puedes repetir al de anoche; puedes protegerte a ti).</p>
      <ActionGrid {players} selKey={key} canPick={(p) => p.id !== my.protectedLast} />
      <button class="primary block" data-a="act-defensor" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actDefensor(sel1(key))) : needSel())}>🛡️ {sel1Name ? `Proteger a ${sel1Name}` : 'Proteger'}</button>
      <button class="ghost block" data-a="act-defensor-skip" onclick={() => guard(() => A.actDefensor(null))}>No proteger a nadie</button>
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
    </div>
  {:else if game.powersLost}
    <div class="actionpanel"><h3>🔮 La Vidente</h3>
      <p class="hint">{ANCIANO}</p>
      <button class="primary block" data-a="act-vidente-skip" onclick={() => guard(() => A.actVidente(null))}>🌙 Terminar mi turno</button>
    </div>
  {:else}
    <div class="actionpanel"><h3>🔮 La Vidente</h3>
      <p class="hint">Toca a quien quieras descubrir esta noche.</p>
      <ActionGrid {players} selKey={key} />
      <button class="primary block" data-a="act-vidente" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actVidente(sel1(key))) : needSel())}>🔮 {sel1Name ? `Ver el rol de ${sel1Name}` : 'Ver un rol'}</button>
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
      <p class="hint">Toca a un jugador (puedes tocarte a ti): olfatearás esa casa y las dos vecinas. Si no hay lobos, perderás tu olfato.</p>
      <ActionGrid {players} selKey={key} />
      <button class="primary block" data-a="act-zorro" disabled={!sel1Name} onclick={zorroSniff}>🦊 {sel1Name ? `Olfatear la casa de ${sel1Name}` : 'Olfatear'}</button>
      <button class="ghost block" data-a="act-zorro-skip" onclick={() => guard(() => A.actZorro(null, false))}>No olfatear</button>
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
      <p class="hint">Toca a un sospechoso (puedes señalarte a ti): mañana cargará con 2 votos extra.</p>
      <ActionGrid {players} selKey={key} />
      <button class="primary block" data-a="act-cuervo" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actCuervo(sel1(key))) : needSel())}>🐦‍⬛ {sel1Name ? `Señalar a ${sel1Name}` : 'Señalar'}</button>
      <button class="ghost block" data-a="act-cuervo-skip" onclick={() => guard(() => A.actCuervo(null))}>No señalar</button>
    </div>
  {/if}
{:else if stepId === 'lobos'}
  {@const pack = players.filter((p) => p.alive && isWolfSide(p))}
  <!-- La manada puede devorar a cualquiera… incluso a uno de los suyos. -->
  <div class="actionpanel"><h3>🐺 Los Hombres Lobo</h3>
    {#if my.infected}<p class="hint">🧛 El mordisco del Padre de los Lobos te unió a la manada: conservas tu carta, pero cazas y ganas con los lobos.</p>{/if}
    {#if my.transformed}<p class="hint">🐾 Tu modelo murió y la bestia despertó en ti: desde ahora cazas y ganas con la manada.</p>{/if}
    <p class="hint">Manada: <b>{pack.map((p) => p.name).join(', ')}</b>. Poneos de acuerdo (en silencio, con la mirada…): el primero que elija decide por todos.</p>
    <ActionGrid {players} selKey={key} />
    <button class="danger block" data-a="act-lobos" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actLobos(sel1(key))) : needSel())}>🩸 {sel1Name ? `Devorar a ${sel1Name}` : 'Devorar'}</button>
    <button class="ghost block" data-a="act-lobos-nadie" onclick={() => guard(() => A.actLobos(null))}>🤷 No nos ponemos de acuerdo (nadie muere)</button>
  </div>
{:else if stepId === 'infecto_decision'}
  {@const v = players.find((p) => p.id === game.acts.wolfVictim)}
  <div class="actionpanel"><h3>🧛 El Infecto Padre de los Lobos</h3>
    <p class="hint">La manada va a devorar a <b>{v?.name || '…'}</b>. Puedes infectarlo en su lugar (una vez por partida): se unirá a los lobos en secreto. Si lo haces, esta misma noche lo despertaré por su palabra clave para contárselo; las noches sin infección llamo palabras señuelo, así nadie sabrá si usaste tu poder.</p>
    <div class="btnrow"><button class="violet" data-a="act-infecto" data-p="si" onclick={() => guard(() => A.actInfecto(true))}>🧛 Infectar</button><button class="danger" data-a="act-infecto" data-p="no" onclick={() => guard(() => A.actInfecto(false))}>🩸 Devorar sin más</button></div>
  </div>
{:else if stepId === 'infectado'}
  {@const infConfirmed = !!(game.acts.infectadoSeen || {})[my.id]}
  <div class="actionpanel"><h3>🧛 El Infecto Padre de los Lobos te ha mordido</h3>
    {#if !infConfirmed}
      <p class="hint">NO has muerto: su mordisco te convierte en <b>hombre lobo en secreto</b>. Conservas tu carta y tus poderes, pero desde ahora cazas y ganas con la manada. La próxima noche, cuando la voz despierte a los hombres lobo, abre los ojos con ellos: os reconoceréis en silencio.</p>
      {#if my.kwNext}
        <!-- La llamada quemó su palabra: la NUEVA se enseña junto al botón. -->
        <p class="hint">🔑 Te llamé por <b>«{my.keyword}»</b>: queda quemada. Tu <b>NUEVA</b> palabra clave, desde ya:</p>
        <p style="text-align:center;font-size:1.3rem;margin:8px 0"><b>«{my.kwNext}»</b></p>
        <p class="hint">Memorízala antes de confirmar: con ella te llamaré la próxima vez.</p>
      {/if}
      <button class="violet block" data-a="act-infectado-ok" onclick={() => guard(A.confirmInfectado)}>🧛 Entendido</button>
    {:else}
      <p class="hint">✅ Confirmado. Desde la próxima noche despiertas y cazas con la manada.{#if my.keyword} Tu palabra clave{my.kwRenewedNight === game.night ? ' (renovada)' : ''}: <b>«{my.keyword}»</b>. La tienes siempre en tu carta (👁 Mostrar mi rol).{/if}</p>
    {/if}
  </div>
{:else if stepId === 'lobo_feroz'}
  <div class="actionpanel"><h3>🐺🔥 El Gran Lobo Feroz</h3>
    <p class="hint">Ningún lobo ha muerto aún: tu hambre exige una segunda víctima.</p>
    <ActionGrid {players} selKey={key} canPick={(p) => p.id !== game.acts.wolfVictim} />
    <button class="danger block" data-a="act-feroz" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actFeroz(sel1(key))) : needSel())}>🩸 {sel1Name ? `Devorar también a ${sel1Name}` : 'Devorar también'}</button>
    <button class="ghost block" data-a="act-feroz-skip" onclick={() => guard(() => A.actFeroz(null))}>Contener el hambre</button>
  </div>
{:else if stepId === 'lobo_albino'}
  <div class="actionpanel"><h3>🌕 El Hombre Lobo Albino</h3>
    <p class="hint">Esta noche puedes devorar a un miembro de tu propia manada.</p>
    <ActionGrid {players} selKey={key} canPick={(p) => isWolfSide(p) && p.id !== my.id} />
    <button class="danger block" data-a="act-albino" disabled={!sel1Name} onclick={() => (sel1(key) ? guard(() => A.actAlbino(sel1(key))) : needSel())}>🩸 {sel1Name ? `Traicionar a ${sel1Name}` : 'Traicionar'}</button>
    <button class="ghost block" data-a="act-albino-skip" onclick={() => guard(() => A.actAlbino(null))}>Ser leal (por ahora)</button>
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
      <p class="hint">{#if canHeal}{#if victim}Los lobos han atacado a <b>{victim.name}</b>.{:else}Esta noche los lobos no han elegido víctima.{/if}{:else}Tu poción de vida ya está gastada; la noche solo te ofrece el veneno.{/if}</p>
      {#if victim && canHeal}
        <div class="settingrow"><div class="sinfo"><div class="sname">💚 Usar poción de vida con {victim.name}</div></div>
          <div class="switch {app.ui.brujaHeal ? 'on' : ''}" data-a="act-bruja-heal-toggle"
            onclick={() => (app.ui.brujaHeal = !app.ui.brujaHeal)}
            role="button" tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') app.ui.brujaHeal = !app.ui.brujaHeal; }}></div></div>
      {/if}
      {#if canPoison}
        <p class="hint" style="margin-top:8px">☠️ Poción de muerte (opcional): toca a quién envenenar. Puedes envenenarte a ti misma.</p>
        <!-- Sin exclusiones: la bruja puede envenenarse a sí misma (también la
             noche en que los lobos la han elegido a ella). -->
        <ActionGrid {players} selKey={key} />
      {/if}
      <button class="primary block" data-a="act-bruja-done" onclick={brujaDone}>{sel1Name ? `☠️ Envenenar a ${sel1Name} y terminar` : '🧪 Terminar mi turno'}</button>
    </div>
  {/if}
{:else if stepId === 'gaitero'}
  {@const targets = players.filter((p) => p.alive && !p.charmed)}
  {@const maxSel = Math.min(2, targets.length)}
  <div class="actionpanel"><h3>🎶 El Gaitero</h3>
    <p class="hint">Encanta a {maxSel} jugador{maxSel > 1 ? 'es' : ''} con tu música (puedes encantarte a ti mismo).</p>
    <ActionGrid {players} max={maxSel} selKey={key} canPick={(p) => !p.charmed} />
    <button class="violet block" data-a="act-gaitero" disabled={sel.length !== maxSel} onclick={gaiteroCharm}>🎶 {sel.length === maxSel ? `Encantar a ${selNames.join(' y ')}` : `Encantar (elige ${maxSel})`}</button>
  </div>
{:else if stepId === 'encantados'}
  {@const others = players.filter((p) => p.alive && p.charmed && p.id !== my.id)}
  {@const encConfirmed = !!(game.acts.encantadosSeen || {})[my.id]}
  <div class="actionpanel"><h3>🎶 El Gaitero te ha encantado</h3>
    {#if !encConfirmed}
      <p class="hint">{#if others.length}Abrid los ojos con disimulo y reconoceos. Encantados: <b>{others.map((p) => p.name).join(', ')}</b>. Si todo el pueblo acaba encantado, el Gaitero gana. Cuando os hayáis reconocido, confirmad.{:else}Eres el único encantado por ahora. Si todo el pueblo acaba encantado, el Gaitero gana. Confirma y la noche sigue.{/if}</p>
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
    <div class="actionpanel"><h3>🔯 La Gitana</h3>
      <p class="hint">Escribe tu pregunta (de sí o no): un espíritu (jugador muerto) la responderá al amanecer.</p>
      <input type="text" id="gitana-q" maxlength="140" placeholder="Tu pregunta de sí o no…" autocomplete="off" bind:value={gitanaQ} />
      <button class="primary block" data-a="act-gitana-custom" onclick={gitanaCustom}>🕯️ Preguntar a los espíritus</button>
      <button class="ghost block" data-a="act-gitana-skip" onclick={() => guard(() => A.actGitana(null))}>No preguntar</button>
    </div>
  {/if}
{/if}
