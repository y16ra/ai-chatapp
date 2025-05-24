# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Working directory: `chatapp/`

```bash
# Development
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Environment setup
cp .env.example .env.local    # Copy environment template
```

## Architecture Overview

**Core Pattern**: Context-driven Next.js app with Firebase backend and dual AI provider integration

**Key Components:**
- `AppContext.tsx` - Global state management (user auth, room selection)
- `Chat.tsx` - Message interface with AI model selection
- `Sidebar.tsx` - Room management and user controls
- `firebase.ts` - Firebase configuration and exports

**Authentication Flow:**
- Firebase Auth with email/password
- Auto-redirect for unauthenticated users
- Session persistence via `onAuthStateChanged`

**Data Structure:**
```
Firestore:
rooms/{roomId} → { name, createdAt, userId }
  └── messages/{messageId} → { text, sender, createdAt }
```

**AI Integration:**
- `/api/openai` - GPT models (4o, 4o-mini, o1, o1-mini)
- `/api/claude` - Claude models (3-7-Sonnet, 3-5-Sonnet, 3-5-Haiku)
- Client-side routing based on model selection
- Full conversation context sent with each request

**Real-time Sync:**
- Firestore `onSnapshot` for live message updates
- Messages auto-scroll and input auto-resizes
- Room switching updates global context

## Environment Variables

Required in `chatapp/.env.local`:
- Firebase: API key, auth domain, project ID, etc.
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_REGISTRATION_ENABLED` (true/false)

## Project Structure

- `src/app/api/` - API routes for AI providers and room management
- `src/app/auth/` - Login/register pages
- `src/app/components/` - Main UI components
- `src/context/` - React context providers