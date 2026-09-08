# Repères

Des flashcards de culture générale, pensées pour les gens qui mémorisent
difficilement.

Le nom dit le programme : la culture générale, c'est _avoir des repères_. Et un
repère, c'est un point fixe qui sert à s'orienter.

## Ce que fait l'application

- **Répétition espacée avec FSRS.** Chaque carte revient au moment où vous êtes
  sur le point de l'oublier, pas avant, pas après.
- **Rappel actif.** La réponse reste cachée jusqu'à ce que vous ayez cherché.
- **Thèmes entrelacés.** Une séance mélange histoire, sciences et arts plutôt
  que d'enchaîner un thème entier. C'est moins confortable, et ça retient mieux.
- **Un indice plutôt qu'un échec.** Un bouton donne un amorçage partiel, qui
  restreint la recherche sans livrer la réponse.
- **« Pourquoi ? »** Après la réponse, un champ libre pour reformuler avec vos
  mots. Un fait relié à quelque chose tient mieux qu'un fait isolé.
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

## Développement

```bash
npm install
npm run dev
```

Voir [AGENTS.md](./AGENTS.md) pour les commandes, la structure et les décisions
techniques.

## Licence

À définir.
