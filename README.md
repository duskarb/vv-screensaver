# vv-screensaver

**A shared digital canvas that transforms idle moments into a living screensaver.**

vv-screensaver explores the boundary between a notes app and a passive display. Users place text fragments onto a canvas, move and resize them, and leave behind traces that remain as part of the environment.

## Concept

Instead of a traditional screensaver that only displays predetermined visuals, this project creates a space where user-generated information gradually becomes the visual experience.

The interface is built around simple actions:

- double click to create text
- drag to move objects
- scroll to change scale
- edit existing text
- drag objects into the trash area to remove them

## Features

- Real-time shared text canvas using Firebase Realtime Database
- Persistent text objects with position and size data
- Drag and drop interaction
- Editable floating text input
- Idle detection mode
- Light/dark themes
- Responsive web interface

## Interaction model

```text
User input
    ↓
Floating text objects
    ↓
Shared spatial memory
    ↓
Idle visual environment
```

## Tech

- React 19
- Vite
- Firebase Realtime Database
- CSS animations
- Progressive Web App setup

## Run locally

```bash
npm install
npm run dev
```

## Deployment

Build:

```bash
npm run build
```

Deploy:

```bash
npm run deploy
```

## Status

Experimental interaction prototype exploring how everyday text input can become an ambient digital artifact.
