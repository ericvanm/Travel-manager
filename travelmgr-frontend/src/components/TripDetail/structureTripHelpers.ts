import { DuplicateActivity } from '../../types';

export const buildStructureConfirmMessage = (
  baseMessage: string,
  duplicateAnalysis: { count: number; duplicates: DuplicateActivity[] }
) => {
  if (duplicateAnalysis.count === 0) {
    return baseMessage;
  }

  let message = `${baseMessage}\n\n${duplicateAnalysis.count} doublons détectés :\n`;
  duplicateAnalysis.duplicates.slice(0, 5).forEach((dup, index) => {
    message += `${index + 1}. ${dup.name} (${dup.type}) - ${dup.stage}\n`;
  });

  if (duplicateAnalysis.count > 5) {
    message += `... et ${duplicateAnalysis.count - 5} autres\n`;
  }

  return `${message}\nCes doublons seront supprimés automatiquement.`;
};

export const buildStructureSuccessMessage = (
  structuredCount: string,
  duplicatesRemoved: number,
  translate: (key: string, params?: Record<string, string>) => string
) => {
  let successMessage = '';

  if (structuredCount !== '0') {
    successMessage += translate('structure_trip_success', { count: structuredCount });
  }
  if (duplicatesRemoved > 0) {
    if (successMessage) successMessage += '\n';
    successMessage += `${duplicatesRemoved} doublons supprimés.`;
  }

  return successMessage || 'Voyage structuré avec succès.';
};
