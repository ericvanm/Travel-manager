# Travel Manager Frontend

A React TypeScript application for managing travel itineraries.

## Features

- User authentication (login/register)
- Trip management
- Stage and activity planning
- Material-UI components

## Getting started

### Development
```bash
npm run dev
```

### Docker Development
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Production  
```bash
docker-compose up --build
```

## Environment Variables

- `VITE_BACKEND_URL`: Backend API URL (default: http://localhost:3001/api)