import React from 'react'
import { AIDocumentImport } from './AIDocumentImport'

interface Props {
  tripId: number
  onImportComplete: () => void
}

export const TripImportPage: React.FC<Props> = ({ tripId, onImportComplete }) => {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Import de Documents</h2>
      <p>
        Importez vos documents de réservation (PDF, images, texte) et laissez l'IA 
        analyser et proposer des actions pour mettre à jour votre voyage.
      </p>
      
      <AIDocumentImport 
        tripId={tripId} 
        onImportComplete={onImportComplete}
      />
      
      <div style={{ marginTop: '40px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h4>Types de documents supportés :</h4>
        <ul>
          <li>📄 <strong>PDF</strong> : Confirmations de réservation, billets électroniques</li>
          <li>📷 <strong>Images</strong> : Photos de documents, captures d'écran</li>
          <li>📝 <strong>Texte</strong> : Emails de confirmation, notes</li>
        </ul>
        
        <h4>Que fait l'IA :</h4>
        <ul>
          <li>🔍 Extrait automatiquement les informations (dates, lieux, numéros)</li>
          <li>🎯 Identifie le type d'activité (vol, hôtel, restaurant, etc.)</li>
          <li>🔄 Propose de mettre à jour les activités existantes ou d'en créer de nouvelles</li>
          <li>✅ Vous demande confirmation avant toute modification</li>
        </ul>
      </div>
    </div>
  )
}