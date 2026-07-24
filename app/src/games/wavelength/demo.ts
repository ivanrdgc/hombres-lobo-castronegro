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
        'Jugáis TÚ, Bea y Carlos, en el mismo equipo (es cooperativo). Cada ronda hay un espectro entre dos ideas opuestas —esta vez «Frío ↔ Caliente»— y un OBJETIVO secreto en algún punto del dial.',
        'Uno de vosotros es el PSÍQUICO de la ronda (rota cada ronda): ve dónde está el objetivo y da una pista para que los demás lo encontréis. Cuanto más cerca dejéis el marcador, más puntos.',
      ],
      visual: { kind: 'board', rows: [{ label: '📡 Espectro', value: 'Frío ↔ Caliente' }, { label: '🔮 Psíquico de la ronda', value: 'Bea' }, { label: '🎯 Objetivo', value: 'secreto (solo Bea)' }] },
    },
    {
      icon: '🔮',
      title: 'Dos pantallas muy distintas',
      who: { actor: 'Bea (Psíquica) mira su dial y piensa una idea', others: 'tú y Carlos veis el dial VACÍO y esperáis su pista, callados.' },
      text: [
        'Solo Bea ve la DIANA: una franja verde del dial que vale 4 puntos en el centro, 3 y 2 según te alejas. Esta ronda cae muy hacia «Caliente».',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Bea (Psíquica 🔮)', lines: ['Dial con la DIANA pintada:', 'Frío ———————▮▮🎯▮▮— Caliente', '«La diana está casi al tope del calor…»'], buttons: [{ label: '💬 Ya he dado la pista', kind: 'primary' }] },
          { title: 'TÚ (equipo)', lines: ['Dial VACÍO, sin diana:', 'Frío ————————————— Caliente', '«🔮 Bea está pensando su pista…»'] },
        ],
      },
    },
    {
      icon: '💬',
      title: 'La pista, en voz alta',
      who: { actor: 'Bea dice UNA idea en voz alta y pulsa «💬 Ya he dado la pista»', others: 'vosotros escucháis; aún no se toca el dial.' },
      text: [
        'Bea busca algo que caiga JUSTO donde está su diana. Como está casi al tope de «Caliente», dice: «una sauna».',
        'Desde ese momento Bea calla: ni aclaraciones, ni caras, ni señalar el dial. Su trabajo ya está hecho.',
      ],
    },
    {
      icon: '🤔',
      title: 'Te toca interpretar',
      who: { actor: 'TÚ y Carlos debatís en voz alta dónde apuntaba', others: 'Bea escucha en silencio (y por dentro se muerde las uñas).' },
      text: ['La pista es «una sauna», en el espectro «Frío ↔ Caliente».'],
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
        'Debatís, movéis el marcador con el dedo y, cuando estáis de acuerdo, uno lo fija por todo el equipo (da igual quién: la decisión es compartida).',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (equipo)', lines: ['Arrastras el marcador hasta 82.'], buttons: [{ label: '✅ Fijar la marca (82)', kind: 'primary' }] },
          { title: 'Bea (Psíquica 🔮)', lines: ['«🎚️ Ya diste tu pista. El equipo está decidiendo…»', 'Ve su diana y espera el veredicto.'] },
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
      visual: { kind: 'log', lines: ['💬 Bea ya ha dado su pista. El equipo coloca el marcador.', '🎯 El objetivo estaba en 85, el equipo marcó 82. 🎯 ¡En el centro! (4) para Bea. Total del equipo: 4.', '📡 Ronda 2: nuevo espectro y nuevo Psíquico (TÚ).'] },
    },
  ],
};
