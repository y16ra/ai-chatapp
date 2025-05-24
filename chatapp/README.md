# AI Chat Application

A real-time chat application supporting multiple AI models from OpenAI and Anthropic. Features responsive design for optimal experience across desktop, tablet, and mobile devices.

## ✨ Key Features

### 🤖 AI Capabilities
- **Multiple AI Models**: GPT-4o, GPT-4o-mini, o1, o1-mini, Claude-3-7-Sonnet, Claude-3-5-Sonnet, Claude-3-5-Haiku
- **AI Model Comparison**: Compare responses from 4 different models in parallel for the same question
- **Streaming Responses**: Real-time display of AI responses as they generate
- **Message Regeneration**: Regenerate AI responses to get alternative answers

### 💬 Chat Features
- **Multi-Room Support**: Create and manage multiple chat rooms
- **Real-time Sync**: Real-time message synchronization using Firebase Firestore
- **Read Status**: Message read status indicators
- **Favorites**: Save and view favorite AI messages
- **History Management**: Clear chat history functionality

### 📱 UI/UX
- **Responsive Design**: Full support for desktop, tablet, and mobile devices
- **Fixed Header/Footer**: Control panels remain visible while scrolling
- **Mobile Optimization**: Hamburger menu and touch-optimized UI
- **Accessibility**: Screen reader support with ARIA attributes

### 🔐 Authentication & Security
- **Firebase Authentication**: Email/password authentication
- **User Management**: Session management with automatic redirects
- **Data Isolation**: User-specific data separation for security

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **AI APIs**: OpenAI API, Anthropic Claude API
- **Icons**: React Icons
- **State Management**: React Hooks (useState, useContext)

## 🚀 Setup

### 1. Environment Variables

```bash
cp .env.example .env.local
```

Configure the following in `.env.local`:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI APIs
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Features
NEXT_PUBLIC_REGISTRATION_ENABLED=true
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/           # API routes (OpenAI, Claude)
│   ├── auth/          # Authentication pages (login, register)
│   ├── components/    # UI components
│   │   ├── Chat.tsx           # Main chat interface
│   │   ├── Sidebar.tsx        # Sidebar (room management)
│   │   ├── Favorites.tsx      # Favorites list
│   │   └── ModelComparison.tsx # AI model comparison
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Main page
├── constants/
│   └── models.ts      # AI model definitions
└── context/
    └── AppContext.tsx # Global state management
```

## 🗄️ Database Structure

```
Firestore:
├── rooms/{roomId}
│   ├── name: string
│   ├── createdAt: timestamp
│   ├── userId: string
│   └── messages/{messageId}
│       ├── text: string
│       ├── sender: 'user' | 'bot'
│       ├── createdAt: timestamp
│       ├── isRead: boolean
│       └── readAt: timestamp
└── users/{userId}/favorites/{favoriteId}
    ├── messageId: string
    ├── roomId: string
    ├── messageText: string
    ├── createdAt: timestamp
    └── timestamp: timestamp
```

## 🎯 Usage

### Basic Chat
1. Login or create an account
2. Click "New Chat" to create a room
3. Select an AI model
4. Type your message and send

### AI Model Comparison
1. Enter your question in the text area
2. Click the "Model Comparison" button
3. View responses from 4 models in parallel
4. Select specific models to regenerate responses

### Favorites Feature
1. Click the ♥ button on AI messages
2. View favorites list from the sidebar
3. Delete unwanted favorites as needed

## 🔧 Customization

You can add or modify models in `src/constants/models.ts`:

```typescript
export const AI_MODELS: AIModel[] = [
  { value: "gpt-4o", label: "GPT-4o", provider: 'OpenAI' },
  // Add new models here
];
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Bug reports and feature requests are welcome! Please feel free to open issues or submit pull requests.

## 📸 Screenshots

*Coming soon - Screenshots of the application interface*

## 🚀 Deployment

This application can be deployed on Vercel, Netlify, or any platform that supports Next.js applications. Make sure to configure your environment variables in your deployment platform.

---

**Built with ❤️ using Next.js and Firebase**
