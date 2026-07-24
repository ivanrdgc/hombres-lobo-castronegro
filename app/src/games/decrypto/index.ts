// «Decrypto» como juego enchufable de la mesa. La app custodia las palabras de
// cada equipo (solo su equipo las ve) y los códigos secretos, y resuelve las
// intercepciones y errores.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import RulesModal from './ui/modals/RulesModal.svelte';

export const decrypto: GameDefinition = {
  id: 'decrypto',
  emoji: '🔐',
  name: 'Decrypto',
  desc: 'Comunicación cifrada entre dos equipos: cada uno tiene 4 palabras clave secretas y transmite códigos de 3 cifras con pistas… mientras el rival escucha e intenta interceptar. Dos intercepciones ganan; dos errores propios hacen perder. Pura estrategia de comunicación.',
  minPlayers: 4,
  maxPlayers: 8,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    // La pastilla flotante de un juego de EQUIPO abre las REGLAS, no una carta:
    // las palabras están en la pantalla (B34).
    'de-rules': RulesModal,
    'de-help': HelpModal,
    'de-demo': DemoModal,
    // Sin «de-leave»: irse de una partida por equipos es terminarla, y tener dos
    // entradas para la misma acción era el clásico botón de más.
    'de-end': EndConfirmModal,
  },
};
