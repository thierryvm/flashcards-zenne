# Direction artistique — Repères

Validée par Thierry. Ce document a autorité sur les choix visuels :
en cas de doute, il tranche. Toute dérogation se justifie dans la PR.

---

## 1. Pour qui, et ce que ça impose

Des adultes qui veulent apprendre et **qui mémorisent mal**. Certains
fatiguent vite, certains lisent difficilement, certains ont déjà échoué
avec d'autres outils.

Trois conséquences non négociables :

**Calme, pas performance.** Aucun compteur de série, aucun chronomètre,
aucune célébration, aucune alerte rouge. L'anxiété dégrade le rappel :
un design qui stresse travaille contre sa propre fonction.

**Une chose à la fois.** Pendant l'étude, la carte _est_ l'interface.
Tout ce qui n'aide pas à répondre disparaît.

**Jamais infantilisant.** Pas d'emoji dans l'interface, pas de ton
encourageant forcé, pas de « Bravo ! ». Ce sont des adultes. On leur
parle comme à des adultes.

---

## 2. Typographie

Deux familles, chargées depuis Google Fonts.

| Rôle                | Police                         | Pourquoi                                                                                                                                                                                                      |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Questions, réponses | **Source Serif 4**             | Une serif se lit mieux sur un texte qu'on fixe. Elle donne du poids à la question — c'est l'objet central, pas un libellé d'interface.                                                                        |
| Tout le reste       | **Atkinson Hyperlegible Next** | Dessinée par le Braille Institute pour les lecteurs malvoyants : formes de lettres délibérément différenciées, `1 l I` et `0 O` non confondables. Ce n'est pas décoratif ici, c'est le sujet même du produit. |

**Échelle** — mobile d'abord, `rem`, base 16 px :

```
question       1.75rem / 1.25   Source Serif 4, 400
réponse        1.375rem / 1.4   Source Serif 4, 600
corps          1.0625rem / 1.6  Atkinson, 400
libellé        0.9375rem / 1.4  Atkinson, 600
mention        0.8125rem / 1.4  Atkinson, 400
```

Règles : jamais sous 0,8125 rem. Jamais de texte centré au-delà de deux
lignes. Longueur de ligne bornée à 60 caractères (`max-w-[34rem]`).
Chiffres en `font-variant-numeric: tabular-nums` partout où ils
s'alignent en colonne.

---

## 3. Couleur

Le fond n'est pas blanc. Un blanc pur fatigue et rappelle le formulaire
administratif ; un papier tiède rappelle le livre.

```
clair                          sombre
paper    #FBF9F5   papier      #14161A
raised   #FFFFFF   surface     #1C1F25
ink      #1A1A17   texte       #E8E6E1
muted    #6B665C   secondaire  #9A958A
line     #E2DDD2   filets      #2C3038
accent   #1D5C63   accent      #6FB3BA   ← un seul, rare
```

**Un seul accent, dépensé avec parcimonie** : l'action principale, les
liens, l'anneau de focus. S'il est partout, il ne signale plus rien.

### Les quatre notes — la décision la plus importante

**Pas de feu tricolore.** Rouge pour « À revoir » culpabilise, et le vert
récompense une réponse facile qui n'apprend rien. C'est exactement à
l'envers de la répétition espacée : c'est l'effort qui construit la
mémoire, pas la facilité.

Une seule teinte, quatre intensités décroissantes, distinguées d'abord
par le **libellé** et la **position**, jamais par la couleur seule :

```
À revoir     accent 100 %   ← la plus visible : c'est le bon choix quand on ne sait pas
Difficile    accent  70 %
Correct      accent  45 %
Facile       contour seul
```

Le message porté par la forme : dire qu'on ne savait pas est normal et
utile. Aucune note n'est un échec.

---

## 4. Espace et rythme

Échelle : `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Rien entre.

- marge d'écran : 20 px en mobile, 32 px au-delà de 640 px
- entre blocs sans lien : 32 px minimum
- dans un bloc : 12 ou 16 px
- cibles tactiles : 48 px de haut minimum, 12 px entre deux boutons

L'écran d'étude doit être **aéré au point de paraître vide**. Une carte,
beaucoup de blanc autour. Le vide n'est pas de la place perdue, c'est ce
qui permet de se concentrer.

---

## 5. Formes

- rayon : 8 px pour les blocs, 10 px pour les boutons. Rien de plus.
- **aucune ombre portée.** La hiérarchie vient du fond et du filet.
- filet 1 px `line` pour séparer, jamais pour encadrer par réflexe
- une carte n'est pas une boîte : sur l'écran d'étude, la question est
  posée sur le papier, sans conteneur

**Tout n'est pas une carte.** Bordure, remplissage et rayon signifient
« objet distinct ». Les distribuer partout aplatit la hiérarchie.

---

## 6. Mouvement

Presque rien. Une transition d'opacité de 120 ms à la révélation, c'est
tout. Aucun glissement, aucun rebond, aucune animation d'entrée.

`prefers-reduced-motion: reduce` supprime tout, sans exception.

---

## 7. Ton des textes

Sobre, direct, adulte. On dit ce qui se passe.

| Non                               | Oui                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| « Bravo ! Continuez comme ça 🎉 » | « Séance terminée. 12 cartes revues. »                                                                  |
| « Oups, une erreur ! »            | « La base de données n'a pas pu être lue. Vos données sont intactes ; réessayez ou rechargez la page. » |
| « Vous êtes en feu ! »            | _(rien)_                                                                                                |

Une erreur dit **ce qui a échoué** et **quoi faire**. Jamais d'excuse,
jamais de vague.

---

## 8. Vérification

Avant toute PR touchant à l'interface :

1. `./tools/shot.sh` en 390×844 **et** 1280×800
2. **regarder les deux captures**
3. vérifier : hiérarchie lisible, écran aéré, tailles distinctes,
   rien qui déborde à 390 px
4. refaire en mode sombre

Une capture non regardée ne compte pas.

---

## 9. Ce qui est interdit

- feu tricolore sur les notes
- emoji dans l'interface
- ombres portées
- plus d'un accent
- texte sous 0,8125 rem
- animation autre que l'opacité de révélation
- affichage d'un état d'erreur déguisé en état normal
