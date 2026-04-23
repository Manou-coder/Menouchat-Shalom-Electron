# menouchat-chalom

Louach zmanim (tableau des horaires de prières) pour la synagogue Menouchat Chalom, packagé en application desktop avec Electron.

## Prérequis

- Node.js 20+
- pnpm

Aucune dépendance système requise : la conversion des PDF en images se fait nativement dans Chromium (Electron), sans GraphicsMagick ni Ghostscript.

## Installation

```bash
pnpm install
```

## Lancement

```bash
# Serveur Express seul (développement rapide, sans fenêtre Electron)
npm run dev

# Application Electron complète
npm start
```

## Build & Release

Le workflow GitHub Actions (`build.yml`) se déclenche automatiquement à chaque merge dans `main` :

1. Crée un nouveau tag patch (`v1.x.y → v1.x.y+1`)
2. Build Linux (`.deb`) et Windows (`.zip`) en parallèle
3. Publie une GitHub Release avec les artefacts

Pour déclencher un build manuellement : Actions → *Build Cross-Platform* → *Run workflow*.
