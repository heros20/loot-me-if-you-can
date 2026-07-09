import Phaser from 'phaser';
import type { AdventurerRole, DefenseType } from '../game/types';
import { TEXTURE_KEYS } from './manifest';

export interface EntityAnimationSet {
  idle: string;
  walk: string;
  action: string;
}

export interface EntityVisualProfile extends EntityAnimationSet {
  texture: string;
  displaySize: number;
  hover?: boolean;
}

export const ANIMATION_KEYS = {
  adventurer: {
    warrior: animationSet('adventurer-warrior'),
    thief: animationSet('adventurer-thief'),
    mage: animationSet('adventurer-mage'),
    healer: animationSet('adventurer-healer'),
    cartographer: animationSet('adventurer-cartographer'),
  } satisfies Record<AdventurerRole, EntityAnimationSet>,
  defense: {
    spikeTrap: staticAnimationSet('defense-spike-trap'),
    fireTrap: staticAnimationSet('defense-fire-trap'),
    roomLockTrap: staticAnimationSet('defense-room-lock-trap'),
    slime: animationSet('defense-demon'),
    skeleton: animationSet('defense-skeleton-mage', 0, 3),
    goblin: animationSet('defense-cursed-raider'),
    guardian: animationSet('defense-gargant-lord'),
  } satisfies Record<DefenseType, EntityAnimationSet>,
  boss: {
    idle: 'boss-final-idle',
    walk: 'boss-final-walk',
    action: 'boss-final-attack',
  } satisfies EntityAnimationSet,
} as const;

export const ENTITY_VISUALS = {
  adventurer: {
    warrior: { texture: TEXTURE_KEYS.adventurer.warrior, displaySize: 38, ...ANIMATION_KEYS.adventurer.warrior },
    thief: { texture: TEXTURE_KEYS.adventurer.thief, displaySize: 36, ...ANIMATION_KEYS.adventurer.thief },
    mage: { texture: TEXTURE_KEYS.adventurer.mage, displaySize: 37, ...ANIMATION_KEYS.adventurer.mage },
    healer: { texture: TEXTURE_KEYS.adventurer.healer, displaySize: 37, ...ANIMATION_KEYS.adventurer.healer },
    cartographer: { texture: TEXTURE_KEYS.adventurer.cartographer, displaySize: 36, ...ANIMATION_KEYS.adventurer.cartographer },
  } satisfies Record<AdventurerRole, EntityVisualProfile>,
  defense: {
    spikeTrap: { texture: TEXTURE_KEYS.defense.spikeTrap, displaySize: 25, ...ANIMATION_KEYS.defense.spikeTrap },
    fireTrap: { texture: TEXTURE_KEYS.defense.fireTrap, displaySize: 27, ...ANIMATION_KEYS.defense.fireTrap },
    roomLockTrap: { texture: TEXTURE_KEYS.defense.roomLockTrap, displaySize: 27, ...ANIMATION_KEYS.defense.roomLockTrap },
    slime: { texture: TEXTURE_KEYS.defense.slime, displaySize: 36, hover: true, ...ANIMATION_KEYS.defense.slime },
    skeleton: { texture: TEXTURE_KEYS.defense.skeleton, displaySize: 34, ...ANIMATION_KEYS.defense.skeleton },
    goblin: { texture: TEXTURE_KEYS.defense.goblin, displaySize: 36, ...ANIMATION_KEYS.defense.goblin },
    guardian: { texture: TEXTURE_KEYS.defense.guardian, displaySize: 48, ...ANIMATION_KEYS.defense.guardian },
  } satisfies Record<DefenseType, EntityVisualProfile>,
  boss: {
    texture: TEXTURE_KEYS.boss,
    displaySize: 72,
    ...ANIMATION_KEYS.boss,
  } satisfies EntityVisualProfile,
} as const;

export function registerPresentationAnimations(scene: Phaser.Scene): void {
  Object.entries(ANIMATION_KEYS.adventurer).forEach(([role, keys]) => {
    const texture = TEXTURE_KEYS.adventurer[role as AdventurerRole];
    createLoop(scene, keys.idle, texture, 0, 3, 3);
    createLoop(scene, keys.walk, texture, 0, 7, 9);
    createOnce(scene, keys.action, texture, 3, 7, 12);
  });

  createStatic(scene, ANIMATION_KEYS.defense.spikeTrap, TEXTURE_KEYS.defense.spikeTrap);
  createStatic(scene, ANIMATION_KEYS.defense.fireTrap, TEXTURE_KEYS.defense.fireTrap);
  createStatic(scene, ANIMATION_KEYS.defense.roomLockTrap, TEXTURE_KEYS.defense.roomLockTrap);
  createLoop(scene, ANIMATION_KEYS.defense.slime.idle, TEXTURE_KEYS.defense.slime, 0, 7, 7);
  createLoop(scene, ANIMATION_KEYS.defense.slime.walk, TEXTURE_KEYS.defense.slime, 0, 7, 10);
  createOnce(scene, ANIMATION_KEYS.defense.slime.action, TEXTURE_KEYS.defense.slime, 0, 7, 14);
  createLoop(scene, ANIMATION_KEYS.defense.skeleton.idle, TEXTURE_KEYS.defense.skeleton, 0, 3, 5);
  createLoop(scene, ANIMATION_KEYS.defense.skeleton.walk, TEXTURE_KEYS.defense.skeleton, 0, 7, 8);
  createOnce(scene, ANIMATION_KEYS.defense.skeleton.action, TEXTURE_KEYS.defense.skeleton, 8, 15, 12);
  createLoop(scene, ANIMATION_KEYS.defense.goblin.idle, TEXTURE_KEYS.defense.goblin, 0, 3, 5);
  createLoop(scene, ANIMATION_KEYS.defense.goblin.walk, TEXTURE_KEYS.defense.goblin, 0, 7, 9);
  createOnce(scene, ANIMATION_KEYS.defense.goblin.action, TEXTURE_KEYS.defense.goblin, 3, 7, 12);
  createLoop(scene, ANIMATION_KEYS.defense.guardian.idle, TEXTURE_KEYS.defense.guardian, 0, 3, 4);
  createLoop(scene, ANIMATION_KEYS.defense.guardian.walk, TEXTURE_KEYS.defense.guardian, 0, 7, 7);
  createOnce(scene, ANIMATION_KEYS.defense.guardian.action, TEXTURE_KEYS.defense.guardian, 0, 7, 11);

  createLoop(scene, ANIMATION_KEYS.boss.idle, TEXTURE_KEYS.boss, 0, 7, 4);
  createLoop(scene, ANIMATION_KEYS.boss.walk, TEXTURE_KEYS.boss, 0, 7, 7);
  createOnce(scene, ANIMATION_KEYS.boss.action, TEXTURE_KEYS.bossAttack, 16, 23, 10);
}

function animationSet(prefix: string, _start = 0, _end = 7): EntityAnimationSet {
  return {
    idle: `${prefix}-idle`,
    walk: `${prefix}-walk`,
    action: `${prefix}-action`,
  };
}

function staticAnimationSet(prefix: string): EntityAnimationSet {
  return {
    idle: `${prefix}-static`,
    walk: `${prefix}-static`,
    action: `${prefix}-static`,
  };
}

function createStatic(scene: Phaser.Scene, set: EntityAnimationSet, texture: string): void {
  if (scene.textures.exists(texture) && !scene.anims.exists(set.idle)) {
    scene.anims.create({ key: set.idle, frames: [{ key: texture }], frameRate: 1, repeat: -1 });
  }
}

function createLoop(scene: Phaser.Scene, key: string, texture: string, start: number, end: number, frameRate: number): void {
  if (!scene.textures.exists(texture) || scene.anims.exists(key)) {
    return;
  }

  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(texture, { start, end }),
    frameRate,
    repeat: -1,
  });
}

function createOnce(scene: Phaser.Scene, key: string, texture: string, start: number, end: number, frameRate: number): void {
  if (!scene.textures.exists(texture) || scene.anims.exists(key)) {
    return;
  }

  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(texture, { start, end }),
    frameRate,
    repeat: 0,
  });
}
