# Utilisation du logiciel

L'application `guitarsounds` a été conçue pour analyser des sons de guitare comprenant une seule note. Les analyses peuvent se faire sur un seul son ou de façon comparative. Les sons à être analyser doivent d'abord être chargés dans le logiciel. Ensuite, diverses analyses produisant des graphiques peuvent être faites sur les sons. Enfin, les analyses pertinentes à l'utilisateur peuvent être sélectionnées afin de générer automatiquement un rapport au format Word. 

## Téléversement et enregistrement des sons

Dans l'onglet "Ajouter des sons", l'utilisateur peut soit téléverser des sons dans un format arbitraire, soit les enregistrer à même son navigateur web. 

Tous les formats de fichiers sonores sont compatibles avec l'application, toutefois le format `.m4a` a été développé par Apple et sa lecture peut entrainer des problèmes.
Si les utilisateurs désirant analyser des sons provenants de fichiers `.m4a` rencontrent des problèmes de chargement il leur est recommandé de convertir les sons en format `.wav`.

L'outil d'enregistrement sauvegarde temporairement le son enregistré en format `.ogg`, un format libre de droit dérivé du format `.mp3`. 
Il ne s'agit donc pas d'un format complètement "loss less", et il est donc recommandé aux utilisateurs désirant analyser des sons avec une qualité maximale de les enregistrer avec un format "loss less" tel que `.wav`.

Lorsque les sons sont chargés par le logiciel, ils sont conditionnés, d'abord en tronquant la partie du son avant l'attaque et ensuite en retirant la partie se trouvant environ 3-4 secondes après l'attaque, en fonction de la fréquence fondamentale du son. 
Les sons sont aussi rééchantillonés avec une fréquence de coupure de 22050 Hz, ce qui permet de reproduire fidèlement des fréquences jusqu'à 10 kHz, soit la limite du spectre pouvant être entendue par l'oreille humaine. 

Afin de s'assurer que le processus de condionnement s'est bien déroulé, l'utilisateur peut écouter les sons après les avoirs enregistrés ou téléchargés, il est important de porter attention aux bruits ambiants qui pourraient s'être retrouvés dans l'enregistrement, ou à un double impact lorsque la corde a été pincée.

## Analyse des sons 

Une fois les sons téléchargés, l'utilisateur peut les analyser dans l'onglets "Analyser À Comparer des sons". 
Les analyses disponibles dépendent du nombre de sons téléchargés. 
Certaines son disponibles seulement pour un son unique, d'autres seulement deux sons que l'on veut comparer et finalement certaines des analyses sont disponibles pour un nombre arbitraire de sons. 

**Les différentes analyses sont documentées, leur documentation est accessible avec l'icone :question:.**

## Documentation additionnelle

Pour aller plus loin, l'utilisateur peut se référer à la documentation du [module d'analyse](https://olivecha.github.io/guitarsounds/guitarsounds.html).
Celui-ci contient toutes les fonctionnalitées d'analyse utilisées dans l'application.
Un [article scientifique](https://joss.theoj.org/papers/10.21105/joss.04878) décrivant le fonctionnement de l'outil d'analyse de sons a aussi été publié.
