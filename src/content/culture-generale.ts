import type { CardContent } from '../domain/types'

/**
 * Sourced general-knowledge deck.
 *
 * Every card carries the reference article that lets a learner check it in one
 * click. The 48 article titles were validated against the MediaWiki API
 * (action=query&redirects=1): no missing page, redirects resolved to the
 * canonical title.
 *
 * Honest limit: a source makes a card *verifiable*, it does not prove the
 * answer. That is a different order of guarantee from an unchecked claim, not
 * an absolute one.
 */

/**
 * Builds the reference from a validated article title. `encodeURI` keeps
 * accented titles valid as URLs; apostrophes are legal in a URI and stay put.
 */
const wiki = (title: string) => ({
  title,
  url: encodeURI(`https://fr.wikipedia.org/wiki/${title.replace(/ /g, '_')}`),
})

export const CULTURE_GENERALE: CardContent[] = [
  // ── Histoire ──────────────────────────────────────────────────────────────
  {
    id: 'hist-bastille',
    theme: 'histoire',
    question: 'Quelle date marque la prise de la Bastille ?',
    answer: 'Le 14 juillet 1789',
    hint: "L'été d'une année qui ouvre la Révolution française.",
    elaboration:
      'La forteresse ne détenait que sept prisonniers ce jour-là : sa portée est symbolique bien plus que militaire.',
    source: wiki('Prise de la Bastille'),
  },
  {
    id: 'hist-mur-berlin',
    theme: 'histoire',
    question: 'Quelle nuit le mur de Berlin est-il tombé ?',
    answer: 'Dans la nuit du 9 au 10 novembre 1989',
    hint: "Un automne qui précède de peu la fin de l'URSS.",
    elaboration:
      "L'ouverture doit beaucoup à une annonce confuse en conférence de presse, appliquée aussitôt par la foule.",
    source: wiki('Chute du mur de Berlin'),
  },
  {
    id: 'hist-westphalie',
    theme: 'histoire',
    question: 'À quelle guerre les traités de Westphalie mettent-ils fin en 1648 ?',
    answer: 'La guerre de Trente Ans',
    hint: "Un conflit qui a ravagé l'Europe centrale pendant trois décennies.",
    elaboration: "On y voit souvent l'acte de naissance du système des États souverains modernes.",
    source: wiki('Traités de Westphalie'),
  },
  {
    id: 'hist-waterloo',
    theme: 'histoire',
    question: 'En quelle année Napoléon est-il défait à Waterloo ?',
    answer: 'En 1815, le 18 juin',
    hint: "Quelques semaines après son retour de l'île d'Elbe.",
    elaboration: "La défaite met fin aux Cent-Jours et à l'Empire napoléonien.",
    source: wiki('Bataille de Waterloo'),
  },
  {
    id: 'hist-octobre',
    theme: 'histoire',
    question: "En quelle année a lieu la Révolution d'Octobre en Russie ?",
    answer: 'En 1917',
    hint: 'Pendant la Première Guerre mondiale.',
    elaboration:
      "Elle porte le nom d'octobre selon le calendrier julien alors en vigueur ; en calendrier grégorien, elle a lieu en novembre.",
    source: wiki("Révolution d'Octobre"),
  },
  {
    id: 'hist-hegire',
    theme: 'histoire',
    question: "Quel événement marque l'an 1 du calendrier musulman ?",
    answer: "L'Hégire, le départ de Mahomet de La Mecque vers Médine en 622",
    hint: 'Un départ, pas une naissance.',
    elaboration:
      'Le calendrier hégirien est lunaire : ses années sont plus courtes que les années solaires.',
    source: wiki('Hégire'),
  },
  {
    id: 'hist-rosette',
    theme: 'histoire',
    question: 'Quel objet a permis de déchiffrer les hiéroglyphes égyptiens ?',
    answer: 'La pierre de Rosette',
    hint: 'Un même texte gravé en trois écritures.',
    elaboration:
      "Champollion annonce son déchiffrement en 1822, en s'appuyant sur la version grecque du texte.",
    source: wiki('Pierre de Rosette'),
  },

  // ── Géographie ────────────────────────────────────────────────────────────
  {
    id: 'geo-muraille',
    theme: 'geographie',
    question: "La Grande Muraille de Chine est-elle visible à l'œil nu depuis la Lune ?",
    answer: "Non. C'est une légende tenace.",
    hint: 'Pensez à sa largeur, pas à sa longueur.',
    elaboration:
      "Elle est étroite de quelques mètres : même depuis l'orbite terrestre basse, elle est difficile à distinguer.",
    source: wiki('Grande Muraille'),
  },
  {
    id: 'geo-everest',
    theme: 'geographie',
    question: "Quelle est l'altitude de l'Everest ?",
    answer: 'Environ 8 849 mètres',
    hint: 'Un peu moins de neuf kilomètres.',
    elaboration:
      "L'altitude officielle a été réévaluée conjointement par la Chine et le Népal en 2020.",
    source: wiki('Everest'),
  },
  {
    id: 'geo-baikal',
    theme: 'geographie',
    question: 'Quel est le lac le plus profond du monde ?',
    answer: 'Le lac Baïkal, en Sibérie',
    hint: 'Il gèle en surface plusieurs mois par an.',
    elaboration:
      "Plus de 1 600 mètres de profondeur : il contient à lui seul une part considérable de l'eau douce liquide de la planète.",
    source: wiki('Lac Baïkal'),
  },
  {
    id: 'geo-amazone',
    theme: 'geographie',
    question: 'Quel fleuve a le plus grand débit du monde ?',
    answer: "L'Amazone",
    hint: "Ce n'est pas le plus long qui gagne ici.",
    elaboration: 'Son débit dépasse celui des sept fleuves suivants réunis.',
    source: wiki('Amazone (fleuve)'),
  },
  {
    id: 'geo-gibraltar',
    theme: 'geographie',
    question: "Quel détroit sépare l'Europe de l'Afrique à l'entrée de la Méditerranée ?",
    answer: 'Le détroit de Gibraltar',
    hint: 'Une quinzaine de kilomètres séparent les deux rives.',
    elaboration: "Il relie l'océan Atlantique à la mer Méditerranée.",
    source: wiki('Détroit de Gibraltar'),
  },
  {
    id: 'geo-sahara',
    theme: 'geographie',
    question: 'Quel est le plus grand désert chaud du monde ?',
    answer: 'Le Sahara',
    hint: 'Il traverse une dizaine de pays africains.',
    elaboration:
      "Les plus grands déserts au sens strict sont polaires : l'Antarctique et l'Arctique.",
    source: wiki('Sahara'),
  },
  {
    id: 'geo-mariannes',
    theme: 'geographie',
    question: 'Quel est le point le plus profond des océans ?',
    answer: 'La fosse des Mariannes, dans le Pacifique',
    hint: "Plus profonde que l'Everest n'est haut.",
    elaboration: 'Son point le plus bas approche les 11 000 mètres sous le niveau de la mer.',
    source: wiki('Fosse des Mariannes'),
  },

  // ── Sciences ──────────────────────────────────────────────────────────────
  {
    id: 'sci-lumiere',
    theme: 'sciences',
    question: 'Quelle est la vitesse de la lumière dans le vide ?',
    answer: '299 792 458 mètres par seconde, exactement',
    hint: 'Un nombre exact, pas une mesure approchée.',
    elaboration: "Elle est exacte par définition : depuis 1983, c'est elle qui définit le mètre.",
    source: wiki('Vitesse de la lumière'),
  },
  {
    id: 'sci-mendeleiev',
    theme: 'sciences',
    question: 'Qui publie en 1869 la première version du tableau périodique des éléments ?',
    answer: 'Dmitri Mendeleïev',
    hint: 'Un chimiste russe.',
    elaboration:
      'Sa force fut de laisser des cases vides et de prédire les propriétés des éléments qui les rempliraient.',
    source: wiki('Tableau périodique des éléments'),
  },
  {
    id: 'sci-adn',
    theme: 'sciences',
    question: "Quelle est la structure de la molécule d'ADN ?",
    answer: 'Une double hélice',
    hint: "Deux brins enroulés l'un autour de l'autre.",
    elaboration:
      "Le modèle est publié en 1953 par Watson et Crick, en s'appuyant sur les clichés de diffraction de Rosalind Franklin.",
    source: wiki('Acide désoxyribonucléique'),
  },
  {
    id: 'sci-relativite',
    theme: 'sciences',
    question: "Que décrit la relativité générale d'Einstein ?",
    answer: "La gravitation comme une courbure de l'espace-temps",
    hint: "Ce n'est plus une force au sens de Newton.",
    elaboration:
      'Publiée en 1915, elle prédit notamment la déviation de la lumière par les masses, confirmée en 1919.',
    source: wiki('Relativité générale'),
  },
  {
    id: 'sci-trou-noir',
    theme: 'sciences',
    question:
      "Comment appelle-t-on la limite d'un trou noir au-delà de laquelle rien ne peut s'échapper ?",
    answer: "L'horizon des événements",
    hint: 'Une frontière, pas une surface matérielle.',
    elaboration:
      "Ce n'est pas un objet physique : c'est la limite à partir de laquelle même la lumière ne peut plus revenir.",
    source: wiki('Trou noir'),
  },
  {
    id: 'sci-photosynthese',
    theme: 'sciences',
    question:
      "Que produisent les plantes par photosynthèse, à partir d'eau et de dioxyde de carbone ?",
    answer: 'Des sucres et du dioxygène',
    hint: "L'un nourrit la plante, l'autre nous nourrit.",
    elaboration:
      "L'énergie lumineuse est captée par la chlorophylle et convertie en énergie chimique.",
    source: wiki('Photosynthèse'),
  },
  {
    id: 'sci-tectonique',
    theme: 'sciences',
    question: "Qui propose en 1912 l'hypothèse de la dérive des continents ?",
    answer: 'Alfred Wegener',
    hint: 'Un météorologue allemand, longtemps moqué.',
    elaboration:
      'Il lui manquait un moteur crédible ; la tectonique des plaques le fournira dans les années 1960.',
    source: wiki('Tectonique des plaques'),
  },
  {
    id: 'sci-penicilline',
    theme: 'sciences',
    question: 'Qui découvre la pénicilline en 1928 ?',
    answer: 'Alexander Fleming',
    hint: 'Une boîte de culture oubliée, contaminée par une moisissure.',
    elaboration:
      'Il faudra le travail de Florey et Chain pour en faire un médicament produit à grande échelle, une décennie plus tard.',
    source: wiki('Pénicilline'),
  },

  // ── Arts ──────────────────────────────────────────────────────────────────
  {
    id: 'art-joconde',
    theme: 'arts',
    question: 'Qui a peint la Joconde, et où est-elle conservée ?',
    answer: 'Léonard de Vinci ; au musée du Louvre, à Paris',
    hint: 'Un peintre italien, un musée français.',
    elaboration: 'Son vol en 1911 a beaucoup fait pour sa célébrité mondiale.',
    source: wiki('Joconde'),
  },
  {
    id: 'art-guernica',
    theme: 'arts',
    question: 'Quel événement Picasso représente-t-il dans Guernica ?',
    answer: "Le bombardement de la ville de Guernica en 1937, pendant la guerre d'Espagne",
    hint: 'Une ville basque, une guerre civile.',
    elaboration:
      'La toile est peinte en noir, blanc et gris, ce qui accentue sa violence documentaire.',
    source: wiki('Guernica (Picasso)'),
  },
  {
    id: 'art-sacre',
    theme: 'arts',
    question: 'Quelle œuvre de Stravinsky provoque un scandale à sa création en 1913 ?',
    answer: 'Le Sacre du printemps',
    hint: 'Un ballet, à Paris.',
    elaboration:
      "Rythmes heurtés et chorégraphie rompant avec l'académisme : la salle se serait divisée bruyamment.",
    source: wiki('Le Sacre du printemps'),
  },
  {
    id: 'art-impressionnisme',
    theme: 'arts',
    question: "D'où vient le nom du mouvement impressionniste ?",
    answer: "D'un tableau de Monet, Impression, soleil levant",
    hint: 'Le terme était au départ une moquerie de critique.',
    elaboration:
      'Employé ironiquement en 1874, il a été revendiqué ensuite par les peintres eux-mêmes.',
    source: wiki('Impressionnisme'),
  },
  {
    id: 'art-nuit-etoilee',
    theme: 'arts',
    question: 'Qui a peint La Nuit étoilée, en 1889 ?',
    answer: 'Vincent van Gogh',
    hint: 'Peinte pendant son séjour à Saint-Rémy-de-Provence.',
    elaboration:
      "Le paysage est vu depuis la fenêtre de sa chambre à l'asile, recomposé de mémoire.",
    source: wiki('Nuit étoilée'),
  },
  {
    id: 'art-penseur',
    theme: 'arts',
    question: 'Qui a sculpté Le Penseur ?',
    answer: 'Auguste Rodin',
    hint: 'Un sculpteur français du XIXe siècle.',
    elaboration: "La figure était initialement conçue comme un élément de La Porte de l'Enfer.",
    source: wiki('Le Penseur'),
  },
  {
    id: 'art-neuvieme',
    theme: 'arts',
    question: 'Quel texte Beethoven met-il en musique dans le finale de sa Neuvième Symphonie ?',
    answer: "L'Ode à la joie de Schiller",
    hint: "Sa mélodie est devenue l'hymne européen.",
    elaboration:
      "C'est la première fois qu'un grand symphoniste introduit des voix dans le finale d'une symphonie.",
    source: wiki('Symphonie no 9 de Beethoven'),
  },

  // ── Littérature ───────────────────────────────────────────────────────────
  {
    id: 'lit-proust',
    theme: 'litterature',
    question:
      "Quel objet déclenche la mémoire involontaire au début d'À la recherche du temps perdu ?",
    answer: 'Une madeleine trempée dans du thé',
    hint: 'Un gâteau, une tasse.',
    elaboration: "L'épisode est devenu la métaphore courante du souvenir surgi d'une sensation.",
    source: wiki('À la recherche du temps perdu'),
  },
  {
    id: 'lit-quichotte',
    theme: 'litterature',
    question: 'Qui a écrit Don Quichotte ?',
    answer: 'Miguel de Cervantès',
    hint: 'Un auteur espagnol du début du XVIIe siècle.',
    elaboration: 'Souvent présenté comme le premier roman moderne européen.',
    source: wiki('Don Quichotte'),
  },
  {
    id: 'lit-miserables',
    theme: 'litterature',
    question: 'Qui est le personnage principal des Misérables de Victor Hugo ?',
    answer: 'Jean Valjean',
    hint: "Un ancien bagnard poursuivi par l'inspecteur Javert.",
    elaboration:
      "Le roman paraît en 1862 et se veut autant un plaidoyer social qu'une fresque romanesque.",
    source: wiki('Les Misérables'),
  },
  {
    id: 'lit-ulysse',
    theme: 'litterature',
    question: 'Sur quelle durée se déroule Ulysse de James Joyce ?',
    answer: 'Une seule journée, le 16 juin 1904',
    hint: 'Cette date est fêtée chaque année à Dublin.',
    elaboration: 'Le Bloomsday tire son nom de Leopold Bloom, le personnage central.',
    source: wiki('Ulysse (roman)'),
  },
  {
    id: 'lit-macondo',
    theme: 'litterature',
    question: 'Dans quel village imaginaire se déroule Cent Ans de solitude ?',
    answer: 'Macondo',
    hint: "Un village d'Amérique latine inventé par l'auteur.",
    elaboration: "Le roman de Gabriel García Márquez est l'œuvre emblématique du réalisme magique.",
    source: wiki('Cent Ans de solitude'),
  },
  {
    id: 'lit-hamlet',
    theme: 'litterature',
    question: 'De quelle pièce est tirée la réplique « Être ou ne pas être » ?',
    answer: 'Hamlet, de Shakespeare',
    hint: 'Un prince danois.',
    elaboration: "La tirade ouvre une méditation sur la mort et sur l'action, au troisième acte.",
    source: wiki('Hamlet'),
  },

  // ── Idées ─────────────────────────────────────────────────────────────────
  {
    id: 'idee-caverne',
    theme: 'idees',
    question: "Que décrit l'allégorie de la caverne de Platon ?",
    answer: 'Des prisonniers qui prennent des ombres projetées pour la réalité',
    hint: 'Un feu, un mur, des ombres.',
    elaboration:
      "Elle figure le passage de l'opinion à la connaissance, et le prix à payer pour y accéder.",
    source: wiki('Allégorie de la caverne'),
  },
  {
    id: 'idee-kant',
    theme: 'idees',
    question: "Quel principe moral Kant formule-t-il avec l'impératif catégorique ?",
    answer: "N'agir que selon une maxime que l'on pourrait vouloir voir érigée en loi universelle",
    hint: "Un test d'universalisation.",
    elaboration:
      "Il s'oppose à l'impératif hypothétique, qui n'oblige qu'en vue d'une fin particulière.",
    source: wiki('Impératif catégorique'),
  },
  {
    id: 'idee-cogito',
    theme: 'idees',
    question: 'Qui formule le « Je pense donc je suis » ?',
    answer: 'René Descartes',
    hint: "Au terme d'un doute poussé jusqu'au bout.",
    elaboration:
      "Le doute méthodique cherche une certitude qui résiste à tout : l'existence du sujet qui doute.",
    source: wiki('Cogito ergo sum'),
  },
  {
    id: 'idee-utilitarisme',
    theme: 'idees',
    question: "Sur quel critère l'utilitarisme juge-t-il une action ?",
    answer: "Sur ses conséquences, évaluées au bien-être global qu'elles produisent",
    hint: 'Le plus grand bonheur du plus grand nombre.',
    elaboration:
      'Formulé par Bentham puis affiné par John Stuart Mill, qui introduit une hiérarchie des plaisirs.',
    source: wiki('Utilitarisme'),
  },

  // ── Techniques ────────────────────────────────────────────────────────────
  {
    id: 'tech-turing',
    theme: 'techniques',
    question: "Qu'est-ce qu'une machine de Turing ?",
    answer: 'Un modèle théorique de calcul, proposé par Alan Turing en 1936',
    hint: 'Un ruban, une tête de lecture, des règles.',
    elaboration:
      'Elle sert à définir ce qui est calculable, et fonde la théorie de la calculabilité.',
    source: wiki('Machine de Turing'),
  },
  {
    id: 'tech-arpanet',
    theme: 'techniques',
    question: "Quel réseau, mis en service en 1969, est l'ancêtre d'Internet ?",
    answer: 'ARPANET',
    hint: 'Un projet financé par la défense américaine.',
    elaboration:
      'Il popularise la commutation de paquets, principe encore au cœur des réseaux actuels.',
    source: wiki('ARPANET'),
  },
  {
    id: 'tech-moore',
    theme: 'techniques',
    question: "Qu'énonce la loi de Moore ?",
    answer:
      'Le doublement régulier du nombre de transistors sur une puce, environ tous les deux ans',
    hint: "Ce n'est pas une loi physique.",
    elaboration:
      "C'est une observation empirique devenue objectif industriel, et donc en partie autoréalisatrice.",
    source: wiki('Loi de Moore'),
  },
  {
    id: 'tech-gutenberg',
    theme: 'techniques',
    question: 'Quel procédé Gutenberg met-il au point vers 1450 en Europe ?',
    answer: "L'imprimerie à caractères mobiles métalliques",
    hint: 'Des caractères réutilisables, fondus un à un.',
    elaboration:
      "Des techniques d'impression existaient déjà en Asie ; l'apport de Gutenberg tient à l'alliage, au moule et à la presse.",
    source: wiki('Imprimerie'),
  },

  // ── Institutions ──────────────────────────────────────────────────────────
  {
    id: 'inst-dudh',
    theme: 'institutions',
    question: "Quand la Déclaration universelle des droits de l'homme est-elle adoptée ?",
    answer: 'Le 10 décembre 1948, à Paris',
    hint: 'Trois ans après la fin de la Seconde Guerre mondiale.',
    elaboration:
      "Adoptée par l'Assemblée générale des Nations unies, elle n'est pas un traité contraignant mais a inspiré de nombreux textes qui le sont.",
    source: wiki("Déclaration universelle des droits de l'homme"),
  },
  {
    id: 'inst-rome',
    theme: 'institutions',
    question: 'Que fonde le traité de Rome, signé en 1957 ?',
    answer: 'La Communauté économique européenne',
    hint: "L'ancêtre de l'Union européenne.",
    elaboration: 'Six États fondateurs, dont la Belgique, y instaurent un marché commun.',
    source: wiki('Traité de Rome'),
  },
  {
    id: 'inst-geneve',
    theme: 'institutions',
    question: 'Que protègent les conventions de Genève ?',
    answer:
      'Les personnes qui ne participent pas ou plus aux combats : civils, blessés, prisonniers de guerre',
    hint: 'Le cœur du droit international humanitaire.',
    elaboration: "Elles n'interdisent pas la guerre : elles en encadrent la conduite.",
    source: wiki('Conventions de Genève'),
  },
  {
    id: 'inst-hippocrate',
    theme: 'institutions',
    question: "À quelle profession le serment d'Hippocrate est-il associé ?",
    answer: 'À la médecine',
    hint: "Un texte grec antique, encore prêté aujourd'hui sous des formes modernisées.",
    elaboration:
      "La formule « Primum non nocere », d'abord ne pas nuire, n'y figure pas littéralement mais en résume l'esprit.",
    source: wiki("Serment d'Hippocrate"),
  },
  {
    id: 'inst-nobel',
    theme: 'institutions',
    question: 'Qui a institué les prix Nobel, et par quel acte ?',
    answer: 'Alfred Nobel, par son testament ; les premiers prix sont décernés en 1901',
    hint: "L'inventeur de la dynamite.",
    elaboration:
      "Le prix d'économie n'est pas prévu par le testament : il a été créé en 1968 par la banque centrale de Suède.",
    source: wiki('Prix Nobel'),
  },
]
