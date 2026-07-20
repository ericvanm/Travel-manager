# Règles de cohérence des voyages

Ce document décrit les contrôles automatiques appliqués à chaque voyage dans Travel Manager, ainsi que les règles métier associées (dates, fuseaux horaires, hébergements, transports, activités).

## Fuseaux horaires et dates

### Stockage

| Donnée | Format | Règle |
|--------|--------|-------|
| `startDateTime` / `endDateTime` (activités, transports) | ISO 8601 **UTC** | Heure réelle enregistrée en base, indépendante du fuseau d'affichage |
| `checkInDate` / `checkOutDate` (hébergements) | `YYYY-MM-DD` | Dates calendaires ; les heures check-in/out sont dérivées ou saisies via le formulaire |
| `startDate` / `endDate` (étapes, voyage) | `YYYY-MM-DD` | Dates calendaires de l'étape |

### Affichage (frontend)

Toute heure ou date/heure affichée dans le détail d'un voyage utilise le fuseau **IANA** de l'étape (`stage.Country.timezone`, ex. `Asia/Bangkok`, `Europe/Paris`). Si absent : `UTC`.

| Vue | Règle |
|-----|-------|
| **Chronologie (timeline)** | Heures de début/fin formatées dans le fuseau de l'étape de l'activité ; en-tête de jour formaté dans le fuseau de l'étape du jour |
| **Liste par étape** | `startDateTime` / `endDateTime` affichés dans le fuseau de l'étape |
| **Formulaire d'édition** | Saisie en heure « murale » locale à l'étape ; conversion UTC à l'enregistrement |

### Saisie / enregistrement

1. L'utilisateur saisit date + heure dans le fuseau de l'étape.
2. Le frontend convertit en UTC (`localInputToUtcIso`, `combineDateAndTimeInTimezone`) avant l'API.
3. À la réouverture du formulaire, reconversion UTC → heure murale de l'étape.

### Timeline (backend)

Le regroupement des activités par jour utilise la **date calendaire locale** dans le fuseau de l'étape (pas la date UTC). Le tri horaire du jour utilise la même règle.

### Implémentation

- Frontend : `travelmgr-frontend/src/utils/localeHelpers.ts`, `dateTimeInputHelpers.ts`, `tripTimezoneHelpers.ts`
- Backend : `travelmgr-backend/utils/datetime-timezone.js`, `trip-timeline.js`

---

## Indicateurs

| Indicateur | Signification |
|------------|---------------|
| **Santé du voyage** (vert / orange / rouge) | Cohérence globale : hébergements, transports, dates, localisation |
| **Budget** (vert / orange / rouge / gris) | Respect du budget planifié vs coûts enregistrés |

### Budget

| Statut | Condition |
|--------|-----------|
| `ok` | Coûts enregistrés ≤ budget planifié |
| `slight_over` | Dépassement > 0 % et ≤ **15 %** |
| `strong_over` | Dépassement > **15 %** |
| `none` | Aucun budget planifié renseigné |

Les dates effectives du voyage sont dérivées du **trip**, des **étapes** et des **activités/hébergements** (même si `trip.startDate`/`endDate` sont vides).

### Hébergement

- Chaque **nuit** à couvrir va du **premier jour** au **avant-dernier jour** du voyage (`startDate` … `endDate - 1`).
- Le **dernier jour** (retour / vol de rentrée) **n'exige pas** d'hébergement.

### Transports

- Un transport relie **deux lieux** (départ et arrivée) : les deux sont valides le même jour.
- Le **retour au domicile** en fin de voyage (ex. vol Tokyo → Bruxelles sur l'étape « Retour ») est **normal** et ne doit pas être signalé comme incohérent.
- Types dédiés : **Flight**, **Train**, **Bus**, **Public Transport**, **Car Rental** (location de voiture).

## Règles vérifiées

### Erreurs (bloquantes pour la conformité)

| Code | Règle |
|------|-------|
| `ACCOMMODATION_NIGHT_UNCOVERED` | Chaque nuit (hors dernier jour) doit être couverte par un hébergement (`checkInDate ≤ nuit < checkOutDate`). |
| `ACCOMMODATION_MISSING_DATES` | Un hébergement n'a **pas de dates** check-in/check-out valides. |
| `ACCOMMODATION_MISSING_LOCATION` | Un hébergement n'a **pas de ville ni d'adresse**. |
| `ACCOMMODATION_LOCATION_MISMATCH` | Un hébergement est **localisé hors** de la ville de son étape. |
| `ACTIVITY_LOCATION_MISMATCH` | Une activité est **localisée hors** de la ville de son étape. |
| `TRANSPORT_LOCATION_MISMATCH` | Un transport ne correspond à **aucun** lieu de l'étape, de l'étape voisine ou du domicile (retour). |
| `TRANSPORT_MISSING_BETWEEN_STAGES` | Lors d'un **changement d'étape** (lieu différent), un transport doit être prévu entre les deux étapes. |
| `BUDGET_STRONG_OVERRUN` | Dépassement du budget planifié de **plus de 15 %**. |

### Avertissements

| Code | Règle |
|------|-------|
| `TRANSPORT_MISSING_OUTBOUND` | Si un **lieu de départ** est défini, un transport aller vers la première étape devrait exister. |
| `TRANSPORT_MISSING_RETURN` | Un transport **retour** vers le lieu de départ devrait exister après la dernière étape. |
| `STAGE_DATE_GAP` | **Trou de dates** entre deux étapes consécutives. |
| `STAGE_BEFORE_TRIP_START` | Une étape commence **avant** la date de début du voyage. |
| `STAGE_AFTER_TRIP_END` | Une étape se termine **après** la date de fin du voyage. |
| `TRIP_DATES_MISSING` | Impossible de déterminer les dates effectives du voyage. |
| `ACTIVITY_MISSING_LOCATION` | Une activité n'a **pas de ville** renseignée. |
| `TRANSPORT_MISSING_LOCATION` | Un transport n'a **pas de lieu** de départ/arrivée. |
| `BUDGET_SLIGHT_OVERRUN` | Dépassement du budget entre **0 % et 15 %**. |

### Informations

| Code | Règle |
|------|-------|
| `STAGE_NO_ACTIVITIES` | Une étape ne contient **aucune activité**. |
| `ACTIVITY_MISSING_DATES` | Une activité n'a **pas de dates** de début/fin. |
| `DAILY_NO_ACTIVITIES` | Aucune activité de loisirs un **jour calendaire** donné (fuseau de l'étape, hors dernier jour de retour). |
| `DAILY_ACTIVITY_HOURS_BELOW_MIN` | Moins d'heures d'activités que le minimum demandé (planification IA). |

## Planification IA — activités quotidiennes

Lors d'une planification ou adaptation IA avec `minActivityHoursPerDay` / `maxActivityHoursPerDay` :

- Chaque jour sur place (hors jour de retour) doit totaliser entre le min et le max d'heures d'activités de loisirs.
- Post-traitement : `ensureDailyActivityHours` complète les journées sous le minimum.
- URLs de réservation : préférer des liens de **recherche** valides (GetYourGuide, Viator…) ; les deep links invalides sont remplacés automatiquement.

## Adaptation IA (resolve consistency)

- Création d'activité : `stageId` obligatoire (explicite ou résolu via ville + date dans le snapshot).
- Le payload de création **conserve** `stageId` jusqu'à l'insertion en base.

## Résolution assistée par IA

Le bouton **Résoudre** (actif lorsqu'il existe des erreurs ou avertissements) :

1. Analyse le rapport de cohérence
2. Génère une demande d'adaptation structurée pour l'IA
3. Propose des modifications (hébergements, transports, dates, coûts, localisation) à valider avant application

Les éléments déjà marqués **réservés** ne sont pas modifiés sans confirmation explicite.

## Fichiers d'implémentation

- Backend : `travelmgr-backend/utils/trip-consistency.js`
- API : `GET /api/trips/consistency/summary`, `GET /api/trips/:id/consistency`
- Résolution IA : `POST /api/ai-adapt/trips/:tripId/resolve-consistency`
- Types transport : `travelmgr-backend/utils/activity-types.js` (Flight=6, Hotel=7, Car Rental=8, Train=9, Bus=10, Public Transport=11)
