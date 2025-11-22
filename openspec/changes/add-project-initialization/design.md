# Design Document: Project Initialization

## Context
This is a greenfield project requiring a modern, scalable architecture with separate frontend and backend codebases. The project structure should support rapid development while maintaining code quality and type safety. The application appears to be business-related (Elite MB Application) and includes a specific module called "furlong".

## Goals / Non-Goals

### Goals
- Establish type-safe development with TypeScript across both frontend and backend
- Create clear separation of concerns between presentation and business logic
- Enable fast development iteration with hot module replacement
- Enforce code quality through linting and formatting
- Support environment-based configuration
- Provide a scalable folder structure that can grow with the project

### Non-Goals
- Database schema design (will be handled in separate changes)
- Authentication implementation (separate change)
- Deployment configuration (separate change)
- Testing framework setup (can be added incrementally)

## Decisions

### Decision 1: Vite over Create React App
**Rationale:** Vite provides significantly faster development server startup and hot module replacement compared to webpack-based solutions. It's the modern standard for React development with excellent TypeScript support.

**Alternatives considered:**
- Create React App: More established but slower and no longer actively maintained
- Next.js: Overkill for this project; adds server-side rendering complexity not needed initially

### Decision 2: Feature-Based Frontend Structure
**Rationale:** Organizing by features (features/modules/furlong) rather than by file type (all components in one folder) scales better as the application grows. It keeps related code together and makes it easier to understand feature boundaries.

**Structure:**
```
01_Frontend/
├── src/
│   ├── features/
│   │   ├── core/          # Core application features
│   │   └── modules/
│   │       └── furlong/   # Furlong-specific features
│   ├── components/        # Shared UI components
│   ├── hooks/             # Shared React hooks
│   ├── services/          # API clients, external services
│   ├── types/             # Shared TypeScript types
│   └── utils/             # Utility functions
```

### Decision 3: Service-Oriented Backend Structure
**Rationale:** Separating routes, services, and middleware follows Express best practices and makes the codebase testable and maintainable. The specific services/supabase directory indicates Supabase will be the primary data layer.

**Structure:**
```
02_Backend/
├── src/
│   ├── api/
│   │   └── routes/        # Express route definitions
│   ├── services/
│   │   ├── supabase/      # Supabase client and operations
│   │   └── integrations/  # Third-party service integrations
│   ├── middleware/        # Express middleware
│   ├── models/            # Data models and schemas
│   └── types/             # Shared TypeScript types
```

### Decision 4: Tailwind CSS for Styling
**Rationale:** Tailwind provides utility-first CSS that works well with component-based React development, maintains consistent design systems, and has excellent tree-shaking for small production bundles.

**Alternatives considered:**
- CSS Modules: More boilerplate, harder to maintain consistency
- Styled Components: Runtime overhead, larger bundle size
- Material-UI/Chakra: Too opinionated, harder to customize

### Decision 5: Path Aliases
**Rationale:** Using @ aliases (e.g., @/components) instead of relative imports (../../components) makes code more maintainable and easier to refactor when moving files.

**Configuration:**
- Frontend: Via tsconfig.json and vite.config.ts
- Backend: Via tsconfig.json and ts-node/tsconfig-paths

### Decision 6: Separate .env Files per Environment
**Rationale:** Keeps sensitive configuration out of code and allows different settings per environment (dev, staging, prod). The .env.example file serves as documentation.

**Pattern:**
- .env.example (committed): Lists all required variables with dummy values
- .env (gitignored): Contains actual values for local development
- Production: Environment variables set via hosting platform

## Risks / Trade-offs

### Risk: Mono-repo vs Multi-repo
**Current approach:** Two separate directories in one repository (01_Frontend, 02_Backend)

**Trade-off:**
- ✅ Simpler initial setup, single git repository
- ✅ Easier to manage version control for coordinated changes
- ❌ May need to split into separate repos if teams grow independently
- ❌ Requires discipline to maintain clear boundaries

**Mitigation:** Maintain strict separation of dependencies and build processes. Each directory should be independently deployable.

### Risk: TypeScript Configuration Complexity
**Trade-off:**
- ✅ Type safety catches bugs early
- ❌ Requires learning curve for developers new to TypeScript
- ❌ Build step adds complexity

**Mitigation:** Provide clear tsconfig.json with comments, document common TypeScript patterns in project.md

### Risk: Tooling Overhead
Multiple tools (ESLint, Prettier, TypeScript) add complexity.

**Mitigation:**
- Use shared configurations where possible
- Document all commands in package.json scripts
- Include setup instructions in README files

## Migration Plan

### Initial Setup (This Change)
1. Scaffold both frontend and backend projects
2. Install and configure all dependencies
3. Create folder structures
4. Verify builds and dev servers work

### Future Enhancements (Separate Changes)
- Add testing frameworks (Jest, Vitest, Supertest)
- Set up CI/CD pipelines
- Add database migrations
- Configure deployment environments
- Add authentication and authorization

### Rollback
If this initialization needs to be rolled back:
1. Delete 01_Frontend and 02_Backend directories
2. Repository returns to empty state
3. No database or external dependencies affected

## Open Questions

1. **Node.js version target?**
   - Recommendation: Node 18 LTS or higher
   - Should be documented in .nvmrc or package.json engines field

2. **Package manager preference?**
   - npm (default), yarn, or pnpm?
   - Recommendation: npm for simplicity unless specific features needed

3. **Supabase project already created?**
   - Backend structure assumes Supabase
   - Need Supabase URL and anon key for .env.example

4. **API versioning strategy?**
   - Should routes be /api/v1/... from the start?
   - Recommendation: Yes, plan for future versioning

5. **Furlong module specifics?**
   - What is the furlong module's purpose?
   - Should influence how features/modules/furlong is structured
