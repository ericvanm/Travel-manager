import React, { useState, useRef } from 'react'
import { Activity } from '../types'

interface AIAnalysisResult {
  extractedText: string
  analysis: {
    detectedActivities: DetectedActivity[]
    extractedInfo: {
      dates: string[]
      locations: string[]
      reservationNumbers: string[]
    }
  }
  actionPlan: ActionPlan[]
  requiresConfirmation: boolean
}

interface DetectedActivity {
  type: string
  name: string
  startDateTime: string
  endDateTime: string
  details: Record<string, any>
  confidence: number
}

interface ActionPlan {
  type: 'create' | 'update'
  activityId?: number
  existingActivity?: Partial<Activity>
  proposedChanges?: Partial<Activity>
  newActivity?: Partial<Activity>
  reason: string
}

interface Props {
  tripId: number
  onImportComplete: () => void
}

export const AIDocumentImport: React.FC<Props> = ({ tripId, onImportComplete }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [selectedActions, setSelectedActions] = useState<number[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file) return

    setIsAnalyzing(true)
    setAnalysisResult(null)

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
    try {
      console.log('Uploading file:', file.name, file.type, file.size)
      const formData = new FormData()
      formData.append('document', file)
      formData.append('tripId', tripId.toString())
      console.log('FormData created, sending to API...')

      const response = await fetch(`${backendUrl}/ai-import/analyze`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('API Response:', result)
      setAnalysisResult(result)
      setSelectedActions(result.actionPlan.map((_: any, index: number) => index))
    } catch (error) {
      console.error('Erreur analyse:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      alert(`Erreur lors de l'analyse du document: ${errorMessage}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const toggleActionSelection = (index: number) => {
    setSelectedActions(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const executeActions = async () => {
    if (!analysisResult || selectedActions.length === 0) return

    setIsExecuting(true)

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
    try {
      const confirmedActions = selectedActions.map(index => analysisResult.actionPlan[index])

      const response = await fetch(`${backendUrl}/ai-import/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          confirmedActions
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'exécution')
      }

      const result = await response.json()
      alert(`${result.results.length} activité(s) traitée(s) avec succès`)
      
      setAnalysisResult(null)
      setSelectedActions([])
      onImportComplete()
    } catch (error) {
      console.error('Erreur exécution:', error)
      alert('Erreur lors de l\'exécution des actions')
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="ai-document-import">
      <h3>Import Documentaire IA</h3>
      
      {/* Zone de dépôt */}
      <div 
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        {isAnalyzing ? (
          <div>🔄 Analyse en cours...</div>
        ) : (
          <div>
            📄 Glissez un fichier ici ou cliquez pour sélectionner
            <br />
            <small>PDF, Images (JPG, PNG), Texte</small>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.txt"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        style={{ display: 'none' }}
      />

      {/* Résultats de l'analyse */}
      {analysisResult && (
        <div className="analysis-results">
          <h4>Analyse du document</h4>
          
          {/* Texte extrait */}
          <details style={{ marginBottom: '20px' }}>
            <summary>Texte extrait</summary>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '4px',
              fontSize: '12px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {analysisResult.extractedText}
            </pre>
          </details>

          {/* Informations détectées */}
          <div style={{ marginBottom: '20px' }}>
            <h5>Informations détectées:</h5>
            <ul>
              <li>Dates: {analysisResult.analysis.extractedInfo.dates.join(', ')}</li>
              <li>Lieux: {analysisResult.analysis.extractedInfo.locations.join(', ')}</li>
              <li>Réservations: {analysisResult.analysis.extractedInfo.reservationNumbers.join(', ')}</li>
            </ul>
          </div>

          {/* Plan d'action */}
          <div>
            <h4>Actions proposées</h4>
            <p>Sélectionnez les actions à exécuter:</p>
            
            {analysisResult.actionPlan.map((action, index) => (
              <div 
                key={index}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '10px',
                  backgroundColor: selectedActions.includes(index) ? '#e8f5e8' : '#f9f9f9'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={selectedActions.includes(index)}
                    onChange={() => toggleActionSelection(index)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      {action.type === 'create' ? '🆕 Créer' : '✏️ Mettre à jour'}: {action.newActivity?.name || action.existingActivity?.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                      {action.reason}
                    </div>
                    
                    {action.type === 'update' && (
                      <div style={{ fontSize: '12px' }}>
                        <div><strong>Existant:</strong> {action.existingActivity?.name}</div>
                        <div><strong>Nouveau:</strong> {action.proposedChanges?.name}</div>
                      </div>
                    )}
                    
                    {action.type === 'create' && (
                      <div style={{ fontSize: '12px' }}>
                        <div><strong>Dates:</strong> {new Date(action.newActivity?.startDateTime || '').toLocaleString()}</div>
                        {action.newActivity?.endDateTime && (
                          <div><strong>Fin:</strong> {new Date(action.newActivity.endDateTime).toLocaleString()}</div>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            ))}

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                onClick={executeActions}
                disabled={selectedActions.length === 0 || isExecuting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedActions.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {isExecuting ? 'Exécution...' : `Exécuter ${selectedActions.length} action(s)`}
              </button>
              
              <button
                onClick={() => {
                  setAnalysisResult(null)
                  setSelectedActions([])
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}