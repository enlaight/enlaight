# Frontend Architecture & Documentation

## Overview

The Enlaight frontend is a modern, responsive React application built with **TypeScript** and **Vite**. It provides a comprehensive user interface for managing projects, agents (bots), knowledge bases, chat sessions, dashboards, and user administration.

**Technology Stack:**
- **Framework**: React 18+
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI based)
- **State Management**: TanStack React Query, Zustand (custom store)
- **API Communication**: Axios
- **Testing**: Vitest with jsdom
- **Styling**: Tailwind CSS + PostCSS
- **Internationalization**: i18next

**Port**: 8080 (locally)

---

## Directory Structure

```
frontend/src/
├── App.tsx                 # Main app component
├── main.tsx               # Vite entry point
├── index.css              # Global styles
├── App.css                # App-level styles
├── assets/                # Static assets (SVGs, images)
│   └── svgs.tsx          # SVG component library
├── components/            # Reusable UI components
│   ├── AddBotModal.tsx
│   ├── AddChartModal.tsx
│   ├── AddClientModal.tsx
│   ├── AddProjectModal.tsx
│   ├── BotDisplayItem.tsx
│   ├── AgentsCard.tsx     # Bot/agent display
│   ├── AgentsChatMount.tsx  # Chat widget integration
│   ├── [More modal/card components...]
│   └── FloatingSidebarToggle.tsx
├── contexts/              # React Context for state sharing
├── hooks/                 # Custom React hooks
├── integrations/          # Third-party integrations
├── lib/                   # Utility functions and helpers
├── locales/               # i18n translation files
├── pages/                 # Page-level components
├── routes/                # Route definitions (React Router)
├── services/              # API service classes
│   ├── api.ts            # Axios instance & configuration
│   ├── AuthService.ts    # Authentication/JWT
│   ├── BotService.ts     # Agent/bot API calls
│   ├── ProjectService.ts # Project API calls
│   ├── ClientService.ts  # Client API calls
│   ├── KnowledgeBaseService.ts  # KB API calls
│   ├── ChatSessionService.ts    # Chat session API calls
│   ├── UserService.ts    # User management API calls
│   ├── [More services...]
│   └── TranslationService.ts    # Translation API
├── store/                 # State management (Zustand)
└── types/                 # TypeScript type definitions
```

---

## Key Components

### 1. Authentication Flow

**AuthService.ts**
- Handles user login/logout
- JWT token management (access + refresh tokens)
- Token storage and retrieval
- Password reset flows

**Login Process:**
1. User enters credentials (email/password)
2. Frontend calls `AuthService.login(email, password)`
3. Backend validates credentials, returns `access_token` + `refresh_token`
4. Tokens stored: access_token in memory, refresh_token in httpOnly cookie
5. User redirected to dashboard

**Token Refresh:**
- On API 401 response, axios interceptor automatically refreshes token
- New access_token obtained via refresh_token
- Original request retried with new token

### 2. API Layer (services/)

All API communication goes through typed service classes:

**Example: BotService.ts**
```typescript
class BotService {
  // Get all bots
  async getBots(): Promise<Bot[]>
  
  // Create bot
  async createBot(data: BotCreatePayload): Promise<Bot>
  
  // Update bot
  async updateBot(botId: string, data: BotUpdatePayload): Promise<Bot>
  
  // Delete bot
  async deleteBot(botId: string): Promise<void>
}
```

**Key Services:**
- **AuthService**: Login, logout, token management
- **BotService**: Agent/bot CRUD operations
- **ProjectService**: Project management, user assignment
- **KnowledgeBaseService**: KB creation, file upload, deletion
- **ChatSessionService**: Chat history, message persistence
- **ClientService**: Client/organization management
- **UserService**: User administration, invites
- **TranslationService**: Multi-language support

### 3. Component Hierarchy

**Layout Components:**
- `App.tsx` - Root component with router
- `FloatingSidebarToggle.tsx` - Navigation sidebar
- Page containers (from `pages/`)

**Feature Components:**
- **Bot Management**
  - `AgentsCard.tsx` - Display available bots
  - `BotDisplayItem.tsx` - Individual bot card
  - `BotManagementModal.tsx` - Bot CRUD modal
  - `AddBotModal.tsx` - Create new bot
  - `EditBotModal.tsx` - Bot editing
  - `AgentsChatMount.tsx` - Embed n8n chat widget

- **Project Management**
  - `AddProjectModal.tsx` - Create project
  - `EditProjectModal.tsx` - Edit project
  - `AttachUserToProjectsModal.tsx` - Assign users

- **Knowledge Bases**
  - `AddEditKBModal.tsx` - Create/edit KB
  - `ManageFilesModal.tsx` - KB file management

- **User Management**
  - `AddUserModal.tsx` - Create user
  - `InviteUserModal.tsx` - Send invitations
  - `UserProfileModal.tsx` - User settings

- **Charts & Dashboards**
  - `AddChartModal.tsx` - Create chart
  - `EditChartModal.tsx` - Chart editing

### 4. State Management

**TanStack Query (React Query)**
- Handles server state (API data caching)
- Automatic refetching, background synchronization
- Example:
  ```typescript
  const { data: bots, isLoading } = useQuery({
    queryKey: ['bots'],
    queryFn: () => BotService.getBots()
  });
  ```

**Zustand Store (Custom)**
- Client-side state (UI state, user preferences)
- Lightweight alternative to Redux

**React Context**
- Share authentication state across app
- Provide current user information to components

### 5. n8n Chat Integration

**AgentsChatMount.tsx**
- Embeds `@n8n/chat` widget
- Displays chat interface for bot interactions
- Takes bot webhook URL (`url_n8n`) from database
- Allows real-time conversation with agent/bot

```typescript
<N8nChat
  chatInputKey={botId}
  webhookUrl={bot.url_n8n}
  webhookConfig={webhookConfig}
/>
```

### 6. Modal System

All create/edit operations use modal dialogs:
- **AddBotModal** - Create new agent
- **AddProjectModal** - Create new project
- **AddUserModal** - Create/invite user
- **ManageFilesModal** - Upload KB files
- **AddChartModal** - Create dashboard chart

Modals are typically controlled by a context/store that manages visibility.

---

## Routing Architecture

React Router manages application navigation:

**Main Routes:**
- `/projects` - Project dashboard
- `/projects/:id` - Project detail
- `/bots` - Bot/agent management
- `/knowledge-bases` - KB management
- `/chat/:botId` - Chat with bot
- `/dashboards` - Analytics & charts
- `/users` - User administration
- `/settings` - Application settings
- `/login` - Authentication page
- `/invite/:token` - Invitation acceptance

Protected routes check JWT token validity before rendering.

---

## Build & Development

### Development Mode
```bash
npm run devmode  # Start dev server on port 8080 with hot reload
npm run dev      # Staging environment
npm run test     # Run Vitest
npm run lint     # Run ESLint
```

### Production Build
```bash
npm run build    # Create optimized production bundle
npm run build:dev  # Production build with dev source maps
npm run preview  # Preview production build locally
```

### Build Configuration (vite.config.ts)
```typescript
- Port: 8080
- Alias: @ → src/
- Test environment: jsdom (browser simulation)
- Global test APIs (no import needed)
- Component tagger for Lovable integration
```

---

## API Integration

### Axios Configuration (api.ts)

```typescript
const apiClient = axios.create({
  baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 10000
});

// Add JWT token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token and retry
    }
  }
);
```

### Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8000/api    # Backend API endpoint
VITE_N8N_CHAT_URL=http://localhost:5678/webhook/<code>/chat
VITE_N8N_SUPPORT_ASSISTANT_URL=http://localhost:5678/webhook/<code>/chat
```

---

## Key Features

### 1. Project-Based Multi-Tenancy
- Users assigned to projects
- Can only access assigned projects
- Admins see all projects
- Projects contain bots, KBs, and users

### 2. Bot/Agent Management
- Create, edit, delete agents
- Configure webhook URLs (from n8n)
- Assign to projects
- Categorize by expertise area
- Embed n8n chat widget for interaction

### 3. Knowledge Base Management
- Create multiple knowledge bases
- Upload files (PDF, DOCX, CSV, etc.)
- Link KBs to projects
- File operations proxied to backend → n8n

### 4. Chat Sessions
- Message history tracking
- Favorite chat items
- User-specific chat sessions
- Real-time bot interaction via webhooks

### 5. User & Client Management
- Create users and admins
- Send invitations via email
- Manage client/organization records
- Role-based access (ADMIN, USER, GUEST)

### 6. Dashboards & Analytics
- Superset integration for embedded dashboards
- Chart management
- Data visualization
- Analytics queries

### 7. Search Functionality
- Global search across projects, bots, KBs
- Filter and pagination support

### 8. Internationalization (i18n)
- Multi-language support via i18next
- Translation lookup service
- Batch translation API
- Language detection and selection

---

## Component Communication Flow

```
User Input (Component)
    ↓
Event Handler
    ↓
Service Call (e.g., BotService.createBot)
    ↓
API Request (axios interceptors add JWT token)
    ↓
Backend Response
    ↓
TanStack Query / State Update
    ↓
Component Re-render
    ↓
UI Update
```

---

## Error Handling

**Frontend Error Strategy:**
1. API errors caught by axios interceptor
2. Error messages displayed to user via toast/modal
3. Failed authentication triggers logout + redirect to login
4. Network errors show retry options
5. Validation errors from backend displayed in forms

**Example:**
```typescript
try {
  const bot = await BotService.createBot(data);
  // Success toast
} catch (error) {
  // Error toast with user-friendly message
  if (error.status === 401) {
    // Logout and redirect
  }
}
```

---

## Performance Optimization

- **Code Splitting**: Route-based chunks via React Router
- **Lazy Loading**: Components loaded on-demand
- **Query Caching**: TanStack Query caches API responses
- **Image Optimization**: SVG components, lazy image loading
- **CSS Optimization**: Tailwind purges unused styles
- **Minification**: Vite production build minifies all assets

---

## Testing

**Vitest Setup (vitest.setup.ts)**
- jsdom environment (browser simulation)
- Global test APIs
- Component testing with React Testing Library
- Mock API calls with MSW (Mock Service Worker)

```bash
npm run test      # Run all tests
npm run test -- --watch  # Watch mode
npm run test -- --coverage  # Coverage report
```

---

## TypeScript Support

**Type Definitions** (`types/`)
- API response types
- Component prop types
- Service interface types
- Redux/Context types
- Form data types

All services use TypeScript for type safety and IDE autocompletion.

---

## Deployment

### Production Build Checklist
- [ ] Update `VITE_API_BASE_URL` to production API
- [ ] Set `VITE_N8N_CHAT_URL` to production n8n
- [ ] Run `npm run lint` - ensure no warnings
- [ ] Run `npm run build` - test production build
- [ ] Review bundle size (target < 500KB gzipped)
- [ ] Test all authentication flows
- [ ] Verify API connectivity
- [ ] Test on target browsers

### Docker Build
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "run", "devmode"]
```

---

## Common Tasks

### Adding a New Page
1. Create component in `pages/YourPage.tsx`
2. Add route in `routes/`
3. Add navigation link in sidebar
4. Implement API calls via service

### Adding a New Modal
1. Create modal component `AddXModal.tsx`
2. Add state/context for visibility
3. Implement form with validation
4. Connect to service API call

### Adding API Service
1. Create `XService.ts` in `services/`
2. Define TypeScript interfaces
3. Implement methods using `apiClient`
4. Export singleton instance

### Styling New Component
1. Use Tailwind classes for styling
2. Import shadcn/ui components as needed
3. Keep components responsive (mobile-first)
4. Use CSS modules if custom styles needed

