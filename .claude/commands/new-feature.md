# Scaffold New Feature

Create the boilerplate structure for a new feature module.

## Arguments
- Feature name (required): The name of the feature to create

## Steps

1. Ask for feature name if not provided as argument: $ARGUMENTS

2. Create frontend feature structure:
   ```
   frontend/src/features/[feature-name]/
   ├── [FeatureName]Page.tsx      # Main page component
   ├── components/                 # Feature-specific components
   │   └── .gitkeep
   ├── hooks/                      # Custom hooks
   │   └── .gitkeep
   ├── stores/                     # Zustand stores
   │   └── [featureName]Store.ts
   ├── types/                      # TypeScript types
   │   └── index.ts
   └── index.ts                    # Public exports
   ```

3. Create basic page component with:
   - TypeScript interface for props
   - Basic layout structure
   - Placeholder content

4. Create Zustand store with:
   - Basic state interface
   - Initial state
   - Common actions (loading, error handling)

5. If backend needed, create:
   - Route file: `backend/app/api/routes/[feature_name].py`
   - Service file: `backend/app/services/[feature_name]_service.py`
   - Schema file: `backend/app/schemas_sqlite/[feature_name].py`

6. Add route to App.tsx (commented out, ready to enable)

7. Report what was created and next steps
