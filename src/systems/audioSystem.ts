import Phaser from 'phaser';

export interface PlaySoundOptions {
  volume?: number;
  rate?: number;
  detune?: number;
  cooldownMs?: number;
}

export interface PlayRandomSoundOptions extends PlaySoundOptions {
  skipRecent?: boolean;
}

interface AmbienceOptions {
  volume?: number;
  fadeMs?: number;
  rate?: number;
}

type ManagedSound = Phaser.Sound.BaseSound & {
  setVolume?: (value: number) => ManagedSound;
  volume?: number;
};

const DEFAULT_SOUND_COOLDOWN_MS = 90;
const DEFAULT_GROUP_COOLDOWN_MS = 140;

export class AudioSystem {
  private static globalMasterVolume = 0.72;
  private static globalSfxVolume = 0.72;
  private static globalAmbienceVolume = 0.34;
  private static globalMuted = false;

  private masterVolume = AudioSystem.globalMasterVolume;
  private sfxVolume = AudioSystem.globalSfxVolume;
  private ambienceVolume = AudioSystem.globalAmbienceVolume;
  private muted = AudioSystem.globalMuted;
  private unlocked = false;
  private currentAmbienceId: string | null = null;
  private currentAmbience: ManagedSound | null = null;
  private currentAmbienceOptions: AmbienceOptions = {};
  private lastPlayedAt = new Map<string, number>();
  private lastGroupChoice = new Map<string, string>();
  private unlockDisposers: Array<() => void> = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.bindUnlock();
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  playSound(id: string, options: PlaySoundOptions = {}): boolean {
    if (!this.canPlay(id)) {
      return false;
    }

    const now = this.scene.time.now;
    const cooldownMs = options.cooldownMs ?? DEFAULT_SOUND_COOLDOWN_MS;
    const lastPlayed = this.lastPlayedAt.get(id) ?? Number.NEGATIVE_INFINITY;

    if (now - lastPlayed < cooldownMs) {
      return false;
    }

    this.lastPlayedAt.set(id, now);

    try {
      return this.scene.sound.play(id, {
        volume: this.effectiveVolume(options.volume ?? 1, 'sfx'),
        rate: options.rate,
        detune: options.detune,
      });
    } catch {
      return false;
    }
  }

  playRandomSound(group: readonly string[], options: PlayRandomSoundOptions = {}): boolean {
    const candidates = group.filter((id) => this.scene.cache.audio.exists(id));

    if (candidates.length === 0) {
      return false;
    }

    const groupKey = candidates.join('|');
    const now = this.scene.time.now;
    const groupCooldown = options.cooldownMs ?? DEFAULT_GROUP_COOLDOWN_MS;
    const lastGroupPlayed = this.lastPlayedAt.get(groupKey) ?? Number.NEGATIVE_INFINITY;

    if (now - lastGroupPlayed < groupCooldown) {
      return false;
    }

    const previous = this.lastGroupChoice.get(groupKey);
    const pool = options.skipRecent !== false && candidates.length > 1
      ? candidates.filter((candidate) => candidate !== previous)
      : candidates;
    const id = Phaser.Utils.Array.GetRandom(pool.length > 0 ? pool : candidates);

    this.lastGroupChoice.set(groupKey, id);
    this.lastPlayedAt.set(groupKey, now);

    return this.playSound(id, { ...options, cooldownMs: 0 });
  }

  playAmbience(id: string, options: AmbienceOptions = {}): void {
    this.currentAmbienceOptions = { ...options };

    if (this.currentAmbienceId === id && this.currentAmbience?.isPlaying) {
      this.setManagedSoundVolume(this.currentAmbience, this.effectiveVolume(options.volume ?? 1, 'ambience'));
      return;
    }

    if (!this.scene.cache.audio.exists(id)) {
      this.stopAmbience();
      return;
    }

    const previous = this.currentAmbience;
    this.currentAmbienceId = id;
    this.currentAmbience = null;

    if (!this.isUnlocked()) {
      return;
    }

    try {
      const next = this.scene.sound.add(id, {
        loop: true,
        volume: 0,
        rate: options.rate ?? 1,
      }) as ManagedSound;
      this.currentAmbience = next;
      next.play();
      this.fadeSound(next, this.effectiveVolume(options.volume ?? 1, 'ambience'), options.fadeMs ?? 700);

      if (previous) {
        this.fadeOutAndDestroy(previous, options.fadeMs ?? 500);
      }
    } catch {
      previous?.stop();
      previous?.destroy();
      this.currentAmbience = null;
    }
  }

  stopAmbience(id?: string): void {
    if (id && this.currentAmbienceId !== id) {
      return;
    }

    if (this.currentAmbience) {
      this.fadeOutAndDestroy(this.currentAmbience, 400);
    }

    this.currentAmbience = null;
    this.currentAmbienceId = null;
  }

  crossfadeAmbience(id: string, options: AmbienceOptions = {}): void {
    this.playAmbience(id, options);
  }

  setMasterVolume(value: number): void {
    this.masterVolume = Phaser.Math.Clamp(value, 0, 1);
    AudioSystem.globalMasterVolume = this.masterVolume;
    this.refreshAmbienceVolume();
  }

  setSfxVolume(value: number): void {
    this.sfxVolume = Phaser.Math.Clamp(value, 0, 1);
    AudioSystem.globalSfxVolume = this.sfxVolume;
  }

  setAmbienceVolume(value: number): void {
    this.ambienceVolume = Phaser.Math.Clamp(value, 0, 1);
    AudioSystem.globalAmbienceVolume = this.ambienceVolume;
    this.refreshAmbienceVolume();
  }

  mute(): void {
    this.muted = true;
    AudioSystem.globalMuted = true;
    this.refreshAmbienceVolume();
  }

  unmute(): void {
    this.muted = false;
    AudioSystem.globalMuted = false;
    this.refreshAmbienceVolume();

    if (this.currentAmbienceId && !this.currentAmbience?.isPlaying) {
      this.playAmbience(this.currentAmbienceId, this.currentAmbienceOptions);
    }
  }

  setMuted(value: boolean): void {
    if (value) {
      this.mute();
    } else {
      this.unmute();
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  destroy(): void {
    if (this.currentAmbience) {
      this.currentAmbience.stop();
      this.currentAmbience.destroy();
    }

    this.currentAmbience = null;
    this.currentAmbienceId = null;
    this.unlockDisposers.forEach((dispose) => dispose());
    this.unlockDisposers = [];
  }

  private canPlay(id: string): boolean {
    return !this.muted && this.isUnlocked() && this.scene.cache.audio.exists(id);
  }

  private isUnlocked(): boolean {
    if (this.unlocked) {
      return true;
    }

    this.unlocked = !this.scene.sound.locked;
    return this.unlocked;
  }

  private bindUnlock(): void {
    const unlock = () => {
      const soundManager = this.scene.sound as Phaser.Sound.BaseSoundManager & { unlock?: () => void };

      if (soundManager.locked && typeof soundManager.unlock === 'function') {
        soundManager.unlock();
      }

      this.unlocked = !this.scene.sound.locked;

      if (this.currentAmbienceId && !this.currentAmbience?.isPlaying && !this.muted) {
        const id = this.currentAmbienceId;
        const options = this.currentAmbienceOptions;
        this.currentAmbienceId = null;
        this.playAmbience(id, options);
      }
    };

    this.scene.input.once('pointerdown', unlock);
    const unlockFromWindow = () => unlock();
    const eventOptions: AddEventListenerOptions = { once: true, capture: true };
    window.addEventListener('pointerdown', unlockFromWindow, eventOptions);
    window.addEventListener('mousedown', unlockFromWindow, eventOptions);
    window.addEventListener('touchstart', unlockFromWindow, eventOptions);
    window.addEventListener('keydown', unlockFromWindow, eventOptions);
    this.unlockDisposers.push(() => {
      window.removeEventListener('pointerdown', unlockFromWindow, eventOptions);
      window.removeEventListener('mousedown', unlockFromWindow, eventOptions);
      window.removeEventListener('touchstart', unlockFromWindow, eventOptions);
      window.removeEventListener('keydown', unlockFromWindow, eventOptions);
    });
  }

  private effectiveVolume(base: number, kind: 'sfx' | 'ambience'): number {
    if (this.muted) {
      return 0;
    }

    const channel = kind === 'sfx' ? this.sfxVolume : this.ambienceVolume;
    return Phaser.Math.Clamp(base * this.masterVolume * channel, 0, 1);
  }

  private refreshAmbienceVolume(): void {
    if (!this.currentAmbience) {
      return;
    }

    this.setManagedSoundVolume(this.currentAmbience, this.effectiveVolume(this.currentAmbienceOptions.volume ?? 1, 'ambience'));
  }

  private fadeSound(sound: ManagedSound, targetVolume: number, duration: number): void {
    this.scene.tweens.add({
      targets: sound,
      volume: targetVolume,
      duration,
      onUpdate: () => this.setManagedSoundVolume(sound, sound.volume ?? targetVolume),
    });
  }

  private fadeOutAndDestroy(sound: ManagedSound, duration: number): void {
    this.scene.tweens.add({
      targets: sound,
      volume: 0,
      duration,
      onUpdate: () => this.setManagedSoundVolume(sound, sound.volume ?? 0),
      onComplete: () => {
        sound.stop();
        sound.destroy();
      },
    });
  }

  private setManagedSoundVolume(sound: ManagedSound, value: number): void {
    const volume = Phaser.Math.Clamp(value, 0, 1);

    if (sound.setVolume) {
      sound.setVolume(volume);
    } else {
      sound.volume = volume;
    }
  }
}
