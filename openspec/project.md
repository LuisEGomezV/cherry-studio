# Project Context

## Purpose
Cherry Studio is a cross-platform desktop AI client that provides unified access to multiple LLM (Large Language Model) providers. The project enables users to interact with various AI models through a single, feature-rich application available on Windows, macOS, and Linux.

**Key Goals:**
- Provide a seamless desktop experience for AI interactions
- Support diverse LLM providers (cloud services, web services, and local models)
- Enable advanced features like knowledge bases, AI assistants, and document processing
- Maintain a highly customizable and extensible architecture

## Tech Stack

### Core Framework
- **Electron** (37.4.0) - Desktop application framework
- **Node.js** (>=22.0.0) - Runtime environment
- **TypeScript** (5.6.2) - Primary programming language
- **electron-vite** (4.0.0) - Build tooling

### Frontend
- **React** (19.0.0) - UI framework
- **React Router** (6) - Navigation
- **Redux Toolkit** (2.2.5) - State management
- **Redux Persist** (6.0.0) - State persistence
- **Ant Design** (5.27.0) - UI component library
- **Styled Components** (6.1.11) - CSS-in-JS styling
- **Lucide React** (0.525.0) - Icon system
- **i18next** (23.11.5) - Internationalization

### AI & ML Integration
- **OpenAI SDK** (5.12.2) - OpenAI API integration
- **Anthropic SDK** (0.41.0) - Claude API integration
- **Google GenAI** (1.0.1) - Gemini API integration
- **AWS SDK** (Bedrock) - AWS Bedrock integration
- **Ollama** - Local model support
- **LangChain** - AI orchestration

### Document Processing
- **Tiptap** (3.2.0) - Rich text editor
- **Markdown-it** (14.1.0) - Markdown parsing
- **Mermaid** (11.10.1) - Diagram rendering
- **pdf-lib** (1.17.1) - PDF processing
- **officeparser** (4.2.0) - Office document parsing
- **Tesseract.js** (6.0.1) - OCR

### Data & Storage
- **Dexie** (4.0.8) - IndexedDB wrapper
- **libsql/client** (0.14.0) - Local database
- **electron-store** (8.2.0) - Settings persistence
- **WebDAV** (5.8.0) - File sync

### Development Tools
- **Vite** (rolldown-vite) - Development server
- **Vitest** (3.2.4) - Testing framework
- **Playwright** (1.52.0) - E2E testing
- **ESLint** (9.22.0) - Linting
- **Prettier** (3.5.3) - Code formatting
- **Husky** (9.1.7) - Git hooks
- **electron-builder** (26.0.15) - Application packaging

## Project Conventions

### Code Style
- **Language**: TypeScript with strict type checking enabled
- **Formatting**: Prettier with 2-space indentation
- **Linting**: ESLint with React and TypeScript rules
- **Imports**: Organized with `eslint-plugin-simple-import-sort`
- **Naming**: 
  - Components: PascalCase (e.g., `MessageTools.tsx`)
  - Hooks: camelCase with `use` prefix (e.g., `useSettings`)
  - Constants: UPPER_SNAKE_CASE
  - Files: PascalCase for components, kebab-case for utilities

### Architecture Patterns
- **Electron Architecture**: Main process, renderer process, and preload scripts
- **State Management**: Redux Toolkit with feature-based slices
- **Component Structure**: Functional components with hooks
- **Styling**: Styled Components with theme support
- **Code Organization**: Feature-based folder structure
  - `/src/main` - Electron main process
  - `/src/renderer` - React application
  - `/src/preload` - Preload scripts
  - `/packages` - Workspace packages

### Testing Strategy
- **Unit Tests**: Vitest for component and utility testing
- **E2E Tests**: Playwright for end-to-end scenarios
- **Test Location**: Co-located with source files (`__tests__` directories)
- **Coverage**: Coverage reports with Vitest
- **Commands**:
  - `yarn test` - Run all tests
  - `yarn test:e2e` - Run E2E tests
  - `yarn test:coverage` - Generate coverage reports

### Git Workflow
- **Branching Strategy**:
  - `main` - Primary development branch (fork-specific changes)
  - `upstream-stable` - Tracks latest stable release from upstream
  - Feature branches for major features (e.g., `FoldersSystem`)

- **Commit Conventions**:
  - Custom commits use prefixes: `[New]`, `[Fix]`, `[Change]`, `[Prog]`
  - Examples:
    - `[New] Implement drag-and-drop reordering for folders`
    - `[Fix] Unused imports`
    - `[Change] Replace rebase workflow with merge workflow`

- **Update Workflow**:
  - **Automated**: Use GitHub Actions workflow `.github/workflows/sync-upstream.yml`
    - Manual trigger only (no scheduled runs)
    - Implements merging rebase strategy with `git range-diff` duplicate detection
    - Always creates PR for manual review before merging
    - See `docs/UPSTREAM_SYNC.md` for detailed usage
  - **Manual fallback**: Use `scripts/merging-rebase-sync.sh` for local testing
  - `upstream-stable` is kept clean via fake merge (`git merge -s ours <tag>`)
  - Custom commits are rebased onto new upstream
  - Range-diff auto-detects upstreamed commits to eliminate false conflicts

- **Pre-commit Hooks**: Husky runs linting and formatting on staged files

## Domain Context

### AI/LLM Integration
- Cherry Studio acts as a universal client for multiple LLM providers
- Supports both streaming and non-streaming responses
- Implements token counting and context management
- Handles various model-specific features (thinking/reasoning, tool use, etc.)

### Model Context Protocol (MCP)
- Supports MCP servers for extensibility
- Implements trace logging for MCP operations
- Custom trace packages: `@cherry-studio/mcp-trace`

### Knowledge Base System
- RAG (Retrieval-Augmented Generation) implementation
- Vector embeddings using EmbedJS
- Support for multiple document formats
- Chunking and indexing strategies

### Multi-language Support
- 20+ languages supported via i18next
- Translation scripts for automation (`scripts/auto-translate-i18n.ts`)
- Language detection for auto-translation

## Important Constraints

### Technical Constraints
- **Node Version**: Must be >= 22.0.0
- **Electron Version**: Locked to 37.4.0 for stability
- **macOS Minimum**: 20.1.0 (macOS 11.0)
- **Build System**: Uses Yarn 4.9.1 (Berry)
- **Module System**: CommonJS for main process, ES modules for renderer

### Platform-Specific
- **Windows**: Requires specific native modules for OCR
- **macOS**: Code signing and notarization requirements
- **Linux**: AppImage, deb, rpm distributions

### Performance
- Large dependency tree requires careful bundle optimization
- Uses `rolldown-vite` for faster builds
- Asset unpacking for native modules (`.node` files)

## External Dependencies

### AI Provider APIs
- **OpenAI** - GPT models
- **Anthropic** - Claude models
- **Google** - Gemini models
- **AWS Bedrock** - Multiple model providers
- **Local Models** - Ollama, LM Studio

### Services
- **WebDAV** - File synchronization and backup
- **Notion API** - Note export integration
- **Joplin API** - Note export integration
- **GitHub OAuth** - Copilot authentication

### Native Dependencies
- **Sharp** - Image processing
- **selection-hook** - Text selection functionality
- **@napi-rs/system-ocr** - OCR on Windows/macOS
- **Tesseract.js** - Cross-platform OCR fallback

### Build & Distribution
- **electron-builder** - Application packaging
- **electron-updater** - Auto-update functionality
- **Artifact signing** - Code signing for release builds
