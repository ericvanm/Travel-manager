# R├¿gles de coh├®rence des voyages

Ce document d├®crit les contr├┤les automatiques appliqu├®s ├á chaque voyage dans Travel Manager, ainsi que les r├¿gles m├®tier associ├®es (dates, fuseaux horaires, h├®bergements, transports, activit├®s).

## Fuseaux horaires et dates

### Stockage

| Donn├®e | Format | R├¿gle |
|--------|--------|-------|
| `startDateTime` / `endDateTime` (activit├®s, transports) | ISO 8601 **UTC** | Heure r├®elle enregistr├®e en base, ind├®pendante du fuseau d'affichage |
| `checkInDate` / `checkOutDate` (h├®bergements) | `YYYY-MM-DD` | Dates calendaires ; les heures check-in/out sont d├®riv├®es ou saisies via le formulaire |
| `startDate` / `endDate` (├®tapes, voyage) | `YYYY-MM-DD` | Dates calendaires de l'├®tape |

### Affichage (frontend)

Toute heure ou date/heure affich├®e dans le d├®tail d'un voyage utilise le fuseau **IANA** de l'├®tape (`stage.Country.timezone`, ex. `Asia/Bangkok`, `Europe/Paris`). Si absent : `UTC`.

| Vue | R├¿gle |
|-----|-------|
| **Chronologie (timeline)** | Heures de d├®but/fin format├®es dans le fuseau de l'├®tape de l'activit├® ; en-t├¬te de jour format├® dans le fuseau de l'├®tape du jour |
| **Liste par ├®tape** | `startDateTime` / `endDateTime` affich├®s dans le fuseau de l'├®tape |
| **Formulaire d'├®dition** | Saisie en heure ┬½ murale ┬╗ locale ├á l'├®tape ; conversion UTC ├á l'enregistrement |

### Saisie / enregistrement

1. L'utilisateur saisit date + heure dans le fuseau de l'├®tape.
2. Le frontend convertit en UTC (`localInputToUtcIso`, `combineDateAndTimeInTimezone`) avant l'API.
3. ├Ç la r├®ouverture du formulaire, reconversion UTC ÔåÆ heure murale de l'├®tape.

### Timeline (backend)

Le regroupement des activit├®s par jour utilise la **date calendaire locale** dans le fuseau de l'├®tape (pas la date UTC). Le tri horaire du jour utilise la m├¬me r├¿gle.

### Impl├®mentation

- Frontend : `travelmgr-frontend/src/utils/localeHelpers.ts`, `dateTimeInputHelpers.ts`, `tripTimezoneHelpers.ts`
- Backend : `travelmgr-backend/utils/datetime-timezone.js`, `trip-timeline.js`

---

## Indicateurs

| Indicateur | Signification |
|------------|---------------|
| **Sant├® du voyage** (vert / orange / rouge) | Coh├®rence globale : h├®bergements, transports, dates, localisation |
| **Budget** (vert / orange / rouge / gris) | Respect du budget planifi├® vs co├╗ts enregistr├®s |

### Budget

| Statut | Condition |
|--------|-----------|
| `ok` | Co├╗ts enregistr├®s Ôëñ budget planifi├® |
| `slight_over` | D├®passement > 0 % et Ôëñ **15 %** |
| `strong_over` | D├®passement > **15 %** |
| `none` | Aucun budget planifi├® renseign├® |

Les dates effectives du voyage sont d├®riv├®es du **trip**, des **├®tapes** et des **activit├®s/h├®bergements** (m├¬me si `trip.startDate`/`endDate` sont vides).

### H├®bergement

- Chaque **nuit** ├á couvrir va du **premier jour** au **avant-dernier jour** du voyage (`startDate` ÔÇª `endDate - 1`).
- Le **dernier jour** (retour / vol de rentr├®e) **n'exige pas** d'h├®bergement.

### Transports

- Un transport relie **deux lieux** (d├®part et arriv├®e) : les deux sont valides le m├¬me jour.
- Le **retour au domicile** en fin de voyage (ex. vol Tokyo ÔåÆ Bruxelles sur l'├®tape ┬½ Retour ┬╗) est **normal** et ne doit pas ├¬tre signal├® comme incoh├®rent.
- Types d├®di├®s : **Flight**, **Train**, **Bus**, **Public Transport**, **Car Rental** (location de voiture).

## R├¿gles v├®rifi├®es

### Erreurs (bloquantes pour la conformit├®)

| Code | R├¿gle |
|------|-------|
| `ACCOMMODATION_NIGHT_UNCOVERED` | Chaque nuit (hors dernier jour) doit ├¬tre couverte par un h├®bergement (`checkInDate Ôëñ nuit < checkOutDate`). |
| `ACCOMMODATION_MISSING_DATES` | Un h├®bergement n'a **pas de dates** check-in/check-out valides. |
| `ACCOMMODATION_MISSING_LOCATION` | Un h├®bergement n'a **pas de ville ni d'adresse**. |
| `ACCOMMODATION_LOCATION_MISMATCH` | Un h├®bergement est **localis├® hors** de la ville de son ├®tape. |
| `ACTIVITY_LOCATION_MISMATCH` | Une activit├® est **localis├®e hors** de la ville de son ├®tape. |
| `TRANSPORT_LOCATION_MISMATCH` | Un transport ne correspond ├á **aucun** lieu de l'├®tape, de l'├®tape voisine ou du domicile (retour). |
| `TRANSPORT_MISSING_BETWEEN_STAGES` | Lors d'un **changement d'├®tape** (lieu diff├®rent), un transport doit ├¬tre pr├®vu entre les deux ├®tapes. |
| `BUDGET_STRONG_OVERRUN` | D├®passement du budget planifi├® de **plus de 15 %**. |

### Avertissements

| Code | R├¿gle |
|------|-------|
| `TRANSPORT_MISSING_OUTBOUND` | Si un **lieu de d├®part** est d├®fini, un transport aller vers la premi├¿re ├®tape devrait exister. |
| `TRANSPORT_MISSING_RETURN` | Un transport **retour** vers le lieu de d├®part devrait exister apr├¿s la derni├¿re ├®tape. |
| `STAGE_DATE_GAP` | **Trou de dates** entre deux ├®tapes cons├®cutives. |
| `STAGE_BEFORE_TRIP_START` | Une ├®tape commence **avant** la date de d├®but du voyage. |
| `STAGE_AFTER_TRIP_END` | Une ├®tape se termine **apr├¿s** la date de fin du voyage. |
| `TRIP_DATES_MISSING` | Impossible de d├®terminer les dates effectives du voyage. |
| `ACTIVITY_MISSING_LOCATION` | Une activit├® n'a **pas de ville** renseign├®e. |
| `TRANSPORT_MISSING_LOCATION` | Un transport n'a **pas de lieu** de d├®part/arriv├®e. |
| `BUDGET_SLIGHT_OVERRUN` | D├®passement du budget entre **0 % et 15 %**. |

### Informations

| Code | R├¿gle |
|------|-------|
| `STAGE_NO_ACTIVITIES` | Une ├®tape ne contient **aucune activit├®**. |
| `ACTIVITY_MISSING_DATES` | Une activit├® n'a **pas de dates** de d├®but/fin. |
| `DAILY_NO_ACTIVITIES` | Aucune activit├® de loisirs un **jour calendaire** donn├® (fuseau de l'├®tape, hors dernier jour de retour). |
| `DAILY_ACTIVITY_HOURS_BELOW_MIN` | Moins d'heures d'activit├®s que le minimum demand├® (planification IA). |

## Planification IA ÔÇö activit├®s quotidiennes

Lors d'une planification ou adaptation IA avec `minActivityHoursPerDay` / `maxActivityHoursPerDay` :

- Chaque jour sur place (hors jour de retour) doit totaliser entre le min et le max d'heures d'activit├®s de loisirs.
- Post-traitement : `ensureDailyActivityHours` compl├¿te les journ├®es sous le minimum.
- URLs de r├®servation : pr├®f├®rer des liens de **recherche** valides (GetYourGuide, ViatorÔÇª) ; les deep links invalides sont remplac├®s automatiquement.

## Adaptation IA (resolve consistency)

- Cr├®ation d'activit├® : `stageId` obligatoire (explicite ou r├®solu via ville + date dans le snapshot).
- Le payload de cr├®ation **conserve** `stageId` jusqu'├á l'insertion en base.

## R├®solution assist├®e par IA

Le bouton **R├®soudre** (actif lorsqu'il existe des erreurs ou avertissements) :

1. Analyse le rapport de coh├®rence
2. G├®n├¿re une demande d'adaptation structur├®e pour l'IA
3. Propose des modifications (h├®bergements, transports, dates, co├╗ts, localisation) ├á valider avant application

Les ├®l├®ments d├®j├á marqu├®s **r├®serv├®s** ne sont pas modifi├®s sans confirmation explicite.

## Fichiers d'impl├®mentation

- Backend : `travelmgr-backend/utils/trip-consistency.js`
- API : `GET /api/trips/consistency/summary`, `GET /api/trips/:id/consistency`
- R├®solution IA : `POST /api/ai-adapt/trips/:tripId/resolve-consistency`
- Types transport : `travelmgr-backend/utils/activity-types.js` (Flight=6, Hotel=7, Car Rental=8, Train=9, Bus=10, Public Transport=11)
