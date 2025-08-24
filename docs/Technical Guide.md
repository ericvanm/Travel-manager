# Travel Manager - Technical Guide

## Overview

Travel Manager is a comprehensive travel management system built with a modern tech stack. The application provides complete trip planning capabilities including itinerary management, budget tracking, activity scheduling, and multi-user collaboration.

## Architecture

### Technology Stack

**Backend:**
- **Node.js** with Express.js framework
- **MySQL** database with Sequelize ORM
- **JWT** authentication
- **Multer** for file uploads
- **CORS** enabled for cross-origin requests

**Frontend:**
- **React 18** with TypeScript
- **Material-UI (MUI)** component library
- **React Router** for navigation
- **Axios** for API communication
- **Vite** as build tool

**Infrastructure:**
- **Docker** containerization
- **Docker Compose** for development and production
- **Environment-based configuration**

## Database Schema

### Core Entities

#### 🧑‍💼 **User Management**
- **users**: User accounts with authentication and preferences
- **tripLists**: Many-to-many relationship between users and trips

#### ✈️ **Trip Management**
- **trips**: Main trip entities with budget and currency tracking
- **stages**: Trip segments organized by location and dates
- **countries**: Country reference data with ISO codes and timezone support

#### 🎯 **Activities System**
- **activities**: Detailed activity records with location, timing, and costs
- **activityTypes**: Categorization system (sightseeing, dining, transport, etc.)

#### 🏨 **Accommodation & Transport**
- **accommodations**: Lodging details with check-in/out dates and costs
- **accommodationTypes**: Hotel, Airbnb, hostel, etc.
- **transports**: Transportation records with schedules and costs
- **transportTypes**: Flight, train, car rental, etc.

#### 💰 **Financial Management**
- **expenses**: Detailed expense tracking with receipt storage
- **expenseCategories**: Expense categorization system

#### 🔔 **Notification System**
- **notifications**: Scheduled notifications for users
- **notificationTypes**: Notification categorization

#### 🌍 **Internationalization**
- **languages**: Supported languages (fr, en, es, etc.)
- **translations**: Generic translation system for all text content

### Key Relationships

```
users (1) ←→ (N) tripLists ←→ (N) trips
trips (1) ←→ (N) stages ←→ (N) activities
trips (1) ←→ (N) expenses
stages (1) ←→ (N) transports
stages (1) ←→ (N) accommodations
countries (1) ←→ (N) stages
languages (1) ←→ (N) translations
```

## Current Implementation Features

### 1. **Cascade Deletion System**
- **Trip deletion**: Automatically removes all associated stages and activities
- **Stage deletion**: Automatically removes all associated activities
- **User feedback**: Shows count of deleted related records

### 2. **Hotel Activity Management**
- **Unified storage**: Hotel activities stored as single records with both check-in/check-out and start/end dates
- **Date synchronization**: Check-in/check-out dates automatically sync with start/end dates
- **Extended fields**: Address, phone, confirmation number, room type support

### 3. **ICS Import System**
- **Calendar integration**: Import trips from ICS/iCal files
- **Hotel event merging**: Automatically combines check-in/check-out events into single activities
- **Flight detection**: Identifies flights using keywords (Terminal, [Flight], Gate) in descriptions
- **Address extraction**: Cleans and extracts addresses from LOCATION fields
- **Stage overlap prevention**: Automatically splits overlapping stages chronologically

### 4. **Timezone Support**
- **Country-based timezones**: Each country has associated timezone information
- **Localized display**: All dates/times displayed in appropriate timezone
- **Database storage**: UTC storage with timezone conversion for display

### 5. **Component Architecture**
- **Modular structure**: Components organized in directories with index.tsx pattern
- **Sub-component isolation**: Related components grouped together
- **Clean imports**: Consistent import patterns across the application

## API Endpoints

### Authentication
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/verify
```

### Trips Management
```
GET    /api/trips          # List user's trips
POST   /api/trips          # Create new trip
GET    /api/trips/:id      # Get trip details
PUT    /api/trips/:id      # Update trip
DELETE /api/trips/:id      # Delete trip (cascade)
```

### Stages Management
```
GET    /api/stages/trip/:tripId    # List trip stages
POST   /api/stages                # Create stage
PUT    /api/stages/:id            # Update stage
DELETE /api/stages/:id            # Delete stage (cascade)
```

### Activities Management
```
GET    /api/activities/stage/:stageId    # List stage activities
POST   /api/activities                  # Create activity
PUT    /api/activities/:id              # Update activity
DELETE /api/activities/:id              # Delete activity
```

### Import System
```
POST /api/import/ics    # Import trip from ICS file
```

## Database Queries Examples

### Trip with Complete Itinerary
```sql
SELECT 
    t.name as trip_name,
    t.startDate as trip_start,
    t.endDate as trip_end,
    s.name as stage_name,
    s.startDate as stage_start,
    s.endDate as stage_end,
    a.name as activity_name,
    a.startDateTime as activity_start,
    a.endDateTime as activity_end,
    a.cost as activity_cost
FROM trips t
LEFT JOIN stages s ON t.id = s.tripId
LEFT JOIN activities a ON s.id = a.stageId
WHERE t.id = ?
ORDER BY s.startDate, a.startDateTime;
```

### Budget Analysis
```sql
SELECT 
    t.name,
    t.budget,
    t.currency,
    SUM(e.amount) as total_expenses,
    (t.budget - SUM(e.amount)) as remaining_budget,
    ROUND((SUM(e.amount) / t.budget) * 100, 2) as budget_used_percent
FROM trips t
LEFT JOIN expenses e ON t.id = e.tripId
WHERE t.id = ?
GROUP BY t.id;
```

### Upcoming Activities
```sql
SELECT 
    a.name,
    a.startDateTime,
    a.endDateTime,
    s.name as stage_name,
    t.name as trip_name
FROM activities a
JOIN stages s ON a.stageId = s.id
JOIN trips t ON s.tripId = t.id
JOIN tripLists tl ON t.id = tl.tripId
WHERE tl.userId = ?
  AND a.startDateTime >= NOW()
  AND a.startDateTime <= DATE_ADD(NOW(), INTERVAL 7 DAY)
ORDER BY a.startDateTime;
```

## Development Workflow

### Environment Setup
```bash
# Backend
cd "travelmgr backend"
npm install
npm run dev

# Frontend
cd "travelmgr frontend"
npm install
npm run dev

# Docker Development
docker-compose -f docker-compose.dev.yml up --build
```

### Database Migrations
```bash
# Run migrations
npm run migrate

# Create new migration
npm run migrate:create -- --name migration_name
```

### Code Organization Standards

#### Component Structure
```
src/components/
├── TripDetail/
│   ├── index.tsx              # Main component
│   ├── StageDialog.tsx        # Stage management dialog
│   ├── ActivityDialog.tsx     # Activity management dialog
│   └── ActivityTypeDialog.tsx # Activity type selection
└── SharedComponent.tsx        # Reusable components
```

#### Backend Structure
```
controllers/
├── trips.js          # Trip CRUD operations
├── stages.js         # Stage management
├── activities.js     # Activity management
└── import.js         # ICS import logic

models/
├── DBmodels.js       # Sequelize models
└── associations.js   # Model relationships

migrations/
└── YYYYMMDD_description.js
```

## Security Considerations

### Authentication
- JWT tokens with expiration
- Password hashing with bcrypt
- Protected routes middleware

### Data Validation
- Input sanitization on all endpoints
- SQL injection prevention via Sequelize ORM
- File upload restrictions and validation

### CORS Configuration
- Configured for specific origins
- Credentials support enabled
- Preflight request handling

## Performance Optimizations

### Database
- Indexed foreign keys
- Optimized queries with proper JOINs
- Cascade deletion for data integrity

### Frontend
- Component lazy loading
- Memoization for expensive calculations
- Efficient re-rendering with React keys

### Caching Strategy
- Static asset caching
- API response caching where appropriate
- Browser storage for user preferences

## Deployment

### Production Environment
```bash
# Build and deploy
docker-compose up --build

# Environment variables required:
# - DATABASE_URL
# - JWT_SECRET
# - NODE_ENV=production
```

### Environment Configuration
```env
# Backend (.env)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=travel_manager
JWT_SECRET=your_jwt_secret
NODE_ENV=development

# Frontend (.env)
VITE_BACKEND_URL=http://localhost:3001/api
```

## Future Enhancements

### Planned Features
- Real-time collaboration
- Mobile application
- Advanced reporting and analytics
- Integration with booking platforms
- Offline capability
- Push notifications

### Technical Improvements
- GraphQL API implementation
- Redis caching layer
- Microservices architecture
- Advanced search capabilities
- Data export/import formats (JSON, CSV)

This technical guide provides a comprehensive overview of the Travel Manager system architecture, implementation details, and development practices.