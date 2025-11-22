# Backend Capability Specification

## ADDED Requirements

### Requirement: Node.js TypeScript Project Setup
The backend SHALL be built with Node.js using TypeScript and Express framework.

#### Scenario: Project initialization
- **WHEN** the project is initialized
- **THEN** it SHALL include Node.js, TypeScript, and Express with proper configuration files
- **AND** the project SHALL compile without errors

### Requirement: Express Server Configuration
The backend SHALL provide a configured Express server with proper TypeScript support.

#### Scenario: Server startup
- **WHEN** the server starts
- **THEN** Express SHALL initialize and listen on a configured port
- **AND** the server SHALL log startup confirmation

### Requirement: Development Tooling
The backend project SHALL include ESLint and Prettier configured for TypeScript and Node.js.

#### Scenario: Code linting
- **WHEN** the lint command is run
- **THEN** all TypeScript files SHALL be checked for code quality issues

#### Scenario: Code formatting
- **WHEN** the format command is run
- **THEN** all code files SHALL be formatted according to Prettier rules

### Requirement: Folder Structure
The backend SHALL organize code using the following directory structure: api/routes, services/supabase, services/integrations, middleware, models, and types.

#### Scenario: API organization
- **WHEN** new API endpoints are added
- **THEN** routes SHALL be organized under api/routes
- **AND** business logic SHALL be placed in services

#### Scenario: Data layer
- **WHEN** database operations are needed
- **THEN** Supabase-related code SHALL be in services/supabase
- **AND** data models SHALL be defined in models directory

### Requirement: Path Aliases
The backend SHALL configure TypeScript path aliases for cleaner imports throughout the codebase.

#### Scenario: Import resolution
- **WHEN** importing from shared directories
- **THEN** developers SHALL use configured aliases instead of relative paths
- **AND** TypeScript SHALL resolve these paths correctly

### Requirement: CORS Middleware
The backend SHALL include CORS middleware configured to allow cross-origin requests from the frontend.

#### Scenario: Cross-origin requests
- **WHEN** the frontend makes API requests
- **THEN** CORS headers SHALL be set appropriately
- **AND** requests SHALL not be blocked by browser CORS policy

### Requirement: Logging Middleware
The backend SHALL include logging middleware to track HTTP requests and responses.

#### Scenario: Request logging
- **WHEN** an API request is received
- **THEN** the request method, path, and response status SHALL be logged
- **AND** logs SHALL aid in debugging and monitoring

### Requirement: Environment Configuration
The backend SHALL support environment variables through .env files with a .env.example template.

#### Scenario: Environment setup
- **WHEN** a new developer clones the repository
- **THEN** they SHALL find a .env.example file with all required variables
- **AND** they SHALL be able to copy it to .env for local development

#### Scenario: Configuration loading
- **WHEN** the server starts
- **THEN** environment variables SHALL be loaded and validated
- **AND** missing critical variables SHALL cause startup failure with clear error messages

### Requirement: Build Scripts
The backend package.json SHALL include scripts for development, building, production start, linting, and formatting.

#### Scenario: Development workflow
- **WHEN** a developer runs npm run dev
- **THEN** the TypeScript code SHALL be executed with automatic reloading on file changes

#### Scenario: Production build
- **WHEN** a developer runs npm run build
- **THEN** TypeScript SHALL compile to JavaScript in a dist directory
- **AND** the compiled code SHALL be ready for production deployment

#### Scenario: Production start
- **WHEN** a developer runs npm run start
- **THEN** the compiled JavaScript SHALL execute from the dist directory
- **AND** the server SHALL run in production mode
