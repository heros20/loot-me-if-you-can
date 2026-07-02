# Ideas Backlog — Loot Me If You Can

| | |
|---|---|
| **Statut** | Vivant — backlog perpétuel, jamais « terminé » |
| **Propriétaire** | Game Design |
| **Dernière mise à jour** | 2026-07-02 |
| **Documents liés** | [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) · [ROADMAP.md](./ROADMAP.md) · [DECISIONS.md](./DECISIONS.md) |

---

## Comment utiliser ce document

Une idée circule entre quatre colonnes au fil de sa vie. Elle ne quitte jamais ce fichier — même refusée, elle reste tracée pour éviter de redébattre indéfiniment des mêmes options sans mémoire des raisons passées.

| Colonne | Signification |
|---|---|
| **Validées** | Approuvées, rattachées à un milestone dans [ROADMAP.md](./ROADMAP.md) / [MILESTONES.md](./MILESTONES.md) |
| **À explorer** | Piste intéressante, pas encore tranchée — nécessite prototype ou discussion |
| **Refusées** | Écartées explicitement, avec justification liée aux Design Principles |
| **Parking** | Bonne idée, mais pas maintenant — pas de raison de la refuser, juste pas de priorité actuelle |

Une idée qui passe en **Validées** doit être accompagnée d'un renvoi vers le milestone qui la porte. Une idée qui passe en **Refusées** doit citer le principe de design invoqué.

---

## Validées

| Idée | Détail | Milestone |
|---|---|---|
| Upgrades de pièges entre les expéditions | Un piège investi progresse au lieu de repartir à coût identique | M1 |
| Extraction du système de combat | Module dédié hors de `DungeonSimulation.ts` | M1 |
| Minuteurs de convalescence et cicatrices | Blessures avec effets comportementaux visibles | M1 |
| Aperçus de placement et raccourcis clavier | Portée de piège/monstre visible avant pose, touches 1/2/3 pour le boss | M1 |
| Donjon creusé dans la roche | Remplace la pose de murs par un vrai creusement (voir [DECISIONS.md](./DECISIONS.md) D-009) | M2 |
| Salles et portes distinctes | Remplace le carvage 3×3 par une vraie typologie de salles | M2 |
| Salles spécialisables | Voir GDD §6 (garde, crypte, laboratoire, temple, prison, arsenal…) | M2 |
| Salle du trône du boss | Salle spécialisée dédiée au boss, distincte de la cellule fixe actuelle | M2 |
| Territoire du donjon comme ressource | L'espace creusé devient une ressource lisible, pas seulement l'or | M2 |
| Guerre de l'information | Le royaume n'apprend que via survivants, cartographes, rumeurs (voir [DECISIONS.md](./DECISIONS.md) D-010) | M3 |
| Cartographie progressive | Les expéditions rapportent des fragments d'information, pas une carte complète | M3 |
| Informations imparfaites | Exactes, incomplètes, anciennes, mal interprétées ou contradictoires | M3 |
| Guilde vivante (recruteurs, rancunes, effectif limité) | Voir GDD §19 | M3 |
| Réputation de guilde active | Le champ existant devient réellement utilisé | M3 |
| Alarme du royaume branchée au gameplay | Le champ `alarm` influence fréquence/composition des expéditions | M3 |
| Pressions régionales (peur, cupidité, gloire, prime) | Voir GDD §18 | M3 |
| Apprentissage collectif étendu (cartes de pièges partagées) | Voir GDD §20 | M3 |
| Ciblage vindicatif par individu nommé | Un héritier vise le monstre exact, pas seulement son type | M3 |
| Écran de taverne avec rumeurs concurrentes | Remplace la rumeur unique actuelle | M3 |
| Cartographe comme classe stratégique future | Documentée dès maintenant (voir GDD §24), pas nécessairement implémentée à ce stade | M3 (structure seulement) |
| Nouveaux pièges et monstres | Élargit la palette tactique | M4 |
| Capacités de boss supplémentaires + chemin d'amélioration | Financé par la réputation/infamie | M4 |
| Traits d'équipement pour aventuriers | Débloqués après morts répétées | M4 |
| Objets légendaires récupérables/perdables | Voir GDD §31 | M4 |
| Héritage d'objets (pas seulement de rancunes) | Étend le système d'héritiers existant | M4 |
| Retour des voleurs évadés, plus riches | Pression de prime sur le trésor volé | M4 |
| Direction artistique complète + assets définitifs | Voir Milestone 5 | M5 |
| Système audio complet | Musique, SFX, mute | M5 |

---

## À explorer

*Pistes jugées cohérentes avec la vision, mais non encore validées formellement — nécessitent un prototype, une discussion d'équipe, ou une clarification avant de rejoindre la roadmap.*

- **Méta-progression trans-parties compatible avec « on perd toujours »** — par exemple, un royaume qui démarre légèrement différent (jamais plus facile) selon le souvenir collectif des parties précédentes, sans jamais donner au joueur un chemin vers l'invincibilité. Lié à D-006 dans [DECISIONS.md](./DECISIONS.md).
- **Salles nommées avec titre persistant** basé sur ce qui s'y est passé (ex. « la Salle du Dernier Soupir »), alimentant les chroniques sans ajouter de mécanique de gameplay pure.
- **Compétition entre plusieurs guildes actives simultanément**, chacune avec sa propre pression de rôle et ses propres rumeurs.
- **Difficulté adaptative visible sous forme de « dossier de menace »** consultable par le joueur en phase Build, résumant ce que le royaume sait actuellement du donjon (transparence totale de l'IA, à tester pour vérifier que ça ne tue pas la surprise).
- **Capacité du joueur à consulter l'arbre généalogique complet d'une lignée d'héritiers** depuis l'écran de débriefing.
- **Monstres capables de fuir et de revenir soignés**, au lieu de mourir ou survivre, pour nuancer le systeme de mort actuel des monstres.
- **Système de « legs » du boss** : le boss garde une trace des adventuriers qui l'ont blessé gravement mais pas tué, influençant ses priorités de ciblage aux expéditions suivantes.
- **Types de roche** — la roche à creuser pourrait ne pas être uniforme (roche tendre, roche dure, filon rare), ouvrant des décisions de creusement plutôt qu'une simple case binaire creusée/non creusée. Lié à D-009.
- **Coût variable de creusement** — le coût d'une case creusée pourrait dépendre de sa position, du type de roche, ou de la proximité d'une salle existante, plutôt qu'un coût fixe uniforme. Lié à D-009.
- **Zones naturelles souterraines** (champignons, cristaux, lave, eau) — des éléments de décor generés par la roche elle-même, avec des effets de gameplay propres (soin, dégâts de zone, ralentissement, ressource récoltable). Lié à D-009.
- **Vieillissement des informations du Royaume** — une information rapportée par une expédition ancienne pourrait perdre en fiabilité avec le temps, indépendamment d'une modification effective du donjon. Lié à D-010, GDD §23.
- **Fausses informations transmises par des survivants paniqués** — un survivant traumatisé ou en fuite pourrait rapporter un récit déformé (surestimer les pertes, mal situer un piège), nourrissant la désinformation plutôt qu'un simple flou. Lié à D-010, GDD §23.
- **Missions de reconnaissance envoyées par la Guilde** — avant une expédition de pillage classique, la Guilde pourrait envoyer une petite expédition dédiée à la cartographie, avec un profil de risque différent (moins combative, plus mobile). Lié à D-010, GDD §22 et §24.

---

## Refusées

*Idées explicitement écartées. Elles ne sont pas supprimées : elles servent de mémoire pour ne pas rouvrir un débat déjà tranché sans nouvel argument.*

| Idée | Raison du refus | Principe invoqué |
|---|---|---|
| Expéditions à effectif croissant (plus de 5 aventuriers) | Contredit l'axe de difficulté choisi | Design Principles #6 — « la difficulté augmente grâce à l'intelligence, jamais au nombre » |
| Condition de victoire finale / fin heureuse | Contredit le pitch central du jeu | Design Principles #3 — « le joueur finit toujours par perdre » ; voir D-004 |
| Mode PvP entre donjons de joueurs | Brise le fantasme asymétrique joueur-vs-royaume qui est le cœur de l'expérience | Vision du jeu, §8 « Ce que le jeu n'est pas » |
| Objets ou upgrades achetables avec de l'argent réel | Incompatible avec un jeu pensé pour une fin méritée plutôt qu'une rétention monétisée | Vision du jeu, §8 |
| Système de score global unique remplaçant les chroniques narratives | Réduit la mémorabilité à un chiffre | Design Principles #2 et #16 |
| Difficulté purement basée sur un multiplicateur global sans adaptation comportementale | Ne produit pas de récit ; contredit la promesse du royaume qui apprend | Design Principles #11 et #12 ; voir D-002 |
| Traiter pièges et monstres de façon économiquement symétrique | Réduit la diversité des décisions de construction | Design Principles #8 ; voir D-007 |

---

## Parking

*Idées valables, sans urgence ni raison de refus — à reconsidérer quand un milestone pertinent s'ouvrira.*

- **Portage mobile / tactile** — pertinent seulement après stabilisation complète de l'UI desktop (post-M5).
- **Mode spectateur / partage de replay d'une expédition mémorable** — intéressant pour la viralité, mais dépend d'un système de log d'événements plus structuré que l'actuel `WaveReport`.
- **Localisation en anglais et autres langues** — le jeu est actuellement pensé et écrit en français ; l'internationalisation est une décision de production à prendre après M4 (Art Direction), pas avant.
- **Classement en ligne des meilleurs scores** — nécessite une infrastructure serveur, hors du périmètre « aucun runtime serveur requis » du V0 (voir `README.md`).
- **Éditeur de donjon partageable entre joueurs** — séduisant mais potentiellement en tension avec le principe « une décision intéressante vaut mieux qu'un nouvel objet » si mal cadré ; à retester une fois le système de creusement du Milestone 2 (*Carve Your Kingdom*) livré.
