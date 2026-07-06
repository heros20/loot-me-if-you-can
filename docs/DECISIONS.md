# Decisions Log — Loot Me If You Can

| | |
|---|---|
| **Statut** | Vivant — journal append-only, on n'édite jamais une décision passée |
| **Propriétaire** | Game Design |
| **Dernière mise à jour** | 2026-07-03 |
| **Documents liés** | [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) · [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md) |

---

## Comment utiliser ce document

Chaque décision structurante obtient une entrée, numérotée dans l'ordre chronologique. **On n'efface ni ne réécrit jamais une entrée existante** — si une décision est révisée, on ajoute une nouvelle entrée qui référence l'ancienne (`Remplace : D-00X`). Cela permet à quiconque de comprendre non seulement l'état actuel, mais aussi pourquoi il a changé.

### Format d'une entrée

```
## D-XXX — Titre court

**Date** : AAAA-MM-JJ
**Statut** : Actif | Révisé | Abandonné
**Contexte** : pourquoi cette question s'est posée
**Décision** : ce qui a été tranché
**Alternatives envisagées** : ce qui a été écarté et pourquoi
**Conséquences** : impact sur le design, le code ou la production
**Remplace / Remplacé par** : lien vers une autre entrée le cas échéant
```

---

## D-001 — Équipe fixe de 5 aventuriers par vague

**Date** : 2025 (rétroactif, formalisé le 2026-07-02)
**Statut** : Actif
**Contexte** : déterminer si la taille d'escouade doit croître avec la difficulté ou rester stable.
**Décision** : chaque vague envoie exactement 5 aventuriers, quel que soit le numéro de vague.
**Alternatives envisagées** : faire croître le nombre d'aventuriers avec la vague (rejeté : contredit le principe « la difficulté vient de l'intelligence, jamais du nombre »).
**Conséquences** : toute la montée en difficulté doit passer par les statistiques, les rôles, les traits et les tactiques — jamais par le volume. Contrainte forte et volontaire sur tout futur design de contenu.

---

## D-002 — La difficulté augmente par l'intelligence, jamais par le nombre d'ennemis

**Date** : 2025 (rétroactif, formalisé le 2026-07-02)
**Statut** : Actif
**Contexte** : choisir l'axe principal de scaling de la difficulté.
**Décision** : le scaling se fait via les statistiques par vague (PV, dégâts, vitesse), la composition adaptative des rôles, et les traits/vengeances — pas via le nombre d'unités envoyées.
**Alternatives envisagées** : vagues à effectif croissant (rejeté, voir D-001) ; difficulté purement basée sur un multiplicateur global de statistiques sans adaptation comportementale (rejeté : ne produit pas de récit, contredit le principe « le royaume apprend »).
**Conséquences** : nécessite un système de mémoire/adaptation robuste (`AdaptationMemory`) plutôt qu'un simple curseur de difficulté.

---

## D-003 — Le gameplay avant les graphismes

**Date** : 2025 (rétroactif, formalisé le 2026-07-02)
**Statut** : Actif
**Contexte** : arbitrer l'ordre de priorité entre validation de mécaniques et production artistique en début de projet.
**Décision** : tout le développement jusqu'à v0.5.0 (Milestone 0) s'est fait avec des textures générées procéduralement, sans aucun asset final.
**Alternatives envisagées** : produire un pilier artistique tôt pour sécuriser le financement/la communication (écarté pour la phase de prototype ; reste une option pour du matériel de communication ponctuel, mais pas pour la production du jeu).
**Conséquences** : la direction artistique n'arrive qu'au Milestone 4 de la [ROADMAP.md](./ROADMAP.md), une fois le gameplay et le royaume vivant validés.

---

## D-004 — Le joueur finit toujours par perdre

**Date** : 2025 (rétroactif, formalisé le 2026-07-02)
**Statut** : Actif
**Contexte** : définir si le jeu doit offrir une condition de victoire finale.
**Décision** : il n'existe aucune condition de victoire permanente. La seule fin de partie est la mort du boss (défaite), qui déclenche une nouvelle partie.
**Alternatives envisagées** : une condition de « victoire éternelle » après un nombre de vagues fixe (rejeté : contredit le pitch central et le principe #3 des Design Principles) ; un mode sans fin sans clôture narrative (rejeté : contredit le principe #4, la défaite doit être une fin narrative).
**Conséquences** : toute méta-progression future (voir IDEAS.md) doit rester compatible avec une défaite garantie — jamais concevoir un chemin vers l'invincibilité.

---

## D-005 — Chaque partie doit raconter une histoire

**Date** : 2025 (rétroactif, formalisé le 2026-07-02)
**Statut** : Actif
**Contexte** : choisir entre un système d'adversité purement statistique et un système producteur de récit.
**Décision** : investir dans le nommage systématique (monstres, aventuriers, héritiers), les rapports narratifs de fin de vague, et les chroniques, plutôt que dans un pur système de score.
**Alternatives envisagées** : un système de difficulté purement numérique sans couche narrative (rejeté : plus simple à produire, mais ne sert pas la vision du jeu).
**Conséquences** : chaque nouveau système de gameplay doit prévoir sa traduction narrative (voir Design Principles #2 et #10).

---

## D-006 — Réinitialisation complète de la mémoire du monde à chaque nouvelle partie

**Date** : 2025 (rétroactif, formalisé le 2026-07-02)
**Statut** : Actif — sous revue pour le Milestone 2
**Contexte** : décider si la mémoire du royaume (`RunWorldMemory`) doit survivre à une défaite (mort du boss).
**Décision** : `startNewGame()` réinitialise entièrement la mémoire du monde ; seul le record de vagues survécues persiste (stockage local, sans effet mécanique).
**Alternatives envisagées** : mémoire persistante entre parties dès le prototype (repoussé : risque de complexifier prématurément un système déjà central, avant que la boucle de base soit validée).
**Conséquences** : c'est l'écart principal documenté dans le [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md) §26 (Progression) et une question ouverte du Milestone 2. Toute décision de rendre la mémoire trans-parties devra passer une nouvelle entrée ici et respecter D-004.

---

## D-007 — Les pièges sont démontés et remboursés après chaque vague ; les monstres persistent

**Date** : 2025 (rétroactif, formalisé le 2026-07-02)
**Statut** : Actif
**Contexte** : différencier économiquement pièges et monstres pour créer des décisions de préparation distinctes.
**Décision** : les pièges sont un investissement à usage unique (remboursé intégralement s'il reste en place) ; les monstres sont un investissement permanent qui se soigne entre les vagues et accumule une identité (nom, kills, statut de vétéran).
**Alternatives envisagées** : traiter pièges et monstres de façon symétrique (rejeté : réduit la diversité des décisions de construction, contredit le principe #8 des Design Principles).
**Conséquences** : la phase Build doit toujours proposer deux logiques différentes de dépense d'or (tactique jetable vs. investissement long terme).

---

## D-008 — Ciblage vindicatif par type de défense, pas encore par individu

**Date** : 2025 (rétroactif, formalisé le 2026-07-02)
**Statut** : Actif — sous revue pour le Milestone 2
**Contexte** : implémenter une première version du système d'héritiers vengeurs sans complexifier excessivement le ciblage en combat.
**Décision** : un héritier vindicatif priorise le *type* de défense qui a tué son ancêtre (ex. tous les gobelins), pas le monstre nommé exact.
**Alternatives envisagées** : ciblage individuel dès le prototype (repoussé pour complexité, prévu explicitement au Milestone 2 du [ROADMAP.md](./ROADMAP.md)).
**Conséquences** : documenté comme limitation connue dans le GDD §13 (Traits) ; ne pas considérer comme un bug, mais comme une simplification volontaire en attente d'extension.

---

## D-009 — Le donjon est creusé, pas construit

**Date** : 2026-07-02
**Statut** : Actif
**Contexte** : réunion de design #001 — clarifier l'identité du jeu par rapport aux tower defenses classiques et aux dungeon builders génériques. Le modèle actuel (« poser des murs » sur une grille vide) ne rendait pas justice au fantasme du Maître du Donjon qui façonne son repaire, et ne se distinguait pas assez d'un simple éditeur de grille.
**Décision** : le joueur ne construit pas un donjon en posant des murs. Il **creuse** son donjon dans la roche. La carte démarre principalement comme une masse rocheuse ; le joueur creuse des couloirs, des salles, des intersections, des accès et des zones stratégiques. Les murs ne sont plus des objets que l'on pose : ce sont simplement de la roche non creusée.
**Alternatives envisagées** : conserver le modèle actuel de pose/retrait de murs sur grille vide (écarté : moins immersif, ne distingue pas le jeu d'un tower defense générique) ; un système hybride où mur et roche coexisteraient comme deux ressources distinctes (écarté : ambiguïté inutile, contredit le principe #9 des Design Principles — un système doit s'expliquer en une phrase).
**Conséquences** : le joueur étend son territoire au lieu de le délimiter ; la construction devient plus immersive ; chaque case creusée peut porter un coût ; le donjon progresse organiquement plutôt que de partir d'un tracé de murs prédéfini (`WALL_CELLS`) ; les salles naissent de l'espace creusé plutôt que d'un carvage générique. Documenté dans le [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md) §4 (Donjon creusé), §5 (Territoire du donjon) et §6 (Salles spécialisées) ; devient le cœur du Milestone 2 — *Carve Your Kingdom* (voir [ROADMAP.md](./ROADMAP.md), [MILESTONES.md](./MILESTONES.md)).

---

## D-010 — La guerre de l'information

**Date** : 2026-07-02
**Statut** : Actif
**Contexte** : réunion de design #001 — clarifier *pourquoi* et *comment* le royaume « sait » ce qu'il sait du donjon, pour que son adaptation reste crédible plutôt que de ressembler à de l'omniscience (voir Design Principles #13).
**Décision** : *Loot Me If You Can* est une guerre de l'information entre le Maître du Donjon et le Royaume. Le Royaume ne connaît pas le donjon par magie : il apprend uniquement grâce aux survivants, aux cartographes, aux rumeurs, aux rapports d'expédition, aux fragments de carte et à des observations imparfaites. Le joueur peut modifier son donjon entre deux expéditions — la carte connue du Royaume peut donc devenir obsolète.
**Alternatives envisagées** : un royaume omniscient qui connaît en permanence l'état exact du donjon (écarté : plus simple à simuler, mais contredit Design Principles #13 et retire toute valeur stratégique à l'information elle-même) ; une carte du royaume qui se met à jour instantanément et parfaitement après chaque expédition (écarté : supprime tout intérêt à la désinformation et à l'obsolescence de la carte).
**Conséquences** : l'information devient une ressource centrale, au même titre que l'or ou le territoire ; les survivants sont dangereux parce qu'ils rapportent des connaissances, pas seulement parce qu'ils s'échappent avec le trésor ; tuer un cartographe peut ralentir l'apprentissage du Royaume ; laisser partir un survivant peut au contraire désinformer la Guilde si son récit est incomplet ou biaisé ; les futures expéditions se préparent selon ce que la Guilde *croit* savoir, pas selon la vérité absolue du donjon. Documenté dans le [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md) §21 à §24 (Exploration des aventuriers, Cartographie progressive, Informations imparfaites, Cartographe) ; devient le cœur du Milestone 3 — *The Kingdom Remembers* (voir [ROADMAP.md](./ROADMAP.md), [MILESTONES.md](./MILESTONES.md)).

---

## D-011 — Portes V1 : obstacle tactique passif

**Date** : 2026-07-03
**Statut** : Actif
**Contexte** : audit technique de Portes V1 (stable, sans bug critique ni majeur) — clarifier explicitement la nature de la porte avant d'envisager toute évolution (portes avancées, économie de réparation, Royaume qui apprend).
**Décision** : la porte renforcée est un obstacle tactique passif et verrouillé, pas un piège et pas un objet destructible. Elle ne fait aucun dégât et ne perd pas de PV : son rôle est de bloquer le passage jusqu'à ce qu'un voleur vivant la crochète. Une porte crochetée s'ouvre pour l'expédition en cours, puis se referme automatiquement entre deux expéditions. Si une expédition sans voleur vivant arrive devant une porte, elle abandonne et la composition adaptative favorise davantage les voleurs. Les monstres et le boss du joueur ignorent volontairement les portes : elles ne gênent que les intrus.
**Alternatives envisagées** : garder une porte cassable par dégâts classiques (écarté après playtest : donne l'impression d'or perdu et affaiblit le rôle du voleur) ; donner à la porte des dégâts de contact contre l'aventurier qui la force (écarté pour V1 : transforme l'obstacle en piège déguisé) ; ajouter clés, mini-jeu ou types avancés de portes (écarté : hors périmètre de Portes V1).
**Conséquences** : la valeur tactique d'une porte dépend de ce que le joueur place à proximité (pièges, sbires, lignes de vue du boss) pour exploiter le temps de crochetage ou provoquer une retraite si la Guilde manque de voleur. Il n'y a plus de réparation ni de remboursement de porte en V1, car la porte n'est plus endommagée. Documenté dans le [CHANGELOG.md](../CHANGELOG.md) (Economy & Locked Doors).

---

## D-012 - Portes V1.2 : retrait volontaire, pas reparation

**Date** : 2026-07-03
**Statut** : Actif
**Contexte** : passe de stabilisation Expedition Cohesion & Defense AI. Les portes verrouillees sont devenues persistantes et non destructibles, mais le joueur doit pouvoir corriger une mauvaise pose sans attendre une economie de reparation.
**Decision** : une porte placee persiste entre expeditions et se reverrouille a chaque nouvelle expedition. Elle ne subit toujours aucun degat et ne demande aucune reparation. En phase Build uniquement, le joueur peut la retirer volontairement avec l'outil `Retirer porte` et recuperer un remboursement partiel fixe de 50% du cout de porte.
**Alternatives envisagees** : remboursement automatique entre vagues (rejete : contredit la permanence tactique de la porte) ; reparation ou usure des portes (rejete : hors perimetre tant que les portes ne prennent pas de degats) ; retrait gratuit complet (rejete : rend la pose trop reversible et efface le poids economique du placement).
**Consequences** : D-011 reste vraie pour le role tactique passif et non destructible de la porte, mais sa phrase "pas de remboursement" est revisee : il n'y a pas de remboursement automatique ni de recuperation liee aux degats, seulement un demontage volontaire en preparation.
**Remplace / Remplace par** : revise partiellement D-011.

---

## D-013 - Intention collective lisible, pas memoire strategique

**Date** : 2026-07-06
**Statut** : Actif
**Contexte** : passe Expedition Clarity & Survivor Chronicle V1. Les playtests montraient des expeditions qui se separaient silencieusement apres la prise du tresor, donnant l'impression que chaque aventurier improvisait seul.
**Decision** : chaque expedition garde une intention collective legere (`groupObjective`) limitee aux moments lisibles de V1 : chercher le tresor, fuir avec le tresor, defier le boss, retraiter, ou paniquer. Les aventuriers conservent des intentions individuelles (`followRetreat`, `coverRetreat`, `panicRetreat`, `disobey`), mais elles doivent servir ou expliquer l'objectif de groupe. Les splits restent rares et doivent etre barkes ou mentionnes au debrief.
**Alternatives envisagees** : laisser chaque aventurier choisir seul apres le tresor (rejete : comportements absurdes visibles) ; implementer tout de suite une vraie memoire strategique du Royaume (rejete : hors perimetre, cela appartient a The Kingdom Remembers) ; bloquer toute desobeissance (rejete : rend les expeditions moins memorables).
**Consequences** : le tresor declenche une decision collective explicite sans changer l'economie, les classes, les portes, les monstres ni les capacites. La chronique d'expedition peut raconter cette decision, mais ne constitue pas encore une cartographie ou une IA globale du Royaume.
**Remplace / Remplace par** :

---

## Modèle vierge pour une nouvelle entrée

```
## D-0XX — Titre court

**Date** : AAAA-MM-JJ
**Statut** : Actif
**Contexte** :
**Décision** :
**Alternatives envisagées** :
**Conséquences** :
**Remplace / Remplacé par** :
```
