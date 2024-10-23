# Application guitarsounds
Ce répertoire contient le code qui permet de déployer l'outil d'analyse [guitarsounds](https://github.com/olivecha/guitarsounds) sur la plateforme web [streamlit](https://streamlit.io/).

L'application est disponible sous le lien suivant hébergé par Streamlit: [App Guitarsounds](https://olivecha-app-guitarsounds-app-kkpo80.streamlit.app/).

## Installation (Développement)

Afin de contribuer à l'application et tester des modifications localement, il suffit d'installer les packages python nécessaires au développement. 
Ceux-cis sont indiqués dans le fichier `env_requirements.txt` et peuvent être directement installés avec `pip`:

```
pip install -r env_requirements.txt
```

Par la suite, l'application peut être lancée localement avec l'outil de ligne de commande de `streamlit`:

```
streamlit run app.py
```

L'application devrait s'ouvrir dans une fenêtre de navigateur web. 

## Tests

Un test minimal est inclu dans le répertoire de l'applicationc et permet de valider l'environnement de développement ainsi que la validité du code de l'application. 
Les différentes fonctionnalités ne sont pas couvertes par ce test, car l'input\output n'est pas accessible à travers l'interface de test de `streamlit`. 

L'application peut être testée en installant d'abord `pytest`:

```
pip install pytest
```

Et puis en lançant l'outil de ligne de commande `pytest` dans le répertoire du projet

```
pytest
```




