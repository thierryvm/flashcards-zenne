# Repères

Des flashcards de culture générale, pensées pour les gens qui mémorisent
difficilement.

Le nom dit le programme : la culture générale, c'est _avoir des repères_. Et un
repère, c'est un point fixe qui sert à s'orienter.

**→ [Essayer maintenant](https://thierryvm.github.io/reperes/)** — rien à
installer, rien à créer. Ça marche hors ligne une fois la page ouverte, et ça
s'installe comme une application depuis le menu du navigateur.

## Ce que fait l'application

- **Répétition espacée avec FSRS.** Chaque carte revient au moment où vous êtes
  sur le point de l'oublier, pas avant, pas après.
- **Rappel actif.** La réponse reste cachée jusqu'à ce que vous ayez cherché.
- **Thèmes entrelacés.** Une séance mélange histoire, sciences et arts plutôt
  que d'enchaîner un thème entier. C'est moins confortable, et ça retient mieux.
- **Une aide graduée, pas un seul indice.** Trois niveaux, ouverts un par un et
  seulement si vous le demandez : d'abord _de quoi on parle_, puis l'indice
  rédigé, enfin la forme de la réponse — « 2 mots : 9 lettres commençant par A,
  7 lettres commençant par F. » Un indice unique ne sert qu'à celui qui sait
  déjà presque ; c'est le premier niveau qui manquait.
- **Demander de l'aide est l'action principale.** Sur l'écran de question,
  c'est « Aidez-moi » qui est mis en avant, pas « Afficher la réponse ». Et les
  quatre notes ne sont pas un feu tricolore : une seule teinte, quatre
  intensités, la plus visible étant « À revoir ». Dire qu'on ne savait pas est
  le geste le plus facile de l'écran.
- **« Pourquoi ? »** Après la réponse, un champ libre pour reformuler avec vos
  mots — et votre explication vous est **réaffichée à la révision suivante**.
  Un fait relié à quelque chose tient mieux qu'un fait isolé.
- **Un tableau de bord.** Progression par thème, rétention estimée, et la charge
  des sept prochains jours.
- **Séances courtes, à fin visible.** Douze cartes maximum, aucun chronomètre,
  aucune série à ne pas briser.

## Vie privée

Tout reste sur votre appareil, dans le stockage local du navigateur. Pas de
compte, pas de serveur, aucune donnée envoyée nulle part.

## Chaque carte porte sa source

Les 48 cartes renvoient à l'article de référence qui permet de les vérifier en
un clic. Le lien apparaît après la réponse, jamais avant. Aucune carte ne peut
être ajoutée sans source : le champ est obligatoire, et le code ne compile pas
sans lui.

Ce n'est pas de la prudence de façade : une application de répétition espacée
grave ce qu'elle répète. Une carte fausse est pire qu'une carte absente.

**La limite, dite franchement** : une source rend une carte _vérifiable_, elle
ne la prouve pas. C'est une garantie d'un autre ordre qu'une affirmation sans
référence, pas une garantie absolue.

Les 48 réponses ont été relues une fois contre leurs sources, le 10 septembre
2026, par quelqu'un qui ne les avait pas écrites : 45 tenaient, 3 ont été
corrigées. Une relecture par un lecteur — c'est mieux que rien et ce n'est pas
une certification.

## Accessibilité

L'application vise WCAG 2.2 AA dès le départ, pas en finition : tout est
atteignable au clavier, les contrastes sont testés à chaque intégration dans
les deux thèmes, les changements d'état sont annoncés, et aucune information
n'est portée par la couleur seule. La police de l'interface est Atkinson
Hyperlegible Next, dessinée pour les lecteurs malvoyants.

Une limite connue : le contraste réel à l'écran n'est vérifié que sur les
jetons de couleur, parce que l'outil d'audit automatique ne sait pas le mesurer
sans navigateur. Voir [AGENTS.md](./AGENTS.md).

## Lancer en local

Il faut [Node.js](https://nodejs.org/) 24 ou plus récent.

```bash
git clone https://github.com/thierryvm/reperes.git
cd reperes
npm install
npm run dev
```

Le serveur de développement affiche l'adresse à ouvrir, en général
`http://localhost:5173`.

Pour construire la version de production et la servir telle qu'elle est
déployée :

```bash
npm run build
npm run preview
```

Une astuce utile pour comparer deux captures d'écran : `?graine=42` fige
l'ordre des cartes d'une séance. La graine s'affiche alors dans le bandeau.

Pour contribuer — commandes, structure du code, conventions et décisions
techniques — voir [AGENTS.md](./AGENTS.md). La direction artistique a son propre
document, [DESIGN.md](./DESIGN.md), qui fait autorité sur les choix visuels.

## Licence

À définir.
