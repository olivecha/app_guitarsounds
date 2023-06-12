L'enveloppe d'un signal est définie comme le maximum de la valeur absolue du signal calculée pour plusieurs fenêtres le long du signal en temps. 

Le signal est divisé en fenêtres de quelques centaines d'échantillons (~20 ms) et pour chaque fenêtre le maximum de la valeur absolue est calculé. 

Typiquement les fenêtres sont chevauchées de la moitié de leur longueur afin de rendre l'enveloppe plus lisse. 

L'enveloppe du signal permet d'en retirer la composante oscillatoire et de visualiser clairement son amplitude dans le temps. 

Cependant, la largeur des fenêtres utilisée ne permet pas d'étudier clairement l'attaque qui se déroule à des échelles de temps plus petites. 

L'enveloppe logarithmique est disponible pour étudier plus précisément l'amplitude du signal autour de l'attaque.
