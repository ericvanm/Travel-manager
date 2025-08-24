# Code Organization and Conventions

## Component Structure

The application follows a modular component organization pattern:

```
src/components/
├── ComponentName/
│   ├── index.tsx              # Main component
│   ├── SubComponent1.tsx      # Sub-components used only by main component
│   └── SubComponent2.tsx      # Sub-components used only by main component
└── SharedComponent.tsx        # Components used by multiple parents
```

**Convention Rules:**
- Main components are placed in their own directory with an `index.tsx` file
- Sub-components that are only used by one parent component are placed in the same directory as the parent
- The main component logic is always in `index.tsx` to maintain clean imports
- Shared components that are used by multiple parents remain at the root level
- Simple components without sub-components can remain as single files

**Examples:**

**TripDetail Component (Complex)**
```
src/components/TripDetail/
├── index.tsx              # Main TripDetail component
├── StageDialog.tsx        # Stage creation/editing dialog
├── ActivityTypeDialog.tsx # Activity type selection dialog
└── ActivityDialog.tsx     # Activity creation/editing dialog
```

**TripList Component (Complex)**
```
src/components/TripList/
├── index.tsx              # Main TripList component
├── TripDialog.tsx         # Trip creation/editing dialog
├── TripTable.tsx          # Trip table display
├── TripActionsMenu.tsx    # Trip actions menu
├── ImportMenu.tsx         # Import dropdown menu
└── ImportDialog.tsx       # Import confirmation dialog
```

**Simple Components**
```
src/components/
├── Login.tsx              # Simple login form
└── Register.tsx           # Simple registration form
```

This structure ensures:
- Clean separation of concerns
- Easy maintenance and testing
- Consistent import patterns (`import TripDetail from './TripDetail'`)
- Logical grouping of related functionality
- Scalability for complex components