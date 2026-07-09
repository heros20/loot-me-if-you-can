# Game Design Document — Loot Me If You Can

| | |
|---|---|
| **Statut** | Vivant — chaque section évolue indépendamment |
| **Version du jeu documentée** | v0.5.0 |
| **Propriétaire** | Game Design |
| **Dernière mise à jour** | 2026-07-08 |
| **Documents liés** | [GAME_VISION.md](./GAME_VISION.md) · [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) · [ROADMAP.md](./ROADMAP.md) · [LORE.md](./LORE.md) |

---

## Comment lire ce document

Chaque section est indépendante et porte une étiquette de statut :

| Étiquette | Signification |
|---|---|
| 🟢 **IMPLÉMENTÉ** | Existe et fonctionne dans le build actuel (v0.5.0). Chiffres vérifiés dans le code. |
| 🟡 **PARTIEL** | Une base existe mais la vision cible va plus loin. |
| 🔵 **CIBLE** | Conçu et validé pour être construit, pas encore codé. |
| ⚪ **EXPLORATOIRE** | Piste envisagée, non validée. Voir [IDEAS.md](./IDEAS.md). |

Quand un chiffre change dans le code, cette section doit être mise à jour dans la même pull request. Toute divergence entre ce document et le code est un bug de documentation.

**Note de terminologie** (réunion de design #001) : dans le vocabulaire de design, on préfère désormais *expédition* (ou *raid*, *groupe d'aventuriers*, *débriefing d'expédition*) à *vague*. Le mot *vague* subsiste dans le code (`GamePhase.wave`, `WaveReport`, `waveNumber`, scripts `smoke`) et reste utilisé ici quand ce document nomme précisément un identifiant de code existant ; le reste de ce document privilégie *expédition*.

---

## 1. Les 5 piliers du jeu 🟢

Actés lors de la réunion de design #001, ces cinq piliers résument l'identité du jeu et orientent toute décision de contenu future. Ils sont la version condensée des Piliers d'expérience du [GAME_VISION.md](./GAME_VISION.md) et des [Design Principles](./DESIGN_PRINCIPLES.md).

1. **Le joueur est le Maître du Donjon.** Il ne subit pas un système : il façonne son repaire — aujourd'hui en posant des murs, demain en creusant la roche (voir [§4 Donjon creusé](#4-donjon-creusé-), [DECISIONS.md](./DECISIONS.md) D-009).
2. **Le Royaume apprend.** Jamais par magie : uniquement via les survivants, les cartographes, les rumeurs et les rapports d'expédition (voir [§18 Royaume](#18-royaume-), [§20 Intelligence collective](#20-intelligence-collective-), [DECISIONS.md](./DECISIONS.md) D-010).
3. **Chaque expédition raconte une histoire.** Les noms, les morts, les héritiers et les débriefings sont la matière première du jeu, pas un habillage (voir [§16 Chroniques](#16-chroniques-), [§25 Débriefing](#25-débriefing-)).
4. **La difficulté vient de l'intelligence, jamais du nombre.** L'expédition reste fixée à 5 aventuriers ; toute montée en puissance passe par les statistiques, les rôles et l'adaptation (voir [DECISIONS.md](./DECISIONS.md) D-001, D-002).
5. **L'information est une ressource.** Elle se gagne, se perd, se désinforme et s'use — au même titre que l'or ou le territoire (voir [§21](#21-exploration-des-aventuriers-) à [§24](#24-cartographe-), [DECISIONS.md](./DECISIONS.md) D-010).

> « Chaque nouvelle mécanique doit rendre les expéditions plus mémorables, pas simplement plus difficiles. »

---

## 2. Présentation générale 🟢

| Élément | Valeur |
|---|---|
| **Titre** | Loot Me If You Can *(nom de projet interne : Final Boss Dungeon)* |
| **Genre** | Stratégie / gestion en temps réel, boucle de défense par expéditions, narration émergente |
| **Point de vue** | Le joueur incarne le boss final et gardien du donjon |
| **Moteur** | Phaser 3.90 (rendu), TypeScript, Vite (build) |
| **Plateforme** | Web (navigateur), PC en priorité |
| **Format** | Partie unique continue, sans reset caché, jusqu'à la mort du boss |

**Résumé en un paragraphe** : le joueur prépare un donjon en dépensant de l'or sur une grille (vision cible : en creusant la roche, voir [§4](#4-donjon-creusé-)), puis lance une expédition de cinq aventuriers qui tentent de voler un trésor et de tuer le boss. Le combat se résout automatiquement ; le joueur peut activer des capacités de boss. Après chaque expédition, un débriefing narratif explique ce qui s'est passé, et le royaume adapte sa prochaine expédition en fonction de ce qu'il croit avoir appris (voir [DECISIONS.md](./DECISIONS.md) D-010).

**Etat presentation/audio (2026-07-08, V2)** : la presentation primaire vise maintenant un dark fantasy plus sombre : tiles/portes/pieges/objectifs generes localement, aventuriers animes par role, defenses/guardian/boss en spritesheets top-down Warlock, boss final demoniaque, VFX de combat lisibles, taverne opaque separee, PNJ animes, ambiances donjon/taverne et musiques boss/gardien. L'audio reste une couche separee de la simulation avec volume global/mute et unlock navigateur gere cote presentation. Les sources et licences sont documentees dans [THIRD_PARTY_ASSETS.md](./THIRD_PARTY_ASSETS.md).

---

## 3. Gameplay Loop 🟢

```
   MENU
     │  (Commencer)
     ▼
┌─────────┐  lancer expédition ┌─────────┐ expédition résolue┌──────────┐
│  BUILD  │ ────────────────▶ │  WAVE   │ ────────────────▶ │  REPORT  │
│ (prépa) │                   │(combat) │                    │ (bilan)  │
└─────────┘ ◀──────────────── └─────────┘                    └──────────┘
     ▲            boss tué             │                          │
     │                                 ▼                          │
     │                            ┌─────────┐                     │
     └────────────────────────────│ DEFEAT  │◀────────────────────┘
        (nouvelle partie)          └─────────┘   (si boss mort)
                                   sinon retour à BUILD
```

**Détail des phases** (`GamePhase` : `menu | build | wave | report | defeat`) :

1. **Build** — Le joueur pose pièges et monstres sur la grille avec son or disponible, modifie les murs/sols du donjon (vision cible : creuse la roche, voir [§4](#4-donjon-creusé-)), consulte l'aperçu de la prochaine expédition et les rumeurs de taverne, puis lance l'expédition.
2. **Wave** — Les cinq aventuriers de l'expédition entrent, pathfindent vers le trésor puis vers le boss, combattent en temps réel. Le joueur peut activer les capacités du boss, mettre en pause, accélérer (x1/x2/x3), et inspecter un aventurier en cliquant dessus.
3. **Report** — Bilan économique, débriefing narratif, changements de la guilde, rumeur générée pour la prochaine expédition, aperçu du prochain recrutement.
4. **Defeat** — Déclenché uniquement par la mort du boss. Écran de clôture narrative ; **redémarre une nouvelle partie complète** (réinitialisation totale de la mémoire du monde — voir [§15 Mémoire](#15-mémoire-)).

Il n'existe pas de victoire permanente : survivre à une expédition ne fait que renvoyer en Build pour préparer la suivante, indéfiniment, jusqu'à la Defeat.

---

## 4. Donjon creusé 🟡

**Etat code actuel (2026-07-08)** - le donjon jouable est maintenant une structure Multi-map / Etages V1. La simulation possede plusieurs `DungeonMap` generes au lancement d'une nouvelle partie, avec `currentMapId`, `expeditionMapId`, transitions d'escalier, tiles/zones par etage, et `mapId` sur les entites importantes. La V1 utilise au moins trois etages : `floor-1` pour l'entree, `floor-2` comme etage intermediaire, et `floor-3` pour le tresor principal et le boss final unique. La construction s'applique a l'etage affiche, les aventuriers traversent les escaliers pendant l'expedition avec un routage par profondeur, et l'affichage suit automatiquement la map atteinte. Les restes/reliques, fouille de butin, tresors speciaux, gardien, faits Kingdom/Cartographe et feedback de combat sont attaches a leur etage.

**Rebouchage actuel** - `Reboucher` est un outil de preparation actif : il remet une case creusee (`floor`/`room`) en roche pour 2 or, refuse les transitions, ancres, cases occupees, restes persistants visibles, et toute modification qui casserait le chemin global entree -> tresors actifs -> boss final a travers les etages.

**Vision (D-009)** — le joueur ne construit pas son donjon en posant des murs sur une grille vide : il **creuse** son donjon dans la roche. La carte démarre principalement comme une masse rocheuse ; creuser un couloir, une salle, une intersection ou un accès étend le territoire exploitable du joueur. Les murs ne sont plus des objets que l'on pose : ils **sont** la roche qui n'a pas encore été creusée. Voir [DECISIONS.md](./DECISIONS.md) D-009.

🟢 **IMPLÉMENTÉ (état du code, v0.5.0)** — le modèle actuel, que D-009 remplace progressivement :

| Élément | Valeur |
|---|---|
| Grille | 23 x 16 cases par etage |
| Cellules fixes protegees | Entree (0,7) ; tresor principal (16,4) ; boss final (22,12) ; transitions d'escalier |
| Or de depart | 115 |
| Outils actuels | **Creuser**, **Reboucher**, **Porte**, **Retirer porte**, marquage **Salle de garde/Crypte**, deplacement boss/tresor, tresors secondaires |
| Contrainte de validation | Toute modification qui casserait le chemin global entree -> tresors actifs -> boss final a travers les transitions est refusee |

Le donjon démarre aujourd'hui avec un tracé de murs prédéfini (`WALL_CELLS`) qui impose un premier couloir logique ; le joueur densifie ou simplifie ce tracé, tant qu'un chemin reste possible.

🔵 **CIBLE (Milestone 2 — Carve Your Kingdom)** :
- La carte démarre **majoritairement rocheuse**, plutôt qu'avec un tracé de murs prédéfini.
- Le joueur **creuse** des couloirs, des salles, des intersections, des accès et des zones stratégiques, au lieu de poser/retirer des murs.
- Chaque case creusée peut porter un **coût** (or et/ou temps).
- Les salles naissent de l'espace creusé plutôt que d'un carvage 3×3 générique (voir [§6 Salles spécialisées](#6-salles-spécialisées-)).
- Le territoire creusé devient une ressource lisible en soi (voir [§5 Territoire du donjon](#5-territoire-du-donjon-)).
- La validation de chemin entrée → trésor → boss s'applique à toute opération de creusement, exactement comme elle s'applique aujourd'hui à la pose de murs.

Ce chantier est le cœur du Milestone 2 (voir [ROADMAP.md](./ROADMAP.md), [MILESTONES.md](./MILESTONES.md)).

---

## 5. Territoire du donjon 🔵

Le joueur ne gagne pas seulement de l'or à chaque expédition repoussée : il gagne, potentiellement, de l'**espace exploitable**. Creuser la roche (voir [§4](#4-donjon-creusé-)) transforme une case inerte en territoire — un couloir traversable, une salle où poser un piège ou un monstre, un accès vers une nouvelle zone stratégique.

🔵 **CIBLE** :
- Le territoire (nombre de cases creusées, ou surface des salles ouvertes) devient une **ressource lisible**, distincte de l'or, affichée dans l'UI de préparation.
- Certaines décisions doivent arbitrer entre **creuser plus** (plus d'options tactiques, plus de surface à défendre) et **creuser moins** (donjon compact, plus facile à couvrir avec le même or).
- Un donjon immense mais vide n'est pas automatiquement plus fort qu'un donjon compact et dense : le territoire est un espace à exploiter, pas un score à maximiser.

⚪ **EXPLORATOIRE** — un lien entre la taille du territoire et l'alarme du royaume ou la réputation (un donjon manifestement plus grand attire-t-il plus d'attention ?), voir [IDEAS.md](./IDEAS.md).

Cette section prépare la structure du concept ; le détail numérique (coût, formule de valeur du territoire) reste à trancher au Milestone 2.

---

## 6. Salles spécialisées 🔵

Une fois le donjon creusé (voir [§4](#4-donjon-creusé-)), certaines zones peuvent devenir des **salles spécialisées** : des espaces qui offrent un effet ou une fonction propre, au-delà du simple carvage 3×3 générique actuel. Cette section prépare uniquement la **structure** de la typologie ; le détail des effets de chaque salle sera conçu au Milestone 2, pas ici (ne pas surdévelopper avant que le système de creusement existe).

⚪ **EXPLORATOIRE** — typologie envisagée, aucune n'est implémentée ni figée :

| Salle | Intention pressentie |
|---|---|
| Salle de garde | Renforce ou concentre les défenses (monstres, pièges) à proximité |
| Crypte | Liée à la mémoire du donjon, aux monstres vétérans ou aux morts passées |
| Laboratoire | Salle d'expérimentation ou d'amélioration (pièges, monstres) |
| Temple | Salle à effet de soin ou de buff pour les défenses du joueur |
| Prison | Capture ou ralentit des aventuriers plutôt que de les tuer directement |
| Arsenal | Stockage/amélioration d'équipement, lié à de futurs objets (voir [IDEAS.md](./IDEAS.md)) |
| Salle du trésor | Salle spécialisée dédiée à la protection du trésor, distincte de la cellule fixe actuelle |
| Salle du trône | Salle spécialisée dédiée au boss, distincte de la cellule fixe actuelle |

🔵 **CIBLE (Milestone 2)** — au minimum, la salle du trésor et la salle du trône du boss existent comme premières salles spécialisées jouables, avec portes associées (voir [MILESTONES.md](./MILESTONES.md)).

---

## 7. Système économique 🟢

| Flux | Formule / valeur |
|---|---|
| Or de depart | 115 |
| Recompense d'expedition repoussee | `20 + vague x 5` |
| Remboursement des pieges | Salvage partiel : 35 % du cout des pieges restants |
| Penalite de tresor vole | `min(or gagne + salvage pieges, 10 + vague x 3)` |
| Soin du boss entre expéditions | `24 + vague × 2` PV |
| Soin des monstres entre expéditions | `+28 %` des PV max |

*(la variable `vague` dans les formules correspond au numéro d'expédition — voir la note de terminologie en tête de document)*

**Principes économiques** :
- Les **pieges** sont un investissement a usage unique par expedition : poses, potentiellement rentabilises, puis seulement partiellement recuperes. Leur cout reel existe donc, sans bloquer les essais de placement.
- Les **monstres** sont un investissement permanent : ils survivent, se soignent, gagnent en réputation individuelle (voir [§17 Réputation](#17-réputation-)), mais aucune mécanique actuelle ne les fait mourir définitivement de vieillesse — seule leur mort en combat compte.
- Le **trésor volé** est la seule perte nette du joueur : elle est plafonnée pour éviter une spirale économique impossible à rattraper, mais reste toujours douloureuse.

---

## 8. Pièges 🟢

| Piège | Coût | Dégâts | Cooldown |
|---|---|---|---|
| Piege a pics (`spikeTrap`) | 5 or | 22 | 1450 ms |
| Piege de feu (`fireTrap`) | 9 or | 31 | 2150 ms |
| Room lock (`roomLockTrap`) | 12 or | 0 direct | salle verrouillee |

**Règles** :
- Un piège s'active quand un aventurier entre sur sa case, avec un temps de recharge avant de pouvoir refrapper.
- Les pieges sont **demontes avec salvage partiel** a la fin de chaque expedition resolue : le joueur repart d'une page blanche de pieges a chaque preparation, mais le spam a un cout.
- Le multiplicateur de dégâts de piège dépend du rôle de l'aventurier qui marche dessus (voir [§12 Aventuriers](#12-aventuriers-)) — un voleur encaisse moitié moins qu'un guerrier.
- Chaque mort causée par un piège sur une case donnée **augmente durablement la dangerosité apprise de cette case** dans le pathfinding adverse (`trapDangerByCell`, +1.25 par kill) : les expéditions suivantes évitent activement les cases qui ont déjà tué.

🔵 **CIBLE** — Upgrades de pièges entre les expéditions (financés par la réputation ou l'or), pour que l'investissement dans un piège efficace puisse s'accumuler au lieu de repartir de zéro à coût identique.

---

## 9. Monstres 🟢

| Monstre | Coût | PV | Dégâts | Portée d'attaque | Cooldown | Comportement |
|---|---|---|---|---|---|---|
| Slime (`slime`) | 5 or | 48 | 5 | 1.1 | 760 ms | Ralentit les intrus au contact |
| Squelette (`skeleton`) | 8 or | 38 | 12 | 1.25 | 1180 ms | Garde une position, résiste en ligne |
| Gobelin (`goblin`) | 6 or | 32 | 7 | 1.15 | 560 ms | Patrouille puis poursuit activement |

**Règles** :
- Les monstres, contrairement aux pièges, **persistent d'une expédition à l'autre** et récupèrent `+28 %` de PV max entre deux expéditions.
- Chaque monstre est **nommé individuellement** (ex. *Clavicule*, *Grattouille*) dès sa pose, comptabilise ses kills, et devient un **vétéran** consigné dans les chroniques du donjon (voir [§16 Chroniques](#16-chroniques-)).
- L'IA de chaque type est distincte (patrouille/poursuite pour le gobelin, garde de position pour le squelette, ralentissement de zone pour le slime) plutôt qu'un comportement générique partagé.

🔵 **CIBLE** — Types de monstres supplémentaires, traits d'équipement débloqués après des morts répétées, monstres nommés capables de devenir la cible spécifique d'un héritier vengeur (au lieu d'une vengeance par *type* de défense uniquement, voir [§13](#13-traits-)).

---

## 10. Boss 🟢

| Statistique | Valeur |
|---|---|
| PV | 340 |
| Dégâts (attaque de base) | 16 |
| Portée de détection | 3.5 |
| Distance de laisse (leash) | 3.1 |
| Soin entre expéditions | `24 + vague × 2` PV |

**Capacités activables par le joueur pendant une expédition** :

| Capacité | Effet | Cooldown | Usages max / expédition |
|---|---|---|---|
| Onde de choc | 22 dégâts de zone + étourdissement 900 ms, rayon 2.9 | 9 s | 3 |
| Rugissement | Peur : les cibles fuient vers la sortie pendant 2600 ms, rayon 4.2 | 14 s | 2 |
| Renforts osseux | Invoque 2 squelettes temporaires près du boss | 20 s | 1 |

Le boss attaque automatiquement les aventuriers à portée entre les activations de capacités ; le joueur ne le déplace pas directement, il l'assiste tactiquement.

🔵 **CIBLE** — Capacités supplémentaires et chemin d'amélioration financé par l'infamie/réputation du donjon, pour que le boss évolue lui aussi entre les paliers de menace (voir [§18 Royaume](#18-royaume-) et [ROADMAP.md](./ROADMAP.md)).

---

## 11. Combat 🟢

Le combat se résout **en temps réel et automatiquement** : chaque unité (aventurier, monstre, boss) possède une portée d'attaque, un cooldown, et cible l'ennemi valide le plus pertinent selon ses règles propres (le boss cible le plus faible ; certains aventuriers priorisent leur nemesis — voir [§13](#13-traits-)).

**Éléments clés** :
- Chaque rôle d'aventurier a un **multiplicateur de dégâts de piège** propre (`trapDamageMultiplier`), rendant certains rôles beaucoup plus vulnérables aux pièges que d'autres.
- Porter le trésor inflige une **pénalité de vitesse de 18 %** au porteur.
- Un aventurier mort lâche le trésor s'il le portait (`dropped`), permettant à un autre membre de l'escouade de le ramasser.
- Le soigneur applique des soins de zone (`healAmount`, `healRange`) plutôt qu'un ciblage unique.

🟡 **PARTIEL** — La résolution de combat vit aujourd'hui directement dans la simulation principale (`DungeonSimulation.ts`). Une extraction en système dédié est prévue une fois le nombre de règles de combat suffisamment grand (voir architecture, [§30](#30-architecture-gameplay-)).

---

## 12. Aventuriers 🟢

| Rôle | PV | Dégâts | Vitesse | Portée | Particularité |
|---|---|---|---|---|---|
| Guerrier (`warrior`) | 72 | 7 | 0.00175 | 1.18 | Résiste bien aux pièges (×0.92) |
| Voleur (`thief`) | 44 | 5 | 0.00235 | 1.05 | Très résistant aux pièges (×0.48), évite activement les cases dangereuses |
| Mage (`mage`) | 34 | 13 | 0.00162 | 2.55 | Dégâts élevés à distance, aucune résistance aux pièges |
| Soigneur (`healer`) | 40 | 3 | 0.00172 | 1.8 | Soigne (`healAmount` 10, `healRange` 2.4) |

**Composition de l'expédition** : fixe à **5 aventuriers** (décision de design, voir [DECISIONS.md](./DECISIONS.md) D-001). La répartition des rôles n'est pas aléatoire : elle est pondérée par la **pression de rôle** apprise (`rolePressure`), c'est-à-dire par ce qui a fonctionné ou échoué lors des expéditions précédentes (voir [§20 Intelligence collective](#20-intelligence-collective-)).

**Progression par expédition** (appliquée à chaque nouvelle escouade) :

| Statistique | Scaling |
|---|---|
| PV | +11,5 % par numero d'expedition |
| Degats | +6,5 % par numero d'expedition |
| Vitesse | jusqu'a +18 % (plafonne) |
| Veterans (ont survecu a une expedition precedente) | +7 % par expedition survecue, plus bonus de reputation plafonne |
| Heritiers | x1.10 sur l'ensemble des statistiques |

---

## 13. Traits 🟢

| Trait | Effet comportemental |
|---|---|
| Courageux (`courageous`) | Reste engagé plus longtemps avant de fuir |
| Prudent (`cautious`) | Se replie tôt, privilégie les plans prudents |
| Vindicatif (`vengeful`) | Priorise en combat le **type** de défense qui a tué son ancêtre (nemesis) |
| Cupide (`greedy`) | Priorise le trésor, quitte à prendre des risques |
| Traumatisé (`traumatized`) | Comportement dégradé après une expérience violente |
| Célèbre (`famous`) | Aventurier notoire, lié à la réputation et aux chroniques |

Ces traits alimentent des **plans d'expédition** (`ExpeditionPlanType`) tirés par l'IA de groupe : *greedy, heroic, cautious, fanatic, mercenary* — chacun avec un objectif primaire (trésor ou boss) et ses propres seuils de repli (ex. : un plan prudent se replie après 2 morts ; un plan cupide se replie après avoir sécurisé le trésor si des pertes ont eu lieu ; un survivant solitaire bat en retraite sauf en plan héroïque).

Les rumeurs de taverne (voir [§20](#20-intelligence-collective-)) peuvent biaiser le choix du plan de la prochaine expédition (`greedSurge` → plan cupide, `cautionSurge` → plan prudent).

🟡 **PARTIEL** — Le ciblage vindicatif se fait aujourd'hui par *type* de monstre (ex. tous les gobelins), pas par individu nommé. Cibler l'individu exact responsable de la mort de l'ancêtre est une cible du Milestone 3 — *The Kingdom Remembers* (voir [IDEAS.md](./IDEAS.md)).

---

## 14. Blessures 🟡

| Statut de vie (`lifeStatus`) | alive · injured · missing · dead · retired |
|---|---|
| **Disponibilité** (`availability`) | available · onExpedition · recovering |
| **Traumatisme** | Valeur cumulative (`trauma`) influençant le profil de personnalité dominant |
| **Blessures** | Liste d'objets `AdventurerInjury` attachés au profil |

L'état actuel couvre la persistance des statuts et un système de traumatisme basique. 🔵 **CIBLE** — Minuteurs de convalescence réels, cicatrices permanentes avec effets mécaniques visibles, et changements de comportement observables en jeu (fuite plus rapide, refus de certains rôles) plutôt qu'un simple flag interne.

---

## 15. Mémoire 🟢

Le cœur technique de la promesse « le royaume apprend ». Deux structures de données portent cette mémoire :

**`AdaptationMemory`** (mémoire tactique du donjon courant) :

```
trapAvoidance      : nombre flottant, démarre à 0.35, plafonné autour de 2.75
trapDangerByCell   : { case → dangerosité apprise }, +1.25 par kill de piège sur cette case
rolePressure       : { rôle → pression }, pousse vers plus/moins de tel rôle
```

Ces valeurs modifient directement le **pathfinding** (une case qui a déjà tué coûte plus cher à traverser, avec un multiplicateur plus fort pour les voleurs) et la **composition des futures escouades**.

**`RunWorldMemory`** (mémoire narrative persistante) : profils d'aventuriers individuels, morts/survies enregistrées, chroniques, réputation, guilde et royaume associés. Cartographer V1 et Remains & Relics V1 ajoutent aussi des `kingdomFacts` modestes (type de fait, cellule éventuelle, précision, confiance, confirmations, âge/stale, source survivante, confirmation par cartographe).

**Déclencheurs d'adaptation post-expédition** (`applyAdaptation`) :

| Situation observée | Réaction du royaume |
|---|---|
| Beaucoup de pièges / kills sur pièges | Plus de voleurs, évitement de pièges renforcé |
| Combats longs | Plus de soigneurs |
| Monstres très efficaces | Plus de guerriers |
| Boss mortel ou dégâts de boss élevés | Plus de guerriers et de soigneurs |
| Trésor volé sans affronter le boss | Plus de guerriers et de mages |
| Quasi-anéantissement rapide de l'escouade | Plus de soigneurs et de voleurs |
| Cas par défaut | Plus de mages |

⚠️ **Important** — Cette mémoire est **entièrement réinitialisée** à chaque nouvelle partie (`startNewGame()` appelle `createInitialWorldMemory()`). Le royaume apprend *à l'intérieur* d'une partie continue, mais pas encore *entre* deux parties distinctes après une Defeat. Voir [§18 Royaume](#18-royaume-) pour la cible d'une mémoire trans-parties.

🟡 **PARTIEL (Cartographer V1 + Remains & Relics V1)** — une partie de la connaissance du Royaume passe désormais par des observations plausibles d'aventuriers survivants. Un cartographe survivant améliore la confiance et la précision des faits qu'il a vus ; un cartographe mort ne transmet pas magiquement ses notes. Les sites de mort et reliques ne deviennent des faits du Royaume que si un survivant les rapporte. La mémoire tactique globale (`trapDangerByCell`, pathfinding réel, adaptations de rôle) reste encore plus omnisciente que la cible Milestone 3 : pas de carte visuelle, pas de fog of war, pas de planification complète sur carte imparfaite.

---

## 16. Chroniques 🟢

Après chaque expédition, un rapport (`WaveReport`) est généré et contient :
- un résumé économique (or gagné, remboursements, pénalités) ;
- un ou plusieurs **fils narratifs** générés (`narrativeReports.ts`) décrivant les faits marquants ;
- les **chroniques des monstres vétérans** (kills cumulés, surnoms) ;
- les **mentions de restes/reliques** uniquement si un survivant a réellement transmis ce fait ;
- des **crochets de legs** (`legacyHooks`) sur les profils d'aventuriers, base des futures histoires d'héritiers.

Ces chroniques sont la matière première de la mémorabilité recherchée par le principe *« une bonne partie doit raconter une histoire »* (voir [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md)).

---

## 17. Réputation 🟢

**Réputation du donjon** — six paliers, recalculés après chaque expédition :

| Seuil | Titre |
|---|---|
| 0–5 | Donjon oublié |
| 6–15 | Petit repaire |
| 16–27 | Donjon dangereux |
| 28–41 | Forteresse maudite |
| 42–59 | Le Donjon Noir |
| 60+ | Fléau du Royaume |

**Formule** : `kills × 2 + évasions + numéro de vague − (6 si trésor volé)` *(le « numéro de vague » désigne le numéro d'expédition, voir la note de terminologie en tête de document)*.

**Réputation individuelle des aventuriers** : un champ `reputation` et un titre associé (`reputationTitle`) suivent chaque profil, indépendamment de la réputation du donjon.

🟡 **PARTIEL** — La réputation de la **guilde** existe comme champ de donnée (`guilds[...].reputation`) mais n'est **jamais mise à jour** en jeu actuellement (voir [§19 Guilde](#19-guilde-)).

---

## 18. Royaume 🟡

État actuel : un royaume unique et statique, **Royaume de Ciremarque**, portant un champ `alarm` qui n'est **jamais modifié** par le gameplay (voir [LORE.md](./LORE.md) pour le contexte narratif).

🔵 **CIBLE** — Un royaume vivant avec des pressions régionales (peur, cupidité, gloire, prime) qui influencent concrètement la fréquence et la composition des expéditions, plusieurs royaumes ou territoires, et une alarme qui a un effet mesurable en jeu. Conformément à D-010 (voir [DECISIONS.md](./DECISIONS.md)), ce royaume vivant ne devra jamais connaître le donjon par magie : son alarme et ses pressions devront rester déduites des informations rapportées par les expéditions (voir [§21](#21-exploration-des-aventuriers-) à [§24](#24-cartographe-)). Cette section est volontairement en retrait par rapport à la vision du jeu ([GAME_VISION.md](./GAME_VISION.md)) — c'est l'écart principal identifié pour le Milestone 3 *The Kingdom Remembers* (voir [ROADMAP.md](./ROADMAP.md)).

---

## 19. Guilde 🟡

État actuel : une guilde unique et statique, **Guilde du Contrat Cendreux**, à laquelle tous les profils d'aventuriers sont rattachés. Aucun recrutement limité, aucune rivalité, aucun changement de tactique propre à la guilde.

🔵 **CIBLE** — Système de guilde vivant : recruteurs actifs, tactiques préférées propres à la guilde, rancunes accumulées, effectif limité (perte réelle et durable d'un type de profil si trop d'aventuriers meurent), possibilité de guildes concurrentes. Voir Milestone 3 — *The Kingdom Remembers* ([ROADMAP.md](./ROADMAP.md)).

---

## 20. Intelligence collective 🟢

Deux mécanismes produisent l'adaptation perçue par le joueur :

1. **Pression de rôle** (`rolePressure`, voir [§15](#15-mémoire-)) — modifie la composition de l'expédition suivante selon les déclencheurs listés plus haut.
2. **Rumeurs de taverne** (`tavernRumors.ts`) — un effet narratif et mécanique choisi après chaque expédition :

| Rumeur | Déclencheur | Effet mécanique |
|---|---|---|
| Poussée de cupidité (`greedSurge`) | Trésor volé, ou par défaut | Biaise le plan d'expédition vers *greedy* |
| Recrutement de voleurs (`thiefRecruitment`) | 2+ kills sur pièges | `rolePressure.thief += 1` |
| Recrutement de guerriers (`warriorRecruitment`) | 2+ kills de monstres | `rolePressure.warrior += 1` |
| Recrutement de soigneurs (`healerRecruitment`) | 30+ points de soin prodigués | `rolePressure.healer += 1` |
| Poussée de prudence (`cautionSurge`) | 2+ kills de boss ou 3+ usages de capacité | Biaise le plan d'expédition vers *cautious* |

🔵 **CIBLE** — Apprentissage collectif au-delà du comptage de rôles : cartes de pièges partagées entre aventuriers d'une même guilde, mémoire de chemin collective, écran de taverne dédié avec plusieurs rumeurs concurrentes plutôt qu'une seule retenue par expédition. Voir Milestone 3 — *The Kingdom Remembers*, et [§21](#21-exploration-des-aventuriers-) à [§24](#24-cartographe-) pour la dimension « guerre de l'information » de cet apprentissage.

---

## 21. Exploration des aventuriers ⚪

Aujourd'hui, une expédition connaît implicitement tout le donjon dès son entrée : le pathfinding utilise la carte réelle et complète pour se déplacer et éviter les cases dangereuses apprises (voir [§15 Mémoire](#15-mémoire-)). Ce n'est pas encore remis en question par le code.

⚪ **EXPLORATOIRE** — piste envisagée pour rendre la guerre de l'information (voir [DECISIONS.md](./DECISIONS.md) D-010) crédible côté aventuriers, pas seulement côté royaume :
- Les aventuriers d'une expédition ne connaîtraient pas nécessairement l'intégralité du donjon avant d'y entrer, seulement ce que la Guilde leur a transmis (voir [§22 Cartographie progressive](#22-cartographie-progressive-)).
- Une expédition pourrait devoir explorer une zone jamais cartographiée avant de savoir si elle est piégée, ce qui changerait la nature du pathfinding actuel (omniscient) vers un pathfinding partiellement informé.
- Un aventurier prudent pourrait ralentir dans une zone inconnue ; un aventurier cupide pourrait s'y précipiter malgré tout (lien avec [§13 Traits](#13-traits-)).

Cette piste n'est pas encore rattachée à un milestone précis ; elle dépend des fondations posées par [§4 Donjon creusé](#4-donjon-creusé-) et [§22 Cartographie progressive](#22-cartographie-progressive-).

---

## 22. Cartographie progressive 🟡

Conséquence directe de D-010 (voir [DECISIONS.md](./DECISIONS.md)) : le Royaume ne connaît pas le donjon par magie. Il apprend uniquement via les survivants, les cartographes, les rumeurs, les rapports d'expédition et des fragments de carte.

🟡 **PARTIEL (Cartographer V1 + Remains & Relics V1 + Zones/Guardian V1)** :
- Les aventuriers produisent maintenant des observations limitées aux portes, pièges, trésors, trésors spéciaux, défenseurs, gardien, boss, zones importantes/dangereuses, routes bloquées/changées, restes et sites de mort qu'ils ont plausiblement vus.
- Seuls les survivants transmettent leurs observations. Un cartographe survivant augmente la confiance, la précision et la correction de faits périmés ; un cartographe mort perd ses notes personnelles.
- Equilibrage global V1 plafonne les faits conserves (`kingdomFacts` et ancienne `kingdomMemory`) et augmente le decay : le Royaume garde les faits utiles, pas une carte exhaustive.
- Les rumeurs/taverne peuvent afficher "Croquis fiable", "Carte perdue" ou une relique/site de mort reconnu sans créer de carte visuelle.

🔵 **CIBLE (Milestone 3 — The Kingdom Remembers)** :
- Chaque expédition ne rapporte, au mieux, que ce qu'elle a effectivement traversé ou observé — pas une carte complète du donjon.
- Les fragments rapportés par des expéditions successives s'accumulent pour former la carte *connue par le Royaume*, potentiellement très différente du donjon *réel* au moment où une future expédition est planifiée.
- Le joueur peut modifier son donjon entre deux expéditions (voir [§4 Donjon creusé](#4-donjon-creusé-)) : la carte du Royaume peut donc devenir **obsolète**, et une expédition préparée sur des informations périmées peut se tromper de chemin ou ignorer un piège récemment posé.
- Tuer un cartographe (voir [§24 Cartographe](#24-cartographe-)) ou empêcher un survivant précis de s'échapper ralentit concrètement cet apprentissage.

Cette mécanique est ce qui rend la promesse *« le royaume apprend »* (voir [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) #11) compatible avec le principe *« l'IA doit surprendre par sa logique, pas par son omniscience »* (#13) : le joueur peut, en observant les expéditions suivantes, déduire ce que le royaume croit savoir — et exploiter l'écart avec la vérité.

---

## 23. Informations imparfaites 🔵

Toute information qui remonte au Royaume via une expédition (voir [§22](#22-cartographie-progressive-)) n'est pas nécessairement fiable. Pour que la guerre de l'information (D-010) ait un sens mécanique, une information rapportée peut être :

| Nature de l'information | Effet attendu |
|---|---|
| **Exacte** | Le Royaume prépare correctement la prochaine expédition sur ce point précis |
| **Incomplète** | Le Royaume ne connaît qu'une partie du donjon (une salle, un couloir), pas l'ensemble |
| **Ancienne** | L'information était vraie au moment du rapport, mais le donjon a changé depuis (voir [§4 Donjon creusé](#4-donjon-creusé-)) |
| **Mal interprétée** | Un survivant paniqué ou blessé rapporte un fait déformé (ex. surestime le nombre de pièges) |
| **Contradictoire** | Deux rapports d'expéditions différentes se contredisent, forçant la Guilde à arbitrer ou à envoyer une reconnaissance |

🔵 **CIBLE (Milestone 3)** — ces catégories qualifient les fragments de carte et les rapports d'expédition consommés par l'apprentissage du Royaume (voir [§15 Mémoire](#15-mémoire-), [§20 Intelligence collective](#20-intelligence-collective-)), en remplacement ou en complément d'une mémoire parfaite.

⚪ **EXPLORATOIRE** — faire varier la fiabilité d'un rapport selon le trait du survivant qui le porte (un aventurier traumatisé rapporte-t-il moins fidèlement qu'un aventurier prudent ? voir [§13 Traits](#13-traits-)) — voir [IDEAS.md](./IDEAS.md).

---

## 24. Cartographe 🟡

Le **Cartographe** est une classe stratégique V1 implémentée. Son rôle est utilitaire : améliorer la qualité des informations transmises au Royaume s'il survit, pas remplacer un combattant, un voleur ou un soigneur.

🟡 **V1 implémentée** :
- rôle `cartographer`, fragile, faible en dégâts, placé milieu/arrière ;
- ne crochette pas les portes et ne désamorce pas les pièges ;
- observe autour de lui avec un rayon supérieur à un survivant ordinaire, mais seulement ce que l'expédition traverse ou approche ;
- s'il survit, les faits observés gagnent en confiance/précision et peuvent corriger du stale ;
- s'il meurt, ses notes personnelles sont perdues sauf si d'autres survivants ont observé les mêmes éléments ;
- la Guilde peut en recruter un quand la mémoire est faible, périmée ou contradictoire, sans supplanter un voleur obligatoire.

### Zones et gardien V1 🟢

Le donjon actuel reste une seule carte, mais la simulation dérive maintenant des `DungeonZone` depuis le layout existant, les ancres, les trésors et les défenses. Ces zones sont des couches de lecture (`entrance`, `defense`, `secondary`, `antechamber`, `treasure`, `boss`, `corridor`) : elles ne remplacent pas les tuiles, ne créent pas de carte visuelle, et ne changent pas le pathfinding de base.

V1 implémentée :
- zones calculées automatiquement, sans éditeur manuel ;
- les aventuriers suivent leur zone courante et leur dernière zone importante ;
- l'antichambre peut provoquer une courte préparation avant boss ;
- les faits `zoneReached`, `antechamberSeen`, `treasureRoomSeen`, `bossApproachKnown`, `dangerousZoneSeen`, `guardianSeen`, `guardianFought` et `guardianKilledAdventurer` ne rejoignent Kingdom Remembers que par survivant ;
- un cartographe survivant améliore précision/confiance sur ces faits ;
- un `guardian` unique peut être placé en zone de défense, salle secondaire ou antichambre, jamais sur entrée, trésor, boss, porte, roche, case invalide ou restes d'aventurier ;
- le gardien utilise l'aggro/combat existants et se lit comme une défense élite (`GUARD`), pas comme un boss.

Non-objectifs V1 : multi-map, étages, génération procédurale, minimap/fog of war, sous-boss complet avec arène dédiée, loot de gardien, ou cadavres persistants de monstres.

### Restes et reliques V1 🟢

Quand un aventurier meurt, le donjon conserve des `AdventurerRemains` à l'endroit de la mort. La trace contient le nom, le rôle, la vague/jour, la cause, un état visuel simple, une relique personnelle déterministe (bague, médaillon, lettre, écusson, arme brisée, fragment de carte, foulard, pendentif, carnet, jeton) et un petit butin de fouille.

V1 reste volontairement sobre :
- seuls les aventuriers morts laissent ce type de restes persistants ; les monstres/défenses morts ne deviennent pas des cadavres persistants ;
- les restes sont visibles en jeu, non bloquants pour le pathfinding et compressés visuellement par case ;
- la relique personnelle n'est pas ramassable, vendable ou craftable ;
- le butin de fouille est récupérable une seule fois pendant la préparation via `Fouiller restes` et donne un petit montant d'or ;
- les futurs aventuriers peuvent rarement réagir ou reconnaître une relique si la situation est assez sûre ;
- les faits `remainsSeen`, `relicRecognized`, `deathSiteKnown`, `dangerousDeathSite`, `bossKilledAdventurerHere` et `trapKilledAdventurerHere` ne rejoignent Kingdom Remembers que par survivant ;
- un cartographe survivant améliore précision/confiance sur ces sites de mort ;
- la taverne et la chronique ne mentionnent ces traces que depuis un fait réel transmis.

Non-objectifs V1 : généalogie, famille automatique, inventaire de cadavre, équipement récupérable complexe, nécromancie, squelettes ennemis, écran dédié aux morts ou Kingdom Remembers V2.

🔵 **CIBLE future** — carte visuelle progressive, fragments récupérables, fausses cartes, relation plus profonde avec [§23 Informations imparfaites](#23-informations-imparfaites-), et traitement plus riche des carnets/reliques laissés dans le donjon.

---

## 25. Débriefing 🟢

Écran affiché en phase **Report**, construit à partir du `WaveReport` :
- gain d'or et détail (récompense, remboursement, pénalité) ;
- texte narratif de l'expédition ;
- rumeur de taverne générée ;
- notes d'adaptation (ce qui a changé et pourquoi, en langage clair) ;
- aperçu de la composition de la prochaine expédition ;
- compteur d'expéditions survécues et **record local** (stocké en `localStorage`, purement déclaratif — *« le record reste purement moral »*, cf. code ; le stockage utilise encore le terme historique « vague »).

🔵 **CIBLE** — Écran de taverne étendu avec plusieurs rumeurs visibles simultanément et concurrentes (voir [§20](#20-intelligence-collective-)).

---

## 26. Progression 🟡

**Progression intra-partie** (🟢 implémentée) : scaling par expédition (voir [§12](#12-aventuriers-)), soin du boss et des monstres entre les expéditions, accumulation de mémoire tactique (voir [§15](#15-mémoire-)).

**Reputation du donjon / menace V1** (implemente) : la run suit maintenant deux valeurs dans `RunWorldMemory.dungeonReputation`.

| Axe | Role |
|---|---|
| Reputation / notoriete (`value`) | A quel point le donjon est connu et attire contrats, rumeurs et recompenses |
| Menace (`threat`) | A quel point la Guilde le considere dangereux et prepare mieux ses equipes |

Paliers V1 :

| Palier | Nom | Effets principaux |
|---|---|---|
| 0 | Donjon inconnu | Base naive, defenses de depart |
| 1 | Rumeur locale | Leger bonus recompense, pression cartographe/soigneur, premiers unlocks |
| 2 | Donjon dangereux | Meilleure preparation, pression guerrier/soigneur, `roomLockTrap`/`guardian` accessibles par palier |
| 3 | Menace regionale | Plans plus serieux, plus de mage/healer, bonus de recompense accru |
| 4 | Donjon tristement celebre | Expeditions fortement preparees, lignes taverne dediees, recompense maximale V1 |

La reputation monte avec les morts, survivants revenus raconter, cartographes survivants, gardien meurtrier, boss vu/atteint, wipes, tresors speciaux lootes, richesse du donjon et progression des expeditions. Une expedition sans survivant n'ajoute qu'une notoriete vague : aucun fait precis Kingdom n'est cree sans temoin. Kingdom Remembers garde son role : il decrit ce que la Guilde croit savoir, tandis que la reputation dit seulement a quel point le donjon semble connu/dangereux.

Effets V1 : bonus d'or modere, leger bonus PV/degats aux aventuriers prepares, pression de roles dans `expeditionComposition`, plans d'expedition plus ambitieux a haut palier, unlocks de defenses existantes par palier OU vague, affichage HUD (`Reputation`, `Menace`) et ligne taverne contextuelle. Non-objectifs : factions, politique, carte du royaume, evenements mondiaux, reputation par ville, arbre de tech complet.

**Progression trans-parties** (🟡 partielle) : à ce jour, seul le **record d'expéditions survécues** persiste après une Defeat (stockage local, sans effet sur le gameplay). Toute la mémoire du monde repart de zéro à chaque nouvelle partie.

🔵 **CIBLE** — Une forme de méta-progression compatible avec le principe *« le joueur finit toujours par perdre »* (voir [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) #18) : par exemple, un royaume qui commence légèrement différent (mais jamais plus facile) à chaque nouvelle partie, informé par le souvenir collectif — nécessairement imparfait (voir [DECISIONS.md](./DECISIONS.md) D-010, [§23](#23-informations-imparfaites-)) — des parties précédentes plutôt que par un bonus de puissance pour le joueur. Cette question est ouverte — voir [IDEAS.md](./IDEAS.md), section « À explorer ».

---

## 27. Conditions de victoire et de défaite 🟢

| Condition | Résultat |
|---|---|
| Tous les aventuriers de l'expédition meurent ou fuient | **Victoire temporaire** : retour en phase Build pour préparer l'expédition suivante |
| Le boss meurt | **Défaite** : fin de la partie, réinitialisation complète |

Il n'existe **aucune condition de victoire finale**. C'est un choix de design assumé (voir [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) #3) : la seule fin possible du jeu est la mort du boss.

---

## 28. Interface 🟢

Interface hybride : rendu de jeu via Phaser (`#game-canvas`) et interface HTML/DOM (`#ui-root`) synchronisée par un instantané en lecture seule (`UiSnapshot`) publié périodiquement (~120 ms) par la scène active.

**Éléments principaux de l'UI** :
- Panneau de construction (sélection de piège/monstre, coût, or restant) ;
- Aperçu de la prochaine escouade et rumeurs actives ;
- Indication compacte `Reputation` / `Menace` du donjon dans le HUD ;
- Barre d'expéditions, PV du boss, contrôles pause/vitesse ;
- Panneau d'inspection d'un aventurier (niveau, traits, blessures, vendetta) au clic pendant une expédition ;
- Écran de débriefing (voir [§25](#25-débriefing-)).

L'interface texte du jeu est actuellement en français.

---

## 29. Contrôles 🟢

| Action | Contrôle actuel |
|---|---|
| Placer une défense | Clic sur une case en phase Build |
| Inspecter un aventurier | Clic sur l'aventurier en phase Wave |
| Activer une capacité de boss | Bouton dédié dans l'UI |
| Pause / vitesse (x1, x2, x3) | Boutons dédiés dans l'UI |

🔵 **CIBLE** — Raccourcis clavier pour les capacités de boss (1/2/3) et la pause (espace), aperçus de placement plus clairs pour la portée des pièges et des monstres.

---

## 30. Architecture gameplay 🟢

**Principe directeur** : *la simulation possède les règles ; Phaser affiche l'état et transmet les entrées.*

```
src/
├── game/            → état de simulation, constantes, types, instantanés UI
│   ├── DungeonSimulation.ts   (moteur principal, ~1900 lignes)
│   ├── constants.ts           (grille, or de départ, cellules fixes)
│   ├── types.ts                (système de types complet)
│   └── uiSnapshot.ts           (vues en lecture seule + actions joueur)
├── entities/        → tables de statistiques (pièges, monstres, aventuriers)
├── systems/         → IA, pathfinding, profils, rumeurs, rapports
├── scenes/          → scènes Phaser (rendu uniquement)
└── ui/              → interface DOM + pont d'événements
```

Cette séparation garantit que toute règle de jeu peut être testée en simulation pure, sans navigateur (voir `npm run smoke`).

🔵 **CIBLE** — Extraction d'un système de combat dédié quand le nombre de règles de combat dans `DungeonSimulation.ts` le justifiera (voir [TODO technique historique](../TODO.md)).

---

## 31. Objectifs long terme 🔵

1. Faire du royaume une entité qui apprend **entre** les parties, pas seulement à l'intérieur d'une partie, sans jamais permettre une victoire permanente, et sans jamais lui prêter une connaissance qu'il n'a pas légitimement acquise (voir [DECISIONS.md](./DECISIONS.md) D-010).
2. Donner à la guilde et au royaume une vie propre (recrutement limité, rivalités, pressions régionales).
3. Transformer la construction du donjon en un véritable système de creusement (salles typées, portes, territoire — voir [§4](#4-donjon-creusé-) à [§6](#6-salles-spécialisées-)) sans jamais perdre la lisibilité de l'espace.
4. Remplacer les placeholders visuels et sonores par une direction artistique cohérente avec le ton du jeu (voir [ROADMAP.md](./ROADMAP.md), Milestone 5).
5. Faire de l'information une ressource stratégique à part entière, aussi précieuse que l'or ou le territoire (voir [§21](#21-exploration-des-aventuriers-) à [§24](#24-cartographe-)).
6. Garantir que chaque nouvelle fonctionnalité renforce au moins un des [5 piliers du jeu](#1-les-5-piliers-du-jeu-) et rende les expéditions plus mémorables, pas simplement plus difficiles.
