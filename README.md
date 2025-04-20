# AI Chat App

This is a chat application built with Next.js, TypeScript, and Firebase.

## Features

- Create a chat application using AI.
- Utilize OpenAI API and Anthropic API.
- Allow users to select and use different AI models.
- Implement user registration and login functionality.
- Save and display chat history.
- Create chat rooms and save/display chats per room.

## Project Structure

```
.
├── chatapp/                 # Main application directory
│   ├── src/                # Source code
│   ├── public/             # Static files
│   ├── .next/             # Next.js build output
│   ├── firebase.ts        # Firebase configuration
│   ├── next.config.mjs    # Next.js configuration
│   ├── tailwind.config.ts # Tailwind CSS configuration
│   ├── postcss.config.mjs # PostCSS configuration
│   ├── tsconfig.json      # TypeScript configuration
│   ├── .env.example       # Example environment variables
│   ├── .env.local         # Local environment variables (not in repository)
│   └── package.json       # Project dependencies and scripts
├── .editorconfig          # Editor configuration
├── .gitignore            # Git ignore rules
├── LICENSE               # License file
├── package.json          # Root package.json
└── README.md            # This file
```

## Technologies Used

### Frontend
- **Next.js (v14.2.25)**: React-based full-stack framework.
- **React (v18)**: UI library.
- **TypeScript (v5)**: Language for type-safe development.
- **Tailwind CSS (v3.4.17)**: Utility-first CSS framework.

### Backend/Infrastructure
- **Firebase (v11.4.0)**: Google's backend service.
- **OpenAI API (v4.87.4)**: Used for AI functionalities.
- **Anthropic API (v0.39.0)**: Used for AI functionalities.

### Development Tools
- **ESLint (v8)**: Maintains code quality and style.
- **PostCSS (v8)**: CSS transformation and optimization.
- **React Hook Form (v7.54.2)**: Form handling library.
- **React Icons (v5.5.0)**: Icon library.
- **React Loading Icons (v1.1.0)**: Loading animations.

## Data Structure

### Firestore Data Model

The application uses the following Firestore data structure:

```
rooms (Collection)
└── {roomId} (Document)
    ├── name: string       # Room name
    ├── createdAt: timestamp # Creation date and time
    ├── userId: string     # Creator's UID
    └── messages (Sub-collection)
        └── {messageId} (Document)
            ├── text: string   # Message content
            ├── sender: string # Sender type ("user" or "bot")
            └── createdAt: timestamp # Message creation date and time
```

#### Collections and Documents

1. **rooms Collection**
   - Each document represents a chat room
   - Contains basic room information and a messages sub-collection
   - Documents are identified by auto-generated IDs

2. **messages Sub-collection**
   - Nested under each room document
   - Each document represents a single message in the chat
   - Messages are ordered by creation timestamp
   - Supports both user messages and AI responses

This structure allows for:
- Individual chat rooms per user
- Separate message history for each room
- Efficient querying of messages within a specific room
- Real-time updates using Firestore listeners

## Environment Setup

The application requires several environment variables to be set up. These variables are stored in `.env.local` file, which is not included in the repository for security reasons.

1. Copy the example environment file:
```bash
cd chatapp
cp .env.example .env.local
```

2. Update the following variables in `.env.local`:

### Firebase Configuration
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Your Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Your Firebase app ID
- `NEXT_PUBLIC_REGISTRATION_ENABLED`: Set to `true` to enable user registration

### OpenAI Configuration
- `OPENAI_API_KEY`: Your OpenAI API key

### Anthropic Configuration
- `ANTHROPIC_API_KEY`: Your Anthropic API key

You can obtain these values from:
- Firebase: Firebase Console > Project Settings > General
- OpenAI: OpenAI Dashboard > API Keys
- Anthropic: Anthropic Dashboard > API Keys
