// Conductor: se ejecuta SOLO en el dispositivo del máster durante el modo automático.
// Narra la partida con voz sintetizada y avanza los pasos que no requieren acción
// (roles muertos, pausas dramáticas, amanecer, transiciones de fase).
import { state, isMaster } from './store.js';
import { stepActors, stepNeedsGhostAnnounce, NIGHT_STEPS, WINNER_LABELS } from './engine.js';
import { ROLES } from './roles.js';
import { NARRATION, OUTROS, narr, deathLine, improv, speak, stopSpeech, initVoice, getVoiceConfig, isNarratorSpeaking } from './narration.js';
import { ensureAmbience, stopAmbience } from './ambience.js';
import {
  startFirstNight, advanceGhostStep, runDawn, startNextNight, resolveSirvienta, startRoleRefresh, finishRoleRefreshClose,
} from './actions.js';

let spoken = new Set();
let timer = null;
let timerKey = null;
let wakeLock = null;
let muted = false;
let nagCounts = {};
let fillerPlan = {};
let repeatSeen = null; // nonce de «repetir última locución»
let lastSpokenText = ''; // última narración principal pronunciada

// Frases de insistencia: si nadie actúa en ~30 s, la voz anima a seguir.
// Admiten varias variantes para que cada aviso suene distinto.
const NAGS = {
  refresh: ['Aún faltan vecinos por revisar su carta… miradla en secreto y confirmad en el dispositivo.'],
  ladron: ['Ladrón, las dos cartas del centro siguen esperándote…'],
  cupido: ['¡Cupido, abre los ojos! Tus flechas de amor esperan un destino.',
    'Cupido, el amor no puede esperar toda la noche… tensa ese arco.'],
  enamorados: ['Enamorados, abrid los ojos con disimulo, mirad vuestra pantalla y confirmad… el amor no puede esperar toda la noche.'],
  nino_salvaje: ['Niño Salvaje, elige ya a tu modelo… la noche avanza.'],
  perro_lobo: ['Perro Lobo, ¿pueblo o manada? Tu corazón debe decidir.'],
  dos_hermanas: ['Hermanas, reconoceos y confirmadlo en vuestra pantalla.'],
  tres_hermanos: ['Hermanos, reconoceos y confirmadlo en vuestra pantalla.'],
  actor: ['Actor, el escenario espera tu interpretación…', 'Actor, el público se impacienta… elige tu papel.'],
  defensor: ['Defensor, el pueblo necesita tu escudo esta noche…', 'Defensor, las puertas crujen… ¿cuál protegerás?'],
  vidente: ['Vidente, tu bola de cristal se enfría… elige a quién descubrir.',
    'Vidente, la niebla se disipa en tu bola de cristal… aprovecha antes de que vuelva.'],
  zorro: ['Zorro, ¿olfatearás esta noche o descansarás?'],
  cuervo: ['Cuervo, ¿sobre qué tejado dejarás caer tu sospecha?'],
  lobos_reconocen: ['Lobos, abrid los ojos, reconoceos… y confirmadlo en vuestro dispositivo.',
    'La manada aún no se ha reconocido del todo… lobos, miraos y confirmad.'],
  lobos: ['Los hombres lobo se lo están pensando… la manada debe elegir a su víctima.',
    'Se oye a la manada deliberar… hombres lobo, el hambre no espera: elegid.',
    'Los lobos afilan sus garras, indecisos… ¿quién caerá esta noche?'],
  lobo_feroz: ['Gran Lobo Feroz, tu hambre espera una segunda víctima… ¿o la contendrás?'],
  lobo_albino: ['Hombre Lobo Albino, ¿traicionarás a la manada esta noche?'],
  bruja: ['Bruja, el caldero humea… decide qué pociones usar y termina tu turno.',
    'Bruja, tus frascos aguardan… vida, muerte o nada: pero decide.'],
  gaitero: ['Gaitero, tu melodía aguarda… elige a quién encantar.'],
  gitana: ['Gitana, los espíritus se impacientan… haz tu pregunta o déjalos descansar.'],
};

const NAG_GENERIC = [
  'Seguimos esperando… el pueblo se impacienta y la luna sigue su camino.',
  'El narrador carraspea… alguien no ha hecho todavía su parte.',
  'La noche no puede durar para siempre… quien deba actuar, que abra los ojos y mire su pantalla.',
];

function nagText(nagId, n) {
  // Los enamorados se llaman por palabras clave: se repiten en cada aviso
  // para que nadie se quede fuera por despiste.
  if (nagId === 'enamorados') {
    const g = state.group && state.group.game;
    const lovers = state.players.filter((p) => p.inGame && p.lover && p.keyword);
    if (g && g.keywordsActive && lovers.length >= 2) {
      const kws = lovers.map((p) => p.keyword).join('… y ');
      return n % 2 === 0
        ? `Enamorados, el amor os espera… Repito las palabras clave: … ${kws}. Si has oído la tuya, abre los ojos con disimulo, mira tu pantalla y confirma.`
        : `Aún falta algún corazón por despertar… Atentos a las palabras: … ${kws}. Quien oiga la suya, que abra los ojos sin hacer ruido y confirme.`;
    }
  }
  if (nagId === 'encantados') {
    const g = state.group && state.group.game;
    const targets = (g && g.acts && g.acts.gaiteroTargets) || [];
    const ps = state.players.filter((p) => targets.includes(p.id) && p.keyword);
    if (g && g.keywordsActive && ps.length) {
      const kws = ps.map((p) => p.keyword).join('… y ');
      return `La melodía del Gaitero sigue sonando… Repito las palabras clave: … ${kws}. Quien oiga la suya, que abra los ojos con disimulo, mire su pantalla y confirme.`;
    }
  }
  const pool = NAGS[nagId] || [];
  if (n % 2 === 0 && pool.length) return pool[Math.floor(n / 2) % pool.length];
  return NAG_GENERIC[n % NAG_GENERIC.length];
}

// Programa un recordatorio recurrente mientras el estado no cambie.
// Tras 4 avisos sin respuesta (~2 minutos), asumimos que alguien olvidó su rol:
// se pausa la noche y todo el pueblo repasa su carta y su palabra clave.
function scheduleNag(baseKey, nagId, delay = 30000) {
  const n = nagCounts[baseKey] || 0;
  schedule(`${baseKey}:nag${n}`, delay, async () => {
    nagCounts[baseKey] = n + 1;
    const g = state.group && state.group.game;
    if (n + 1 >= 4 && nagId !== 'refresh' && g && g.phase === 'night' && !g.roleRefresh) {
      await startRoleRefresh();
      return;
    }
    speak(nagText(nagId, n), { muted, priority: 'low' });
    scheduleNag(baseKey, nagId, delay);
  });
}

// Despedida del paso («…vuelve a cerrar los ojos») + pausa para dejar el móvil.
// Se dice SIEMPRE, haya actuado alguien o no: es parte del disimulo.
function outroFor(stepId, game) {
  if (stepId === 'lobos' && game.steps[game.stepIdx + 1] === 'infecto_decision') return null;
  return OUTROS[stepId] || null;
}

function chainOutro(key, outroTxt, waitMs, stepIdx) {
  const adv = () => advanceGhostStep(stepIdx);
  if (!outroTxt) { scheduleAfterSpeech(key + ':adv', 900, adv); return; }
  const oKey = key + ':outro';
  if (spoken.has(oKey)) { scheduleAfterSpeech(key + ':adv', 3200 + Math.random() * 800, adv); return; }
  scheduleAfterSpeech(oKey + ':t', waitMs, async () => {
    say(oKey, outroTxt);
    // El «cerrad los ojos» debe SONAR entero antes de la espera de bloqueo.
    scheduleAfterSpeech(key + ':adv', 3200 + Math.random() * 800, adv);
  });
}

export function setMuted(m) { muted = m; if (m) stopSpeech(); }
export function isMuted() { return muted; }

export function initConductor() {
  initVoice();
}

function say(key, text, onend) {
  if (spoken.has(key)) { if (onend) onend(); return; }
  spoken.add(key);
  if (text) lastSpokenText = text;
  speak(text, { muted, onend });
}

function schedule(key, ms, fn) {
  if (timerKey === key) return;
  clearTimeout(timer);
  timerKey = key;
  timer = setTimeout(() => {
    timerKey = null;
    fn().catch((e) => console.warn('conductor', e));
  }, ms);
}

function cancelTimer() {
  clearTimeout(timer);
  timerKey = null;
}

// Programa fn para DESPUÉS de que la voz termine (más extraMs de margen).
// La UI y el estado trabajan así al ritmo del audio: por muy rápido que la
// gente pulse, el siguiente paso no se anuncia hasta que el narrador calla.
// Tope de seguridad de 20 s por si el motor de voz se quedara colgado.
function scheduleAfterSpeech(key, extraMs, fn, waited = 0) {
  if (isNarratorSpeaking() && waited < 20000) {
    schedule(key + ':w', 400, async () => scheduleAfterSpeech(key, extraMs, fn, waited + 400));
    return;
  }
  schedule(key, extraMs, fn);
}

async function requestWakeLock() {
  try {
    if (!wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* sin wake lock, avisamos en la UI */ }
}

// Llamado en cada cambio de estado. Decide qué narrar y qué avanzar.
export function conductorTick() {
  const g = state.group;
  const game = g && g.game;
  if (!g || !game || game.mode !== 'auto' || !isMaster()) {
    cancelTimer();
    stopAmbience();
    return;
  }
  // Paisaje sonoro de fondo en el dispositivo narrador.
  const wantAmbience = getVoiceConfig().ambience && !muted && !game.paused && game.phase !== 'end';
  ensureAmbience(!wantAmbience ? null : (game.phase === 'day' ? 'day' : 'night'));
  requestWakeLock();
  // Repetición bajo demanda: se olvida lo dicho en el contexto actual y el
  // flujo normal vuelve a pronunciarlo (paso, amanecer, debate…).
  const rn = game.repeatNonce || 0;
  if (repeatSeen === null) repeatSeen = rn;
  else if (rn !== repeatSeen) {
    repeatSeen = rn;
    stopSpeech();
    if (lastSpokenText) {
      // Pausa breve tras el cancel: Chrome se traga un speak() inmediato.
      const t = lastSpokenText;
      setTimeout(() => speak(t, { muted }), 350);
    } else {
      spoken.clear(); // narrador recién recargado: re-narra el contexto actual
    }
  }
  if (game.paused) { cancelTimer(); stopSpeech(); return; } // pausa global
  const players = state.players.filter((p) => p.inGame);

  if (game.phase === 'reveal') {
    const kwNote = game.keywordsActive
      ? ' Junto a vuestro rol encontraréis una palabra clave secreta: memorizadla. Si de noche la voz la pronuncia, abrid los ojos con disimulo y mirad vuestra pantalla: el mensaje irá por vosotros.'
      : '';
    const aa = players.find((p) => p.role === 'aldeano_aldeano');
    const aaNote = aa
      ? ` Y una certeza antes de dormir: la carta de ${aa.name} tiene dos caras, y ambas muestran un aldeano. ${aa.name} es el Aldeano-Aldeano: su inocencia está fuera de toda duda.`
      : '';
    say('reveal', narr('bienvenida', String(game.seed)) + kwNote + aaNote);
    // Aunque todos hayan confirmado, la primera noche también espera al botón:
    // la gente sigue mirando su carta y comentando con los ojos abiertos.
    cancelTimer();
    return;
  }

  if (game.phase === 'night') {
    const stepId = game.steps[game.stepIdx];
    const key = `n${game.night}:s${game.stepIdx}:${stepId}:r${game.refreshNonce || 0}`;
    if (!stepId) return;

    // Repaso de roles: la noche se pausa y todos los vivos revisan su carta.
    if (game.roleRefresh && game.roleRefresh.closing) {
      const ck = `refresh:close:${game.roleRefresh.at}`;
      say(ck, 'Gracias, Castronegro. Volved a cerrar todos los ojos… la noche continúa justo donde estaba.');
      scheduleAfterSpeech(ck, 5000 + Math.random() * 2000, finishRoleRefreshClose);
      return;
    }
    if (game.roleRefresh) {
      const rk = `refresh:${game.roleRefresh.startedAt}`;
      say(rk, 'Un momento… parece que alguien ha olvidado quién es. Todo Castronegro, abrid los ojos: revisad en secreto vuestro rol y vuestra palabra clave en el dispositivo, y confirmad. La noche continuará justo donde estaba.');
      scheduleNag(rk, 'refresh', 35000);
      return;
    }

    if (game.stepIdx === 0) {
      const flavor = Math.random() < 0.55 ? ' ' + improv('noche') : '';
      say(`n${game.night}:cae`, narr('noche_cae', `${game.seed}:n${game.night}`) + flavor);
    }

    if (stepId === 'amanecer') {
      say(key, '', null);
      scheduleAfterSpeech(key, 1500, runDawn);
      return;
    }
    // Colchón inicial: la misma pantalla de sueño para todos mientras suena
    // «cae la noche»; el primer rol no despierta hasta que todos duermen.
    if (stepId === 'durmiendo') {
      scheduleAfterSpeech(key, 6000 + Math.random() * 3000, () => advanceGhostStep(game.stepIdx));
      return;
    }
    // Encantados: se les llama por palabras clave y el juego ESPERA a que cada
    // uno confirme haberse reconocido (como los enamorados).
    if (stepId === 'encantados') {
      const targets = (game.acts.gaiteroTargets || []).map((id) => players.find((p) => p.id === id)).filter(Boolean);
      const encIntro = narr('encantados', `${game.seed}:${key}`);
      const actors = stepActors(stepId, game, players);
      if (targets.length && actors && actors.length) {
        const kws = targets.map((p) => p.keyword).filter(Boolean);
        say(key, `${encIntro} Todos con los ojos cerrados. Si oyes tu palabra clave, la música te ha atrapado: abre los ojos con disimulo, mira tu pantalla y confirma. Las palabras son: … ${kws.join('… y ')}.`);
        scheduleNag(key, 'encantados');
        return;
      }
      if (targets.length) { // todos confirmados: despedida y sigue la noche
        chainOutro(key, OUTROS.encantados, 900, game.stepIdx);
        return;
      }
      if (game.keywordsActive && !game.revealDead && players.some((p) => p.role === 'gaitero')) {
        // El gaitero ya no actúa: llamada falsa para no delatar su muerte.
        const alive = players.filter((p) => p.alive && p.keyword);
        const fake = alive.slice().sort(() => Math.random() - 0.5).slice(0, 2).map((p) => p.keyword);
        say(key, `${encIntro} Todos con los ojos cerrados. Si oyes tu palabra clave, la música te ha atrapado: abre los ojos con disimulo y mira tu pantalla. Las palabras son: … ${fake.join('… y ')}. Cuando lo hayáis visto, volved a cerrar los ojos.`);
        scheduleAfterSpeech(key, 6000, () => advanceGhostStep(game.stepIdx));
      } else {
        schedule(key, 1200, () => advanceGhostStep(game.stepIdx));
      }
      return;
    }
    const def = NIGHT_STEPS.find((s) => s.id === stepId);
    const actors = stepActors(stepId, game, players);
    if (def && def.silent) {
      if (actors && actors.length) { cancelTimer(); return; } // decisión en curso
      chainOutro(key, outroFor(stepId, game), 700, game.stepIdx);
      return; // paso interno: sin narración de entrada
    }
    let text = narr(stepId, `${game.seed}:n${game.night}:s${game.stepIdx}:${stepId}`);
    if (stepId === 'lobos' && game.night === 1 && !game.noKillNight1) {
      text = narr('lobos_noche1', `${game.seed}:n1:lobos`);
    }
    // Enamorados: se les llama por sus palabras clave secretas.
    if (stepId === 'enamorados' && game.keywordsActive) {
      const lovers = players.filter((p) => p.lover && p.keyword);
      if (lovers.length >= 2) {
        text = `Cupido ha disparado sus flechas. Todos con los ojos cerrados y atentos. Si oyes tu palabra clave, abre los ojos con disimulo y mira tu pantalla: … ${lovers.map((p) => p.keyword).join('… y ')}. Enamorados, descubrid a vuestro amor y confirmad en silencio.`;
      }
    }
    if (actors && actors.length) {
      if (text) say(key, text);
      // A veces, un murmullo ambiental antes del primer aviso (despista y ambienta).
      if (fillerPlan[key] === undefined) fillerPlan[key] = Math.random() < 0.3;
      if (fillerPlan[key]) {
        schedule(`${key}:filler`, 9000 + Math.random() * 6000, async () => {
          fillerPlan[key] = false;
          speak(improv('relleno'), { muted, priority: 'low' });
          scheduleNag(key, stepId);
        });
      } else {
        scheduleNag(key, stepId); // si nadie actúa, la voz insiste cada ~30 s
      }
      return; // esperamos la acción del jugador (su transacción avanza el paso)
    }
    // Nadie debe actuar: el paso se resolvió, el rol está muerto o no puede usar
    // su poder. En todos los casos suena la misma despedida («…vuelve a cerrar
    // los ojos») con la misma espera: los tiempos y el audio no delatan nada.
    const outro = outroFor(stepId, game);
    if (stepNeedsGhostAnnounce(stepId, game, players)) {
      if (text) say(key, text);
      chainOutro(key, outro, 2500 + Math.random() * 2500, game.stepIdx);
    } else if (['enamorados', 'lobos_reconocen', 'lobos'].includes(stepId)) {
      chainOutro(key, outro, 900, game.stepIdx); // pasos vivos ya completados
    } else {
      schedule(key, 1200, () => advanceGhostStep(game.stepIdx)); // rol públicamente muerto
    }
    return;
  }

  if (game.phase === 'day') {
    const dawnKey = `d${game.dayNum}:dawn`;
    if (!spoken.has(dawnKey)) {
      const parts = [];
      const deaths = (game.lastDawn && game.lastDawn.deaths) || [];
      const dawnSalt = `${game.seed}:d${game.dayNum}`;
      parts.push('Castronegro, abrid todos los ojos.');
      if (deaths.length) {
        parts.push(narr('amanecer_con_muertes', dawnSalt));
        for (const d of deaths) {
          parts.push(deathLine(d.name, d.role, dawnSalt));
        }
      } else {
        parts.push(narr('amanecer_sin_muertes', dawnSalt));
      }
      if (game.lastDawn && game.lastDawn.cuervo) parts.push(game.lastDawn.cuervo);
      if (game.lastDawn && game.lastDawn.gitana) parts.push(game.lastDawn.gitana);
      if (Math.random() < 0.5) parts.push(improv('amanecer'));
      const aliveCount = players.filter((p) => p.alive).length;
      if (aliveCount > 0 && aliveCount <= 4) parts.push(improv('pocos'));
      say(dawnKey, parts.join(' '));
    }

    const head = (game.pending || [])[0];
    if (head) {
      const pKey = `d${game.dayNum}:pending:${head.type}:${head.pid || head.targetId || ''}:${game.pending.length}`;
      const narrKey = {
        cazador: 'cazador', sirvienta: 'sirvienta',
        alguacil_elect: 'alguacil_elige', alguacil_pick: 'alguacil_hereda',
        cabeza_pick: 'cabeza_pick',
      }[head.type];
      if (narrKey) say(pKey, narr(narrKey, `${game.seed}:${pKey}`));
      if (head.type === 'sirvienta') {
        const remaining = Math.max(1000, (head.deadline || 0) - Date.now());
        schedule(pKey, remaining, () => resolveSirvienta(false));
      } else {
        cancelTimer(); // de día se juega con los ojos abiertos: no hace falta insistir
      }
      return;
    }

    if (game.votesLeft > 0 && !game.vote) {
      const vKey = `d${game.dayNum}:debate:${game.votesLeft}`;
      const flavor = Math.random() < 0.4 ? ' ' + improv('debate') : '';
      // Tras una noche sin muertes, el tono del debate cambia.
      const debateKind = ((game.lastDawn || {}).deaths || []).length ? 'dia_debate' : 'dia_debate_tranquilo';
      const debateTxt = narr(debateKind, `${game.seed}:d${game.dayNum}:${game.votesLeft}`) + flavor;
      if (game.juezSecondActive) say(vKey + ':juez', `${narr('juez_segunda', `${game.seed}:${vKey}`)} ${debateTxt}`);
      else say(vKey, debateTxt);
      cancelTimer();
      return;
    }

    if (game.votesLeft <= 0 && !game.pending.length && !game.winner) {
      // El pueblo suele quedarse comentando la jugada: la noche no empieza
      // hasta que alguien pulse «Empezar la noche» en su dispositivo.
      const ll = game.lastLynch;
      const lynchNote = game.revealDead && ll && ll.role && !ll.hideRole
        ? `Castronegro ha dictado sentencia: ${ll.name} era ${ROLES[ll.role] ? ROLES[ll.role].name : ll.role}. ` : '';
      say(`d${game.dayNum}:ocaso`, lynchNote + improv('ocaso'));
      cancelTimer();
    }
    return;
  }

  if (game.phase === 'end') {
    cancelTimer();
    const label = WINNER_LABELS[game.winner] || '';
    say('end:' + game.winner, `${narr('fin_partida', String(game.seed))} ${label.replace(/[^\p{L}\p{N}\s,.!¡¿?…]/gu, '')}`);
    return;
  }
}

// Al cambiar de partida o volver al lobby, olvidamos lo narrado.
let lastGameId = null;
export function conductorReset() {
  const gid = state.group && state.group.game && state.group.game.startedAt;
  if (gid !== lastGameId) {
    lastGameId = gid;
    spoken = new Set();
    nagCounts = {};
    fillerPlan = {};
    repeatSeen = null;
    lastSpokenText = '';
    cancelTimer();
    stopSpeech();
  }
}

export function speakTest() {
  speak('Bienvenidos a Castronegro. La voz del narrador funciona correctamente.', { muted: false });
}
