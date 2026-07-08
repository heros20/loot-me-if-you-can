# Decisions Log — Loot Me If You Can

| | |
|---|---|
| **Statut** | Vivant — journal append-only, on n'édite jamais une décision passée |
| **Propriétaire** | Game Design |
| **Dernière mise à jour** | 2026-07-07 (D-025) |
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

## D-025 - Kingdom Remembers V1 apprend par temoignages, pas par omniscience

**Date** : 2026-07-07
**Statut** : Actif
**Contexte** : D-010 pose la guerre de l'information, mais les adaptations existantes restaient surtout des compteurs tactiques internes. Apres Survivor Continuity, Special Treasures, Rebouchage et Hopital/Repos, il fallait une premiere memoire du royaume utile sans ouvrir la cartographie complete ni le Cartographe.
**Decision** : `RunWorldMemory.kingdomMemory` stocke des faits imparfaits rapportes uniquement par les survivants officiels d'une expedition. Les faits portent un type, une cellule ou localisation approximative, une confiance, un age (`firstSeenWave`/`lastSeenWave`), une source survivante, des confirmations, un niveau de danger et un etat `stale`. Une expedition sans survivant ne donne pas de connaissance precise : elle peut seulement creer une rumeur vague de groupe disparu. Les faits fiables influencent legerement la composition et le comportement, mais ne remplacent pas les regles existantes de survivants, blessures, roles obligatoires ou portes actives.
**Alternatives envisagees** : brancher directement l'IA sur l'etat reel du donjon (rejete : omniscient, contredit D-010) ; attendre une cartographie complete avant toute memoire (rejete : trop gros et prive les survivants de consequence mecanique) ; faire du rebouchage une mise a jour instantanee de la carte du royaume (rejete : le joueur doit pouvoir deplacer l'information, et les changements ne sont suspects qu'apres observation).
**Consequences** : la Guilde peut recruter plus volontiers un voleur apres une porte/piege signale, preparer plus de frontliners/soigneurs apres une zone dangereuse ou le boss, attirer des roles compatibles vers les tresors speciaux connus, et traiter une ancienne route comme suspecte si une expedition la retrouve bouchee. La taverne, la chronique et la sidebar affichent seulement des rumeurs issues de ces faits. V1 reste volontairement limitee : pas de carte connue visible, pas de Cartographe, pas de memoire trans-run, pas de nouvelle classe, pas de mise a jour magique au moment ou le joueur modifie le donjon.
**Remplace / Remplace par** : affine D-010 sans la remplacer.

---

## D-024 - Les survivants peuvent manquer une expedition sans quitter la continuite

**Date** : 2026-07-07
**Statut** : Actif
**Contexte** : Survivor Continuity V1 faisait revenir automatiquement les survivants, ce qui rendait les profils trop mecaniques apres des sorties tres blessees ou traumatisantes. Il fallait ajouter une consequence lisible sans ouvrir un vrai systeme medical, un hopital gere par le joueur, ni Kingdom Remembers.
**Decision** : chaque profil survivant porte un `recoveryState` simple : `available`, `injured`, `resting` ou `shaken`, avec `recoveryExpeditionsRemaining = 1` en V1. Un survivant tres bas en PV devient injured et saute la prochaine expedition. Un survivant moderement blesse peut etre resting. Une expedition traumatique peut rendre un non-veteran shaken/refusant. Un veteran ou un porteur de tresor special peut insister pour repartir si la blessure physique ne prime pas. Les profils indisponibles restent vivants, gardent leur identite et leurs bonus, ne satisfont pas les roles obligatoires, puis redeviennent disponibles apres l'expedition manquee.
**Alternatives envisagees** : hopital dedie avec soins payants (rejete : trop lourd et hors V1) ; trauma probabiliste profond (rejete : peu lisible et dur a tester) ; laisser les blesses satisfaire les roles obligatoires (rejete : contredit l'indisponibilite) ; transformer un refus en mort/disparition (rejete : casserait la promesse de continuite).
**Consequences** : `expeditionComposition` distingue maintenant indisponibilite, retour disponible et reserve tactique. La Guilde complete avec des volontaires et recrute un role obligatoire si le survivant qui le couvre est blesse. La taverne et la sidebar affichent les absents comme vivants, pas comme morts. V1 reste volontairement courte : pas de medecins, pas de soins payants, pas de blessures localisees.
**Remplace / Remplace par** :

---

## D-023 - Reboucher corrige le donjon sans devenir un outil de mur libre

**Date** : 2026-07-07
**Statut** : Actif
**Contexte** : Dungeon Structure V2 prevoyait un "Mur" mais le design valide reste "le donjon se creuse". Le joueur doit pouvoir corriger et remodeler une case deja creusee sans transformer le jeu en editeur de chateau ni rendre une expedition impossible.
**Decision** : l'outil s'appelle `Reboucher` dans l'UI. Il coute peu (`RESEAL_TILE_COST = 2`) et ne peut viser que des cases floor/room deja creusees. Il refuse les ancres et objets critiques (entree, tresor principal ou secondaire/special, trone/boss, porte, defense, aventurier present). Avant d'appliquer, la simulation transforme temporairement la case en roche puis valide la topologie obligatoire entry -> tresor(s) actif(s) -> boss. Si la route casse, aucun or n'est retire et le message reste court.
**Alternatives envisagees** : poser librement des murs (rejete : contredit la philosophie "creuser puis reboucher") ; supprimer automatiquement portes/pieges/tresors sur la case (rejete pour V1 : trop implicite et risquerait des pertes surprises) ; ne proteger que le tresor principal et laisser les tresors speciaux s'isoler (rejete pour l'instant : les tresors actifs sont deja des objectifs et les special treasures doivent rester compatibles).
**Consequences** : le pathfinding reste base sur les tiles courantes via `getBlockedCellKeys`, donc une case rebouchee devient immediatement bloquante pour la prochaine expedition. Le systeme est volontairement strict sur tous les tresors actifs ; cette limite pourra etre assouplie plus tard si les objectifs optionnels deviennent explicitement sacrifiables.
**Remplace / Remplace par** :

---

## D-022 - Human Adventurer Behavior V0 reste une couche lisible, pas une IA complete

**Date** : 2026-07-07
**Statut** : Actif
**Contexte** : correction apres test manuel du commit 3b38a2a. Le rogue pouvait encore ouvrir le boss avant le guerrier, des tresors evidents etaient ignores, et les gains speciaux etaient trop peu perceptibles.
**Decision** : ajouter une couche comportementale explicite mais limitee. Le boss utilise un verrou d'engagement : tant qu'un frontliner vivant et atteignable existe, lui seul peut ouvrir les degats boss, puis le groupe attaque. Le loot opportuniste interrompt un rush si un tresor est adjacent, sur le chemin, ou accessible sans detour dangereux ; les healers/casters ne traversent pas seuls une zone menacee. Les tresors speciaux affichent leur effet au pickup, appliquent un bonus temporaire au porteur, puis persistent seulement si le porteur s'echappe. Les etats humains restent courts (`regrouping`, `evaluatingRoom`, `waitingForTank`, `opportunisticLoot`, `bossPreparation`, `backlineHold`) et servent surtout la lisibilite.
**Alternatives envisagees** : refondre le pathfinding/formation en IA de squad (rejete : trop large et risque de blocage) ; creer un inventaire/equipement complet (rejete : hors perimetre Special Treasures V1) ; ajouter cartographe/hopital/Kingdom Remembers pour justifier les decisions (rejete : non-objectifs explicites) ; rendre les pauses longues et scriptes (rejete : le rythme doit rester bon).
**Consequences** : les corrections comportementales doivent rester testables par smoke et validables en manuel. Les limites connues sont assumees : pas de vraie reservation de cases, pas de roles supplementaires, pas d'inventaire detaille, et pas de planification globale multi-salles.
**Remplace / Remplace par** : precise D-021.

---

## D-021 - Un systeme V1 doit etre perceptible en jeu, pas seulement present dans les donnees

**Date** : 2026-07-07
**Statut** : Actif
**Contexte** : correction apres test manuel du commit 248c005. Special Treasures V1, Combat Damage Feedback V0 et Aggro V0 existaient techniquement, mais les aventuriers ignoraient trop souvent les tresors speciaux, les degats n'etaient pas attribuables, et le rogue/healer pouvaient encore lire comme frontline involontaire.
**Decision** : les tresors speciaux doivent entrer dans la selection d'objectif avec un score fort et une affinite de role explicite. Le feedback de combat doit etre un evenement de simulation avec source/cible/montant/style, pas une deduction visuelle depuis une baisse de PV. L'aggro V0 reste simple mais doit produire une lecture RPG : guerrier devant et naturellement cible, rogue utilitaire/flank, caster/healer en retrait sauf menace accumulee ou frontline tombee.
**Alternatives envisagees** : creer des quetes individuelles de loot (rejete : trop large) ; creer un systeme d'inventaire/equipement (rejete : hors perimetre) ; garder le feedback par delta de PV (rejete : impossible d'attribuer l'attaquant) ; coder une formation parfaite par pathfinding (rejete : risque de blocages et de refonte globale).
**Consequences** : les prochains ajouts V1 doivent etre testes en jeu pour leur lisibilite comportementale. Les tests smoke protegent maintenant la selection de tresors speciaux, la source des degats et la priorite tank-first, mais le dernier mot reste un test manuel court.
**Remplace / Remplace par** : precise D-020.

---

## D-020 - Les tresors speciaux sont des bonus persistants simples, pas un inventaire

**Date** : 2026-07-07
**Statut** : Actif
**Contexte** : passe Special Treasures V1 + Combat Damage Feedback V0 + Formation/Aggro Logic V0. Le studio voulait que certains tresors secondaires donnent une consequence durable si un aventurier survit avec eux, sans ouvrir Combat Roles & Abilities V1, Kingdom Remembers, inventaire complet, talents ou systeme d'equipement.
**Decision** : les tresors d'arme, d'armure et de technique sont des objectifs secondaires Build comme l'or, limites par le plafond global de tresors. Ils n'accordent un bonus qu'au profil du porteur qui s'echappe vivant. Chaque type de bonus est unique par profil. Les effets restent passifs et lisibles : arme = degats, armure = PV + reduction legere, technique = bonus adapte au role. Le combat affiche les degats/soins par feedback flottant et l'IA cible via une table de menace legere qui favorise naturellement le guerrier sauf menace DPS/soin plus forte.
**Alternatives envisagees** : creer un inventaire/slot d'equipement (rejete : trop gros pour V1) ; ajouter des sorts/capacites liees aux tresors (rejete : demarrerait Combat Roles & Abilities V1) ; lier les tresors a une memoire du Royaume (rejete : Kingdom Remembers reste hors perimetre) ; faire ignorer les tresors speciaux par l'IA (rejete : ils doivent attirer le risque comme des objectifs secondaires).
**Consequences** : `specialTreasuresSystem.ts` centralise les bonus, `combatThreatSystem.ts` centralise l'aggro legere, et les rapports/taverne peuvent mentionner le loot special sans creer de nouvel ecran. Les futures extensions devront partir de ce contrat minimal ou le reviser explicitement.
**Remplace / Remplace par** :

---

## D-018 - Les roles strategiques appris peuvent ecarter temporairement un survivant

**Date** : 2026-07-07
**Statut** : Actif
**Contexte** : bugfix Survivor Continuity V1 + portes verrouillees. Quand cinq survivants revenaient sans voleur alors que la Guilde avait deja appris qu'une porte active ou une retraite sans voleur exigeait un specialiste, la continuite remplissait les cinq slots et bloquait toute adaptation.
**Decision** : la composition respecte toujours `PARTY_SIZE = 5`, puis impose les roles strategiques appris s'ils ne sont pas couverts par les survivants disponibles (V1 : au moins un voleur si porte verrouillee active, ou si la derniere expedition a du rebrousser chemin sans voleur et qu'il reste des survivants), puis remplit avec le maximum de survivants possibles, puis complete avec des recrues adaptatives. Un survivant ecarte reste vivant, garde son profil, et peut revenir plus tard ; la sidebar, la chronique et la taverne expliquent explicitement pourquoi il reste au rapport.
**Alternatives envisagees** : envoyer six aventuriers (rejete : contredit D-001) ; ignorer le besoin de voleur pour honorer la continuite (rejete : casse l'apprentissage des portes) ; supprimer definitivement le survivant ecarte (rejete : casse la promesse de persistance des profils).
**Consequences** : `selectProfilesForWave` vit dans `expeditionComposition.ts` ; `doorBlockedWithoutThief` et `rolePressure.thief >= 3` n'imposent un voleur que s'il reste des survivants a arbitrer, tandis qu'une porte active impose toujours un voleur meme sans survivant. D-015 reste vrai dans l'esprit mais n'est plus absolu face a un role indispensable appris.
**Remplace / Remplace par** :

---

**Remplace / Remplace par** : revise par D-019 (Phaser in-game).

---

## D-019 - La taverne/guilde est une scene Phaser in-game, pas un overlay DOM principal

**Date** : 2026-07-07
**Statut** : Actif
**Contexte** : passe Guild Tavern Scene V3. La V2 (D-017) positionnait des acteurs dans un espace CSS, mais le rendu restait un overlay HTML de type fiche stylisee plutot qu'une vraie scene jouee dans le moteur.
**Decision** : la taverne devient une scene Phaser dediee (`GuildTavernScene`) lancee entre fin d'expedition et phase de preparation. Le canvas affiche une vraie salle (sol, murs, table, comptoir, panneau des disparus) peuplee de sprites pour survivants et PNJ. Les dialogues sont des beats autoplay avec bulles au-dessus des locuteurs. Le DOM ne garde qu'un HUD minimal (Continuer/Passer + rapport replie). Les pools de dialogue contextualises vivent dans la couche data (`tavernDialoguePools.ts`, `guildTavernSceneSystem.ts`, `tavernDialogueSequence.ts`).
**Alternatives envisagees** : conserver le rendu CSS V2 et n'enrichir que les textes (ecarte : ne resout pas le probleme de "vraie scene in-game") ; scene Phaser sans pools elargis (ecarte : repetition et ton generique) ; supprimer le rapport texte (ecarte : perte d'information utile).
**Consequences** : `DungeonScene` lance/arrete `GuildTavernScene` selon la phase ; `domUi.ts` masque la sidebar pendant la taverne ; D-017 reste valide sur les regles d'acteurs/faits mais son choix DOM est depasse pour le rendu principal.
**Remplace / Remplace par** :

---

## D-017 - La scene de taverne est un espace avec des acteurs positionnes, pas des cartes de rapport

**Date** : 2026-07-06
**Statut** : Actif
**Contexte** : passe Guild Tavern Scene V2. La V1 (D-016) remplacait deja le texte brut par une "scene", mais le rendu restait en pratique un encart de rapport stylise : cartes de survivants alignees, liste de badges, bulles de dialogue empilees hors de tout espace. Le studio a juge que ca ne "ressemblait pas a une vraie scene de jeu".
**Decision** : la scene devient un vrai lieu compose d'acteurs positionnes : une table qui garde toujours PARTY_SIZE (5) chaises (un survivant assis ou une chaise vide nommee pour chaque mort/disparu), un comptoir avec des PNJ fixes (tavernier, archiviste), un fond de salle avec des volontaires generiques, et un panneau mural qui reprend les noms des disparus. Les dialogues deviennent une sequence de 3 a 6 "beats" reveles un par un : chaque beat affiche une bulle ancree au-dessus de l'acteur qui parle dans la scene (pas une carte separee), avec un journal discret en dessous pour les repliques deja jouees. Aucun nouveau survivant ou volontaire n'est invente : chaque acteur/beat provient reellement du rapport de vague.
**Alternatives envisagees** : construire une vraie Phaser Scene dediee pour la taverne (ecarte pour cette passe : risque architectural trop eleve pour le gain, le flow report/build actuel repose entierement sur le DOM ; garde comme option V3 si l'immersion doit encore monter) ; garder la V1 et se contenter de retirer les badges (ecarte : ne resout pas le probleme de fond, l'absence d'espace et de personnages positionnes) ; afficher tous les beats simultanement comme en V1 (ecarte comme cible, garde comme fallback documente si la sequence posait probleme).
**Consequences** : `guildTavernSceneSystem.ts` expose desormais `TavernActor`/`TavernSceneLayout`/`TavernBeat` au lieu de `survivors`/`dialogueLines`/`badges` ; le rendu vit dans un module dedie `src/ui/guildTavernView.ts` (pur, sans regle de jeu) et `domUi.ts` ne gere plus que l'etat local de progression des beats. Toute future evolution (portraits, animations, relations, Remains & Relics) doit continuer a s'appuyer sur ces acteurs/positions plutot que de recreer un panneau de synthese.
**Remplace / Remplace par** :

---

## D-016 - Le debriefing entre expeditions est une scene jouee, pas un rapport texte

**Date** : 2026-07-06
**Statut** : Actif
**Contexte** : passe Guild Tavern Scene V1. Le debriefing de fin de vague etait fonctionnel (chronique + badges + sections tactiques) mais se lisait comme un ecran de rapport, sans lieu ni personnages, alors que le GDD promet des aventuriers qui deviennent des personnages persistants (voir D-005, D-010).
**Decision** : l'ecran affiche apres chaque expedition ouvre sur une scene de guilde/taverne : les survivants sont assis a une table avec role, niveau et statut (veteran/revenant), les morts sont nommes dans un panneau dedie plutot que reduits a un compteur, et si personne ne revient, aucun aventurier n'est invente comme temoin — seules des voix generiques de la Guilde et des rumeurs reagissent. Le rapport texte complet (participants, lecture tactique, economie) n'est pas supprime : il reste disponible juste en dessous, replie par defaut.
**Alternatives envisagees** : garder le seul texte de chronique et se contenter d'ameliorer sa redaction (ecarte : ne resout pas le probleme de lisibilite emotionnelle identifie par le studio) ; construire tout de suite une taverne interactive avec deplacement et dialogues cliquables (ecarte : hors perimetre V1, risque de retarder Kingdom Remembers) ; supprimer purement le rapport texte existant (ecarte : perte d'information deja utile en debrief).
**Consequences** : `survivorChronicleSystem.ts` reste la source factuelle (badges reutilises tel quel) ; un nouveau `guildTavernSceneSystem.ts` genere uniquement la couche scenique/dialogue au-dessus. Toute future evolution narrative (Kingdom Remembers, relations, objets personnels) doit se brancher sur cette meme scene plutot que recreer un second ecran de debriefing.
**Remplace / Remplace par** :

---

## D-015 - Survivant prioritaire dans l'expedition suivante

**Date** : 2026-07-06
**Statut** : Actif
**Contexte** : passe Survivor Continuity V1. Les survivants existaient deja comme profils persistants, mais leur retour etait opportuniste au lieu d'etre une promesse de design.
**Decision** : tout aventurier survivant et disponible revient automatiquement dans l'expedition suivante. Les survivants occupent les slots en priorite, puis le systeme adaptatif complete les places restantes. La taille de groupe reste strictement 5.
**Alternatives envisagees** : continuer a repiocher les survivants seulement si leur role correspond (rejete : casse la continuite narrative) ; creer un systeme d'hopital/repos complet maintenant (rejete : hors perimetre V1) ; augmenter la taille du groupe pour accueillir tous les survivants (rejete : contredit D-001).
**Consequences** : la composition adaptative doit raisonner apres les revenants, pas avant. Les futures indisponibilites devront etre explicites et documentees.
**Remplace / Remplace par** :

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
