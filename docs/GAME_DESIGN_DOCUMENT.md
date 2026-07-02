# Game Design Document — Loot Me If You Can

| | |
|---|---|
| **Statut** | Vivant — chaque section évolue indépendamment |
| **Version du jeu documentée** | v0.5.0 |
| **Propriétaire** | Game Design |
| **Dernière mise à jour** | 2026-07-02 |
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

---

## 1. Présentation générale 🟢

| Élément | Valeur |
|---|---|
| **Titre** | Loot Me If You Can *(nom de projet interne : Final Boss Dungeon)* |
| **Genre** | Stratégie / gestion en temps réel, boucle de défense par vagues, narration émergente |
| **Point de vue** | Le joueur incarne le boss final et gardien du donjon |
| **Moteur** | Phaser 3.90 (rendu), TypeScript, Vite (build) |
| **Plateforme** | Web (navigateur), PC en priorité |
| **Format** | Partie unique continue, sans reset caché, jusqu'à la mort du boss |

**Résumé en un paragraphe** : le joueur prépare un donjon en dépensant de l'or sur une grille, puis lance une vague de cinq aventuriers qui tentent de voler un trésor et de tuer le boss. Le combat se résout automatiquement ; le joueur peut activer des capacités de boss. Après chaque vague, un rapport narratif explique ce qui s'est passé, et le royaume adapte sa prochaine escouade en fonction de ce qui a fonctionné contre lui.

---

## 2. Gameplay Loop 🟢

```
   MENU
     │  (Commencer)
     ▼
┌─────────┐   lancer vague    ┌─────────┐   vague résolue   ┌──────────┐
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

1. **Build** — Le joueur pose pièges et monstres sur la grille avec son or disponible, modifie les murs/sols du donjon, consulte l'aperçu de la prochaine escouade et les rumeurs de taverne, puis lance la vague.
2. **Wave** — Les cinq aventuriers entrent, pathfindent vers le trésor puis vers le boss, combattent en temps réel. Le joueur peut activer les capacités du boss, mettre en pause, accélérer (x1/x2/x3), et inspecter un aventurier en cliquant dessus.
3. **Report** — Bilan économique, rapport narratif, changements de la guilde, rumeur générée pour la prochaine vague, aperçu du prochain recrutement.
4. **Defeat** — Déclenché uniquement par la mort du boss. Écran de clôture narrative ; **redémarre une nouvelle partie complète** (réinitialisation totale de la mémoire du monde — voir [§9 Mémoire](#9-mémoire-)).

Il n'existe pas de victoire permanente : survivre à une vague ne fait que renvoyer en Build pour préparer la suivante, indéfiniment, jusqu'à la Defeat.

---

## 3. Construction du donjon 🟡

| Élément | Valeur |
|---|---|
| Grille | 18 × 12 cases, 36 px/case |
| Cellules fixes protégées | Entrée (0,5) · Trésor (14,3) · Boss (17,9) — non constructibles |
| Or de départ | 30 |
| Outils actuels | **Mur** (bloque le passage), **Sol** (retire un mur), **Salle** (dégage un carré 3×3 de murs) |
| Contrainte de validation | Toute modification qui casserait le chemin entrée → trésor → boss est refusée |

Le donjon démarre avec un tracé de murs prédéfini (`WALL_CELLS`) qui impose un premier couloir logique. Le joueur peut ensuite densifier ou simplifier ce tracé, tant qu'un chemin reste possible.

🔵 **CIBLE** — Système de salles et de portes distinctes (au lieu d'un simple carvage de murs), permettant des typologies de salles avec effets propres (voir [IDEAS.md](./IDEAS.md)). Les portes ouvriraient des décisions tactiques supplémentaires (ralentir, forcer un détour, créer un goulot d'étranglement payant).

---

## 4. Système économique 🟢

| Flux | Formule / valeur |
|---|---|
| Or de départ | 30 |
| Récompense de vague repoussée | `14 + vague × 4` |
| Remboursement des pièges | Coût plein des pièges restants (les pièges sont démontés après chaque vague) |
| Pénalité de trésor volé | `min(or gagné + remboursement pièges, 8 + vague × 2)` |
| Soin du boss entre vagues | `24 + vague × 2` PV |
| Soin des monstres entre vagues | `+28 %` des PV max |

**Principes économiques** :
- Les **pièges** sont un investissement à usage unique par vague : posés, potentiellement rentabilisés, puis remboursés — le coût réel d'un piège est nul sur la durée s'il n'est jamais détruit, mais il occupe une décision de placement à chaque cycle.
- Les **monstres** sont un investissement permanent : ils survivent, se soignent, gagnent en réputation individuelle (voir [§14 Réputation](#14-réputation-)), mais aucune mécanique actuelle ne les fait mourir définitivement de vieillesse — seule leur mort en combat compte.
- Le **trésor volé** est la seule perte nette du joueur : elle est plafonnée pour éviter une spirale économique impossible à rattraper, mais reste toujours douloureuse.

---

## 5. Pièges 🟢

| Piège | Coût | Dégâts | Cooldown |
|---|---|---|---|
| Piège à pics (`spikeTrap`) | 4 or | 24 | 1450 ms |
| Piège de feu (`fireTrap`) | 7 or | 34 | 2100 ms |

**Règles** :
- Un piège s'active quand un aventurier entre sur sa case, avec un temps de recharge avant de pouvoir refrapper.
- Les pièges sont **démontés et intégralement remboursés** à la fin de chaque vague résolue : le joueur repart d'une page blanche de pièges à chaque préparation.
- Le multiplicateur de dégâts de piège dépend du rôle de l'aventurier qui marche dessus (voir [§8 Aventuriers](#8-aventuriers-)) — un voleur encaisse moitié moins qu'un guerrier.
- Chaque mort causée par un piège sur une case donnée **augmente durablement la dangerosité apprise de cette case** dans le pathfinding adverse (`trapDangerByCell`, +1.25 par kill) : les vagues suivantes évitent activement les cases qui ont déjà tué.

🔵 **CIBLE** — Upgrades de pièges entre les vagues (financés par la réputation ou l'or), pour que l'investissement dans un piège efficace puisse s'accumuler au lieu de repartir de zéro à coût identique.

---

## 6. Monstres 🟢

| Monstre | Coût | PV | Dégâts | Portée d'attaque | Cooldown | Comportement |
|---|---|---|---|---|---|---|
| Slime (`slime`) | 5 or | 48 | 5 | 1.1 | 760 ms | Ralentit les intrus au contact |
| Squelette (`skeleton`) | 8 or | 38 | 12 | 1.25 | 1180 ms | Garde une position, résiste en ligne |
| Gobelin (`goblin`) | 6 or | 32 | 7 | 1.15 | 560 ms | Patrouille puis poursuit activement |

**Règles** :
- Les monstres, contrairement aux pièges, **persistent d'une vague à l'autre** et récupèrent `+28 %` de PV max entre deux vagues.
- Chaque monstre est **nommé individuellement** (ex. *Clavicule*, *Grattouille*) dès sa pose, comptabilise ses kills, et devient un **vétéran** consigné dans les chroniques du donjon (voir [§13 Chroniques](#13-chroniques-)).
- L'IA de chaque type est distincte (patrouille/poursuite pour le gobelin, garde de position pour le squelette, ralentissement de zone pour le slime) plutôt qu'un comportement générique partagé.

🔵 **CIBLE** — Types de monstres supplémentaires, traits d'équipement débloqués après des morts répétées, monstres nommés capables de devenir la cible spécifique d'un héritier vengeur (au lieu d'une vengeance par *type* de défense uniquement, voir [§10](#10-traits-)).

---

## 7. Boss 🟢

| Statistique | Valeur |
|---|---|
| PV | 340 |
| Dégâts (attaque de base) | 16 |
| Portée de détection | 3.5 |
| Distance de laisse (leash) | 3.1 |
| Soin entre vagues | `24 + vague × 2` PV |

**Capacités activables par le joueur pendant une vague** :

| Capacité | Effet | Cooldown | Usages max / vague |
|---|---|---|---|
| Onde de choc | 22 dégâts de zone + étourdissement 900 ms, rayon 2.9 | 9 s | 3 |
| Rugissement | Peur : les cibles fuient vers la sortie pendant 2600 ms, rayon 4.2 | 14 s | 2 |
| Renforts osseux | Invoque 2 squelettes temporaires près du boss | 20 s | 1 |

Le boss attaque automatiquement les aventuriers à portée entre les activations de capacités ; le joueur ne le déplace pas directement, il l'assiste tactiquement.

🔵 **CIBLE** — Capacités supplémentaires et chemin d'amélioration financé par l'infamie/réputation du donjon, pour que le boss évolue lui aussi entre les paliers de menace (voir [§16 Royaume](#16-royaume-) et [ROADMAP.md](./ROADMAP.md)).

---

## 8. Combat 🟢

Le combat se résout **en temps réel et automatiquement** : chaque unité (aventurier, monstre, boss) possède une portée d'attaque, un cooldown, et cible l'ennemi valide le plus pertinent selon ses règles propres (le boss cible le plus faible ; certains aventuriers priorisent leur nemesis — voir [§10](#10-traits-)).

**Éléments clés** :
- Chaque rôle d'aventurier a un **multiplicateur de dégâts de piège** propre (`trapDamageMultiplier`), rendant certains rôles beaucoup plus vulnérables aux pièges que d'autres.
- Porter le trésor inflige une **pénalité de vitesse de 18 %** au porteur.
- Un aventurier mort lâche le trésor s'il le portait (`dropped`), permettant à un autre membre de l'escouade de le ramasser.
- Le soigneur applique des soins de zone (`healAmount`, `healRange`) plutôt qu'un ciblage unique.

🟡 **PARTIEL** — La résolution de combat vit aujourd'hui directement dans la simulation principale (`DungeonSimulation.ts`). Une extraction en système dédié est prévue une fois le nombre de règles de combat suffisamment grand (voir architecture, [§21](#21-architecture-gameplay-)).

---

## 9. Aventuriers 🟢

| Rôle | PV | Dégâts | Vitesse | Portée | Particularité |
|---|---|---|---|---|---|
| Guerrier (`warrior`) | 72 | 7 | 0.00175 | 1.18 | Résiste bien aux pièges (×0.92) |
| Voleur (`thief`) | 44 | 5 | 0.00235 | 1.05 | Très résistant aux pièges (×0.48), évite activement les cases dangereuses |
| Mage (`mage`) | 34 | 13 | 0.00162 | 2.55 | Dégâts élevés à distance, aucune résistance aux pièges |
| Soigneur (`healer`) | 40 | 3 | 0.00172 | 1.8 | Soigne (`healAmount` 10, `healRange` 2.4) |

**Composition de l'escouade** : fixe à **5 aventuriers** par vague (décision de design, voir [DECISIONS.md](./DECISIONS.md)). La répartition des rôles n'est pas aléatoire : elle est pondérée par la **pression de rôle** apprise (`rolePressure`), c'est-à-dire par ce qui a fonctionné ou échoué lors des vagues précédentes (voir [§17 Intelligence collective](#17-intelligence-collective-)).

**Progression par vague** (appliquée à chaque nouvelle escouade) :

| Statistique | Scaling |
|---|---|
| PV | +13 % par numéro de vague |
| Dégâts | +8 % par numéro de vague |
| Vitesse | jusqu'à +22 % (plafonné) |
| Vétérans (ont survécu à une expédition précédente) | +8 % par expédition survécue, plus bonus de réputation |
| Héritiers | ×1.12 sur l'ensemble des statistiques |

---

## 10. Traits 🟢

| Trait | Effet comportemental |
|---|---|
| Courageux (`courageous`) | Reste engagé plus longtemps avant de fuir |
| Prudent (`cautious`) | Se replie tôt, privilégie les plans prudents |
| Vindicatif (`vengeful`) | Priorise en combat le **type** de défense qui a tué son ancêtre (nemesis) |
| Cupide (`greedy`) | Priorise le trésor, quitte à prendre des risques |
| Traumatisé (`traumatized`) | Comportement dégradé après une expérience violente |
| Célèbre (`famous`) | Aventurier notoire, lié à la réputation et aux chroniques |

Ces traits alimentent des **plans d'expédition** (`ExpeditionPlanType`) tirés par l'IA de groupe : *greedy, heroic, cautious, fanatic, mercenary* — chacun avec un objectif primaire (trésor ou boss) et ses propres seuils de repli (ex. : un plan prudent se replie après 2 morts ; un plan cupide se replie après avoir sécurisé le trésor si des pertes ont eu lieu ; un survivant solitaire bat en retraite sauf en plan héroïque).

Les rumeurs de taverne (voir [§17](#17-intelligence-collective-)) peuvent biaiser le choix du plan de la prochaine expédition (`greedSurge` → plan cupide, `cautionSurge` → plan prudent).

🟡 **PARTIEL** — Le ciblage vindicatif se fait aujourd'hui par *type* de monstre (ex. tous les gobelins), pas par individu nommé. Cibler l'individu exact responsable de la mort de l'ancêtre est une cible du roadmap (voir [IDEAS.md](./IDEAS.md)).

---

## 11. Blessures 🟡

| Statut de vie (`lifeStatus`) | alive · injured · missing · dead · retired |
|---|---|
| **Disponibilité** (`availability`) | available · onExpedition · recovering |
| **Traumatisme** | Valeur cumulative (`trauma`) influençant le profil de personnalité dominant |
| **Blessures** | Liste d'objets `AdventurerInjury` attachés au profil |

L'état actuel couvre la persistance des statuts et un système de traumatisme basique. 🔵 **CIBLE** — Minuteurs de convalescence réels, cicatrices permanentes avec effets mécaniques visibles, et changements de comportement observables en jeu (fuite plus rapide, refus de certains rôles) plutôt qu'un simple flag interne.

---

## 12. Mémoire 🟢

Le cœur technique de la promesse « le royaume apprend ». Deux structures de données portent cette mémoire :

**`AdaptationMemory`** (mémoire tactique du donjon courant) :

```
trapAvoidance      : nombre flottant, démarre à 0.35, plafonné autour de 2.75
trapDangerByCell   : { case → dangerosité apprise }, +1.25 par kill de piège sur cette case
rolePressure       : { rôle → pression }, pousse vers plus/moins de tel rôle
```

Ces valeurs modifient directement le **pathfinding** (une case qui a déjà tué coûte plus cher à traverser, avec un multiplicateur plus fort pour les voleurs) et la **composition des futures escouades**.

**`RunWorldMemory`** (mémoire narrative persistante) : profils d'aventuriers individuels, morts/survies enregistrées, chroniques, réputation, guilde et royaume associés.

**Déclencheurs d'adaptation post-vague** (`applyAdaptation`) :

| Situation observée | Réaction du royaume |
|---|---|
| Beaucoup de pièges / kills sur pièges | Plus de voleurs, évitement de pièges renforcé |
| Combats longs | Plus de soigneurs |
| Monstres très efficaces | Plus de guerriers |
| Boss mortel ou dégâts de boss élevés | Plus de guerriers et de soigneurs |
| Trésor volé sans affronter le boss | Plus de guerriers et de mages |
| Quasi-anéantissement rapide de l'escouade | Plus de soigneurs et de voleurs |
| Cas par défaut | Plus de mages |

⚠️ **Important** — Cette mémoire est **entièrement réinitialisée** à chaque nouvelle partie (`startNewGame()` appelle `createInitialWorldMemory()`). Le royaume apprend *à l'intérieur* d'une partie continue, mais pas encore *entre* deux parties distinctes après une Defeat. Voir [§16 Royaume](#16-royaume-) pour la cible d'une mémoire trans-parties.

---

## 13. Chroniques 🟢

Après chaque vague, un `WaveReport` est généré et contient :
- un résumé économique (or gagné, remboursements, pénalités) ;
- un ou plusieurs **fils narratifs** générés (`narrativeReports.ts`) décrivant les faits marquants ;
- les **chroniques des monstres vétérans** (kills cumulés, surnoms) ;
- des **crochets de legs** (`legacyHooks`) sur les profils d'aventuriers, base des futures histoires d'héritiers.

Ces chroniques sont la matière première de la mémorabilité recherchée par le principe *« une bonne partie doit raconter une histoire »* (voir [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md)).

---

## 14. Réputation 🟢

**Réputation du donjon** — six paliers, recalculés après chaque vague :

| Seuil | Titre |
|---|---|
| 0–5 | Donjon oublié |
| 6–15 | Petit repaire |
| 16–27 | Donjon dangereux |
| 28–41 | Forteresse maudite |
| 42–59 | Le Donjon Noir |
| 60+ | Fléau du Royaume |

**Formule** : `kills × 2 + évasions + numéro de vague − (6 si trésor volé)`.

**Réputation individuelle des aventuriers** : un champ `reputation` et un titre associé (`reputationTitle`) suivent chaque profil, indépendamment de la réputation du donjon.

🟡 **PARTIEL** — La réputation de la **guilde** existe comme champ de donnée (`guilds[...].reputation`) mais n'est **jamais mise à jour** en jeu actuellement (voir [§16](#16-royaume-)).

---

## 15. Royaume 🟡

État actuel : un royaume unique et statique, **Royaume de Ciremarque**, portant un champ `alarm` qui n'est **jamais modifié** par le gameplay (voir [LORE.md](./LORE.md) pour le contexte narratif).

🔵 **CIBLE** — Un royaume vivant avec des pressions régionales (peur, cupidité, gloire, prime) qui influencent concrètement la fréquence et la composition des vagues, plusieurs royaumes ou territoires, et une alarme qui a un effet mesurable en jeu. Cette section est volontairement en retrait par rapport à la vision du jeu ([GAME_VISION.md](./GAME_VISION.md)) — c'est l'écart principal identifié pour le Milestone 2 *Living Kingdom* (voir [ROADMAP.md](./ROADMAP.md)).

---

## 16. Guilde 🟡

État actuel : une guilde unique et statique, **Guilde du Contrat Cendreux**, à laquelle tous les profils d'aventuriers sont rattachés. Aucun recrutement limité, aucune rivalité, aucun changement de tactique propre à la guilde.

🔵 **CIBLE** — Système de guilde vivant : recruteurs actifs, tactiques préférées propres à la guilde, rancunes accumulées, effectif limité (perte réelle et durable d'un type de profil si trop d'aventuriers meurent), possibilité de guildes concurrentes.

---

## 17. Intelligence collective 🟢

Deux mécanismes produisent l'adaptation perçue par le joueur :

1. **Pression de rôle** (`rolePressure`, voir [§12](#12-mémoire-)) — modifie la composition de l'escouade suivante selon les déclencheurs listés plus haut.
2. **Rumeurs de taverne** (`tavernRumors.ts`) — un effet narratif et mécanique choisi après chaque vague :

| Rumeur | Déclencheur | Effet mécanique |
|---|---|---|
| Vague de cupidité (`greedSurge`) | Trésor volé, ou par défaut | Biaise le plan d'expédition vers *greedy* |
| Recrutement de voleurs (`thiefRecruitment`) | 2+ kills sur pièges | `rolePressure.thief += 1` |
| Recrutement de guerriers (`warriorRecruitment`) | 2+ kills de monstres | `rolePressure.warrior += 1` |
| Recrutement de soigneurs (`healerRecruitment`) | 30+ points de soin prodigués | `rolePressure.healer += 1` |
| Vague de prudence (`cautionSurge`) | 2+ kills de boss ou 3+ usages de capacité | Biaise le plan d'expédition vers *cautious* |

🔵 **CIBLE** — Apprentissage collectif au-delà du comptage de rôles : cartes de pièges partagées entre aventuriers d'une même guilde, mémoire de chemin collective, écran de taverne dédié avec plusieurs rumeurs concurrentes plutôt qu'une seule retenue par vague.

---

## 18. Débriefing 🟢

Écran affiché en phase **Report**, construit à partir du `WaveReport` :
- gain d'or et détail (récompense, remboursement, pénalité) ;
- texte narratif de la vague ;
- rumeur de taverne générée ;
- notes d'adaptation (ce qui a changé et pourquoi, en langage clair) ;
- aperçu de la composition de la prochaine escouade ;
- compteur de vagues survécues et **record local** (stocké en `localStorage`, purement déclaratif — *« le record reste purement moral »*, cf. code).

🔵 **CIBLE** — Écran de taverne étendu avec plusieurs rumeurs visibles simultanément et concurrentes (voir [§17](#17-intelligence-collective-)).

---

## 19. Progression 🟡

**Progression intra-partie** (🟢 implémentée) : scaling par vague (voir [§9](#9-aventuriers-)), soin du boss et des monstres entre les vagues, accumulation de mémoire tactique (voir [§12](#12-mémoire-)).

**Progression trans-parties** (🟡 partielle) : à ce jour, seul le **record de vagues survécues** persiste après une Defeat (stockage local, sans effet sur le gameplay). Toute la mémoire du monde repart de zéro à chaque nouvelle partie.

🔵 **CIBLE** — Une forme de méta-progression compatible avec le principe *« le joueur finit toujours par perdre »* (voir [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) #18) : par exemple, un royaume qui commence légèrement différent (mais jamais plus facile) à chaque nouvelle partie, informé par le souvenir collectif des parties précédentes plutôt que par un bonus de puissance pour le joueur. Cette question est ouverte — voir [IDEAS.md](./IDEAS.md), section « À explorer ».

---

## 20. Conditions de victoire et de défaite 🟢

| Condition | Résultat |
|---|---|
| Tous les aventuriers de l'escouade meurent ou fuient | **Victoire temporaire** : retour en phase Build pour préparer la vague suivante |
| Le boss meurt | **Défaite** : fin de la partie, réinitialisation complète |

Il n'existe **aucune condition de victoire finale**. C'est un choix de design assumé (voir [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) #3) : la seule fin possible du jeu est la mort du boss.

---

## 21. Interface 🟢

Interface hybride : rendu de jeu via Phaser (`#game-canvas`) et interface HTML/DOM (`#ui-root`) synchronisée par un instantané en lecture seule (`UiSnapshot`) publié périodiquement (~120 ms) par la scène active.

**Éléments principaux de l'UI** :
- Panneau de construction (sélection de piège/monstre, coût, or restant) ;
- Aperçu de la prochaine escouade et rumeurs actives ;
- Barre de vagues, PV du boss, contrôles pause/vitesse ;
- Panneau d'inspection d'un aventurier (niveau, traits, blessures, vendetta) au clic pendant une vague ;
- Écran de débriefing (voir [§18](#18-débriefing-)).

L'interface texte du jeu est actuellement en français.

---

## 22. Contrôles 🟢

| Action | Contrôle actuel |
|---|---|
| Placer une défense | Clic sur une case en phase Build |
| Inspecter un aventurier | Clic sur l'aventurier en phase Wave |
| Activer une capacité de boss | Bouton dédié dans l'UI |
| Pause / vitesse (x1, x2, x3) | Boutons dédiés dans l'UI |

🔵 **CIBLE** — Raccourcis clavier pour les capacités de boss (1/2/3) et la pause (espace), aperçus de placement plus clairs pour la portée des pièges et des monstres.

---

## 23. Architecture gameplay 🟢

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

## 24. Objectifs long terme 🔵

1. Faire du royaume une entité qui apprend **entre** les parties, pas seulement à l'intérieur d'une partie, sans jamais permettre une victoire permanente.
2. Donner à la guilde et au royaume une vie propre (recrutement limité, rivalités, pressions régionales).
3. Étendre le vocabulaire tactique du joueur (salles typées, portes, upgrades de pièges) sans jamais perdre la lisibilité de la grille.
4. Remplacer les placeholders visuels et sonores par une direction artistique cohérente avec le ton du jeu (voir [ROADMAP.md](./ROADMAP.md), Milestone 4).
5. Garantir que chaque nouvelle fonctionnalité renforce au moins un des piliers définis dans [GAME_VISION.md](./GAME_VISION.md).
