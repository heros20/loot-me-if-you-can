# Game Vision — Loot Me If You Can

| | |
|---|---|
| **Statut** | Vivant — révisable à chaque milestone |
| **Propriétaire** | Game Design |
| **Dernière mise à jour** | 2026-07-02 |
| **Documents liés** | [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) · [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md) · [LORE.md](./LORE.md) |

---

## 1. Pitch en une phrase

> Vous êtes le monstre final d'un donjon. Chaque vague repoussée rend le royaume un peu plus intelligent — et votre défaite, un peu plus inévitable.

## 2. Le fantasme central

*Loot Me If You Can* inverse le point de vue classique du dungeon crawler. Le joueur n'incarne pas le héros qui explore — il incarne le donjon lui-même : son architecte, son gardien, son dernier rempart. Les aventuriers sont les protagonistes de leur propre histoire ; le joueur n'est qu'un obstacle sur leur chemin. Un obstacle qui se souvient d'eux, qui apprend d'eux, et qui refuse de mourir facilement.

Le jeu ne demande jamais *« vais-je gagner ? »* — la victoire permanente n'existe pas. Il demande *« combien de temps vais-je tenir, et quelle histoire cela va-t-il raconter ? »*.

## 3. Vision détaillée

*Loot Me If You Can* est un jeu de stratégie et de gestion en temps réel où le joueur alterne entre deux phases : la **préparation** (construire le donjon, poser pièges et monstres, gérer son or) et l'**assaut** (regarder — et influencer via les capacités du boss — une équipe de cinq aventuriers tenter de voler le trésor et tuer le boss).

Ce qui distingue structurellement le jeu de ses inspirations, c'est que le monde en face du joueur n'est pas un simple multiplicateur de difficulté. C'est une entité qui **retient** : les pièges qui ont tué deviennent des pièges que l'on évite, les rôles qui ont échoué sont remplacés dans la prochaine escouade, les héros tombés reviennent sous forme d'héritiers vindicatifs, et chaque victoire du joueur nourrit malgré elle la légende — donc la préparation — du camp adverse.

Le jeu est conçu comme une **partie unique et continue** (pas une succession de runs indépendants) : il n'y a pas de fin heureuse. Il y a une fin — le boss meurt — et cette fin doit être méritée, racontée, et acceptée comme faisant partie du plaisir de jeu.

## 4. Public visé

| Segment | Description |
|---|---|
| **Cœur de cible** | Joueurs PC de jeux de stratégie/gestion en temps réel (Dungeon Keeper, Orcs Must Die!, Kingdom Rush, Dungeon Warfare) qui aiment optimiser un espace et regarder leur plan s'exécuter. |
| **Cible élargie** | Joueurs de jeux à narration émergente (RimWorld, Dwarf Fortress, Crusader Kings) qui apprécient les histoires produites par des systèmes plutôt qu'écrites à l'avance. |
| **Cible affinitaire** | Joueurs de roguelites à mémoire persistante (Rogue Legacy, Darkest Dungeon, Hades) sensibles à l'idée que la défaite fait progresser une histoire plutôt que de la stopper. |
| **Âge** | 16 ans et plus (violence fantastique stylisée, thèmes de deuil et de vengeance). |
| **Plateforme initiale** | Navigateur (Web), PC. Portage Steam envisagé en fin de production (voir [ROADMAP.md](./ROADMAP.md)). |
| **Format de session** | Cycles courts (10–20 minutes par vague) qui s'enchaînent en sessions longues ; une partie complète se termine par la mort du boss, potentiellement après plusieurs heures. |

## 5. Émotions recherchées

| Émotion | Moment de jeu | Comment on l'obtient |
|---|---|---|
| **Malaise grandissant** | À mesure que la réputation du donjon augmente | Les vagues montent en compétence de façon lisible : plus de voleurs après un donjon plein de pièges, plus de soigneurs après des combats longs. |
| **Fierté noire** | Un piège ou une combinaison de monstres anéantit une escouade | Feedback visuel et narratif fort sur les kills, monstres nommés qui deviennent des vétérans. |
| **Injustice savoureuse** | Un héritier vindicatif revient venger un ancêtre | Système d'héritiers avec nom de famille, trait vengeful et bonus de statistiques. |
| **Deuil inversé** | La mort d'un monstre nommé, ou la perte d'un piège fétiche | Les monstres du joueur ont un nom, un compteur de kills, une mémoire. |
| **Tension stratégique** | Chaque phase de préparation | Budget d'or limité, disposition contrainte par le chemin obligatoire entrée → trésor → boss. |
| **Catharsis tragique** | La mort finale du boss | La défaite est mise en scène comme un aboutissement narratif, jamais comme un écran d'échec sec. |

## 6. Inspirations

| Jeu | Ce qu'on en prend | Ce qu'on évite |
|---|---|---|
| **Dungeon Keeper** (Bullfrog) | Le fantasme d'incarner le mal, la construction de donjon | La micro-gestion fastidieuse de créatures individuelles |
| **Orcs Must Die! / Dungeon Warfare** | La boucle poser-des-pièges puis regarder-la-vague | Le pur réflexe sans mémoire long terme entre les parties |
| **Darkest Dungeon** | Traits de personnalité, traumatismes, mortalité qui compte | La punition pure sans compensation narrative |
| **RimWorld / Dwarf Fortress** | Les histoires émergentes racontées par les systèmes | La complexité de simulation qui nuit à la lisibilité |
| **Rogue Legacy** | Les héritiers qui portent la mémoire des morts précédents | La progression purement statistique déconnectée du récit |
| **Slay the Spire** | Parties courtes où le joueur apprend un système lisible | L'aléatoire qui remplace la compréhension |

## 7. Ce qui nous différencie

- **Le royaume a une mémoire structurelle, pas un simple curseur de difficulté.** Chaque adaptation (rôles envoyés, évitement de cases, rumeurs de taverne) découle d'événements précis de la partie précédente.
- **La défaite est un objectif de design, pas un échec du joueur.** Le jeu est écrit pour qu'on la voie venir, et pour qu'elle vaille la peine d'être racontée.
- **L'inversion des rôles est totale.** Les aventuriers sont les héros de leur propre histoire ; le joueur écrit, sans le vouloir, le rôle du grand méchant.
- **Tout ce qui compte a un nom.** Monstres, pièges emblématiques, aventuriers, héritiers : la mémoire du jeu se construit par des identités, pas par des statistiques anonymes.
- **Une seule partie continue.** Pas de reset caché entre les vagues : ce que le joueur construit et ce que le royaume apprend s'accumulent jusqu'à la fin.

## 8. Ce que le jeu n'est pas

- Ce n'est **pas** un jeu où l'on peut « gagner » définitivement.
- Ce n'est **pas** un jeu compétitif ou multijoueur (PvP).
- Ce n'est **pas** un builder d'optimisation infinie sans conséquence narrative.
- Ce n'est **pas** conçu autour d'une monétisation agressive ou de sessions infinies sans clôture.

## 9. Piliers d'expérience

Ces piliers orientent chaque décision de design. Le détail des règles qui en découlent est dans [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md).

1. **Le gameplay avant tout.**
2. **Le royaume apprend, toujours, et le montre.**
3. **Chaque partie doit pouvoir se raconter.**
4. **Le joueur est le méchant ; les aventuriers sont les héros.**
5. **On perd toujours — la question est comment.**

## 10. Critère de succès

*Loot Me If You Can* aura atteint sa vision si, en observant une session, un joueur peut décrire sans notes ce qui vient de se passer sous forme d'anecdote (« ils ont perdu deux guerriers sur mon piège de feu, alors la vague suivante ils ont envoyé des voleurs — et l'un d'eux était le fils du guerrier »), et s'il ressent que sa défaite finale, quand elle arrive, est méritée plutôt que subie.
