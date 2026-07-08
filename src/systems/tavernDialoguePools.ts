import type { AdventurerRole, WaveReport } from '../game/types';

export type SceneSource = Omit<WaveReport, 'guildTavernScene'>;

export interface DialogueContext {
  report: SceneSource;
  dead: string[];
  speakerName: string;
  firstDead: string | null;
}

export interface DialogueLine {
  id: string;
  text: string | ((ctx: DialogueContext) => string);
}

function line(id: string, text: string | ((ctx: DialogueContext) => string)): DialogueLine {
  return { id, text };
}

export const SURVIVOR_GENERIC: DialogueLine[] = [
  line('surv-01', "J'ai encore de la poussiere dans la gorge."),
  line('surv-02', 'On aurait du faire demi-tour plus tot.'),
  line('surv-03', "Je l'ai vu tomber. J'ai pas pu revenir en arriere."),
  line('surv-04', "Le tresor ? On l'a meme pas touche."),
  line('surv-05', "J'ai entendu le boss avant de le voir."),
  line('surv-06', 'Je repars, mais cette fois je marche pas devant.'),
  line('surv-07', 'Les couloirs sentaient la pierre humide.'),
  line('surv-08', "On etait cinq en entrant. Ca fait mal de compter."),
  line('surv-09', 'Personne ne parlait en remontant.'),
  line('surv-10', 'Ma main tremble encore sur la poignee de la porte.'),
];

export const NPC_GENERIC: DialogueLine[] = [
  line('npc-01', 'Asseyez-vous avant de parler.'),
  line('npc-02', 'La guilde ecoute. Brievement.'),
  line('npc-03', 'On note tout. Meme ce que vous oubliez.'),
  line('npc-04', 'Le prochain groupe partira mieux informe.'),
  line('npc-05', 'Personne ne repart sans un verre ou un nom.'),
  line('npc-06', 'Les chaises du fond sont pour ceux qui reviennent.'),
  line('npc-07', 'Parlez bas. Les murs ont des oreilles ici aussi.'),
  line('npc-08', 'On a deja prepare les contrats pour la suite.'),
  line('npc-09', 'Les volontaires attendent votre version.'),
  line('npc-10', 'La salle se remplit des qu on parle de pertes.'),
];

export const DOOR_LINES: DialogueLine[] = [
  line('door-01', "On est restes plantes devant une porte comme des idiots."),
  line('door-02', 'Pas de voleur, pas de passage.'),
  line('door-03', 'La prochaine equipe part avec un crocheteur. Point.'),
  line('door-04', 'La serrure a tenu dix secondes. Pas plus.'),
  line('door-05', 'Le voleur nous a ouvert le passage, mais derriere c etait pire.'),
  line('door-06', 'Les portes nous ont stoppe net au milieu du couloir.'),
  line('door-07', 'On a heurte une porte verrouillee sans outil pour l ouvrir.'),
  line('door-08', 'Sans crocheteur, on a tourne les talons.'),
];

export const TRAP_LINES: DialogueLine[] = [
  line('trap-01', 'Les dalles piegees etaient juste apres le virage.'),
  line('trap-02', "J'ai vu les pics sortir sous ses bottes."),
  line('trap-03', 'On a arrete de courir apres le deuxieme piege.'),
  line('trap-04', 'Le sol mentait. Une dalle sur deux etait fausse.'),
  line('trap-05', 'Un piege nous a decale tout le groupe.'),
  line('trap-06', 'On marchait sur la pointe des pieds. Ca n a pas suffi.'),
  line('trap-07', 'Le bruit du piege a alerte tout le couloir.'),
  line('trap-08', (ctx) => `${ctx.report.trapHighlights[0]?.label ?? 'Un piege'} nous a couté cher.`),
];

export const TREASURE_TAKEN_LINES: DialogueLine[] = [
  line('treas-y-01', "On a ramene l'or. Pas tout le monde."),
  line('treas-y-02', "J'ai encore la bourse. Je sais pas si ca valait le prix."),
  line('treas-y-03', (ctx) => `Le coffre est sorti, mais pas ${ctx.firstDead ?? 'tout le monde'}.`),
  line('treas-y-04', 'Le tresor est dans la salle du fond. Nous, on est dehors.'),
  line('treas-y-05', "On l'a pris en courant, les mains qui tremblent."),
  line('treas-y-06', 'La bourse etait lourde. Le retour aussi.'),
  line('treas-y-07', 'Ils ont le tresor. La guilde va le savoir vite.'),
  line('treas-y-08', 'On repart avec l or et sans les noms qu on voulait ramener.'),
];

export const TREASURE_NOT_TAKEN_LINES: DialogueLine[] = [
  line('treas-n-01', 'Le coffre est toujours la-bas.'),
  line('treas-n-02', "On l'a vu, mais on n'a pas pu l'atteindre."),
  line('treas-n-03', 'Le tresor etait trop loin. Ou nous, trop lents.'),
  line('treas-n-04', 'Le tresor est reste au fond, intact.'),
  line('treas-n-05', 'On verra la prochaine fois pour le coffre.'),
  line('treas-n-06', 'On etait proches. Pas assez.'),
  line('treas-n-07', 'Le tresor brille encore dans le noir du donjon.'),
  line('treas-n-08', 'On repart les mains vides. Ca pique.'),
];

export const BOSS_FACED_LINES: DialogueLine[] = [
  line('boss-y-01', 'Le boss nous attendait dans la salle du fond.'),
  line('boss-y-02', "On l'a blesse, mais pas assez."),
  line('boss-y-03', 'Il a rugi, et tout le monde a recule.'),
  line('boss-y-04', 'Le boss tape plus fort qu il en a l air.'),
  line('boss-y-05', 'On l a touche. Il est toujours debout.'),
  line('boss-y-06', 'La salle du trone sentait le soufre.'),
  line('boss-y-07', 'Personne n a tenu longtemps face a lui.'),
  line('boss-y-08', 'On l a vu. On prefererait ne plus jamais le revoir.'),
];

export const BOSS_NOT_REACHED_LINES: DialogueLine[] = [
  line('boss-n-01', "On n'a meme pas vu le boss."),
  line('boss-n-02', "On s'est arretes bien avant la salle du fond."),
  line('boss-n-03', 'Si le boss etait derriere, tant mieux. On avait deja assez de problemes.'),
  line('boss-n-04', 'Le trone est reste loin. Tres loin.'),
  line('boss-n-05', 'On a entendu quelque chose au fond. On n y est pas alles.'),
  line('boss-n-06', 'Le boss n a pas eu besoin de se montrer.'),
  line('boss-n-07', 'On s est retires avant la salle du trone.'),
  line('boss-n-08', 'La salle du fond est reste un bruit, pas une rencontre.'),
];

export const NO_SURVIVOR_LINES: DialogueLine[] = [
  line('nosurv-01', 'Ils etaient cinq.'),
  line('nosurv-02', "On a attendu jusqu'a la fermeture."),
  line('nosurv-03', 'Le recruteur a barre cinq noms sans lever les yeux.'),
  line('nosurv-04', "On les a appeles jusqu'a la nuit. Personne n'a repondu."),
  line('nosurv-05', 'Preparez cinq autres contrats.'),
  line('nosurv-06', 'Ils devaient rentrer avant le repas. Les chaises sont encore vides.'),
  line('nosurv-07', 'La porte de la guilde est restee fermee toute la soiree.'),
  line('nosurv-08', "Quelqu'un doit aller verifier. Pas moi."),
];

export const ROLE_LINES: Record<AdventurerRole, DialogueLine[]> = {
  warrior: [
    line('war-01', "J'ai tenu le passage aussi longtemps que j'ai pu."),
    line('war-02', 'Ils ont panique quand le slime a bloque le couloir.'),
    line('war-03', 'Le boss tape plus fort qu il en a l air.'),
    line('war-04', (ctx) => `On etait cinq. On est revenus ${ctx.report.adventurersEscaped}. Ca suffit comme rapport ?`),
    line('war-05', 'Je reste debout. Le reste, on verra.'),
  ],
  thief: [
    line('thf-01', 'Sans moi, vous seriez encore devant cette porte.'),
    line('thf-02', 'Il y avait un mecanisme sous chaque dalle.'),
    line('thf-03', "J'en ai desamorce deux. Apres ca, c etait au petit bonheur."),
    line('thf-04', 'La prochaine fois, vous me laissez regarder avant de courir.'),
    line('thf-05', 'Les serrures, ca se sent. Les pieges aussi.'),
  ],
  healer: [
    line('hel-01', "J'ai soigne ce que je pouvais."),
    line('hel-02', (ctx) => `Quand ${ctx.firstDead ?? 'lui'} est tombe, j'avais plus rien.`),
    line('hel-03', 'Ils saignaient tous. Tous.'),
    line('hel-04', 'Je peux repartir, mais pas sans repos.'),
    line('hel-05', 'Je reste, partez !'),
  ],
  mage: [
    line('mag-01', 'La glace les a ralentis, pas arretes.'),
    line('mag-02', "J'ai gele le couloir. Ca nous a gagne quelques secondes."),
    line('mag-03', "Le slime n'a pas aime le froid."),
    line('mag-04', "Le boss n'a presque pas reagi a mon sort."),
    line('mag-05', 'Mes sorts ont tenu le temps d un souffle.'),
  ],
  cartographer: [
    line('map-01', 'Le couloir est moins droit que dans les recits.'),
    line('map-02', 'J ai marque la porte et les dalles dangereuses.'),
    line('map-03', 'La carte de la Guilde etait fausse. Elle l est un peu moins.'),
    line('map-04', 'Si je repars, je marche derriere ceux qui saignent le mieux.'),
    line('map-05', 'Le boss est note. Pas dessine avec flatterie.'),
  ],
};

export const TAVERNKEEPER_LINES: DialogueLine[] = [
  line('tk-01', "Pose ton epee avant de t'ecrouler sur ma table."),
  line('tk-02', 'Encore deux noms a rayer ?'),
  line('tk-03', 'Je vous sers quelque chose ou vous repartez mourir tout de suite ?'),
  line('tk-04', 'Je garde la table du fond pour ceux qui reviennent. Quand ils reviennent.'),
  line('tk-05', 'Asseyez-vous. Parlez apres.'),
];

export const ARCHIVIST_LINES: DialogueLine[] = [
  line('arc-01', 'Donne-moi les noms. Pas les excuses.'),
  line('arc-02', 'Qui a vu le boss ?'),
  line('arc-03', 'Qui portait le tresor ?'),
  line('arc-04', 'Je note : porte verrouillee, pas de voleur, retraite.'),
  line('arc-05', 'Le registre attend vos faits, pas vos legendes.'),
];

export const RECRUITER_LINES: DialogueLine[] = [
  line('rec-01', "Il nous faut un voleur. Cette fois, c'est pas negociable."),
  line('rec-02', 'On garde un survivant au rapport. On envoie quelqu un qui sait ouvrir.'),
  line('rec-03', 'Je veux des volontaires, pas des heros.'),
  line('rec-04', 'Le prochain groupe partira mieux prepare.'),
  line('rec-05', 'Cinq contrats. Cinq noms. On recommence.'),
];

export const VOLUNTEER_LINES: DialogueLine[] = [
  line('vol-01', 'Vous voulez qu on retourne la-dedans ?'),
  line('vol-02', 'Attends... ils sont morts ou exactement ?'),
  line('vol-03', 'Il reste un tresor au fond ?'),
  line('vol-04', 'Et vous etes surs qu il faut y aller a cinq ?'),
  line('vol-05', 'Je peux tenir une torche. Pas la ligne de front.'),
];

export const DESPERATION_LINES: DialogueLine[] = [
  line('des-01', 'On peut encore le faire !'),
  line('des-02', 'Encore quelques metres !'),
  line('des-03', 'Le boss faiblit, avancez !'),
  line('des-04', 'Pas maintenant. On est trop proches.'),
  line('des-05', "Si on fuit maintenant, tout ca n'aura servi a rien."),
];

export const DISOBEY_LINES: DialogueLine[] = [
  line('dis-01', 'Je reste, partez !'),
  line('dis-02', 'Je peux encore le retenir !'),
  line('dis-03', 'Non, on ne fuit pas maintenant !'),
  line('dis-04', 'Je couvre votre retraite !'),
  line('dis-05', "Je ne l'abandonne pas !"),
];

export const VETERAN_LINES: DialogueLine[] = [
  line('vet-01', 'Oui. Cette fois, je connais le chemin.'),
  line('vet-02', 'Je repars. Mais pas en premiere ligne.'),
  line('vet-03', 'Le donjon a change. Moi aussi.'),
  line('vet-04', 'On sait ou ca pique, maintenant.'),
  line('vet-05', 'Je retourne. Quelqu un doit le faire.'),
];

export function resolveLine(entry: DialogueLine, ctx: DialogueContext): string {
  return typeof entry.text === 'function' ? entry.text(ctx) : entry.text;
}
