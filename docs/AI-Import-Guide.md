# Guide d'Import Documentaire IA

## Vue d'ensemble

Le système d'import documentaire IA permet aux utilisateurs de charger des documents de réservation (PDF, images, texte) et d'utiliser l'intelligence artificielle pour extraire automatiquement les informations et proposer des actions sur les activités du voyage.

## Fonctionnalités

### 1. **Upload de Documents**
- **Drag & Drop** : Glissez-déposez vos fichiers
- **Sélection manuelle** : Cliquez pour ouvrir l'explorateur de fichiers
- **Formats supportés** : PDF, JPG, PNG, TXT

### 2. **Extraction Intelligente**
- **PDF** : Extraction de texte avec `pdf-parse`
- **Images** : OCR avec `Tesseract.js` (français)
- **Texte** : Lecture directe

### 3. **Analyse IA**
- **Détection automatique** : Types d'activités, dates, lieux
- **Correspondance intelligente** : Trouve les activités existantes similaires
- **Deux modes** :
  - **OpenAI** : Analyse avancée (nécessite clé API)
  - **Patterns** : Analyse par expressions régulières (fallback)

### 4. **Actions Proposées**
- **Création** : Nouvelles activités détectées
- **Mise à jour** : Activités existantes à compléter
- **Validation utilisateur** : Confirmation avant exécution

## Installation

### Backend

```bash
cd "travelmgr-backend"
npm install multer pdf-parse tesseract.js
```

### Variables d'environnement

```env
# Optionnel : pour utiliser OpenAI
USE_OPENAI=true
OPENAI_API_KEY=your-api-key-here
```

### Frontend

Le composant `AIDocumentImport` est prêt à utiliser :

```tsx
import { AIDocumentImport } from './components/AIDocumentImport'

// Dans votre composant
<AIDocumentImport 
  tripId={currentTripId} 
  onImportComplete={() => refreshActivities()}
/>
```

## API Endpoints

### POST `/api/ai-import/analyze`
Analyse un document uploadé

**Body (FormData):**
- `document` : Fichier à analyser
- `tripId` : ID du voyage

**Response:**
```json
{
  "success": true,
  "extractedText": "...",
  "analysis": {
    "detectedActivities": [...],
    "extractedInfo": {...}
  },
  "actionPlan": [...],
  "requiresConfirmation": true
}
```

### POST `/api/ai-import/execute`
Exécute les actions confirmées

**Body:**
```json
{
  "tripId": 123,
  "confirmedActions": [...]
}
```

## Flux d'utilisation

1. **Upload** → L'utilisateur dépose un fichier
2. **Extraction** → Le système extrait le texte
3. **Analyse IA** → Détection des informations structurées
4. **Correspondance** → Recherche d'activités existantes similaires
5. **Proposition** → Plan d'action avec créations/mises à jour
6. **Validation** → L'utilisateur sélectionne les actions
7. **Exécution** → Mise à jour de la base de données

## Exemples de documents supportés

### Confirmation de vol
```
Vol Air France AF1234
Paris CDG → New York JFK
Date: 15/03/2024
Départ: 14:30 - Terminal 2E
Arrivée: 22:45 - Terminal 4
```

### Réservation d'hôtel
```
Hôtel Marriott Times Square
Check-in: 16/03/2024 15:00
Check-out: 20/03/2024 11:00
123 Broadway, New York, NY
Confirmation: HTL789456
```

### Email de confirmation
```
Votre réservation restaurant
Le Bernardin - New York
Date: 17/03/2024 19:30
155 West 51st Street
Réservation: RES123456
```

## Personnalisation

### Ajouter un nouveau type d'activité

1. **Backend** : Modifier `getActivityTypeId()` dans `ai-import.js`
2. **IA Service** : Ajouter des patterns dans `ai-service.js`
3. **Frontend** : Mettre à jour les types TypeScript

### Intégrer une autre API IA

Modifier `utils/ai-service.js` pour utiliser Claude, Gemini, ou autre :

```javascript
const analyzeWithClaude = async (text) => {
  // Implémentation Claude
}
```

## Sécurité

- **Validation des fichiers** : Types MIME vérifiés
- **Limite de taille** : 10MB maximum
- **Authentification** : Sessions utilisateur requises
- **Validation des données** : Vérification avant insertion DB

## Performance

- **OCR** : Traitement asynchrone pour les images
- **Cache** : Possibilité de mettre en cache les résultats d'analyse
- **Batch processing** : Traitement multiple de fichiers (future amélioration)

## Dépannage

### Erreur d'extraction PDF
- Vérifier que le PDF contient du texte (pas seulement des images)
- Pour les PDF scannés, convertir en image et utiliser l'OCR

### OCR ne fonctionne pas
- Vérifier la qualité de l'image
- S'assurer que Tesseract.js est correctement installé
- Tester avec des images en haute résolution

### IA ne détecte rien
- Vérifier le format du texte extrait
- Ajuster les patterns regex dans `ai-service.js`
- Considérer l'utilisation d'OpenAI pour une meilleure précision