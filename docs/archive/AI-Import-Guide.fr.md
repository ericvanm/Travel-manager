# Guide d'Import Documentaire IA

## Vue d'ensemble

Le syst├¿me d'import documentaire IA permet aux utilisateurs de charger des documents de r├®servation (PDF, images, texte) et d'utiliser l'intelligence artificielle pour extraire automatiquement les informations et proposer des actions sur les activit├®s du voyage.

## Fonctionnalit├®s

### 1. **Upload de Documents**
- **Drag & Drop** : Glissez-d├®posez vos fichiers
- **S├®lection manuelle** : Cliquez pour ouvrir l'explorateur de fichiers
- **Formats support├®s** : PDF, JPG, PNG, TXT

### 2. **Extraction Intelligente**
- **PDF** : Extraction de texte avec `pdf-parse`
- **Images** : OCR avec `Tesseract.js` (fran├ºais)
- **Texte** : Lecture directe

### 3. **Analyse IA**
- **D├®tection automatique** : Types d'activit├®s, dates, lieux
- **Correspondance intelligente** : Trouve les activit├®s existantes similaires
- **Deux modes** :
  - **OpenAI** : Analyse avanc├®e (n├®cessite cl├® API)
  - **Patterns** : Analyse par expressions r├®guli├¿res (fallback)

### 4. **Actions Propos├®es**
- **Cr├®ation** : Nouvelles activit├®s d├®tect├®es
- **Mise ├á jour** : Activit├®s existantes ├á compl├®ter
- **Validation utilisateur** : Confirmation avant ex├®cution

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

Le composant `AIDocumentImport` est pr├¬t ├á utiliser :

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
Analyse un document upload├®

**Body (FormData):**
- `document` : Fichier ├á analyser
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
Ex├®cute les actions confirm├®es

**Body:**
```json
{
  "tripId": 123,
  "confirmedActions": [...]
}
```

## Flux d'utilisation

1. **Upload** ÔåÆ L'utilisateur d├®pose un fichier
2. **Extraction** ÔåÆ Le syst├¿me extrait le texte
3. **Analyse IA** ÔåÆ D├®tection des informations structur├®es
4. **Correspondance** ÔåÆ Recherche d'activit├®s existantes similaires
5. **Proposition** ÔåÆ Plan d'action avec cr├®ations/mises ├á jour
6. **Validation** ÔåÆ L'utilisateur s├®lectionne les actions
7. **Ex├®cution** ÔåÆ Mise ├á jour de la base de donn├®es

## Exemples de documents support├®s

### Confirmation de vol
```
Vol Air France AF1234
Paris CDG ÔåÆ New York JFK
Date: 15/03/2024
D├®part: 14:30 - Terminal 2E
Arriv├®e: 22:45 - Terminal 4
```

### R├®servation d'h├┤tel
```
H├┤tel Marriott Times Square
Check-in: 16/03/2024 15:00
Check-out: 20/03/2024 11:00
123 Broadway, New York, NY
Confirmation: HTL789456
```

### Email de confirmation
```
Votre r├®servation restaurant
Le Bernardin - New York
Date: 17/03/2024 19:30
155 West 51st Street
R├®servation: RES123456
```

## Personnalisation

### Ajouter un nouveau type d'activit├®

1. **Backend** : Modifier `getActivityTypeId()` dans `ai-import.js`
2. **IA Service** : Ajouter des patterns dans `ai-service.js`
3. **Frontend** : Mettre ├á jour les types TypeScript

### Int├®grer une autre API IA

Modifier `utils/ai-service.js` pour utiliser Claude, Gemini, ou autre :

```javascript
const analyzeWithClaude = async (text) => {
  // Impl├®mentation Claude
}
```

## S├®curit├®

- **Validation des fichiers** : Types MIME v├®rifi├®s
- **Limite de taille** : 10MB maximum
- **Authentification** : Sessions utilisateur requises
- **Validation des donn├®es** : V├®rification avant insertion DB

## Performance

- **OCR** : Traitement asynchrone pour les images
- **Cache** : Possibilit├® de mettre en cache les r├®sultats d'analyse
- **Batch processing** : Traitement multiple de fichiers (future am├®lioration)

## D├®pannage

### Erreur d'extraction PDF
- V├®rifier que le PDF contient du texte (pas seulement des images)
- Pour les PDF scann├®s, convertir en image et utiliser l'OCR

### OCR ne fonctionne pas
- V├®rifier la qualit├® de l'image
- S'assurer que Tesseract.js est correctement install├®
- Tester avec des images en haute r├®solution

### IA ne d├®tecte rien
- V├®rifier le format du texte extrait
- Ajuster les patterns regex dans `ai-service.js`
- Consid├®rer l'utilisation d'OpenAI pour une meilleure pr├®cision
