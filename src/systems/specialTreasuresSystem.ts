import type {
  AdventurerProfile,
  AdventurerRole,
  DungeonTreasure,
  DungeonTreasureKind,
  SpecialTreasureBonus,
  SpecialTreasureKind,
} from '../game/types';

export const SPECIAL_TREASURE_BALANCE = {
  weaponCost: 18,
  armorCost: 18,
  techniqueCost: 20,
  weaponDamageBonus: 2,
  armorMaxHpBonus: 8,
  armorDamageReduction: 1,
  techniqueDamageBonus: 1,
  techniqueMageDamageBonus: 2,
  techniqueHealingBonus: 3,
  attractionWeight: 3,
};

export interface SpecialTreasureStatModifiers {
  damageBonus: number;
  maxHpBonus: number;
  incomingDamageReduction: number;
  healingBonus: number;
}

export function isSpecialTreasureKind(kind: DungeonTreasureKind): boolean {
  return kind === 'specialWeapon' || kind === 'specialArmor' || kind === 'specialTechnique';
}

export function specialKindFromTreasureKind(kind: DungeonTreasureKind): SpecialTreasureKind | null {
  switch (kind) {
    case 'specialWeapon':
      return 'weapon';
    case 'specialArmor':
      return 'armor';
    case 'specialTechnique':
      return 'technique';
    default:
      return null;
  }
}

export function specialTreasureLabel(kind: SpecialTreasureKind): string {
  switch (kind) {
    case 'weapon':
      return 'Lame empruntee';
    case 'armor':
      return 'Armure insolente';
    case 'technique':
      return 'Technique interdite';
    default:
      return 'Relique suspecte';
  }
}

export function specialTreasureValue(kind: SpecialTreasureKind): number {
  switch (kind) {
    case 'weapon':
      return SPECIAL_TREASURE_BALANCE.weaponCost;
    case 'armor':
      return SPECIAL_TREASURE_BALANCE.armorCost;
    case 'technique':
      return SPECIAL_TREASURE_BALANCE.techniqueCost;
    default:
      return 0;
  }
}

export function grantSpecialTreasureBonus(
  profile: AdventurerProfile,
  treasure: DungeonTreasure,
  wave: number,
): SpecialTreasureBonus | null {
  const kind = specialKindFromTreasureKind(treasure.kind);

  if (!kind || profile.specialTreasureBonuses.some((bonus) => bonus.kind === kind)) {
    return null;
  }

  const bonus: SpecialTreasureBonus = {
    kind,
    label: specialTreasureLabel(kind),
    sourceTreasureId: treasure.id,
    acquiredWave: wave,
  };

  profile.specialTreasureBonuses.push(bonus);
  return bonus;
}

export function computeSpecialTreasureModifiers(profile: AdventurerProfile): SpecialTreasureStatModifiers {
  return computeSpecialTreasureModifiersFromBonuses(profile.role, profile.specialTreasureBonuses);
}

export function computeSpecialTreasureModifiersFromBonuses(
  role: AdventurerRole,
  bonuses: SpecialTreasureBonus[],
): SpecialTreasureStatModifiers {
  const hasWeapon = bonuses.some((bonus) => bonus.kind === 'weapon');
  const hasArmor = bonuses.some((bonus) => bonus.kind === 'armor');
  const hasTechnique = bonuses.some((bonus) => bonus.kind === 'technique');
  const techniqueDamageBonus = hasTechnique
    ? role === 'mage'
      ? SPECIAL_TREASURE_BALANCE.techniqueMageDamageBonus
      : role === 'healer'
        ? 0
        : SPECIAL_TREASURE_BALANCE.techniqueDamageBonus
    : 0;

  return {
    damageBonus: (hasWeapon ? SPECIAL_TREASURE_BALANCE.weaponDamageBonus : 0) + techniqueDamageBonus,
    maxHpBonus: hasArmor ? SPECIAL_TREASURE_BALANCE.armorMaxHpBonus : 0,
    incomingDamageReduction: hasArmor ? SPECIAL_TREASURE_BALANCE.armorDamageReduction : 0,
    healingBonus: hasTechnique && role === 'healer' ? SPECIAL_TREASURE_BALANCE.techniqueHealingBonus : 0,
  };
}

export function describeSpecialTreasureBonus(
  profileName: string,
  bonus: SpecialTreasureBonus,
  role: AdventurerRole | null = null,
): string {
  switch (bonus.kind) {
    case 'weapon':
      return `${profileName} revient avec une lame volee (+${SPECIAL_TREASURE_BALANCE.weaponDamageBonus} degats).`;
    case 'armor':
      return `${profileName} porte maintenant une armure du donjon (+${SPECIAL_TREASURE_BALANCE.armorMaxHpBonus} PV, -${SPECIAL_TREASURE_BALANCE.armorDamageReduction} degat recu).`;
    case 'technique':
      return `${profileName} a appris une technique interdite (${describeTechniqueEffect(role)}).`;
    default:
      return `${profileName} revient change par un tresor special.`;
  }
}

export function formatSpecialTreasureBonuses(
  bonuses: SpecialTreasureBonus[],
  role: AdventurerRole | null = null,
): string[] {
  return bonuses.map((bonus) => {
    switch (bonus.kind) {
      case 'weapon':
        return `${bonus.label} (+${SPECIAL_TREASURE_BALANCE.weaponDamageBonus} degats)`;
      case 'armor':
        return `${bonus.label} (+${SPECIAL_TREASURE_BALANCE.armorMaxHpBonus} PV, -${SPECIAL_TREASURE_BALANCE.armorDamageReduction} degat recu)`;
      case 'technique':
        return `${bonus.label} (${describeTechniqueEffect(role)})`;
      default:
        return bonus.label;
    }
  });
}

export function specialTreasurePickupText(kind: SpecialTreasureKind): string {
  switch (kind) {
    case 'weapon':
      return 'Arme equipee';
    case 'armor':
      return 'Armure equipee';
    case 'technique':
      return 'Technique apprise';
    default:
      return 'Tresor vole';
  }
}

function describeTechniqueEffect(role: AdventurerRole | null): string {
  switch (role) {
    case 'mage':
      return `+${SPECIAL_TREASURE_BALANCE.techniqueMageDamageBonus} degats`;
    case 'healer':
      return `+${SPECIAL_TREASURE_BALANCE.techniqueHealingBonus} soin`;
    case 'warrior':
    case 'thief':
    case 'cartographer':
      return `+${SPECIAL_TREASURE_BALANCE.techniqueDamageBonus} degat`;
    default:
      return 'passif de role';
  }
}
