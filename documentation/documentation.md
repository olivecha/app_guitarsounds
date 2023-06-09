# Utilisation du logiciel

L'application `guitarsounds` a été conçue pour analyser des sons de guitare comprenant une seule note. Les analyses peuvent se faire sur un seul son ou de façon comparative. Les sons à être analyser doivent d'abord être chargés dans le logiciel. Ensuite, diverses analyses produisant des graphiques peuvent être faites sur les sons. Enfin, les analyses pertinentes à l'utilisateur peuvent être sélectionnées afin de générer automatiquement un rapport au format Word. 

# Téléversement et enregistrement des sons

Dans l'onglet "Ajouter des sons", l'utilisateur peut soit téléverser des sons dans un format arbitraire, soit les enregistrer à même son navigateur web. 
Il est important de noter que la fonction d'enregistrement permet seulement d'enregistrer pendant 4 secondes. 
Cette durée devrait être amplement suffisante pour bien capturer l'attaque et la descente d'une note jouée sur une guitare. 

Lorsque les sons sont chargés par le logiciel, ils sont conditionnés, d'abord en tronquant la partie du son avant l'attaque et ensuite en retirant la partie se trouvant environ 3-4 secondes après l'attaque, en fonction de la fréquence fondamentale du son. 
Les sons sont aussi rééchantillonés avec une fréquence de coupure de 22050 Hz, ce qui permet de reproduire fidèlement des fréquences jusqu'à 10 kHz, soit la limite du spectre pouvant être entendue par l'oreille humaine. 

Afin de s'assurer que le processus de condionnement s'est bien déroulé, l'utilisateur peut écouter les sons après les avoirs enregistrés ou téléchargés, il est important de porter attention aux bruits ambiants qui pourraient s'être retrouvés dans l'enregistrement, ou à un double impact lorsque la corde a été pincée.

# Analyse des sons 

Cette section décrit les différentes analyses qui peuvent être faites sur un son unique, un duo de sons ou un nombre arbitraire de sons. 
Certaines analyses s'appuient sur des concepts plus avancés de l'analyse numérique de signaux qui sont décrits dans la section théorie.

## Théorie de l'analyse des signaux

### Décomposition en bandes de fréquences

### Transformée de Fourier

### Échelle temporelle logarithmique

## Analyse d'un seul son

## Analyse comparative de deux sons

## Analyse comparative de plusieurs sons 

# Génération d'un rapport 

# Documentation additionnelle

Pour aller plus loin, l'utilisateur peut se référer à la documentation du [module d'analyse](https://olivecha.github.io/guitarsounds/guitarsounds.html), et à l'[article scientifique](https://joss.theoj.org/papers/10.21105/joss.04878) publié décrivant le fonctionnement de l'outil d'analyse de sons.
