import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ENTITY_VISUALS } from '../src/assets/animationManifest';
import { AUDIO_ASSETS, AUDIO_KEYS, EXTERNAL_TEXTURES, SPRITESHEET_ASSETS } from '../src/assets/manifest';

const projectRoot = process.cwd();
const failures: string[] = [];

const allAssets = [
  ...EXTERNAL_TEXTURES.map((asset) => ({ kind: 'image', ...asset })),
  ...SPRITESHEET_ASSETS.map((asset) => ({ kind: 'spritesheet', ...asset })),
  ...AUDIO_ASSETS.map((asset) => ({ kind: 'audio', ...asset })),
];

const seenKeys = new Map<string, string>();

allAssets.forEach((asset) => {
  const previousKind = seenKeys.get(asset.key);

  if (previousKind) {
    failures.push(`Duplicate asset key "${asset.key}" used by ${previousKind} and ${asset.kind}.`);
  }

  seenKeys.set(asset.key, asset.kind);

  const localPath = join(projectRoot, 'public', asset.path.replace(/^\//, ''));

  if (!existsSync(localPath)) {
    failures.push(`Missing ${asset.kind} asset "${asset.key}" at ${asset.path}.`);
  }
});

SPRITESHEET_ASSETS.forEach((sheet) => {
  if (sheet.frameWidth <= 0 || sheet.frameHeight <= 0) {
    failures.push(`Invalid frame size for spritesheet "${sheet.key}".`);
  }
});

const loadedTextureKeys = new Set([
  ...EXTERNAL_TEXTURES.map((asset) => asset.key),
  ...SPRITESHEET_ASSETS.map((asset) => asset.key),
]);

Object.entries(ENTITY_VISUALS.adventurer).forEach(([role, visual]) => {
  if (!loadedTextureKeys.has(visual.texture)) {
    failures.push(`Adventurer visual "${role}" references unloaded texture "${visual.texture}".`);
  }
});

Object.entries(ENTITY_VISUALS.defense).forEach(([type, visual]) => {
  if (!loadedTextureKeys.has(visual.texture)) {
    failures.push(`Defense visual "${type}" references unloaded texture "${visual.texture}".`);
  }
});

if (!loadedTextureKeys.has(ENTITY_VISUALS.boss.texture)) {
  failures.push(`Boss visual references unloaded texture "${ENTITY_VISUALS.boss.texture}".`);
}

const loadedAudioKeys = new Set(AUDIO_ASSETS.map((asset) => asset.key));

if (!loadedAudioKeys.has(AUDIO_KEYS.ambience.boss)) {
  failures.push('Boss music key is not present in AUDIO_ASSETS.');
}

if (!loadedAudioKeys.has(AUDIO_KEYS.ambience.guardian)) {
  failures.push('Guardian music key is not present in AUDIO_ASSETS.');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Media manifest OK: ${allAssets.length} assets, ${SPRITESHEET_ASSETS.length} spritesheets.`);
