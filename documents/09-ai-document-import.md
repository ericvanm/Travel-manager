# AI document import

Users upload reservation documents (PDF, images, plain text). The backend extracts text and uses AI (or regex fallback) to propose create/update actions on trip activities.

See also [08-ai-integration.md](08-ai-integration.md) for OpenAI configuration and logging.

## Features

| Step | Behavior |
|------|----------|
| Upload | Drag-and-drop or file picker; PDF, JPG, PNG, TXT |
| Extraction | PDF text extraction; OCR via Tesseract.js for images |
| Analysis | OpenAI when configured; pattern-based fallback otherwise |
| Confirmation | User selects proposed actions before execution |

## Backend setup

Dependencies are already in `travelmgr-backend/package.json` (`multer`, `tesseract.js`, etc.).

```bash
cd travelmgr-backend
cp .env.example .env
# Optional OpenAI
# USE_OPENAI=true
# OPENAI_API_KEY=...
npm run dev
```

## Frontend component

```tsx
import AIDocumentImport from './components/AIDocumentImport'

<AIDocumentImport tripId={tripId} onImportComplete={() => refresh()} />
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ai-import/analyze` | `multipart/form-data`: `document`, `tripId` |
| POST | `/api/ai-import/execute` | JSON: `tripId`, `confirmedActions` |

Responses include extracted text, detected activities, and an action plan requiring confirmation.

## Flow

1. Upload → 2. Text extraction → 3. AI/pattern analysis → 4. Match existing activities → 5. User confirms → 6. Persist changes

## Security and limits

- MIME type validation; max file size enforced on the server
- Authenticated session required
- Do not log document contents in production (see backend logger guidelines)

## Customization

- Activity type mapping: `travelmgr-backend/controllers/ai-import.js`
- Prompts / patterns: `travelmgr-backend/utils/ai-service.js`

## Troubleshooting

| Issue | Hint |
|-------|------|
| Empty PDF text | Scanned PDFs need OCR (image upload) |
| Poor OCR | Use higher-resolution images |
| No detections | Review extracted text; tune patterns or enable OpenAI |

---

**Legacy French guide:** [`../docs/archive/AI-Import-Guide.fr.md`](../docs/archive/AI-Import-Guide.fr.md)
