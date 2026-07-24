// Tutorial de Wavelength: una ronda de ejemplo continua, con quién actúa en
// cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'wavelength',
  name: 'Wavelength',
  emoji: '📡',
  steps: [
    {
      icon: '🎯',
      title: 'La ronda de ejemplo',
      text: [
        'Jugáis TÚ, Bea y Carlos, en el mismo equipo (es cooperativo). Cada ronda hay un espectro entre dos ideas opuestas —esta vez el dial va de «Frío», a la izquierda, a «Caliente», a la derecha— y un OBJETIVO secreto en algún punto de él.',
        'El dial se numera de 0 a 100: 0 es el extremo izquierdo, 100 el derecho y 50 el centro justo. Cuando la app diga «el objetivo estaba en 85», habla de esa escala.',
        'Uno de vosotros es el PSÍQUICO de la ronda (rota cada ronda): ve dónde está el objetivo y da una pista para que los demás lo encontréis. Cuanto más cerca dejéis el marcador, más puntos.',
      ],
      visual: { kind: 'board', rows: [{ label: '📡 Espectro', value: 'Frío ↔ Caliente' }, { label: '🎚️ El dial', value: 'de 0 (Frío) a 100 (Caliente)' }, { label: '🔮 Psíquico de la ronda', value: 'Bea' }, { label: '🎯 Objetivo', value: 'secreto (solo Bea)' }] },
    },
    {
      icon: '🔮',
      title: 'Dos pantallas muy distintas',
      who: { actor: 'Bea (Psíquica) mira su dial y piensa una idea', others: 'tú y Carlos veis el dial VACÍO y esperáis su pista, callados.' },
      text: [
        'Solo Bea ve la DIANA: una franja verde del dial que vale 4 puntos en el centro, 3 y 2 según te alejas. Esta ronda cae muy hacia «Caliente», por el 85.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Bea (Psíquica 🔮)', lines: ['🎯 Su objetivo está en 85 de 100, del lado de «Caliente».', 'Mientras mantiene pulsado, el dial le pinta la diana:', 'Frío ———————▮▮🎯▮▮— Caliente'], buttons: [{ label: '🎯 Mantén pulsado para apuntar', kind: 'ghost' }, { label: '💬 Ya he dado la pista', kind: 'primary' }] },
          { title: 'TÚ (equipo)', lines: ['Dial VACÍO, sin diana:', 'Frío ————————————— Caliente', '«👂 Escucha la pista de Bea: la dirá una sola vez.»'] },
        ],
      },
    },
    {
      icon: '💬',
      title: 'La pista, en voz alta',
      who: { actor: 'Bea dice UNA idea en voz alta y pulsa «💬 Ya he dado la pista»', others: 'vosotros escucháis; aún no se toca el dial.' },
      text: [
        'Bea busca algo que caiga JUSTO donde está su diana. Como está casi al tope de «Caliente», dice: «una sauna».',
        'Antes de pulsar, puede escribir la pista en su móvil: aparece en la pantalla de todos durante el debate. Es opcional, pero evita el clásico «¿qué había dicho?» a los treinta segundos.',
        'Desde ese momento Bea calla: ni aclaraciones, ni caras, ni señalar el dial. Su trabajo ya está hecho.',
      ],
    },
    {
      icon: '🤔',
      title: 'Te toca interpretar',
      who: { actor: 'TÚ y Carlos debatís en voz alta dónde apuntaba', others: 'Bea escucha en silencio (y por dentro se muerde las uñas).' },
      text: ['La pista es «una sauna», en un dial que va de «Frío» (0) a «Caliente» (100).'],
      ask: {
        prompt: '¿Dónde lleváis el marcador?',
        choices: [
          { label: 'Muy hacia «Caliente», casi al extremo', good: true, reply: 'Bien leído: una sauna es de lo más caliente que hay sin quemar. Ajustad los últimos milímetros debatiendo: ¿más que «un desierto»? ¿menos que «lava»?' },
          { label: 'Al centro, por si acaso', reply: 'El centro sería algo templado («una piscina en primavera»). Si el equipo se raja y tira al centro «por seguridad», la sintonía se pierde: confiad en la pista.' },
          { label: 'Le pregunto a Bea si es «muy» caliente', reply: 'No puede contestar: tras la pista, la Psíquica tiene prohibido añadir nada. Todo lo que necesitáis está en «una sauna».' },
        ],
      },
    },
    {
      icon: '🎚️',
      title: 'Fijar la marca',
      who: { actor: 'UNO de vosotros (tú o Carlos) arrastra el marcador y pulsa «✅ Fijar la marca»', others: 'Bea no toca el dial: solo mira.' },
      text: [
        'El marcador es COMPARTIDO: lo arrastra cualquiera del equipo y se mueve igual en todos los móviles, así que discutís sobre la misma posición.',
        'Cuando estáis de acuerdo, uno pulsa «✅ Fijar la marca» y confirma (pide dos toques: un roce despistado ya no cierra la ronda). Da igual quién lo pulse: la decisión es compartida.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (equipo)', lines: ['Arrastras la marca hasta 82.', 'Carlos ve el 82 en su móvil.'], buttons: [{ label: '✅ Fijar la marca en 82', kind: 'primary' }] },
          { title: 'Bea (Psíquica 🔮)', lines: ['«🙈 Sigues teniendo el objetivo en el móvil.»', '«Van por 82 (la movió Carlos). La fijan ellos.»'] },
        ],
      },
    },
    {
      icon: '🏆',
      title: 'La revelación y los puntos',
      who: { actor: 'La app revela el objetivo a TODOS y puntúa', others: 'cualquiera pulsa «🔁 Otra ronda» para seguir: el Psíquico rota (ahora te tocaría a ti).' },
      text: [
        'El objetivo estaba en 85 y marcasteis 82: ¡centro de la diana, 4 puntos! Los suma Bea (fue quien os sintonizó) y también el total del equipo.',
        'Puntos por cercanía: 4 el centro, 3 cerca, 2 rozando, 0 fuera. Nueva ronda: nuevo espectro, nuevo Psíquico. ¿Hasta dónde llega vuestra sintonía? 📡',
      ],
      visual: { kind: 'log', lines: ['💬 Bea ya ha dado su pista. El equipo coloca la marca en el dial.', '🎯 El objetivo estaba en 85, el equipo marcó 82. 🎯 ¡En el centro! (4) para Bea. Total del equipo: 4.', '📡 Ronda 2: nuevo espectro y nuevo Psíquico (TÚ).'] },
    },
    {
      icon: '🔮',
      title: 'Y ahora te toca a ti',
      who: { actor: 'TÚ eres el Psíquico de la ronda 2', others: 'Bea y Carlos pasan a ser el equipo y esperan tu pista.' },
      text: [
        'En TU pantalla aparecerá la franja verde sobre el dial: ese es el objetivo, y solo lo ves tú. Piensa una idea que caiga justo ahí, dila en voz alta (puedes escribirla también) y pulsa «💬 Ya he dado la pista». Después, silencio: ni matices ni gestos.',
        'Si el espectro que te ha tocado no te dice nada, pulsa «🔀 Cambiar espectro» antes de dar la pista: te reparte otro par y no gasta la ronda.',
        'La partida acaba con la meta que elegisteis al empezar (por ejemplo, una vuelta a la mesa) y sale un resumen con el total del equipo. ¿Hasta dónde llega vuestra sintonía? 📡',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (Psíquico 🔮)', lines: ['Nuevo espectro: Aburrido ↔ Emocionante', '🎯 Tu objetivo está en 30 de 100, del lado de «Aburrido».'], buttons: [{ label: '🎯 Mantén pulsado para apuntar', kind: 'ghost' }, { label: '💬 Ya he dado la pista', kind: 'primary' }, { label: '🔀 Cambiar espectro y objetivo', kind: 'ghost' }] },
          { title: 'Bea y Carlos (equipo)', lines: ['Dial sin diana.', '«👂 Escuchan tu pista…»'] },
        ],
      },
    },
  ],
};
