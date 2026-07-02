# Roadmap — Loot Me If You Can

| | |
|---|---|
| **Statut** | Vivant — la roadmap se réajuste à chaque milestone clos |
| **Propriétaire** | Game Design / Production |
| **Dernière mise à jour** | 2026-07-02 |
| **Documents liés** | [MILESTONES.md](./MILESTONES.md) · [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md) · [DECISIONS.md](./DECISIONS.md) |

---

## Vue d'ensemble

```
M0 Prototype ──▶ M1 Gameplay Foundation ──▶ M2 Carve Your Kingdom ──▶ M3 The Kingdom Remembers ──▶ M4 Content Expansion ──▶ M5 Art Direction ──▶ M6 Polish ──▶ M7 Release Candidate
   (acquis)         (base solide)             (le donjon se creuse)    (le royaume se souvient)     (plus de contenu)         (identité visuelle)   (finition)     (prêt à sortir)
```

Chaque milestone est détaillé fiche par fiche dans [MILESTONES.md](./MILESTONES.md). Cette page donne la vue macro : objectif, fonctionnalités, critères de validation.

---

## Milestone 0 — Prototype ✅ *(acquis, correspond à v0.5.0)*

**Objectif** : prouver que la boucle centrale (préparer, affronter, apprendre) est amusante avec des placeholders.

**Fonctionnalités** :
- Grille de donjon avec entrée/trésor/boss fixes et validation de chemin.
- 2 pièges, 3 monstres, 4 rôles d'aventuriers, boss avec 3 capacités.
- Économie de base (or, remboursement de pièges, pénalité de vol de trésor).
- Mémoire d'adaptation (pression de rôle, évitement de cases) et rumeurs de taverne.
- Profils d'aventuriers persistants, héritiers, réputation du donjon.
- Rapports narratifs de fin de vague.
- Suite de tests headless (`npm run smoke`).

**Critères de validation** : *atteints.* La boucle est jouable de bout en bout, le royaume s'adapte de façon observable, une partie peut être racontée après coup.

---

## Milestone 1 — Gameplay Foundation

**Objectif** : consolider la boucle centrale avant d'empiler du contenu ou de l'art — combler les manques qui limitent la profondeur tactique et la lisibilité.

**Fonctionnalités prévues** :
- Upgrades de pièges entre les expéditions.
- Extraction d'un système de combat dédié hors de `DungeonSimulation.ts`.
- Amélioration des blessures : minuteurs de convalescence, cicatrices visibles.
- Aperçus de placement (portée des pièges/monstres) et raccourcis clavier.
- Passage des scripts de simulation headless à un vrai runner de tests avec assertions déterministes.

⚠️ **Note (réunion de design #001)** : les « salles et portes distinctes », initialement prévues ici en remplacement du carvage 3×3, sont retirées de ce milestone et absorbées par le Milestone 2 — *Carve Your Kingdom*, qui devient le foyer unique du système de creusement (voir [DECISIONS.md](./DECISIONS.md) D-009).

**Critères de validation** :
- Aucune règle de combat majeure ne reste implicite dans le moteur de simulation principal.
- La suite de tests échoue de façon déterministe si une régression de règle est introduite.

---

## Milestone 2 — Carve Your Kingdom

**Objectif** : transformer la construction actuelle en un vrai système de donjon creusé dans la roche (voir [DECISIONS.md](./DECISIONS.md) D-009).

**Question centrale** : *Comment faire en sorte que chaque donjon soit unique, lisible et stratégiquement intéressant ?*

**Fonctionnalités prévues** :
- Carte majoritairement rocheuse au départ, plutôt qu'un tracé de murs prédéfini (`WALL_CELLS`).
- Creusement de couloirs et de salles, remplaçant la pose/le retrait de murs.
- Salles spécialisables (garde, crypte, laboratoire, temple, prison, arsenal…), salle du trône du boss, salle du trésor.
- Portes comme élément tactique distinct du couloir.
- Validation du chemin étendue à toute opération de creusement.
- Coût de creusement par case, territoire du donjon comme ressource propre.
- Meilleure lisibilité visuelle de l'espace (roche / couloir / salle spécialisée / porte).

**Critères de validation** :
- Creuser une case de roche, une salle spécialisée et sa porte ne casse jamais la validation de chemin entrée → trésor → boss.
- Un joueur peut distinguer visuellement la roche non creusée, un couloir et une salle spécialisée sans lire l'UI.
- Le territoire creusé est mesurable comme une ressource propre, distincte de l'or.

---

## Milestone 3 — The Kingdom Remembers

**Objectif** : implémenter progressivement la mémoire du Royaume, la cartographie imparfaite et les survivants qui rapportent des informations à la Guilde (voir [DECISIONS.md](./DECISIONS.md) D-010) — combler l'écart principal identifié dans le GDD en faisant vivre la guilde et le royaume au-delà de champs de données statiques.

**Fonctionnalités prévues** :
- Système de guilde vivant : recruteurs, tactiques préférées, rancunes, effectif limité.
- Réputation de guilde réellement mise à jour (actuellement un champ mort).
- Alarme du royaume (`alarm`) branchée sur la fréquence/composition des expéditions.
- Pressions régionales (peur, cupidité, gloire, prime) influençant les rumeurs et les plans d'expédition.
- Cartographie progressive : les expéditions ne rapportent que des fragments d'information, jamais une carte complète.
- Informations imparfaites : rapports exacts, incomplets, anciens, mal interprétés ou contradictoires.
- Survivants et cartographes comme source principale de connaissance du Royaume.
- Ciblage vindicatif par individu nommé plutôt que par type de défense.
- Écran de taverne dédié avec rumeurs concurrentes.

**Critères de validation** :
- La carte du donjon connue par le Royaume peut objectivement différer de la carte réelle après une modification du joueur entre deux expéditions.
- Un joueur peut observer un changement de comportement d'expédition directement attribuable à l'alarme ou à une pression régionale, distinct de la simple pression de rôle existante.
- La guilde peut, dans certaines conditions, manquer d'effectif d'un rôle donné suite à des pertes répétées.

**Dépendances** : Milestone 2 (la cartographie imparfaite n'a de sens que si le donjon a une géométrie creusée et évolutive à cartographier).

---

## Milestone 4 — Content Expansion

**Objectif** : élargir le vocabulaire de jeu (contenu) une fois les fondations et le royaume qui se souvient en place.

**Fonctionnalités prévues** :
- Nouveaux types de pièges et de monstres.
- Capacités de boss supplémentaires et chemin d'amélioration financé par la réputation/infamie.
- Traits d'équipement pour les aventuriers après des morts répétées.
- Objets légendaires récupérables ou perdables dans le donjon.
- Héritiers capables d'hériter d'objets/équipements, pas seulement de rancunes.
- Retour des voleurs de trésor évadés, plus riches et mieux équipés (pression de prime).

**Critères de validation** :
- Chaque nouvel élément de contenu est validé contre les Design Principles (notamment #7 et #8 : pas de contenu qui n'ouvre pas de décision).
- Le nombre de combinaisons tactiques viables augmente mesurablement sans complexifier l'interface de base.

---

## Milestone 5 — Art Direction

**Objectif** : remplacer les placeholders par une identité visuelle et sonore cohérente avec le ton du jeu.

**Fonctionnalités prévues** :
- Direction artistique validée (mood board, palette, silhouettes lisibles).
- Remplacement des textures générées par des assets définitifs (ou packs CC0 vérifiés en attendant du sur-mesure).
- Effets visuels dédiés pour les capacités de boss (onde de choc, cône de rugissement, invocation).
- Système audio : musique, effets sonores, feedback de kill/mort, mute.
- Chargement d'assets piloté par un manifeste JSON.

**Critères de validation** :
- Aucune texture générée procéduralement ne subsiste en dehors des outils de développement.
- Un joueur peut distinguer chaque type de piège/monstre/rôle d'aventurier sans lire l'UI.

---

## Milestone 6 — Polish

**Objectif** : finition, équilibrage et accessibilité avant le gel de contenu.

**Fonctionnalités prévues** :
- Passe d'équilibrage complète sur l'économie, le scaling d'expédition et les capacités de boss.
- Tutoriel d'introduction pour les nouveaux joueurs.
- Accessibilité (lisibilité des contrastes, tailles de texte, remappage des contrôles).
- Optimisation des performances (temps de simulation, rendu Phaser).
- Passe UX complète sur tous les écrans (build, wave, report, defeat).

**Critères de validation** :
- Un joueur n'ayant jamais vu le jeu comprend la boucle centrale sans aide externe en moins de 5 minutes.
- Aucune chute de performance mesurable jusqu'à un seuil d'expédition défini par les tests de charge.

---

## Milestone 7 — Release Candidate

**Objectif** : verrouiller le contenu, valider la qualité, préparer la sortie.

**Fonctionnalités prévues** :
- Gel de contenu et de fonctionnalités.
- Campagne de QA complète (fonctionnelle, régression, compatibilité navigateurs).
- Build de portage packagé (ex. Steam) si validé en amont.
- Supports de communication et de marketing (trailer, page de store, captures).

**Critères de validation** :
- Zéro bug bloquant ou majeur ouvert.
- Le jeu répond à tous les piliers d'expérience listés dans [GAME_VISION.md](./GAME_VISION.md) selon une session de test à l'aveugle.

---

## Notes de gouvernance

- Un milestone n'est ouvert que lorsque le précédent est formellement clos dans [MILESTONES.md](./MILESTONES.md).
- Toute réorganisation de cette roadmap (ajout, fusion, report de milestone) doit être tracée dans [DECISIONS.md](./DECISIONS.md).
- Les idées non planifiées restent dans [IDEAS.md](./IDEAS.md) tant qu'elles ne sont pas rattachées à un milestone précis.
