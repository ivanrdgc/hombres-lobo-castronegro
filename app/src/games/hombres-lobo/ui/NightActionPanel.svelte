<script lang="ts">
  // Panel de acción nocturna del actor del paso en curso: port COMPLETO del
  // switch de nightActionPanel() de la v1 con los handlers act-* de main.js.
  // Nota: los roles vivos SIEMPRE despiertan aunque no puedan usar su poder
  // (pociones gastadas, olfato perdido, castigo del Anciano): su panel de
  // disimulo mantiene el comportamiento externo idéntico.
  import { app, setFlash } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ROLES, isWolfSide, isWolfTeamRole, aliveNeighbors } from '../roles';
  import { GITANA_QUESTIONS } from '../engine';
  import { selIds, sel1 } from '../../../shell/selection';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import PickList from './PickList.svelte';

  const { stepId, group, my, players }: {
    stepId: string;
    group: GroupDoc;
    my: PlayerDoc;
    players: PlayerDoc[];
  } = $props();

  const game = $derived(group.game!);
  const others = $derived(players.filter((p) => p.id !== my.id));
  const key = $derived(`n${game.night}:${stepId}`);
  const sel = $derived(selIds(key));

  const needSel = () => setFlash('Selecciona primero a un jugador de la lista.');

  // Texto de disimulo compartido cuando el pueblo mató al Anciano.
  const ANCIANO = 'La muerte del Anciano os arrebató los poderes. Que nadie lo note: espera un instante, disimula… y termina tu turno.';

  const ACTOR_POWERS: ['vidente' | 'defensor' | 'cuervo', string][] = [
    ['vidente', '🔮 Ver un rol'], ['defensor', '🛡️ Proteger'], ['cuervo', '🐦‍⬛ Señalar (+2 votos)'],
  ];

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
    const targets = players.filter((p) => p.alive && !p.charmed && p.id !== my.id);
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
    <p class="hint">Elige a dos personas (puedes incluirte). Quedarán enamoradas para siempre.</p>
    <PickList {players} max={2} selKey={key} />
    <button class="primary block" data-a="act-cupido" onclick={cupidoShoot}>🏹 Enamorar{sel.length === 2 ? '' : ' (elige 2)'}</button>
  </div>
{:else if stepId === 'enamorados'}
  {@const partner = players.find((p) => p.lover && p.id !== my.id)}
  <div class="actionpanel"><h3>💘 Estás enamorado/a</h3>
    <p class="hint">Tu media naranja es <b>{partner?.name || '…'}</b>. Si muere, tú también. Si sois de bandos distintos, vuestra meta es quedar los dos últimos.</p>
    <button class="primary block" data-a="act-lover-ok" onclick={() => guard(A.confirmLover)}>❤️ Entendido</button>
  </div>
{:else if stepId === 'nino_salvaje'}
  <div class="actionpanel"><h3>🐾 El Niño Salvaje</h3>
    <p class="hint">Elige a tu modelo. Si muere, te convertirás en hombre lobo.</p>
    <PickList players={others} selKey={key} />
    <button class="primary block" data-a="act-nino" onclick={() => (sel1(key) ? guard(() => A.actNinoSalvaje(sel1(key))) : needSel())}>🌟 Elegir modelo</button>
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
  {#if game.powersLost}
    <div class="actionpanel"><h3>🎭 El Actor</h3>
      <p class="hint">{ANCIANO}</p>
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
      <p class="hint">Elige el papel que interpretarás esta noche.</p>
      <div class="btnrow">{#each ACTOR_POWERS as [p, l] (p)}<button class="violet" data-a="act-actor-power" data-p={p} onclick={() => { app.ui.actorPower = p; app.ui.sel = null; }}>{l}</button>{/each}</div>
      <button class="ghost block" data-a="act-actor-skip" onclick={() => guard(() => A.actActor(null, null))}>🚫 No actuar esta noche</button>
    </div>
  {:else}
    <div class="actionpanel"><h3>🎭 El Actor: {ACTOR_POWERS.find(([p]) => p === app.ui.actorPower)?.[1]}</h3>
      <p class="hint">Ahora elige tu objetivo.</p>
      <PickList players={app.ui.actorPower === 'defensor' ? players : others} selKey={key} />
      <button class="primary block" data-a="act-actor-confirm" onclick={actorConfirm}>🎭 Actuar</button>
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
      <p class="hint">Elige a quién proteger esta noche (no puedes repetir al de anoche). Puedes protegerte a ti.</p>
      <PickList {players} exclude={my.protectedLast ? [my.protectedLast] : []} selKey={key} />
      <button class="primary block" data-a="act-defensor" onclick={() => (sel1(key) ? guard(() => A.actDefensor(sel1(key))) : needSel())}>🛡️ Proteger</button>
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
      <p class="hint">Elige a quién quieres descubrir esta noche.</p>
      <PickList players={others} selKey={key} />
      <button class="primary block" data-a="act-vidente" onclick={() => (sel1(key) ? guard(() => A.actVidente(sel1(key))) : needSel())}>🔮 Ver su rol</button>
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
      <p class="hint">Señala a un jugador: olfatearás su casa y las dos vecinas. Si no hay lobos, perderás tu olfato.</p>
      <PickList players={others} selKey={key} />
      <button class="primary block" data-a="act-zorro" onclick={zorroSniff}>🦊 Olfatear</button>
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
      <p class="hint">Señala a un sospechoso: mañana cargará con 2 votos extra.</p>
      <PickList players={others} selKey={key} />
      <button class="primary block" data-a="act-cuervo" onclick={() => (sel1(key) ? guard(() => A.actCuervo(sel1(key))) : needSel())}>🐦‍⬛ Señalar</button>
      <button class="ghost block" data-a="act-cuervo-skip" onclick={() => guard(() => A.actCuervo(null))}>No señalar</button>
    </div>
  {/if}
{:else if stepId === 'lobos'}
  {@const pack = players.filter((p) => p.alive && isWolfSide(p))}
  {@const prey = players.filter((p) => p.alive)}
  <!-- La manada puede devorar a cualquiera… incluso a uno de los suyos. -->
  <div class="actionpanel"><h3>🐺 Los Hombres Lobo</h3>
    <p class="hint">Manada: <b>{pack.map((p) => p.name).join(', ')}</b>. Poneos de acuerdo (en silencio, con la mirada…): el primero que elija decide por todos.</p>
    <PickList players={prey} selKey={key} />
    <button class="danger block" data-a="act-lobos" onclick={() => (sel1(key) ? guard(() => A.actLobos(sel1(key))) : needSel())}>🩸 Devorar</button>
    <button class="ghost block" data-a="act-lobos-nadie" onclick={() => guard(() => A.actLobos(null))}>🤷 No nos ponemos de acuerdo (nadie muere)</button>
  </div>
{:else if stepId === 'infecto_decision'}
  {@const v = players.find((p) => p.id === game.acts.wolfVictim)}
  <div class="actionpanel"><h3>🧛 El Infecto Padre de los Lobos</h3>
    <p class="hint">La manada va a devorar a <b>{v?.name || '…'}</b>. Puedes infectarlo en su lugar (una vez por partida): se unirá a los lobos en secreto.</p>
    <div class="btnrow"><button class="violet" data-a="act-infecto" data-p="si" onclick={() => guard(() => A.actInfecto(true))}>🧛 Infectar</button><button class="danger" data-a="act-infecto" data-p="no" onclick={() => guard(() => A.actInfecto(false))}>🩸 Devorar sin más</button></div>
  </div>
{:else if stepId === 'lobo_feroz'}
  {@const prey = players.filter((p) => p.alive && p.id !== game.acts.wolfVictim && p.id !== my.id)}
  <div class="actionpanel"><h3>🐺🔥 El Gran Lobo Feroz</h3>
    <p class="hint">Ningún lobo ha muerto aún: tu hambre exige una segunda víctima.</p>
    <PickList players={prey} selKey={key} />
    <button class="danger block" data-a="act-feroz" onclick={() => (sel1(key) ? guard(() => A.actFeroz(sel1(key))) : needSel())}>🩸 Devorar también</button>
    <button class="ghost block" data-a="act-feroz-skip" onclick={() => guard(() => A.actFeroz(null))}>Contener el hambre</button>
  </div>
{:else if stepId === 'lobo_albino'}
  {@const pack = players.filter((p) => p.alive && isWolfSide(p) && p.id !== my.id)}
  <div class="actionpanel"><h3>🌕 El Hombre Lobo Albino</h3>
    <p class="hint">Esta noche puedes devorar a un miembro de tu propia manada.</p>
    <PickList players={pack} selKey={key} />
    <button class="danger block" data-a="act-albino" onclick={() => (sel1(key) ? guard(() => A.actAlbino(sel1(key))) : needSel())}>🩸 Traicionar</button>
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
        <p class="hint" style="margin-top:8px">☠️ Poción de muerte (opcional): elige a quién envenenar.</p>
        <PickList {players} exclude={[my.id]} selKey={key} />
      {/if}
      <button class="primary block" data-a="act-bruja-done" onclick={brujaDone}>🧪 Terminar mi turno</button>
    </div>
  {/if}
{:else if stepId === 'gaitero'}
  {@const targets = players.filter((p) => p.alive && !p.charmed && p.id !== my.id)}
  {@const maxSel = Math.min(2, targets.length)}
  <div class="actionpanel"><h3>🎶 El Gaitero</h3>
    <p class="hint">Encanta a {maxSel} jugador{maxSel > 1 ? 'es' : ''} con tu música.</p>
    <PickList players={targets} max={maxSel} selKey={key} />
    <button class="violet block" data-a="act-gaitero" onclick={gaiteroCharm}>🎶 Encantar{sel.length === maxSel ? '' : ` (elige ${maxSel})`}</button>
  </div>
{:else if stepId === 'encantados'}
  <div class="actionpanel"><h3>🎶 La música te ha atrapado</h3>
    <p class="hint">Ahora estás <b>encantado</b> por el Gaitero. Encantados hasta ahora: <b>{players.filter((p) => p.charmed).map((p) => p.name).join(', ')}</b>. Confirma y vuelve a cerrar los ojos con disimulo.</p>
    <button class="violet block" data-a="act-encantado-ok" onclick={() => guard(A.confirmEncantado)}>🎶 Entendido</button>
  </div>
{:else if stepId === 'gitana'}
  {#if game.powersLost}
    <div class="actionpanel"><h3>🔯 La Gitana</h3>
      <p class="hint">{ANCIANO}</p>
      <button class="primary block" data-a="act-gitana-skip" onclick={() => guard(() => A.actGitana(null))}>🌙 Terminar mi turno</button>
    </div>
  {:else}
    <div class="actionpanel"><h3>🔯 La Gitana</h3>
      <p class="hint">Escribe tu pregunta (de sí o no) o elige una sugerida: un espíritu (jugador muerto) la responderá al amanecer.</p>
      <input type="text" id="gitana-q" maxlength="140" placeholder="Tu pregunta de sí o no…" autocomplete="off" bind:value={gitanaQ} />
      <button class="primary block" data-a="act-gitana-custom" onclick={gitanaCustom}>🕯️ Preguntar a los espíritus</button>
      <p class="hint" style="margin-top:10px">O una sugerida:</p>
      {#each GITANA_QUESTIONS as q, i (i)}
        <button class="ghost block" data-a="act-gitana" data-p={String(i)} onclick={() => guard(() => A.actGitana(i))}>🕯️ {q}</button>
      {/each}
      <button class="ghost block" data-a="act-gitana-skip" onclick={() => guard(() => A.actGitana(null))}>No preguntar</button>
    </div>
  {/if}
{/if}
