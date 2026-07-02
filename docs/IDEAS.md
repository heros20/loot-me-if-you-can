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
| Salles et portes distinctes | Remplace le carvage 3×3 par une vraie typologie de salles | M1 |
| Upgrades de pièges entre les vagues | Un piège investi progresse au lieu de repartir à coût identique | M1 |
| Extraction du système de combat | Module dédié hors de `DungeonSimulation.ts` | M1 |
| Minuteurs de convalescence et cicatrices | Blessures avec effets comportementaux visibles | M1 |
| Aperçus de placement et raccourcis clavier | Portée de piège/monstre visible avant pose, touches 1/2/3 pour le boss | M1 |
| Guilde vivante (recruteurs, rancunes, effectif limité) | Voir GDD §16 | M2 |
| Réputation de guilde active | Le champ existant devient réellement utilisé | M2 |
| Alarme du royaume branchée au gameplay | Le champ `alarm` influence fréquence/composition des vagues | M2 |
| Pressions régionales (peur, cupidité, gloire, prime) | Voir GDD §15 | M2 |
| Apprentissage collectif étendu (cartes de pièges partagées) | Voir GDD §17 | M2 |
| Ciblage vindicatif par individu nommé | Un héritier vise le monstre exact, pas seulement son type | M2 |
| Écran de taverne avec rumeurs concurrentes | Remplace la rumeur unique actuelle | M2 |
| Nouveaux pièges et monstres | Élargit la palette tactique | M3 |
| Capacités de boss supplémentaires + chemin d'amélioration | Financé par la réputation/infamie | M3 |
| Traits d'équipement pour aventuriers | Débloqués après morts répétées | M3 |
| Objets légendaires récupérables/perdables | Voir GDD §24 | M3 |
| Héritage d'objets (pas seulement de rancunes) | Étend le système d'héritiers existant | M3 |
| Retour des voleurs évadés, plus riches | Pression de prime sur le trésor volé | M3 |
| Direction artistique complète + assets définitifs | Voir Milestone 4 | M4 |
| Système audio complet | Musique, SFX, mute | M4 |

---

## À explorer

*Pistes jugées cohérentes avec la vision, mais non encore validées formellement — nécessitent un prototype, une discussion d'équipe, ou une clarification avant de rejoindre la roadmap.*

- **Méta-progression trans-parties compatible avec « on perd toujours »** — par exemple, un royaume qui démarre légèrement différent (jamais plus facile) selon le souvenir collectif des parties précédentes, sans jamais donner au joueur un chemin vers l'invincibilité. Lié à D-006 dans [DECISIONS.md](./DECISIONS.md).
- **Salles nommées avec titre persistant** basé sur ce qui s'y est passé (ex. « la Salle du Dernier Soupir »), alimentant les chroniques sans ajouter de mécanique de gameplay pure.
- **Compétition entre plusieurs guildes actives simultanément**, chacune avec sa propre pression de rôle et ses propres rumeurs.
- **Difficulté adaptative visible sous forme de « dossier de menace »** consultable par le joueur en phase Build, résumant ce que le royaume sait actuellement du donjon (transparence totale de l'IA, à tester pour vérifier que ça ne tue pas la surprise).
- **Capacité du joueur à consulter l'arbre généalogique complet d'une lignée d'héritiers** depuis l'écran de débriefing.
- **Monstres capables de fuir et de revenir soignés**, au lieu de mourir ou survivre, pour nuancer le systeme de mort actuel des monstres.
- **Système de « legs » du boss** : le boss garde une trace des adventuriers qui l'ont blessé gravement mais pas tué, influençant ses priorités de ciblage aux vagues suivantes.

---

## Refusées

*Idées explicitement écartées. Elles ne sont pas supprimées : elles servent de mémoire pour ne pas rouvrir un débat déjà tranché sans nouvel argument.*

| Idée | Raison du refus | Principe invoqué |
|---|---|---|
| Vagues à effectif croissant (plus de 5 aventuriers) | Contredit l'axe de difficulté choisi | Design Principles #6 — « la difficulté augmente grâce à l'intelligence, jamais au nombre » |
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
- **Mode spectateur / partage de replay d'une vague mémorable** — intéressant pour la viralité, mais dépend d'un système de log d'événements plus structuré que l'actuel `WaveReport`.
- **Localisation en anglais et autres langues** — le jeu est actuellement pensé et écrit en français ; l'internationalisation est une décision de production à prendre après M4 (Art Direction), pas avant.
- **Classement en ligne des meilleurs scores** — nécessite une infrastructure serveur, hors du périmètre « aucun runtime serveur requis » du V0 (voir `README.md`).
- **Éditeur de donjon partageable entre joueurs** — séduisant mais potentiellement en tension avec le principe « une décision intéressante vaut mieux qu'un nouvel objet » si mal cadré ; à retester une fois les salles/portes du Milestone 1 livrées.
