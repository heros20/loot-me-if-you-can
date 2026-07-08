/**
 * Petits utilitaires de formatage texte partages entre domUi.ts et
 * guildTavernView.ts. Aucune regle de jeu ici.
 */

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'warrior':
      return 'Guerrier';
    case 'thief':
      return 'Voleur';
    case 'mage':
      return 'Mage';
    case 'healer':
      return 'Soigneur';
    case 'cartographer':
      return 'Cartographe';
    case 'guild':
      return 'Guilde';
    case 'rumor':
      return 'Rumeur';
    default:
      return role;
  }
}

export function roleInitial(role: string): string {
  switch (role) {
    case 'warrior':
      return 'G';
    case 'thief':
      return 'V';
    case 'mage':
      return 'M';
    case 'healer':
      return 'S';
    case 'cartographer':
      return 'C';
    case 'guild':
      return 'PN';
    case 'rumor':
      return '?';
    default:
      return '?';
  }
}
