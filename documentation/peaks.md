Le graphique des pics n'inclut pas plus d'information que le graphique du spectre seul. 
La seule différence est que les pics sont soulignés par des points. 

Cette analyse permet par contre de valider que l'algorithme a bien réussi à détecter les pics dans le son analysé. 

En effet, la détection des pics dans le spectre d'un son ou d'un signal n'est pas triviale. 
Un algorithme a été développé spécifiquement pour le présent projet. 
Cet algorithme fais entre autre l'assomption que le signal est harmonique, et que l'amplitude des pics dimminue avec la fréquence. 
Cela est typiquement le cas pour les sons de guitare et d'instruments à corde. 

Certaines fonctionnalitées de l'outil d'analyse reposent sur la détéction des pics, comme par exemple le calcul de la fréquence fondamentale pour déterminer à quelle longueur tronquer le signal. 
Par conséquent, si vous rencontrer des difficultées, ou des messages d'erreur, il peut être pertinant de visualiser les pics du son analysé afin de s'assurer qu'ils sont détectés convenablement.

Il est possible par exemple, que l'analyse de sons d'impacts rende la détection des pics moins précise, ce qui pourrait entrainer des erreurs.
