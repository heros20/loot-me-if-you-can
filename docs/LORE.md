# Lore Foundations — Loot Me If You Can

| | |
|---|---|
| **Statut** | Vivant — fondations uniquement, l'histoire complète n'est pas encore écrite |
| **Propriétaire** | Game Design / Narration |
| **Dernière mise à jour** | 2026-07-02 |
| **Documents liés** | [GAME_VISION.md](./GAME_VISION.md) · [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md) |

---

## Portée de ce document

Ce document pose les **fondations** du monde : ce qui doit rester vrai pour que tout contenu narratif futur (chroniques, rumeurs, héritiers, capacités, contenu du Milestone 4) soit cohérent entre lui. Il ne raconte **pas** l'histoire complète du jeu — celle-ci s'écrit en jeu, partie après partie, via les chroniques générées par la simulation (voir [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md) §16).

Toute future extension du lore doit rester compatible avec ces fondations, ou passer par une entrée dans [DECISIONS.md](./DECISIONS.md) si elle les modifie.

---

## 1. Le monde

Le donjon du joueur se trouve dans le territoire connu sous le nom de **Royaume de Ciremarque**. C'est, à ce stade, le seul royaume nommé dans l'univers du jeu — les extensions futures (Milestone 3, pressions régionales, royaumes multiples) devront soit l'étendre, soit le subdiviser, sans le contredire.

Le donjon lui-même n'est pas un bâtiment posé sur le sol : c'est un domaine **souterrain**, creusé à même la roche par le Maître du Donjon (voir [DECISIONS.md](./DECISIONS.md) D-009). Chaque couloir, chaque salle est une extension arrachée à la pierre, pas une pièce construite. Ciremarque ne voit donc jamais le donjon dans son ensemble : il n'en connaît que ce que la roche a bien voulu laisser traverser à ceux qui y sont entrés (voir §7 et D-010).

Ciremarque n'est pas décrit dans le détail géographique ou politique à ce stade : c'est une fondation volontairement minimale, pour laisser le champ narratif ouvert. Ce qu'il faut retenir :

- Ciremarque est un royaume qui **organise une réponse structurée** face aux menaces souterraines — il ne subit pas passivement, il **envoie**, **recrute**, et **apprend**, mais uniquement à partir de ce que ses survivants, ses cartographes et ses rumeurs lui rapportent (voir la mécanique d'alarme du royaume, GDD §18, et la guerre de l'information, [DECISIONS.md](./DECISIONS.md) D-010).
- Le royaume est représenté en jeu par une **alarme** (`alarm`) — une jauge conceptuelle de la menace perçue par les autorités du royaume face au donjon du joueur. Elle existe dans les données depuis le prototype mais n'a pas encore d'effet en jeu (voir GDD §18 et Milestone 3 — *The Kingdom Remembers*).

## 2. La guilde

Les aventuriers qui pénètrent dans le donjon du joueur ne sont pas des individus isolés : ils appartiennent à la **Guilde du Contrat Cendreux**. C'est l'organisation qui recrute, forme, envoie et enregistre le destin des aventuriers.

Ce que le nom évoque, et qui doit guider tout contenu futur :
- Un **contrat** : la guilde formalise chaque expédition comme un engagement, pas une aventure spontanée — cohérent avec l'idée que chaque escouade est envoyée délibérément, avec un objectif (voler le trésor, tuer le boss).
- **Cendreux** : une organisation marquée par les pertes passées. La guilde n'est pas naïve — elle a déjà perdu du monde face à des donjons comme celui du joueur, et le sait.

La guilde est aujourd'hui statique dans les données (une seule guilde, réputation non utilisée), mais sa fondation narrative est déjà posée pour porter le Milestone 3 — *The Kingdom Remembers* (guilde vivante, recruteurs, rancunes, effectif limité).

## 3. Le joueur : qui est le boss ?

Le joueur incarne le **gardien final du donjon** — le boss. Il n'a pas de nom imposé par ce document : l'identité précise du boss (créature, sorcier déchu, entité plus ancienne que le royaume lui-même…) est une question narrative **ouverte**, à trancher avant le Milestone 4 (contenu) si elle doit influencer des capacités ou des objets légendaires.

Ce qui est déjà fixé, quelle que soit l'identité choisie :
- Le boss **habite** le donjon, il ne le visite pas. C'est son territoire, sa dernière ligne de défense — un domaine qu'il creuse et étend lui-même dans la roche plutôt qu'un bâtiment qu'on lui aurait confié.
- Le boss **n'est jamais présenté comme une victime**. Sa défaite finale, quand elle survient, est le résultat logique d'un royaume qui a fini par apprendre à le vaincre — pas d'une injustice.
- Le joueur ne dirige pas directement le boss comme un avatar classique : il le **soutient tactiquement** (capacités actives) pendant que le boss agit de façon semi-autonome. Narrativement, cela suggère un boss doté de sa propre volonté, que le joueur *guide* plus qu'il ne *contrôle*.

## 4. Les aventuriers : les héros de leur propre histoire

Le pilier de design *« les aventuriers sont les héros, le joueur est le méchant »* (voir [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) #1) a une conséquence narrative directe : chaque aventurier qui entre dans le donjon doit pouvoir, en théorie, porter sa propre histoire.

Fondations à respecter :
- Chaque aventurier a un **nom**, un **rôle**, une **personnalité dominante**, et potentiellement des **traits** (courageux, prudent, vindicatif, cupide, traumatisé, célèbre — voir GDD §13).
- La mort d'un aventurier n'est pas une fin narrative silencieuse : elle peut engendrer un **héritier**, porteur du nom de famille et, potentiellement, d'une rancune (trait vindicatif) contre ce qui l'a tué.
- Les aventuriers **reviennent** structurellement : la guilde n'abandonne pas après un échec, elle envoie une expédition suivante, adaptée à ce qu'elle croit savoir (voir GDD §20, Intelligence collective).

## 5. Les monstres et pièges du joueur

Le camp du joueur a sa propre identité narrative, symétrique à celle des aventuriers :
- Les **monstres posés par le joueur sont nommés** dès leur création (voir `minionNaming.ts`), pas seulement statistiques. Un slime nommé *Grattouille* qui survit à cinq vagues est un vétéran, pas une unité interchangeable.
- Les **pièges**, à l'inverse, sont narrativement anonymes et jetables (démontés après chaque vague) — ils représentent la préparation tactique du joueur, pas ses alliés.
- Cette asymétrie (monstres = alliés avec identité, pièges = outils sans identité) est une fondation à préserver : elle structure où investir en narration (les monstres) et où investir en mécanique pure (les pièges).

## 6. Le ton

- **Sombre mais pas nihiliste** : le joueur est le méchant, mais le jeu ne cherche pas le glauque gratuit. L'humour noir est bienvenu (voir le commentaire de code sur le record local : *« le record reste purement moral »*).
- **Tragique plutôt que grimdark** : la défaite finale doit évoquer une fin de saga plutôt qu'un échec humiliant.
- **Précis plutôt que grandiloquent** : les noms, titres et rumeurs doivent rester lisibles et concrets (« Petit repaire », « Fléau du Royaume ») plutôt que verbeux ou pompeux.

## 7. Ce qui n'est délibérément pas encore écrit

Pour ne pas figer prématurément des choix qui appartiennent au Milestone 4 (Content Expansion) :
- L'histoire complète et la géographie détaillée de Ciremarque.
- L'identité précise et l'origine du boss.
- Le contenu détaillé des objets légendaires et leur lien avec le lore.
- L'existence ou non d'autres royaumes/factions au-delà de Ciremarque.

Ces sujets doivent être abordés via [IDEAS.md](./IDEAS.md) (colonne « À explorer ») avant de rejoindre ce document de façon définitive.
