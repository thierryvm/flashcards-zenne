import type { CardContent } from '../domain/types'

/**
 * Seed deck.
 *
 * Every card is flagged `unverified` on purpose. It was written from an offline
 * model's recollection, with no source to check against, and spaced repetition
 * is precisely the mechanism that would engrave a wrong fact. The deck is kept
 * small and conservative for that reason: it is a working corpus for the study
 * loop, not a knowledge base. Clearing the flag requires a human or a sourced
 * import, card by card.
 */
export const CULTURE_GENERALE: CardContent[] = [
  // ── Histoire ──────────────────────────────────────────────────────────────
  {
    id: 'hist-bastille',
    theme: 'histoire',
    question: 'Quelle date marque la prise de la Bastille ?',
    answer: '14 juillet 1789',
    hint: "L'été d'une année qui ouvre la Révolution française.",
    elaboration:
      'La prison ne comptait que sept détenus. Ce qui compte est le symbole : une forteresse royale tombe aux mains des Parisiens.',
    unverified: true,
  },
  {
    id: 'hist-mur-berlin',
    theme: 'histoire',
    question: 'Quand le mur de Berlin est-il tombé ?',
    answer: '9 novembre 1989',
    hint: "La fin d'une décennie, deux ans avant la dissolution de l'URSS.",
    elaboration:
      "L'ouverture découle en partie d'une annonce confuse en conférence de presse : la foule a pris de vitesse la décision politique.",
    unverified: true,
  },
  {
    id: 'hist-14-18',
    theme: 'histoire',
    question: 'Quelles années encadrent la Première Guerre mondiale ?',
    answer: '1914 à 1918',
    hint: "L'armistice est signé un 11 novembre.",
    unverified: true,
  },
  {
    id: 'hist-debarquement',
    theme: 'histoire',
    question: 'À quelle date a lieu le débarquement de Normandie ?',
    answer: '6 juin 1944',
    hint: 'On le désigne par une lettre et un chiffre : le « Jour J ».',
    unverified: true,
  },
  {
    id: 'hist-colomb',
    theme: 'histoire',
    question: "En quelle année Christophe Colomb atteint-il l'Amérique ?",
    answer: '1492',
    elaboration:
      "Il cherchait une route occidentale vers les Indes et mourut convaincu d'y être parvenu.",
    unverified: true,
  },
  {
    id: 'hist-traite-rome',
    theme: 'histoire',
    question: 'Quel traité de 1957 fonde la Communauté économique européenne ?',
    answer: 'Le traité de Rome',
    hint: 'Une capitale du sud de l’Europe lui donne son nom.',
    unverified: true,
  },

  // ── Géographie ────────────────────────────────────────────────────────────
  {
    id: 'geo-nil',
    theme: 'geographie',
    question: "Quel est le plus long fleuve d'Afrique ?",
    answer: 'Le Nil',
    elaboration:
      'Il traverse une dizaine de pays et se jette en Méditerranée par un delta, en Égypte.',
    unverified: true,
  },
  {
    id: 'geo-canberra',
    theme: 'geographie',
    question: "Quelle est la capitale de l'Australie ?",
    answer: 'Canberra',
    hint: 'Ni Sydney ni Melbourne : une ville créée pour les départager.',
    elaboration:
      'Canberra a été construite ex nihilo précisément pour arbitrer la rivalité entre Sydney et Melbourne.',
    unverified: true,
  },
  {
    id: 'geo-pacifique',
    theme: 'geographie',
    question: 'Quel est le plus vaste océan du globe ?',
    answer: "L'océan Pacifique",
    unverified: true,
  },
  {
    id: 'geo-everest',
    theme: 'geographie',
    question: 'Quel est le plus haut sommet du monde ?',
    answer: "L'Everest, environ 8 849 m",
    hint: 'Il se situe sur la frontière entre le Népal et la Chine.',
    elaboration:
      "L'altitude exacte a été révisée plusieurs fois ; retenir l'ordre de grandeur vaut mieux qu'un chiffre au mètre près.",
    unverified: true,
  },
  {
    id: 'geo-gibraltar',
    theme: 'geographie',
    question: "Quel détroit sépare l'Europe de l'Afrique à l'ouest de la Méditerranée ?",
    answer: 'Le détroit de Gibraltar',
    unverified: true,
  },
  {
    id: 'geo-senne',
    theme: 'geographie',
    question: 'Quelle rivière traverse Bruxelles ?',
    answer: 'La Senne',
    hint: 'Elle est aujourd’hui voûtée et invisible en centre-ville.',
    elaboration:
      'Voûtée au XIXᵉ siècle pour raisons sanitaires, elle coule sous les boulevards du centre. En néerlandais : de Zenne.',
    unverified: true,
  },

  // ── Sciences ──────────────────────────────────────────────────────────────
  {
    id: 'sci-or',
    theme: 'sciences',
    question: "Quel est le symbole chimique de l'or ?",
    answer: 'Au',
    hint: 'Il vient du latin, pas du français.',
    elaboration: 'Du latin aurum. Beaucoup de symboles chimiques gardent la racine latine.',
    unverified: true,
  },
  {
    id: 'sci-lumiere',
    theme: 'sciences',
    question: 'Quelle est approximativement la vitesse de la lumière dans le vide ?',
    answer: 'Environ 300 000 km/s',
    elaboration:
      "Sa valeur est fixée par convention et sert désormais à définir le mètre, plutôt que l'inverse.",
    unverified: true,
  },
  {
    id: 'sci-chromosomes',
    theme: 'sciences',
    question: 'Combien de chromosomes compte une cellule humaine ordinaire ?',
    answer: '46, soit 23 paires',
    unverified: true,
  },
  {
    id: 'sci-mercure',
    theme: 'sciences',
    question: 'Quelle planète est la plus proche du Soleil ?',
    answer: 'Mercure',
    unverified: true,
  },
  {
    id: 'sci-hydrogene',
    theme: 'sciences',
    question: "Quel est l'élément le plus abondant de l'univers ?",
    answer: "L'hydrogène",
    unverified: true,
  },
  {
    id: 'sci-adn',
    theme: 'sciences',
    question: "En quelle année la structure en double hélice de l'ADN est-elle publiée ?",
    answer: '1953, par Watson et Crick',
    elaboration:
      "Leur modèle s'appuie sur les clichés de diffraction de Rosalind Franklin, dont la contribution est longtemps restée dans l'ombre.",
    unverified: true,
  },

  // ── Arts ──────────────────────────────────────────────────────────────────
  {
    id: 'art-joconde',
    theme: 'arts',
    question: 'Qui a peint La Joconde ?',
    answer: 'Léonard de Vinci',
    elaboration: "L'œuvre est conservée au Louvre, à Paris.",
    unverified: true,
  },
  {
    id: 'art-guernica',
    theme: 'arts',
    question: 'Qui a peint Guernica ?',
    answer: 'Pablo Picasso',
    hint: "Le tableau répond au bombardement d'une ville basque en 1937.",
    unverified: true,
  },
  {
    id: 'art-nuit-etoilee',
    theme: 'arts',
    question: 'Qui a peint La Nuit étoilée ?',
    answer: 'Vincent van Gogh',
    unverified: true,
  },
  {
    id: 'art-penseur',
    theme: 'arts',
    question: 'Qui a sculpté Le Penseur ?',
    answer: 'Auguste Rodin',
    unverified: true,
  },
  {
    id: 'art-impressionnisme',
    theme: 'arts',
    question: 'À quel mouvement rattache-t-on Claude Monet ?',
    answer: "L'impressionnisme",
    elaboration:
      "Le nom du mouvement vient d'un de ses tableaux, Impression, soleil levant, et fut d'abord une moquerie de critique.",
    unverified: true,
  },
  {
    id: 'art-neuvieme',
    theme: 'arts',
    question: 'Quel compositeur a écrit la Neuvième Symphonie et son Ode à la joie ?',
    answer: 'Ludwig van Beethoven',
    elaboration: "Son thème principal sert d'hymne européen.",
    unverified: true,
  },

  // ── Littérature ───────────────────────────────────────────────────────────
  {
    id: 'lit-miserables',
    theme: 'litterature',
    question: 'Qui a écrit Les Misérables ?',
    answer: 'Victor Hugo',
    unverified: true,
  },
  {
    id: 'lit-proust',
    theme: 'litterature',
    question: 'Qui a écrit À la recherche du temps perdu ?',
    answer: 'Marcel Proust',
    hint: 'Le premier volume paraît en 1913.',
    unverified: true,
  },
  {
    id: 'lit-quichotte',
    theme: 'litterature',
    question: 'Qui a écrit Don Quichotte ?',
    answer: 'Miguel de Cervantès',
    unverified: true,
  },
  {
    id: 'lit-1984',
    theme: 'litterature',
    question: 'Qui a écrit 1984 ?',
    answer: 'George Orwell',
    elaboration:
      'Publié en 1949, le roman donne au français des mots courants comme « novlangue » et « Big Brother ».',
    unverified: true,
  },
  {
    id: 'lit-petit-prince',
    theme: 'litterature',
    question: 'Qui a écrit Le Petit Prince ?',
    answer: 'Antoine de Saint-Exupéry',
    unverified: true,
  },
  {
    id: 'lit-bovary',
    theme: 'litterature',
    question: 'Qui a écrit Madame Bovary ?',
    answer: 'Gustave Flaubert',
    elaboration:
      'Le roman valut à son auteur un procès pour outrage aux bonnes mœurs, dont il sortit acquitté.',
    unverified: true,
  },

  // ── Institutions ──────────────────────────────────────────────────────────
  {
    id: 'inst-quinquennat',
    theme: 'institutions',
    question: 'Quelle est la durée du mandat présidentiel en France ?',
    answer: 'Cinq ans',
    hint: 'On parle de « quinquennat » depuis le début des années 2000.',
    unverified: true,
  },
  {
    id: 'inst-devise-fr',
    theme: 'institutions',
    question: 'Quelle est la devise de la République française ?',
    answer: 'Liberté, Égalité, Fraternité',
    unverified: true,
  },
  {
    id: 'inst-ue-membres',
    theme: 'institutions',
    question: "Combien d'États membres compte l'Union européenne depuis le Brexit ?",
    answer: '27',
    elaboration: "Le Royaume-Uni s'est retiré en 2020, faisant passer l'Union de 28 à 27 membres.",
    unverified: true,
  },
  {
    id: 'inst-parlement-ue',
    theme: 'institutions',
    question: 'Où se trouve le siège officiel du Parlement européen ?',
    answer: 'Strasbourg',
    hint: "Ce n'est pas la ville où siègent ses commissions.",
    elaboration:
      "Les sessions plénières se tiennent à Strasbourg, siège fixé par les traités, tandis qu'une grande partie du travail parlementaire se fait à Bruxelles.",
    unverified: true,
  },
  {
    id: 'inst-conseil-securite',
    theme: 'institutions',
    question: "Quel organe de l'ONU compte cinq membres permanents disposant d'un droit de veto ?",
    answer: 'Le Conseil de sécurité',
    elaboration:
      'Chine, États-Unis, France, Royaume-Uni et Russie. Un seul veto suffit à bloquer une résolution.',
    unverified: true,
  },
]
