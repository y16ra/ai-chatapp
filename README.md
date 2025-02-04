# AI Chat App

This is a chat application built with Next.js, TypeScript, and Firebase.

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

- Next.js - React framework
- TypeScript - Type safety
- Firebase - Backend services
- Tailwind CSS - Styling

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

You can obtain these values from:
- Firebase: Firebase Console > Project Settings > General
- OpenAI: OpenAI Dashboard > API Keys
