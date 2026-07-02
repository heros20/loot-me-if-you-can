# Milestones — Loot Me If You Can

| | |
|---|---|
| **Statut** | Vivant — chaque fiche se met à jour à l'ouverture puis à la clôture du milestone |
| **Propriétaire** | Production / Game Design |
| **Dernière mise à jour** | 2026-07-02 |
| **Documents liés** | [ROADMAP.md](./ROADMAP.md) · [DECISIONS.md](./DECISIONS.md) |

---

## Légende de statut

| Statut | Signification |
|---|---|
| ✅ Clos | Livré et validé par ses critères |
| 🚧 En cours | Travail actif |
| ⏳ Planifié | Pas encore démarré |

---

## Milestone 0 — Prototype

**Statut** : ✅ Clos (correspond à v0.5.0)

**Objectif** : valider que la boucle préparation / vague / apprentissage est jouable et amusante, même avec des placeholders visuels.

**Périmètre livré** :
- Grille 18×12 avec entrée, trésor et boss fixes, validation de chemin.
- 2 pièges (`spikeTrap`, `fireTrap`), 3 monstres (`slime`, `skeleton`, `goblin`), 4 rôles d'aventuriers.
- Boss avec 3 capacités actives (onde de choc, rugissement, renforts osseux).
- Économie complète (or, remboursement de pièges, pénalité de trésor volé, soins entre vagues).
- Mémoire d'adaptation tactique (pression de rôle, dangerosité de case apprise).
- Profils d'aventuriers persistants, système d'héritiers, réputation du donjon (6 paliers).
- Rumeurs de taverne influençant la vague suivante.
- Rapports narratifs de fin de vague, panneau d'inspection d'aventurier.
- Pause, vitesse x1/x2/x3, record local de vagues survécues.
- Suite de scripts de simulation headless (`npm run smoke`).

**Critères de validation** :
- [x] Un cycle Build → Wave → Report complet fonctionne sans intervention manuelle sur le code.
- [x] Une adaptation observable du royaume est visible d'une vague à l'autre.
- [x] Une partie peut être décrite après coup comme une anecdote (mort nommée, héritier, rumeur).

**Enseignements** : la boucle centrale tient sans art final, confirmant le principe *« le gameplay avant les graphismes »*. Le principal écart identifié est l'absence de vie réelle de la guilde et du royaume au-delà de champs de données statiques — d'où la priorité donnée au Milestone 3 (*The Kingdom Remembers*) avant l'expansion de contenu. La réunion de design #001 a par ailleurs identifié un second écart, tout aussi central : le donjon lui-même reste un carvage de murs plutôt qu'un véritable espace creusé — d'où l'introduction du Milestone 2 (*Carve Your Kingdom*).

---

## Milestone 1 — Gameplay Foundation

**Statut** : ⏳ Planifié

**Objectif** : consolider les fondations techniques et tactiques avant d'ajouter du contenu ou de l'art.

**Fonctionnalités** :
| Fonctionnalité | Description |
|---|---|
| Upgrades de pièges | Un piège peut progresser entre les expéditions au lieu de repartir à coût identique |
| Extraction du système de combat | Sortir la résolution de combat de `DungeonSimulation.ts` vers un module dédié |
| Blessures approfondies | Minuteurs de convalescence, cicatrices permanentes, effets comportementaux visibles |
| Aperçus de placement | Visualisation de la portée des pièges/monstres avant pose |
| Raccourcis clavier | Capacités de boss (1/2/3), pause (espace) |
| Runner de tests déterministe | Remplace les scripts `smoke` ad hoc par des assertions automatisées |

⚠️ **Note (réunion de design #001)** : l'item « Salles et portes » initialement prévu ici est retiré de ce milestone et absorbé par le Milestone 2 — *Carve Your Kingdom*, qui devient le foyer unique du système de creusement (voir [DECISIONS.md](./DECISIONS.md) D-009).

**Critères de validation** :
- [ ] Aucune règle de dégâts/soins majeure ne reste écrite en dur dans la scène de rendu ou dans un fichier non dédié au combat.
- [ ] La suite de tests échoue de manière déterministe si une régression de règle de jeu est introduite.
- [ ] Un piège amélioré est visuellement et mécaniquement distinct de sa version de base.

**Dépendances** : aucune — peut démarrer immédiatement après M0.

**Risques** :
- Le refactor du système de combat peut introduire des régressions silencieuses si la suite de tests n'est pas renforcée en amont (mitigation : prioriser le runner de tests avant l'extraction).

---

## Milestone 2 — Carve Your Kingdom

**Statut** : ⏳ Planifié

**Objectif** : transformer la construction actuelle en un vrai système de donjon creusé (voir [DECISIONS.md](./DECISIONS.md) D-009).

**Question centrale** : *Comment faire en sorte que chaque donjon soit unique, lisible et stratégiquement intéressant ?*

**Fonctionnalités** :
| Fonctionnalité | Description |
|---|---|
| Carte majoritairement rocheuse au départ | La grille démarre en roche pleine plutôt qu'avec un tracé de murs prédéfini (`WALL_CELLS`) |
| Creusement de couloirs et de salles | Le joueur agrandit son territoire case par case au lieu de poser/retirer des murs |
| Salles spécialisables | Typologie de salles à effets propres (garde, crypte, laboratoire, temple, prison, arsenal…) |
| Salle du trône du boss | Salle spécialisée dédiée au boss, distincte de la cellule fixe actuelle |
| Salle du trésor | Salle spécialisée dédiée au trésor, distincte de la cellule fixe actuelle |
| Portes | Élément tactique distinct du couloir (ralentir, forcer un détour, goulot d'étranglement payant) |
| Validation du chemin | Étendue au creusement : toute opération doit préserver un chemin entrée → trésor → boss |
| Coût de creusement | Chaque case creusée peut porter un coût en or et/ou en temps |
| Territoire du donjon | L'espace exploitable devient une ressource à part entière, pas seulement l'or |
| Meilleure lisibilité de l'espace | Distinction visuelle claire entre roche, couloir creusé, salle spécialisée, porte |

**Critères de validation** :
- [ ] Creuser une case de roche, une salle spécialisée et sa porte ne casse jamais la validation de chemin entrée → trésor → boss.
- [ ] Un joueur peut distinguer visuellement la roche non creusée, un couloir et une salle spécialisée sans lire l'UI.
- [ ] Le territoire creusé est mesurable comme une ressource propre, distincte de l'or.

**Dépendances** : Milestone 1 (le système de combat extrait et les tests déterministes sécurisent le refactor de la grille).

**Risques** :
- Migrer les donjons existants (`WALL_CELLS`) vers le nouveau modèle roche/creusement sans casser les parties en cours.
- Équilibrer le coût de creusement pour qu'il reste une décision intéressante (Design Principles #8) sans ralentir excessivement le rythme de préparation.

---

## Milestone 3 — The Kingdom Remembers

**Statut** : ⏳ Planifié

**Objectif** : implémenter progressivement la mémoire du Royaume, la cartographie imparfaite, les survivants qui rapportent des informations, et l'adaptation des futures expéditions à ce que la Guilde *croit* savoir plutôt qu'à la vérité absolue du donjon (voir [DECISIONS.md](./DECISIONS.md) D-010).

**Fonctionnalités** :
| Fonctionnalité | Description |
|---|---|
| Guilde vivante | Recruteurs, tactiques préférées propres, rancunes accumulées, effectif limité |
| Réputation de guilde active | Le champ existant est enfin mis à jour et a un effet |
| Alarme du royaume | Le champ `alarm` influence fréquence et composition des expéditions |
| Pressions régionales | Peur, cupidité, gloire, prime — influencent rumeurs et plans d'expédition |
| Cartographie progressive | Les expéditions ne rapportent que des fragments d'information, pas une carte complète |
| Informations imparfaites | Les rapports peuvent être exacts, incomplets, anciens, mal interprétés ou contradictoires |
| Survivants et cartographes | Deviennent la source principale de connaissance du Royaume sur le donjon |
| Ciblage vindicatif individuel | Un héritier cible le monstre nommé exact responsable, pas seulement son type |
| Écran de taverne dédié | Plusieurs rumeurs concurrentes visibles simultanément |

**Critères de validation** :
- [ ] La carte du donjon connue par le Royaume peut être objectivement différente de la carte réelle après une modification du joueur entre deux expéditions.
- [ ] Un joueur peut attribuer un changement de comportement d'expédition à l'alarme du royaume ou à une pression régionale spécifique, distincte de la pression de rôle existante.
- [ ] La guilde peut manquer temporairement d'un rôle après des pertes répétées de ce rôle.
- [ ] Un héritier peut viser nommément le monstre qui a tué son ancêtre, si celui-ci est toujours vivant.

**Dépendances** : Milestone 2 (la cartographie imparfaite n'a de sens que si le donjon a une géométrie creusée et évolutive à cartographier).

**Risques** :
- Complexité de simulation accrue : surveiller les performances (voir Milestone 6) dès l'introduction de la cartographie et des pressions régionales.
- Lisibilité pour le joueur : une information imparfaite doit rester compréhensible a posteriori (Design Principles #13), pas juste aléatoire.

---

## Milestone 4 — Content Expansion

**Statut** : ⏳ Planifié

**Objectif** : élargir le contenu jouable une fois les fondations et le royaume vivant stabilisés.

**Fonctionnalités** :
| Fonctionnalité | Description |
|---|---|
| Nouveaux pièges et monstres | Élargit la palette tactique de construction |
| Capacités de boss supplémentaires | Avec chemin d'amélioration financé par la réputation/infamie |
| Traits d'équipement | Débloqués pour les aventuriers après des morts répétées |
| Objets légendaires | Récupérables ou perdables définitivement dans le donjon |
| Héritage d'objets | Les héritiers reçoivent des objets, pas seulement des rancunes |
| Retour des voleurs évadés | Reviennent plus riches et mieux équipés (pression de prime) |

**Critères de validation** :
- [ ] Chaque nouvel élément est validé individuellement contre les Design Principles #7 et #8 (pas de contenu sans décision).
- [ ] Le nombre de configurations tactiques viables augmente sans ajouter de complexité visible à l'interface de base.

**Dépendances** : Milestone 3 (le contenu doit s'insérer dans un royaume qui se souvient déjà pour avoir du sens narratif).

---

## Milestone 5 — Art Direction

**Statut** : ⏳ Planifié

**Objectif** : donner au jeu une identité visuelle et sonore définitive.

**Fonctionnalités** :
| Fonctionnalité | Description |
|---|---|
| Direction artistique validée | Mood board, palette, silhouettes lisibles par type d'unité |
| Assets définitifs | Remplacement des textures procédurales par des assets vérifiés (CC0 ou sur-mesure) |
| VFX des capacités de boss | Onde de choc, cône de rugissement, invocation |
| Système audio | Musique, SFX, feedback de kill/mort, mute |
| Manifeste JSON d'assets | Chargement piloté par données plutôt que codé en dur |

**Critères de validation** :
- [ ] Plus aucune texture générée procéduralement en dehors des outils de développement interne.
- [ ] Chaque piège/monstre/rôle est identifiable visuellement sans lire l'UI.

**Dépendances** : Milestone 4 (éviter de produire de l'art pour du contenu encore instable).

---

## Milestone 6 — Polish

**Statut** : ⏳ Planifié

**Objectif** : finition, équilibrage, accessibilité et performance avant gel de contenu.

**Fonctionnalités** :
| Fonctionnalité | Description |
|---|---|
| Passe d'équilibrage | Économie, scaling de vague, capacités de boss |
| Tutoriel | Introduction pour nouveaux joueurs |
| Accessibilité | Contrastes, tailles de texte, remappage des contrôles |
| Optimisation performance | Simulation et rendu |
| Passe UX | Tous les écrans (build, wave, report, defeat) |

**Critères de validation** :
- [ ] Un joueur néophyte comprend la boucle centrale sans aide externe en moins de 5 minutes.
- [ ] Aucune dégradation de performance mesurable jusqu'au seuil de vague défini par les tests de charge.

**Dépendances** : Milestones 1 à 5 (le polish porte sur un périmètre fonctionnel et artistique stabilisé).

---

## Milestone 7 — Release Candidate

**Statut** : ⏳ Planifié

**Objectif** : verrouiller le jeu et préparer sa sortie.

**Fonctionnalités** :
| Fonctionnalité | Description |
|---|---|
| Gel de contenu | Aucune nouvelle fonctionnalité, seulement des corrections |
| Campagne QA | Fonctionnelle, régression, compatibilité navigateurs |
| Build de portage | Packaging (ex. Steam) si validé en amont |
| Supports marketing | Trailer, page de store, captures d'écran |

**Critères de validation** :
- [ ] Zéro bug bloquant ou majeur ouvert.
- [ ] Session de test à l'aveugle confirmant l'adéquation avec les piliers de [GAME_VISION.md](./GAME_VISION.md).

**Dépendances** : Milestone 6.
