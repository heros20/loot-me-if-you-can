/**
 * Guild Tavern Scene - rendu DOM legacy (V2).
 * La sequence de dialogue est partagee avec la scene Phaser via tavernDialogueSequence.ts.
 */
export {
  advanceTavernSceneState,
  createInitialTavernSceneState,
  isTavernSceneFullyRevealed,
  revealAllTavernBeats,
  type TavernSceneState,
} from '../systems/tavernDialogueSequence';
