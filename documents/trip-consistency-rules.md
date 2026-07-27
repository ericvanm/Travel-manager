# Trip consistency rules

This document describes automatic checks applied to each trip in Travel Manager, and the related business rules (dates, time zones, accommodation, transport, activities).

> **French version:** [`archive/trip-consistency-rules.fr.md`](archive/trip-consistency-rules.fr.md)

## Time zones and dates

### Storage

| Field | Format | Rule |
|-------|--------|------|
| `startDateTime` / `endDateTime` (activities, transport) | ISO 8601 **UTC** | Stored in UTC regardless of display timezone |
| `checkInDate` / `checkOutDate` (hotels) | `YYYY-MM-DD` | Calendar dates; check-in/out times come from the form or defaults |
| `startDate` / `endDate` (stages, trip) | `YYYY-MM-DD` | Stage calendar bounds |

### Display (frontend)

All times in trip detail use the stage **IANA** timezone (`stage.Country.timezone`, e.g. `Asia/Bangkok`, `Europe/Paris`). Fallback: `UTC`.

| View | Rule |
|------|------|
| **Timeline** | Start/end formatted in the activity stage timezone; day headers use the day stage timezone |
| **Stage list** | `startDateTime` / `endDateTime` in stage timezone |
| **Edit form** | Wall-clock input in stage timezone; converted to UTC on save |

### Input / persistence

1. User enters date + time in the stage timezone.
2. Frontend converts to UTC (`localInputToUtcIso`, `combineDateAndTimeInTimezone`) before the API.
3. On reopen, UTC is converted back to stage wall time.

### Timeline (backend)

Grouping activities by day uses the **local calendar date** in the stage timezone (not UTC date). Intra-day sort uses the same rule.

### Implementation

- Frontend: `travelmgr-frontend/src/utils/localeHelpers.ts`, `dateTimeInputHelpers.ts`, `tripTimezoneHelpers.ts`
- Backend: `travelmgr-backend/utils/datetime-timezone.js`, `trip-timeline.js`

---

## Indicators

| Indicator | Meaning |
|-----------|---------|
| **Trip health** (green / amber / red) | Overall consistency: accommodation, transport, dates, location |
| **Budget** (green / amber / red / grey) | Planned budget vs recorded costs |

### Budget

| Status | Condition |
|--------|-----------|
| `ok` | Recorded costs ≤ planned budget |
| `slight_over` | Overrun > 0% and ≤ **15%** |
| `strong_over` | Overrun > **15%** |
| `none` | No planned budget set |

Effective trip dates are derived from the **trip**, **stages**, and **activities/hotels** even when `trip.startDate`/`endDate` are empty.

### Accommodation

- Each **night** to cover runs from the **first day** through **the day before the last day** (`startDate` … `endDate - 1`).
- The **last day** (return / inbound flight) **does not require** accommodation.

### Transport

- Transport links **two places** (departure and arrival); both are valid on the same day.
- **Return home** at end of trip (e.g. Tokyo → Brussels on a “Return” stage) is **expected** and must not be flagged as inconsistent.
- Dedicated types: **Flight**, **Train**, **Bus**, **Public Transport**, **Car Rental**.

## Rules checked

### Errors (block “healthy” status)

| Code | Rule |
|------|------|
| `ACCOMMODATION_NIGHT_UNCOVERED` | Each night (except last day) must be covered by hotel dates (`checkInDate ≤ night < checkOutDate`). |
| `ACCOMMODATION_MISSING_DATES` | Hotel missing valid check-in/check-out dates. |
| `ACCOMMODATION_MISSING_LOCATION` | Hotel missing city and address. |
| `ACCOMMODATION_LOCATION_MISMATCH` | Hotel located outside its stage city. |
| `ACTIVITY_LOCATION_MISMATCH` | Activity located outside its stage city. |
| `TRANSPORT_LOCATION_MISMATCH` | Transport matches neither stage, adjacent stage, nor home (return). |
| `TRANSPORT_MISSING_BETWEEN_STAGES` | When **changing stage location**, transport between stages is required. |
| `BUDGET_STRONG_OVERRUN` | Planned budget exceeded by **more than 15%**. |

### Warnings

| Code | Rule |
|------|------|
| `TRANSPORT_MISSING_OUTBOUND` | If **departure location** is set, outbound transport to the first stage should exist. |
| `TRANSPORT_MISSING_RETURN` | Return transport to departure location should exist after the last stage. |
| `STAGE_DATE_GAP` | **Date gap** between consecutive stages. |
| `STAGE_BEFORE_TRIP_START` | Stage starts **before** trip start date. |
| `STAGE_AFTER_TRIP_END` | Stage ends **after** trip end date. |
| `TRIP_DATES_MISSING` | Cannot determine effective trip dates. |
| `ACTIVITY_MISSING_LOCATION` | Activity has **no city**. |
| `TRANSPORT_MISSING_LOCATION` | Transport missing departure/arrival location. |
| `BUDGET_SLIGHT_OVERRUN` | Budget overrun between **0% and 15%**. |

### Information

| Code | Rule |
|------|------|
| `STAGE_NO_ACTIVITIES` | Stage has **no activities**. |
| `ACTIVITY_MISSING_DATES` | Activity missing start/end dates. |
| `DAILY_NO_ACTIVITIES` | No leisure activities on a calendar day (stage TZ, excluding return day). |
| `DAILY_ACTIVITY_HOURS_BELOW_MIN` | Fewer activity hours than AI planning minimum. |

## AI planning — daily activities

When planning or adapting with `minActivityHoursPerDay` / `maxActivityHoursPerDay`:

- Each on-site day (except return day) must total between min and max leisure hours.
- Post-processing: `ensureDailyActivityHours` fills days below the minimum.
- Booking URLs: prefer valid **search** links (GetYourGuide, Viator, …); invalid deep links are replaced automatically.

## AI adapt (resolve consistency)

- Activity creation requires `stageId` (explicit or resolved from city + date in the snapshot).
- Create payload **keeps** `stageId` until database insert.

## AI-assisted resolution

The **Resolve** action (when errors or warnings exist):

1. Reads the consistency report
2. Builds a structured adapt request for the LLM
3. Proposes changes (accommodation, transport, dates, costs, location) for user confirmation

Items marked **reserved** are not changed without explicit confirmation.

## Implementation files

- Backend: `travelmgr-backend/utils/trip-consistency.js`
- API: `GET /api/trips/consistency/summary`, `GET /api/trips/:id/consistency`
- AI resolve: `POST /api/ai-adapt/trips/:tripId/resolve-consistency`
- Transport type IDs: `travelmgr-backend/utils/activity-types.js` (Flight=6, Hotel=7, Car Rental=8, Train=9, Bus=10, Public Transport=11)
