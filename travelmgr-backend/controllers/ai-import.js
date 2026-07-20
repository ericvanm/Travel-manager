const router = require('express').Router()
const multer = require('multer')
const { Trip, Stage, Activity, ActivityType, Country } = require('../models/DBmodels')

// Configuration upload
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 10,
    fieldSize: 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain']
    cb(null, allowedTypes.includes(file.mimetype))
  }
})

// Extraction de texte selon le type de fichier
const extractText = async (file) => {
  try {
    if (file.mimetype === 'application/pdf') {
      // PDF parsing temporairement désactivé - retourner texte simulé
      return 'Réservation Vol AF1234 Paris-New York 15/03/2024 14:30 - Terminal 2E'
    } else if (file.mimetype.startsWith('image/')) {
      // OCR temporairement désactivé - retourner texte simulé
      return 'Réservation extraite d\'une image - OCR à implémenter'
    } else if (file.mimetype === 'text/plain') {
      return file.buffer.toString('utf-8')
    }
    return ''
  } catch (error) {
    throw new Error(`Erreur extraction: ${error.message}`)
  }
}

// Agent IA pour analyser le texte
const analyzeWithAI = async (text, tripId) => {
  const { analyzeReservationText } = require('../utils/ai-service')
  
  // Analyse IA du texte
  const analysis = await analyzeReservationText(text)

  // Rechercher des activités similaires existantes
  if (tripId) {
    const existingActivities = await Activity.findAll({
      include: [
        { model: ActivityType },
        { 
          model: Stage, 
          where: { tripId },
          required: true
        }
      ]
    })

    // Logique de correspondance pour chaque activité détectée
    analysis.potentialMatches = []
    
    analysis.detectedActivities.forEach(detected => {
      const matches = existingActivities
        .filter(activity => {
          if (!activity.startDateTime || !detected.startDateTime) return false
          
          const activityDate = new Date(activity.startDateTime)
          const detectedDate = new Date(detected.startDateTime)
          const daysDiff = Math.abs(activityDate - detectedDate) / (1000 * 60 * 60 * 24)
          
          // Correspondance par date (même jour ou jour adjacent)
          const dateMatch = daysDiff <= 1
          
          // Correspondance par nom (similarité basique)
          const nameMatch = activity.name && detected.name && 
            activity.name.toLowerCase().includes(detected.name.toLowerCase().substring(0, 10))
          
          return dateMatch || nameMatch
        })
        .map(activity => ({
          activityId: activity.id,
          name: activity.name,
          startDateTime: activity.startDateTime,
          similarity: 0.8,
          suggestedAction: 'update',
          detectedActivity: detected
        }))
      
      analysis.potentialMatches.push(...matches)
    })
  }

  return analysis
}

// Générer les actions proposées
const generateActionPlan = (analysis) => {
  const actions = []

  analysis.detectedActivities.forEach((detected, index) => {
    const matches = analysis.potentialMatches?.filter(m => 
      m.suggestedAction === 'update'
    ) || []

    if (matches.length > 0) {
      // Mise à jour d'activité existante
      const bestMatch = matches[0]
      actions.push({
        type: 'update',
        activityId: bestMatch.activityId,
        existingActivity: {
          name: bestMatch.name,
          startDateTime: bestMatch.startDateTime
        },
        proposedChanges: {
          name: detected.name,
          startDateTime: detected.startDateTime,
          endDateTime: detected.endDateTime,
          ...detected.details
        },
        reason: `Activité similaire trouvée (${Math.round(bestMatch.similarity * 100)}% de correspondance)`
      })
    } else {
      // Création nouvelle activité
      actions.push({
        type: 'create',
        newActivity: {
          name: detected.name,
          startDateTime: detected.startDateTime,
          endDateTime: detected.endDateTime,
          activityTypeId: getActivityTypeId(detected.type),
          ...detected.details
        },
        reason: 'Nouvelle activité détectée'
      })
    }
  })

  return actions
}

// Mapper type d'activité vers ID
const getActivityTypeId = (type) => {
  const typeMap = {
    'flight': 6,
    'hotel': 7,
    'car_rental': 8,
    'restaurant': 2,
    'activity': 1
  }
  return typeMap[type] || 1
}

// POST /ai-import/analyze - Analyser un document
router.post('/analyze', upload.single('document'), async (req, res) => {
  try {
    const { tripId } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ error: 'Fichier requis' })
    }

    // Extraction du texte
    const extractedText = await extractText(file)
    
    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'Aucun texte extrait du document' })
    }

    // Analyse IA
    const analysis = await analyzeWithAI(extractedText, tripId)
    
    // Génération du plan d'action
    const actionPlan = generateActionPlan(analysis)

    res.json({
      success: true,
      extractedText,
      analysis: {
        detectedActivities: analysis.detectedActivities,
        extractedInfo: analysis.extractedInfo
      },
      actionPlan,
      requiresConfirmation: true
    })

  } catch (error) {
    console.error('Erreur analyse IA:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /ai-import/execute - Exécuter les actions confirmées
router.post('/execute', async (req, res) => {
  try {
    const { tripId, confirmedActions } = req.body

    if (!confirmedActions || !Array.isArray(confirmedActions)) {
      return res.status(400).json({ error: 'Actions confirmées requises' })
    }

    const results = []

    for (const action of confirmedActions) {
      if (action.type === 'create') {
        // Créer nouvelle activité
        // Trouver ou créer un stage pour cette activité
        let stage = await Stage.findOne({ 
          where: { tripId },
          order: [['startDate', 'ASC']]
        })
        
        if (!stage) {
          // Créer un stage par défaut
          const defaultCountry = await Country.findOne({ where: { code: 'FR' } })
          stage = await Stage.create({
            tripId,
            countryId: defaultCountry?.id || 1,
            name: 'Stage par défaut',
            startDate: new Date()
          })
        }
        
        const newActivity = await Activity.create({
          ...action.newActivity,
          stageId: stage.id
        })
        results.push({
          type: 'created',
          activityId: newActivity.id,
          name: newActivity.name
        })
      } else if (action.type === 'update') {
        // Mettre à jour activité existante
        const activity = await Activity.findByPk(action.activityId)
        if (activity) {
          await activity.update(action.proposedChanges)
          results.push({
            type: 'updated',
            activityId: activity.id,
            name: activity.name
          })
        }
      }
    }

    res.json({
      success: true,
      results,
      message: `${results.length} activité(s) traitée(s) avec succès`
    })

  } catch (error) {
    console.error('Erreur exécution:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router