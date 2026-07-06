# Dungeon Structure V2 — Loot Me If You Can

| | |
|---|---|
| **Note V1.4** | Initial Dungeon Layout V1.1 implémenté : ~177 cases creusées (~48.1%) réparties en 7 salles/couloirs nommés, corrigeant la V1 (40 cases, ~10.9%) qui s'était révélée *plus* linéaire malgré son faible taux de creusement. Détails : [INITIAL_DUNGEON_LAYOUT_V1.md](./INITIAL_DUNGEON_LAYOUT_V1.md). |
| **Statut** | Spec vivante — Initial Dungeon Layout V1.1 est implémenté, le reste demeure proposition |
| **Propriétaire** | Game Design |
| **Dernière mise à jour** | 2026-07-06 |
| **Documents liés** | [DECISIONS.md](./DECISIONS.md) (D-009) · [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md) (§4-6) · [ROADMAP.md](./ROADMAP.md) (Milestone 2) · [IDEAS.md](./IDEAS.md) |

---

Ce document répond à une demande studio : préparer l'évolution du donjon vers une carte moins donnée, plus dangereuse à creuser, avec un boss que le joueur peut repositionner, et une trajectoire vers plusieurs niveaux et sous-boss. **Rien dans ce document n'est codé.** C'est une spec de référence pour séquencer les prochains chantiers sans les mélanger.

## 1. Problèmes actuels

- Le donjon démarre déjà partiellement creusé : sur la grille 23×16 (368 cases), l'état initial (`src/game/dungeonTiles.ts`) compte **70 cases creusées (19 %) pour 298 cases de roche (81 %)**. En valeur brute, ce n'est pas énorme — mais ces 70 cases forment déjà un réseau de couloirs ramifiés reliant l'entrée au trésor et au trône, **plus trois salles 3×3 déjà dégagées** (`(2,8)-(4,10)`, `(8,2)-(10,3)`, `(11,6)-(13,8)`). Le joueur a donc l'impression que le gros du travail de creusement est déjà fait pour lui, même si le pourcentage global de roche reste élevé.
- Le trésor `(16,4)` et le trône du boss `(22,12)` sont fixes depuis la v0.5.0. Le joueur ne peut influencer ni leur position ni la difficulté d'accès au boss au-delà de ce qu'il construit autour.
- Le boss est immobile : aucune décision de placement, aucune tension entre « je protège mon trésor » et « je protège mon boss ».
- La carte est strictement identique à chaque nouvelle partie (mêmes cellules, même tracé de départ), ce qui limite la rejouabilité une fois la disposition optimale trouvée.
- Il n'existe qu'un seul boss et qu'une seule salle finale : pas de notion de progression par zones, pas de garde intermédiaire.
- La sidebar (voir passe UI/UX associée à cette même livraison) rendait ces informations de terrain plus visibles qu'utiles, sans aider le joueur à décider où creuser ensuite.

## 2. Objectifs

- Rendre le début de partie plus brut : le joueur doit sentir qu'il **façonne** le donjon plutôt que d'hériter d'un tracé presque terminé.
- Donner au joueur un vrai levier stratégique sur la position du boss, borné par des règles simples (zone de sûreté, accessibilité garantie).
- Introduire un outil de reconstruction bon marché (« Mur ») sans renier D-009 (le donjon se creuse, on ne pose pas de murs comme objets).
- Préparer, sans les construire, une génération de carte par run et une progression en zones/niveaux avec sous-boss — pour que les décisions actuelles (grille, cellules protégées, validation de chemin) restent compatibles avec ces cibles.
- Séquencer ces chantiers pour qu'aucun ne casse la boucle de jeu actuelle (5 aventuriers par vague, économie, chronique, barks, IA).

## 3. Boss déplaçable

**Règle proposée :**
- Un outil « Déplacer le boss », disponible uniquement en phase Préparation.
- Coût nul ou très faible (à trancher en V1.2 ; probablement gratuit la première fois par expédition pour ne pas pénaliser l'expérimentation, un petit coût si répété trop souvent).
- Destination valide = une case de **salle** (`room`/`throne`) déjà creusée, jamais de la roche brute ni un couloir simple — le boss doit occuper une pièce, pas un couloir.
- Interdictions : la zone de sûreté de départ (voir §4), toute case qui casserait la validation de chemin entrée → trésor → boss, toute case qui rendrait le boss totalement inatteignable.
- Le trésor et le boss doivent conserver une logique de **progression** : la distance de chemin entrée → boss ne doit jamais devenir strictement inférieure à la distance entrée → trésor (sinon le joueur pourrait rendre le boss trivialement plus facile à atteindre que le trésor, ce qui inverserait la tension centrale du jeu).
- Implémentation suggérée : réutiliser le validateur de chemin existant (celui qui protège déjà `dig`/`door`/salles) en lui ajoutant un mode « déplacement de cellule spéciale » plutôt que d'écrire un second système de validation.

**Pourquoi ce n'est pas codé dans cette passe :** déplacer `BOSS_CELL` touche la simulation (pathfinding, IA du boss, cellules protégées `isProtectedCell`), pas seulement l'UI. C'est un chantier V1.2 à part entière.

## 4. Zone de sûreté

- Rayon proposé : **2 à 3 cases** autour de `ENTRY_CELL`, à trancher par playtest (2 cases = pression rapide, 3 cases = marge de manœuvre pour les aventuriers avant le premier danger).
- Dans cette zone, interdiction de placer : le boss (voir §3), des pièges, des monstres, des portes bloquantes.
- Objectif : garantir qu'aucune expédition ne meure à la sortie littérale de l'entrée — la tension doit venir de la progression dans le donjon, pas d'un mur de la mort au démarrage.
- Cette règle est un **prérequis** du boss déplaçable (§3) : sans zone de sûreté, un joueur pourrait déplacer le boss juste devant l'entrée.

## 5. Une vraie structure de donjon au départ (et non "le moins creusé possible")

**Historique :** une première passe (V1.4 initiale) a réduit le sol creusé de 19 % à 10.9 % en rabougrissant chaque zone à une cavité minimale. En jeu, le résultat était pire : le chemin entrée → trésor → boss était **plus** direct qu'avant, sans vraies salles ni embranchements. Le problème n'était pas le pourcentage de sol creusé, c'était la **topologie**.

**Cible retenue (V1.1, voir [INITIAL_DUNGEON_LAYOUT_V1.md](./INITIAL_DUNGEON_LAYOUT_V1.md)) :**
- Viser environ 45-55 % de sol creusé (salles + couloirs), pas un minimum absolu.
- Construire de vraies salles dimensionnées (zone d'entrée, salle de défense proche mais hors zone de sûreté, une poche latérale optionnelle, salle du trésor décalée, antichambre, salle du boss), reliées par des couloirs étroits pleins de virages.
- Garantir un **point d'étranglement obligatoire** (aujourd'hui la salle de défense et son unique sortie) que toute expédition doit traverser, pour que portes/pièges/monstres placés là comptent systématiquement.
- Le chemin entrée → boss doit être long (37 cases) et sinueux (11 virages), sans que l'entrée, le trésor et le boss soient à peu près alignés.
- Cette modification reste **isolée** (données pures dans `src/game/dungeonTiles.ts`), mais elle a nécessité d'ajouter des tests de topologie (longueur de chemin, nombre de virages, alignement, nombre de zones) en plus du seul ratio creusé — un ratio bas ne suffit pas à garantir un bon donjon.

## 6. Construction de murs

**Tension avec D-009 :** *Loot Me If You Can* a tranché que le donjon se creuse, pas qu'il se construit — les murs ne sont pas des objets, ce sont des cases de roche non creusée (voir [DECISIONS.md](./DECISIONS.md) D-009). Une action « Mur » qui « poserait un mur » contredirait cette décision actée.

**Reformulation proposée, compatible avec D-009 :** l'action « Mur » n'ajoute pas un objet mur — elle **rebouche** une case déjà creusée (la retransforme en roche). C'est un outil de correction/redirection, pas une nouvelle brique de construction. Nom d'affichage possible à trancher plus tard (« Reboucher », « Combler » sont plus fidèles à la mécanique que « Mur », mais l'UI actuelle garde le libellé « Mur » proposé par le studio en attendant confirmation).

**Règles proposées :**
- Coût faible : 3 à 5 or (aligné sur la demande studio).
- Cible : une case actuellement `floor`/`room` (creusée), hors cellules protégées (`entrance`, `treasure`, `throne`) et hors salles spécialisées avec du contenu actif (à confirmer — interdire de reboucher sous un piège/monstre posé, ou forcer leur retrait/remboursement automatique d'abord).
- Doit repasser par la validation de chemin existante : reboucher une case ne doit jamais casser l'accessibilité entrée → trésor → boss, exactement comme `dig` le fait déjà en sens inverse.
- Rôle attendu : corriger une erreur de creusement, fermer un raccourci trop dangereux, forcer les intrus à repasser par une zone défendue.

**Pourquoi ce n'est pas codé dans cette passe :** la validation de chemin actuelle est écrite pour du creusement (ajout de sol), pas pour du rebouchage (retrait de sol) ; il faut vérifier qu'elle se comporte correctement dans les deux sens avant d'exposer un bouton fonctionnel. Le bouton « Mur » ajouté dans cette passe est **désactivé et marqué « Bientôt »** : il ne déclenche aucune action.

## 7. Génération aléatoire au début du run

**Proposition retenue :** générer une carte aléatoire **une seule fois, au lancement d'une nouvelle partie** (`startNewGame()`), puis la conserver telle quelle (creusée et modifiée par le joueur) pendant toute la durée du run, à travers toutes les expéditions.

**Structure future envisagée :**
- Une **seed de run**, stockée avec la partie, pour permettre un futur mode « défi » ou un partage de carte entre joueurs.
- Un générateur qui pose, dans cet ordre : l'entrée, la zone de sûreté (§4), l'emplacement du trésor, l'emplacement du boss (respectant la contrainte de progression du §3), puis quelques cavernes/couloirs initiaux minimaux (§5) reliant ces points.
- Une validation de chemin systématique après génération (réutilisation du validateur existant), avec re-génération ou correction automatique si le résultat est invalide.
- Une densité de roche paramétrable (probablement autour de l'actuel 80-85 %, à confirmer par playtest une fois §5 en place).

## 8. Pourquoi ne pas régénérer à chaque expédition

Régénérer la carte à chaque expédition rendrait inutiles toutes les décisions de creusement, de placement de pièges/monstres et de portes prises lors des expéditions précédentes — cela contredirait directement le principe central du jeu (le Maître du Donjon façonne un lieu qui **persiste** et qui **se souvient**, voir [GAME_VISION.md](./GAME_VISION.md) et D-010). Une nouvelle carte par expédition transformerait le jeu en une suite de niveaux jetables plutôt qu'un donjon vivant. Cette option n'est envisagée que si une décision explicite et documentée (nouvelle entrée D-0XX) venait un jour la justifier — ce n'est pas le cas aujourd'hui.

## 9. Progression vers le boss

Le jeu ne doit plus proposer un unique couloir direct vers le boss. Deux idées complémentaires, dans l'ordre de priorité :

1. **Court terme (V2.1, sans multi-niveaux) :** structurer une même carte en zones fonctionnelles traversées dans l'ordre — zone d'entrée (§4), zone de défense principale, antichambre, salle du trésor, salle du boss. Le joueur creuse et arme chacune de ces zones différemment ; les intrus les traversent dans cet ordre logique plutôt que par le chemin le plus court instantané.
2. **Long terme (V3.0) :** transformer ces zones en véritables niveaux/étages distincts, avec une transition explicite entre eux (voir §11).

## 10. Sous-boss futurs

- Rôle : gardiens de zone, placés dans les salles spécialisées introduites par le Milestone 2 (garde, crypte, laboratoire…) ou dans les futures antichambres (§9).
- Doivent rester cohérents avec D-002 (la difficulté vient de l'intelligence et des rôles, jamais du nombre) : un sous-boss est une unité nommée et distincte, pas un monstre générique renforcé.
- Doivent produire du récit (D-005) : un sous-boss vaincu ou contourné doit pouvoir être mentionné dans la chronique/le débrief, au même titre qu'un sbire vétéran aujourd'hui.
- Non implémentés, non planifiés avant que §9 (zones) ait une première version fonctionnelle.

## 11. Plusieurs niveaux futurs

- Ne pas commencer par de vrais étages séparés. Commencer par les zones sur une même carte (§9), qui posent déjà la question de la progression sans le coût technique d'un changement de scène/niveau.
- Une fois les zones validées par le jeu et par les joueurs, envisager de transformer certaines transitions de zone en véritables changements de niveau (nouvelle grille, nouveau boss de zone, retour impossible ou coûteux).
- Implications à anticiper mais pas à résoudre maintenant : sauvegarde de l'état de chaque niveau, coût de creusement cumulé, added complexity pour la chronique et le debrief (quel niveau raconter ?).

## 12. Plan d'implémentation par étapes

| Étape | Contenu | Statut |
|---|---|---|
| **V1.1** | Sidebar propre (audit, hiérarchie, actions principales visibles, accordéons réduits, emplacements UI pour Mur/Déplacer boss désactivés) | ✅ Cette passe |
| **V1.2** | Boss déplaçable + zone de sûreté | ⚪ Spec seulement (§3, §4) |
| **V1.3** | Murs constructibles (rebouchage) + validation de chemin bidirectionnelle | ⚪ Spec seulement (§6) |
| **V1.4** | Map initiale avec vraies salles/couloirs (~48-52% sol/roche) | Implémenté (V1.1) — voir `docs/INITIAL_DUNGEON_LAYOUT_V1.md` |
| **V2.0** | Génération aléatoire par run (seed, cavernes initiales, validation) | ⚪ Spec seulement (§7, §8) |
| **V2.1** | Zones / antichambres sur une même carte | ⚪ Spec seulement (§9) |
| **V3.0** | Plusieurs niveaux + sous-boss | ⚪ Spec seulement (§10, §11) |

Chaque étape doit repasser par sa propre passe de tests (`npm run smoke*`) et, si elle modifie une règle durable, par une nouvelle entrée dans [DECISIONS.md](./DECISIONS.md).
