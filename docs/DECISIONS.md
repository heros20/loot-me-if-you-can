# Decisions Log — Loot Me If You Can

| | |
|---|---|
| **Statut** | Vivant — journal append-only, on n'édite jamais une décision passée |
| **Propriétaire** | Game Design |
| **Dernière mise à jour** | 2026-07-02 |
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
**Conséquences** : c'est l'écart principal documenté dans le [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md) §19 (Progression) et une question ouverte du Milestone 2. Toute décision de rendre la mémoire trans-parties devra passer une nouvelle entrée ici et respecter D-004.

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
**Conséquences** : documenté comme limitation connue dans le GDD §10 (Traits) ; ne pas considérer comme un bug, mais comme une simplification volontaire en attente d'extension.

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
