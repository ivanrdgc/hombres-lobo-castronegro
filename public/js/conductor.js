// Conductor: se ejecuta SOLO en el dispositivo del máster durante el modo automático.
// Narra la partida con voz sintetizada y avanza los pasos que no requieren acción
// (roles muertos, pausas dramáticas, amanecer, transiciones de fase).
import { state, isMaster } from './store.js';
import { stepActors, stepNeedsGhostAnnounce, computeNightSteps, NIGHT_STEPS, WINNER_LABELS } from './engine.js';
import { ROLES } from './roles.js';
import { buildExplainSpeech } from './explain.js';
import { NARRATION, narr, outro, deathLine, loveDeathLine, improv, speak, stopSpeech, initVoice, getVoiceConfig, isNarratorSpeaking, prewarm } from './narration.js';
import { ensureAmbience, stopAmbience } from './ambience.js';
import {
  startFirstNight, advanceGhostStep, runDawn, startNextNight, resolveSirvienta, startRoleRefresh, finishRoleRefreshClose,
} from './actions.js';

let spoken = new Set();
let timer = null;
let timerKey = null;
let wakeLock = null;
let wasMaster = false; // para detectar cuándo este dispositivo toma la narración
let muted = false;
let nagCounts = {};
let fillerPlan = {};
let repeatSeen = null; // nonce de «repetir última locución»
let lastSpokenText = ''; // última narración principal pronunciada

// Cuando todos han visto su carta: la voz anima a comenzar la primera noche.
const LISTOS = [
  'Ya todos conocéis vuestro papel. Guardad bien el secreto… y cuando el pueblo esté listo, que alguien dé comienzo a la primera noche.',
  'Todo Castronegro ha visto ya su carta. Respirad hondo: la primera noche está a punto de caer. Empezadla cuando queráis.',
  'Los papeles están repartidos y bien guardados. Cuando estéis preparados, dad comienzo a la noche.',
  'Cada cual conoce su destino. Que nadie lo revele… y, cuando queráis, que caiga la primera noche sobre Castronegro.',
];

// Frases de insistencia: si nadie actúa en ~30 s, la voz anima a seguir.
// Admiten varias variantes para que cada aviso suene distinto.
const NAGS = {
  refresh: ['Aún faltan vecinos por revisar su carta… miradla en secreto y confirmad en el dispositivo.',
    'Castronegro espera: revisad vuestra carta en secreto y confirmad, que la noche quiere continuar.'],
  ladron: ['Ladrón, las dos cartas del centro siguen esperándote…',
    'Ladrón, decídete: ¿lo tuyo, o lo ajeno?',
    'Ladrón, la noche no dura para siempre y los destinos tampoco…'],
  cupido: ['¡Cupido, abre los ojos! Tus flechas de amor esperan un destino.',
    'Cupido, el amor no puede esperar toda la noche… tensa ese arco.',
    'Cupido, dos corazones siguen sueltos por tu culpa… apunta de una vez.'],
  enamorados: ['Enamorados, abrid los ojos con disimulo, mirad vuestra pantalla y confirmad… el amor no puede esperar toda la noche.',
    'Enamorados, que el flechazo no os deje dormidos: mirad la pantalla con disimulo y confirmad.'],
  nino_salvaje: ['Niño Salvaje, elige ya a tu modelo… la noche avanza.',
    'Niño Salvaje, todo cachorro necesita un espejo: elígelo.'],
  perro_lobo: ['Perro Lobo, ¿pueblo o manada? Tu corazón debe decidir.',
    'Perro Lobo, decídete: ni el bosque ni el hogar esperan eternamente.'],
  dos_hermanas: ['Hermanas, reconoceos y confirmadlo en vuestra pantalla.',
    'Hermanas, la sangre os busca: miraos y confirmad.'],
  tres_hermanos: ['Hermanos, reconoceos y confirmadlo en vuestra pantalla.',
    'Hermanos, tres pares de ojos y ninguna confirmación… miraos y confirmad.'],
  actor: ['Actor, el escenario espera tu interpretación…',
    'Actor, el público se impacienta… elige tu papel.',
    'Actor, sin miedo escénico: la noche es tu mejor función.'],
  defensor: ['Defensor, el pueblo necesita tu escudo esta noche…',
    'Defensor, las puertas crujen… ¿cuál protegerás?',
    'Defensor, elige guardia: los colmillos no van a esperar mucho más.'],
  vidente: ['Vidente, tu bola de cristal se enfría… elige a quién descubrir.',
    'Vidente, la niebla se disipa en tu bola de cristal… aprovecha antes de que vuelva.',
    'Vidente, la verdad tiene prisa esta noche: pregunta un nombre.'],
  zorro: ['Zorro, ¿olfatearás esta noche o descansarás?',
    'Zorro, el rastro se enfría… decide dónde husmear.'],
  cuervo: ['Cuervo, ¿sobre qué tejado dejarás caer tu sospecha?',
    'Cuervo, tus plumas pesan… suéltalas sobre algún tejado.'],
  lobos_reconocen: ['Lobos, abrid los ojos, reconoceos… y confirmadlo en vuestro dispositivo.',
    'La manada aún no se ha reconocido del todo… lobos, miraos y confirmad.'],
  lobos: ['Los hombres lobo se lo están pensando… la manada debe elegir a su víctima.',
    'Se oye a la manada deliberar… hombres lobo, el hambre no espera: elegid.',
    'Los lobos afilan sus garras, indecisos… ¿quién caerá esta noche?',
    'La manada discute en silencio… decidid, que la luna no espera.'],
  lobo_feroz: ['Gran Lobo Feroz, tu hambre espera una segunda víctima… ¿o la contendrás?',
    'Gran Lobo Feroz, el segundo plato se enfría…'],
  lobo_albino: ['Hombre Lobo Albino, ¿traicionarás a la manada esta noche?',
    'Hombre Lobo Albino, decide: lealtad… o un hermano menos.'],
  bruja: ['Bruja, el caldero humea… decide qué pociones usar y termina tu turno.',
    'Bruja, tus frascos aguardan… vida, muerte o nada: pero decide.',
    'Bruja, la noche pregunta dos veces y tú aún no has contestado ninguna…'],
  gaitero: ['Gaitero, tu melodía aguarda… elige a quién encantar.',
    'Gaitero, dos oídos esperan tu música… elige de una vez.'],
  gitana: ['Gitana, los espíritus se impacientan… haz tu pregunta o déjalos descansar.',
    'Gitana, el velo se cierra pronto… pregunta ya.'],
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
  return outro(stepId, `${game.seed}:n${game.night}:s${game.stepIdx}`);
}

// Las llamadas por palabra clave se dicen en DOS partes: una fija (que se
// pre-genera y suena al instante) y otra con las palabras clave (dinámica). Al
// encadenarlas, la segunda se sintetiza mientras suena la primera, sin espera.
const ENAMORADOS_INTRO = 'Cupido ha disparado sus flechas esta noche. Guardad todos los ojos cerrados y escuchad con atención. Si oyes tu palabra clave, abre los ojos con disimulo y mira tu pantalla.';
function enamoradosKw(lovers) {
  return `Atención: … ${lovers.map((p) => p.keyword).join('… y ')}. Enamorados, reconoced en silencio a vuestro amor y confirmad en la pantalla.`;
}

// Adelanta la síntesis de las locuciones previsibles de una noche (entradas de
// cada rol, despedidas y amanecer) mientras la gente aún mira su carta. Es «best
// effort»: usa los mismos textos y sales deterministas que reproducirá el
// conductor, así que aciertan en caché; lo que no acierte, se sintetiza al pedirlo.
function prewarmNight(game, players, night) {
  try {
    const base = { ...game, night, stepIdx: 0 };
    const steps = computeNightSteps(base, players);
    prewarm(narr('noche_cae', `${game.seed}:n${night}`));
    steps.forEach((stepId, idx) => {
      if (stepId === 'durmiendo' || stepId === 'amanecer') return;
      const def = NIGHT_STEPS.find((s) => s.id === stepId);
      const g2 = { ...game, night, stepIdx: idx, steps };
      if (def && def.silent) { prewarm(outroFor(stepId, g2)); return; }
      prewarm(narr(stepId, `${game.seed}:n${night}:s${idx}:${stepId}`));
      prewarm(outroFor(stepId, g2));
    });
    prewarm(narr('amanecer_sin_muertes', `${game.seed}:d${night}`));
    prewarm(narr('amanecer_con_muertes', `${game.seed}:d${night}`));
    // El día también se precarga: el debate suena justo tras el amanecer.
    prewarm('Castronegro, abrid todos los ojos.');
    prewarm(narr('dia_debate', `${game.seed}:d${night}:1`));
    prewarm(narr('dia_debate_tranquilo', `${game.seed}:d${night}:1`));
    if (steps.includes('enamorados')) prewarm(ENAMORADOS_INTRO); // parte fija de la llamada
  } catch { /* la pre-generación es opcional: si algo falla, se sintetiza al vuelo */ }
}

// Pre-genera la entrada (y despedida) de un paso concreto, si es estático.
function prewarmStep(game, idx) {
  try {
    const stepId = (game.steps || [])[idx];
    if (!stepId || ['durmiendo', 'amanecer', 'enamorados', 'encantados', 'lobos'].includes(stepId)) return;
    prewarm(narr(stepId, `${game.seed}:n${game.night}:s${idx}:${stepId}`));
    prewarm(outroFor(stepId, { ...game, stepIdx: idx }));
  } catch { /* la pre-generación es opcional */ }
}

function chainOutro(key, outroTxt, waitMs, stepIdx) {
  const adv = () => advanceGhostStep(stepIdx);
  // Mientras suena esta despedida, adelanta la síntesis del siguiente rol.
  const g = state.group && state.group.game;
  if (g) prewarmStep(g, stepIdx + 1);
  if (!outroTxt) { scheduleAfterSpeech(key + ':adv', 500, adv); return; }
  const oKey = key + ':outro';
  if (spoken.has(oKey)) { scheduleAfterSpeech(key + ':adv', 800 + Math.random() * 400, adv); return; }
  scheduleAfterSpeech(oKey + ':t', waitMs, async () => {
    say(oKey, outroTxt);
    // El «cerrad los ojos» debe SONAR entero antes de la espera de bloqueo.
    scheduleAfterSpeech(key + ':adv', 800 + Math.random() * 400, adv);
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

// Como say(), pero encadena varias partes en una sola locución. La primera parte
// (fija, pre-generada) suena al instante mientras la segunda (dinámica, con las
// palabras clave) se sintetiza en paralelo gracias al prefetch de la cola.
function sayParts(key, parts, onend) {
  if (spoken.has(key)) { if (onend) onend(); return; }
  spoken.add(key);
  const list = parts.filter(Boolean);
  if (!list.length) { if (onend) onend(); return; }
  lastSpokenText = list.join(' ');
  list.forEach((p, i) => speak(p, { muted, chain: i > 0, onend: i === list.length - 1 ? onend : null }));
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
    schedule(key + ':w', 250, async () => scheduleAfterSpeech(key, extraMs, fn, waited + 250));
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
let explainSeen = null; // `${grupo}:${nonce}` — para no releer al recargar

export function conductorTick() {
  const g = state.group;
  const game = g && g.game;
  // Relevo de narrador en plena partida: si este dispositivo acaba de tomar el
  // mando, olvida lo ya dicho para volver a narrar el paso actual desde aquí.
  const amMaster = !!(g && game && game.mode === 'auto' && isMaster());
  if (amMaster && !wasMaster) { spoken.clear(); stopSpeech(); }
  wasMaster = amMaster;
  // Explicación en voz alta (en el lobby): la lee el dispositivo narrador
  // elegido en la mesa; si no hay, el dispositivo que la pidió.
  if (g && g.explain && g.explain.nonce) {
    const cur = `${g.id}:${g.explain.nonce}`;
    if (explainSeen === null || explainSeen.split(':')[0] !== g.id) {
      explainSeen = cur; // primera vista del grupo: no releer peticiones viejas
    } else if (explainSeen !== cur) {
      explainSeen = cur;
      const myPid = state.session && state.session.pid;
      const narrOk = state.players.some((p) => p.id === g.lastNarratorId);
      const shouldSpeak = narrOk ? myPid === g.lastNarratorId : myPid === g.explain.by;
      if (shouldSpeak && g.status === 'lobby') {
        const { segments } = buildExplainSpeech(g);
        initVoice();
        stopSpeech();
        setTimeout(() => segments.forEach((seg) => speak(seg.text, { ssml: seg.ssml, chain: true, muted })), 350);
      }
    }
  }
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
    // Mientras la gente mira su carta, adelantamos la síntesis de la primera noche.
    if (!spoken.has('pw:n1')) { spoken.add('pw:n1'); prewarmNight(game, players, 1); }
    // Cuando todos han visto su carta, la voz anima a empezar la noche (pero el
    // avance sigue esperando al botón: la gente comenta con los ojos abiertos).
    if (players.length && players.every((p) => p.roleSeen)) {
      say('reveal:listos', LISTOS[Math.floor(Math.random() * LISTOS.length)]);
    }
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
      // Sin adornos aleatorios: así el texto coincide con el pre-generado y la
      // intro de la noche suena al instante (su variedad ya es alta de por sí).
      say(`n${game.night}:cae`, narr('noche_cae', `${game.seed}:n${game.night}`));
      // Adelanta la síntesis del resto de la noche (por si el reveal no llegó).
      const pk = `pw:n${game.night}`;
      if (!spoken.has(pk)) { spoken.add(pk); prewarmNight(game, players, game.night); }
    }

    if (stepId === 'amanecer') {
      say(key, '', null);
      scheduleAfterSpeech(key, 1000, runDawn);
      return;
    }
    // Colchón inicial: la misma pantalla de sueño para todos mientras suena
    // «cae la noche»; el primer rol no despierta hasta que todos duermen.
    if (stepId === 'durmiendo') {
      scheduleAfterSpeech(key, 1500 + Math.random() * 800, () => advanceGhostStep(game.stepIdx));
      return;
    }
    // Encantados: se les llama por palabras clave y el juego ESPERA a que cada
    // uno confirme haberse reconocido (como los enamorados).
    if (stepId === 'encantados') {
      const targets = (game.acts.gaiteroTargets || []).map((id) => players.find((p) => p.id === id)).filter(Boolean);
      // Misma sal que usa prewarmNight: así la intro de los encantados acierta
      // en caché y suena al instante (antes usaba otra sal y sintetizaba en vivo).
      const encIntro = narr('encantados', `${game.seed}:n${game.night}:s${game.stepIdx}:encantados`);
      const actors = stepActors(stepId, game, players);
      if (targets.length && actors && actors.length) {
        const kws = targets.map((p) => p.keyword).filter(Boolean);
        // Parte fija + palabras clave encadenadas: las claves se sintetizan
        // mientras suena la primera parte, así no añaden espera.
        sayParts(key, [
          `${encIntro} Todos con los ojos cerrados. Si oyes tu palabra clave, la música te ha atrapado: abre los ojos con disimulo, mira tu pantalla y confirma.`,
          `Escuchad las palabras: … ${kws.join('… y ')}.`,
        ]);
        scheduleNag(key, 'encantados');
        return;
      }

      if (targets.length) { // todos confirmados: despedida y sigue la noche
        chainOutro(key, outro('encantados', `${game.seed}:n${game.night}`), 900, game.stepIdx);
        return;
      }
      const gaiteroDealt = (game.composition || {}).gaitero > 0 || players.some((p) => p.role === 'gaitero');
      if (game.keywordsActive && ((gaiteroDealt && !game.revealDead) || (!gaiteroDealt && game.fakeAllSelected))) {
        // Gaitero muerto con roles ocultos, o nunca repartido con composición
        // secreta: llamada falsa con SEÑUELOS (palabras sin dueño, distintas
        // cada noche), para no quemar la palabra de ningún jugador real.
        const decoys = (game.kwDecoys || []).slice(2); // los 2 primeros son de Cupido
        const base = ((game.night - 1) * 2) % Math.max(1, decoys.length);
        const fake = decoys.length >= 2
          ? [decoys[base], decoys[(base + 1) % decoys.length]]
          : players.filter((p) => p.alive && p.keyword).slice(0, 2).map((p) => p.keyword);
        say(key, `${encIntro} Todos con los ojos cerrados. Si oyes tu palabra clave, la música te ha atrapado: abre los ojos con disimulo y mira tu pantalla. Las palabras son: … ${fake.join('… y ')}. Cuando lo hayáis visto, volved a cerrar los ojos.`);
        scheduleAfterSpeech(key, 3000, () => advanceGhostStep(game.stepIdx));
      } else {
        schedule(key, 900, () => advanceGhostStep(game.stepIdx));
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
    // Cupido activado pero no repartido (composición secreta): la noche 1 se
    // finge también la llamada a los enamorados, con dos palabras clave falsas.
    if (stepId === 'enamorados' && game.fakeAllSelected && game.keywordsActive
      && !((game.composition || {}).cupido > 0) && !players.some((p) => p.lover)) {
      // Señuelos: palabras nunca asignadas a nadie. Con los ojos cerrados, una
      // llamada que nadie atiende es indistinguible de una real.
      const fake = (game.kwDecoys || []).slice(0, 2);
      if (fake.length === 2) {
        say(key, `Cupido ha disparado sus flechas. Todos con los ojos cerrados y atentos. Si oyes tu palabra clave, abre los ojos con disimulo y mira tu pantalla: … ${fake.join('… y ')}. Enamorados, descubrid a vuestro amor en silencio… y volved a cerrar los ojos.`);
        scheduleAfterSpeech(key, 3500 + Math.random() * 1500, () => advanceGhostStep(game.stepIdx));
        return;
      }
    }
    // Enamorados: parte fija (pre-generada) + palabras clave (dinámica), encadenadas.
    let parts = null;
    if (stepId === 'enamorados' && game.keywordsActive) {
      const lovers = players.filter((p) => p.lover && p.keyword);
      if (lovers.length >= 2) parts = [ENAMORADOS_INTRO, enamoradosKw(lovers)];
    }
    if (actors && actors.length) {
      if (parts) sayParts(key, parts);
      else if (text) say(key, text);
      // Adelanta la síntesis de lo que viene: la despedida de este paso (para
      // cuando actúen) y la entrada del siguiente paso estático.
      prewarm(outroFor(stepId, game));
      const nextId = game.steps[game.stepIdx + 1];
      if (nextId && !['durmiendo', 'amanecer', 'enamorados', 'encantados', 'lobos'].includes(nextId)) {
        prewarm(narr(nextId, `${game.seed}:n${game.night}:s${game.stepIdx + 1}:${nextId}`));
      }
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
    // Carrera de datos: Cupido ya emparejó (doc del grupo) pero las marcas
    // `lover` viven en los docs de jugadores, que pueden llegar DESPUÉS por
    // otro listener. Sin este guardia, el paso creería «no hay enamorados que
    // esperar» y se los saltaría. Esperamos al snapshot de jugadores.
    if (stepId === 'enamorados' && (game.acts || {}).cupidoPair && !players.some((p) => p.lover)) {
      cancelTimer();
      return;
    }
    // Nadie debe actuar: el paso se resolvió, el rol está muerto o no puede usar
    // su poder. En todos los casos suena la misma despedida («…vuelve a cerrar
    // los ojos») con la misma espera: los tiempos y el audio no delatan nada.
    // Si Cupido acaba de marcar, ya sabemos las palabras clave: adelantamos la
    // síntesis de la llamada a los enamorados (que si no, se haría al vuelo).
    if (game.steps[game.stepIdx + 1] === 'enamorados' && game.keywordsActive) {
      const lovers = players.filter((p) => p.lover && p.keyword);
      if (lovers.length >= 2) { prewarm(ENAMORADOS_INTRO); prewarm(enamoradosKw(lovers)); }
    }
    const outro = outroFor(stepId, game);
    if (stepNeedsGhostAnnounce(stepId, game, players)) {
      if (text) say(key, text);
      chainOutro(key, outro, 900 + Math.random() * 700, game.stepIdx);
    } else if (['enamorados', 'lobos_reconocen', 'lobos'].includes(stepId)) {
      chainOutro(key, outro, 400, game.stepIdx); // pasos vivos ya completados
    } else {
      schedule(key, 700, () => advanceGhostStep(game.stepIdx)); // rol públicamente muerto
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
      if (game.lastDawn && game.lastDawn.oso) parts.push(game.lastDawn.oso);
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
      // Si el linchado estaba enamorado, su pareja muere de amor: se anuncia siempre.
      const lv = game.lastLoveDeath;
      const loveNote = lv ? loveDeathLine(ll ? ll.name : null, lv.name, `d${game.dayNum}`) + ' ' : '';
      say(`d${game.dayNum}:ocaso`, lynchNote + loveNote + improv('ocaso'));
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
