# Guide Technique - Travel Manager Database

## Vue d'ensemble

Le système Travel Manager est une base de données complète pour la gestion de voyages avec support multilingue, gestion financière, transport, hébergement et notifications.

## Architecture des Tables

### 🌍 **Système Multilingue**
- **languages** : Langues supportées (fr, en, es, etc.)
- **translations** : Traductions génériques pour tous contenus textuels

### 🧑‍💼 **Gestion Utilisateurs**
- **users** : Utilisateurs avec langue préférée et email
- **tripLists** : Association utilisateurs-voyages

### ✈️ **Gestion Voyages**
- **trips** : Voyages avec budget et devise
- **stages** : Étapes par pays avec dates
- **countries** : Pays avec codes ISO

### 🎯 **Activités**
- **activities** : Activités avec coûts et détails
- **activityTypes** : Types d'activités (visite, restaurant, etc.)

### 🚗 **Transport**
- **transports** : Moyens de transport avec horaires et coûts
- **transportTypes** : Types (avion, train, voiture, etc.)

### 🏨 **Hébergement**
- **accommodations** : Logements avec dates et coûts
- **accommodationTypes** : Types (hôtel, Airbnb, etc.)

### 💰 **Gestion Financière**
- **expenses** : Dépenses détaillées avec reçus
- **expenseCategories** : Catégories de dépenses

### 🔔 **Notifications**
- **notifications** : Messages programmés pour utilisateurs
- **notificationTypes** : Types de notifications

## Relations Principales

```
trips (1) ←→ (N) stages ←→ (N) activities
trips (1) ←→ (N) expenses
stages (1) ←→ (N) transports
stages (1) ←→ (N) accommodations
users (1) ←→ (N) notifications
languages (1) ←→ (N) translations
```

## Exemple Complet : Voyage en Afrique du Sud

### 1. Données de Base

```sql
-- Langues
INSERT INTO languages VALUES (1, 'fr', 'Français'), (2, 'en', 'English');

-- Pays
INSERT INTO countries VALUES (1, 'Afrique du Sud', 'ZAF');

-- Utilisateur
INSERT INTO users VALUES (1, 'john_doe', 'John Doe', 'hash123', false, 1, 'john@email.com');

-- Types
INSERT INTO activityTypes VALUES 
(1, 'Safari'), (2, 'Visite culturelle'), (3, 'Restaurant'), (4, 'Plage');

INSERT INTO transportTypes VALUES 
(1, 'Avion'), (2, 'Voiture de location'), (3, 'Bus');

INSERT INTO accommodationTypes VALUES 
(1, 'Hôtel'), (2, 'Lodge Safari'), (3, 'Guesthouse');

INSERT INTO expenseCategories VALUES 
(1, 'Transport'), (2, 'Hébergement'), (3, 'Activités'), (4, 'Repas');

INSERT INTO notificationTypes VALUES 
(1, 'Rappel vol'), (2, 'Check-in hôtel'), (3, 'Activité');
```

### 2. Création du Voyage

```sql
-- Voyage principal
INSERT INTO trips VALUES (
    1, 
    'Safari & Découverte Afrique du Sud', 
    'Voyage de 14 jours entre Le Cap, Kruger et Johannesburg',
    '2024-03-15', 
    '2024-03-28', 
    3500.00, 
    'EUR'
);

-- Association utilisateur-voyage
INSERT INTO tripLists VALUES (1, 1, 1);
```

### 3. Étapes du Voyage

```sql
-- Étape 1: Le Cap
INSERT INTO stages VALUES (
    1, 1, 1, 'Le Cap - Table Mountain & Waterfront', 
    '2024-03-15', '2024-03-20'
);

-- Étape 2: Kruger National Park
INSERT INTO stages VALUES (
    2, 1, 1, 'Parc National Kruger - Safari', 
    '2024-03-21', '2024-03-25'
);

-- Étape 3: Johannesburg
INSERT INTO stages VALUES (
    3, 1, 1, 'Johannesburg - Soweto & Musées', 
    '2024-03-26', '2024-03-28'
);
```

### 4. Transports

```sql
-- Vol Paris-Le Cap
INSERT INTO transports VALUES (
    1, 1, 1, 'Paris CDG', 'Le Cap International',
    '2024-03-15 10:30:00', '2024-03-16 08:15:00',
    'AF995', 850.00, 'Vol direct Air France'
);

-- Location voiture Le Cap
INSERT INTO transports VALUES (
    2, 1, 2, 'Aéroport Le Cap', 'Hôtel Le Cap',
    '2024-03-16 09:00:00', '2024-03-16 10:00:00',
    'HERTZ-LC001', 45.00, 'Compact car 5 jours'
);

-- Vol interne Le Cap-Kruger
INSERT INTO transports VALUES (
    3, 2, 1, 'Le Cap', 'Skukuza Airport',
    '2024-03-21 07:00:00', '2024-03-21 08:30:00',
    'SA8234', 180.00, 'Vol domestique'
);
```

### 5. Hébergements

```sql
-- Hôtel Le Cap
INSERT INTO accommodations VALUES (
    1, 1, 1, 'The Table Bay Hotel',
    'V&A Waterfront, Le Cap', 'Le Cap',
    '2024-03-16', '2024-03-21', 'TBH-2024-001',
    120.00, 600.00, 'Vue sur Table Mountain'
);

-- Lodge Safari Kruger
INSERT INTO accommodations VALUES (
    2, 2, 2, 'Sabi Sabi Bush Lodge',
    'Sabi Sand Reserve', 'Kruger',
    '2024-03-21', '2024-03-25', 'SABI-2024-456',
    280.00, 1120.00, 'All inclusive avec safaris'
);

-- Hôtel Johannesburg
INSERT INTO accommodations VALUES (
    3, 3, 1, 'Saxon Hotel Johannesburg',
    'Sandhurst, Johannesburg', 'Johannesburg',
    '2024-03-26', '2024-03-28', 'SAXON-789',
    95.00, 190.00, 'Hôtel de luxe'
);
```

### 6. Activités

```sql
-- Le Cap - Table Mountain
INSERT INTO activities VALUES (
    1, 1, 2, 'Téléphérique Table Mountain',
    'TM-2024-001', '2024-03-17 09:00:00', '2024-03-17 12:00:00',
    'Table Mountain Rd', '8001', 'Le Cap', 'Afrique du Sud',
    'Vue panoramique 360°', 'Prévoir veste', 25.00
);

-- Le Cap - Dégustation vins
INSERT INTO activities VALUES (
    2, 1, 2, 'Route des Vins Stellenbosch',
    'WINE-2024-002', '2024-03-18 10:00:00', '2024-03-18 17:00:00',
    'Stellenbosch Wine Route', '7600', 'Stellenbosch', 'Afrique du Sud',
    'Dégustation 5 domaines', 'Transport inclus', 85.00
);

-- Kruger - Safari Big 5
INSERT INTO activities VALUES (
    3, 2, 1, 'Safari Big 5 - Game Drive',
    'SAFARI-001', '2024-03-22 05:30:00', '2024-03-22 10:30:00',
    'Kruger National Park', '1350', 'Skukuza', 'Afrique du Sud',
    'Recherche Big 5', 'Départ très matinal', 120.00
);

-- Johannesburg - Soweto Tour
INSERT INTO activities VALUES (
    4, 3, 2, 'Visite Guidée Soweto',
    'SOWETO-2024', '2024-03-27 09:00:00', '2024-03-27 15:00:00',
    'Vilakazi Street', '1804', 'Soweto', 'Afrique du Sud',
    'Histoire Apartheid', 'Guide local inclus', 45.00
);
```

### 7. Dépenses

```sql
-- Dépenses transport
INSERT INTO expenses VALUES (
    1, 1, 1, 'Vol Paris-Le Cap AR', 850.00, 'EUR', '2024-02-15', 'receipt_001.pdf'
);

-- Dépenses hébergement
INSERT INTO expenses VALUES (
    2, 1, 2, 'Hôtels 3 villes', 1910.00, 'EUR', '2024-03-01', 'hotels_booking.pdf'
);

-- Dépenses activités
INSERT INTO expenses VALUES (
    3, 1, 3, 'Activités et excursions', 275.00, 'EUR', '2024-03-20', 'activities_receipts.pdf'
);

-- Dépenses repas
INSERT INTO expenses VALUES (
    4, 1, 4, 'Restaurants et repas', 465.00, 'EUR', '2024-03-28', 'food_expenses.pdf'
);
```

### 8. Notifications

```sql
-- Rappel vol
INSERT INTO notifications VALUES (
    1, 1, 1, 'Rappel Vol Paris-Le Cap',
    'N\'oubliez pas votre vol AF995 demain à 10h30', false,
    '2024-03-14 18:00:00', null, '2024-03-14 12:00:00'
);

-- Check-in hôtel
INSERT INTO notifications VALUES (
    2, 1, 2, 'Check-in Table Bay Hotel',
    'Votre chambre sera prête à partir de 15h', false,
    '2024-03-16 14:00:00', null, '2024-03-16 10:00:00'
);

-- Safari matinal
INSERT INTO notifications VALUES (
    3, 1, 3, 'Safari Big 5 demain',
    'RDV 5h30 lobby pour safari Big 5. Prévoir vêtements chauds', false,
    '2024-03-21 20:00:00', null, '2024-03-21 18:00:00'
);
```

### 9. Traductions (Support Multilingue)

```sql
-- Traduction voyage en anglais
INSERT INTO translations VALUES (
    1, 2, 'trips', 1, 'name', 'Safari & Discovery South Africa'
);

INSERT INTO translations VALUES (
    2, 2, 'trips', 1, 'description', '14-day journey between Cape Town, Kruger and Johannesburg'
);

-- Traduction activité Table Mountain
INSERT INTO translations VALUES (
    3, 2, 'activities', 1, 'name', 'Table Mountain Cable Car'
);

INSERT INTO translations VALUES (
    4, 2, 'activities', 1, 'comments', '360° panoramic view'
);
```

## Requêtes Utiles

### Budget Total par Voyage
```sql
SELECT t.name, t.budget, t.currency,
       SUM(e.amount) as total_expenses,
       (t.budget - SUM(e.amount)) as remaining_budget
FROM trips t
LEFT JOIN expenses e ON t.id = e.tripId
WHERE t.id = 1
GROUP BY t.id;
```

### Planning Complet d'une Étape
```sql
SELECT s.name as stage, s.startDate, s.endDate,
       a.name as accommodation, a.checkInDate, a.checkOutDate,
       act.name as activity, act.startDateTime,
       t.departureLocation, t.arrivalLocation, t.departureDateTime
FROM stages s
LEFT JOIN accommodations a ON s.id = a.stageId
LEFT JOIN activities act ON s.id = act.stageId
LEFT JOIN transports t ON s.id = t.stageId
WHERE s.id = 1
ORDER BY act.startDateTime;
```

### Notifications à Envoyer
```sql
SELECT n.title, n.message, u.email, n.scheduledFor
FROM notifications n
JOIN users u ON n.userId = u.id
WHERE n.isRead = false 
  AND n.scheduledFor <= NOW()
  AND n.sentAt IS NULL;
```

### Contenu Multilingue
```sql
SELECT t.name as original_name,
       tr.translatedText as translated_name,
       l.name as language
FROM trips t
LEFT JOIN translations tr ON tr.entityType = 'trips' 
                         AND tr.entityId = t.id 
                         AND tr.fieldName = 'name'
LEFT JOIN languages l ON tr.languageId = l.id
WHERE t.id = 1;
```

## Coûts du Voyage Exemple

| Catégorie | Montant (EUR) | Détail |
|-----------|---------------|---------|
| Transport | 1,075.00 | Vols + locations |
| Hébergement | 1,910.00 | 3 hôtels/lodges |
| Activités | 275.00 | Safaris + visites |
| Repas | 465.00 | Restaurants |
| **TOTAL** | **3,725.00** | Dépassement: 225€ |

Ce modèle permet une gestion complète et multilingue des voyages avec suivi financier détaillé et système de notifications automatisé.