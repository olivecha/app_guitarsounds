# Analyse comparative de sons de guitare — V 3.0

## Lancer l'application localement

L'application utilise des modules ES (JavaScript moderne) qui **ne fonctionnent pas** quand
`index.html` est ouvert directement depuis le système de fichiers (`file://`).
Il faut la servir via HTTP :

```bash
cd static_app
python3 -m http.server 8080
# puis ouvrir http://localhost:8080 dans le navigateur
```

## Déploiement sur GitHub Pages

Pointer GitHub Pages sur le dossier `static_app/` de la branche `main`.
Aucune étape de compilation n'est requise — les fichiers sont servis tels quels.
