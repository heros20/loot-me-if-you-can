# Design Principles — Loot Me If You Can

| | |
|---|---|
| **Statut** | Vivant — ces règles arbitrent chaque décision de design |
| **Propriétaire** | Game Design |
| **Dernière mise à jour** | 2026-07-02 |
| **Documents liés** | [GAME_VISION.md](./GAME_VISION.md) · [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md) · [DECISIONS.md](./DECISIONS.md) |

---

## Comment utiliser ce document

Ce ne sont pas des vœux pieux : ce sont des règles d'arbitrage. Face à un choix de design, on applique le principe concerné et la **question test** associée. Si une fonctionnalité proposée échoue à un principe sans raison exceptionnelle, elle est refusée ou envoyée dans [IDEAS.md](./IDEAS.md) sous « Refusées ».

Toute proposition d'ajout ou de modification à cette liste passe par une entrée dans [DECISIONS.md](./DECISIONS.md).

---

## A. Fantasme & ton

### 1. Le joueur est le méchant, les aventuriers sont les héros
Le joueur ne doit jamais être présenté comme la victime du système. Le récit, l'interface et le vocabulaire adoptent systématiquement le point de vue du donjon.
**Question test** : *Ce texte / cette mécanique renforce-t-il le point de vue du gardien du donjon, ou glisse-t-il vers celui d'un héros incompris ?*

### 2. Une bonne partie doit raconter une histoire
Chaque système doit produire des faits mémorables (un nom, une mort, un retour), pas seulement des nombres qui montent.
**Question test** : *Un joueur peut-il raconter cette vague à un ami sans citer une seule statistique ?*

### 3. Le joueur finit toujours par perdre
La défaite n'est pas une possibilité parmi d'autres : c'est l'horizon garanti du jeu. Toute mécanique de méta-progression doit rester compatible avec cette certitude.
**Question test** : *Cette fonctionnalité permettrait-elle, même en théorie, une victoire permanente ?* Si oui, elle est refusée telle quelle.

### 4. La défaite est une fin narrative, jamais une punition gratuite
Quand le boss meurt, le jeu doit offrir une clôture (résumé, chronique, épitaphe) qui valorise la résistance passée plutôt qu'un simple écran « Game Over ».
**Question test** : *Cet écran donne-t-il envie de raconter la partie, ou seulement de la fermer ?*

---

## B. Gameplay & systèmes

### 5. Le gameplay avant les graphismes
Toute fonctionnalité doit prouver sa valeur en prototype texte ou en placeholder avant de recevoir un budget artistique.
**Question test** : *Cette mécanique est-elle intéressante sans aucun art final ?*

### 6. La difficulté augmente grâce à l'intelligence, jamais au nombre d'ennemis
On complexifie les *décisions* des aventuriers (rôles envoyés, chemins choisis, tactiques de repli), pas la taille brute des vagues. La taille de l'escouade (5) est fixe par principe, pas par contrainte technique.
**Question test** : *Cette augmentation de difficulté vient-elle d'une meilleure décision adverse, ou seulement d'un plus grand nombre d'unités ?*

### 7. Une mécanique inutile est supprimée
Une mécanique qui n'influence ni une décision du joueur ni le récit produit est retirée, même si elle a coûté du temps de développement.
**Question test** : *Si on supprime cette mécanique, qu'est-ce que le joueur perd concrètement ?* Si la réponse est « rien de mesurable », elle part.

### 8. Une décision intéressante vaut mieux qu'un nouvel objet
On préfère enrichir un choix existant (où poser ce piège, quand activer cette capacité) plutôt qu'ajouter du contenu qui ne fait qu'élargir un catalogue.
**Question test** : *Ce nouvel élément crée-t-il un dilemme, ou juste une option de plus dans une liste ?*

### 9. Chaque système doit pouvoir s'expliquer en une phrase
Si un système ne tient pas dans une phrase simple, il est trop complexe ou mal découpé.
**Question test** : *Peut-on expliquer ce système à un nouveau développeur en une phrase, sans jargon interne ?*

### 10. Aucune mécanique n'existe sans conséquence visible en jeu
Toute variable interne (pression de rôle, dangerosité apprise d'une case, alarme du royaume) doit avoir une traduction visible ou lisible par le joueur, directement ou via un rapport.
**Question test** : *Le joueur peut-il, d'une façon ou d'une autre, constater l'effet de cette variable ?*

---

## C. Le royaume apprend

### 11. Le royaume apprend
C'est la promesse centrale du jeu. Chaque système d'adversité doit avoir une composante qui évolue en fonction des actions du joueur, et pas seulement du numéro de la vague.
**Question test** : *Si le joueur rejoue la même vague deux fois avec le même résultat, le royaume se comporte-t-il différemment la fois suivante ?*

### 12. Rien n'est oublié : la mémoire est permanente, pas un simple multiplicateur
L'apprentissage se stocke sous forme de faits (cette case a tué, ce piège a des voleurs qui l'évitent, cet aventurier a un nemesis) et non sous forme d'un unique score de difficulté global.
**Question test** : *Peut-on pointer un fait précis de la partie qui explique ce changement de comportement ?*

### 13. L'IA doit surprendre par sa logique, pas par son omniscience
L'adversaire ne doit jamais sembler tricher ou tout savoir d'avance ; ses adaptations doivent être déductibles a posteriori par le joueur.
**Question test** : *Un joueur attentif peut-il reconstituer pourquoi le royaume a réagi ainsi ?*

### 14. Chaque défaite du joueur enseigne quelque chose à l'IA ; chaque victoire du joueur coûte quelque chose au royaume
L'apprentissage est bidirectionnel : les échecs des aventuriers doivent nourrir leurs futures stratégies, et leurs pertes doivent avoir un coût visible pour la guilde/le royaume (moral, effectifs, réputation).
**Question test** : *Cette victoire du joueur a-t-elle un prix quelque part dans le système, même différé ?*

---

## D. Personnages & émotion

### 15. Chaque aventurier peut devenir une anecdote
Un aventurier générique doit pouvoir, par ses actes (mort, survie, vengeance), devenir un personnage qu'on se souvient avoir affronté.
**Question test** : *Cet aventurier a-t-il au moins une chance de sortir du lot lors de cette vague ?*

### 16. Un nom vaut plus qu'une statistique
Priorité systématique au nommage (monstres, aventuriers, salles, objets) sur l'ajout de chiffres supplémentaires dans l'interface.
**Question test** : *Ce contenu gagnerait-il à avoir un nom plutôt qu'un numéro ou un pourcentage ?*

### 17. La mort doit avoir un poids narratif, pas seulement économique
Perdre un monstre nommé ou voir un aventurier mourir doit produire un texte, une réaction, une conséquence dans la mémoire du monde — pas seulement une perte d'or ou un slot vide.
**Question test** : *Cette mort produit-elle une trace ailleurs que dans un compteur ?*

---

## E. Économie & progression

### 18. Le joueur ne peut jamais « résoudre » le jeu définitivement
Aucune combinaison de défenses ou de capacités ne doit devenir une solution universelle qui rend les vagues suivantes triviales indéfiniment, car le royaume s'adapte spécifiquement à ce qui fonctionne trop bien.
**Question test** : *Existe-t-il une configuration qui bat toutes les vagues futures sans jamais être contrée ?* Si oui, il manque une adaptation.

### 19. Chaque gain a un prix différé
L'or, les kills, les vagues repoussées : chaque bénéfice immédiat doit alimenter, quelque part, une pression qui reviendra plus tard (réputation, pression de rôle, rumeur).
**Question test** : *Ce gain immédiat a-t-il une contrepartie qui se déclenchera dans une vague future ?*

---

## F. Production & process

### 20. Un principe qui n'oriente aucune décision n'est pas un principe
Si, en six mois, un principe de cette liste n'a jamais été cité pour trancher un débat, il est reformulé ou retiré.
**Question test** : *Peut-on citer une décision réelle qui a été tranchée grâce à ce principe ?*

### 21. En cas de doute, retirer plutôt qu'ajouter
Face à une hésitation sur une fonctionnalité, l'option par défaut est de ne pas l'ajouter et de la documenter dans [IDEAS.md](./IDEAS.md) plutôt que de l'implémenter « pour voir ».
**Question test** : *A-t-on une raison positive et documentée d'ajouter cet élément maintenant, ou seulement l'absence de raison de ne pas le faire ?*
