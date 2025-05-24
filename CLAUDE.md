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
  └── messages/{messageId} → { text, sender, createdAt, isRead, readAt }
users/{userId}/favorites/{favoriteId} → { messageId, roomId, messageText, createdAt, timestamp }
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

## Current Status

### Recent Work Completed (2025/5/24)
- **Feature**: AIレスポンスの再生成機能を追加し、メッセージ表示を改善 (commit: 4f9af6b)
  - 新機能：AIメッセージの再生成ボタンを実装
  - 変更ファイル：`chatapp/src/app/components/Chat.tsx` (+162 lines)
  - 主な機能：最後のAIメッセージに再生成ボタンを表示、ストリーミング対応
- **Feature**: チャットメッセージに既読機能を追加し、タイムスタンプのフォーマットを改善 (commit: 7c37557)
- **Feature**: ストリーミング応答機能を追加し、チャットコンポーネントを更新 (commit: b083ecc)
- **Feature**: CLAUDE.mdを追加し、開発コマンドやアーキテクチャ概要を記載 (commit: 1ea2201)

### Today's Bug Fix Session
- **Issue**: 最後のAIメッセージ以外の再生成ボタンを押すと、生成されたメッセージに再生成ボタンが表示されない
- **Solution**: `Chat.tsx:424-446`の再生成ボタン表示条件を修正
- **Technical**: 最後のbotメッセージかどうかの判定ロジック(`isLastBotMessage`)を追加

### Recent Work Completed (2025/5/24 - お気に入り機能実装)
- **Feature**: AIメッセージお気に入り機能を実装
  - 新機能：AIメッセージにハートボタンを追加し、お気に入り登録/削除が可能
  - 追加ファイル：`src/app/components/Favorites.tsx` (お気に入り一覧表示コンポーネント)
  - 変更ファイル：`src/app/components/Chat.tsx` (お気に入りボタンとAPI機能追加)
  - 変更ファイル：`src/app/components/Sidebar.tsx` (お気に入り表示ボタン追加)
  - データ構造：`users/{userId}/favorites/{favoriteId}` - メッセージID、ルームID、本文、タイムスタンプを保存
  - 主な機能：リアルタイム同期、お気に入り一覧表示、削除機能、メッセージ短縮表示

### Current Features Analysis
- ✅ マルチルーム対応
- ✅ 複数AIモデル対応（OpenAI/Claude）
- ✅ ストリーミング応答
- ✅ メッセージ再生成（修正済み）
- ✅ 既読機能
- ✅ 履歴クリア
- ✅ お気に入り機能（AIメッセージの保存・一覧表示）

## Next Actions

### 優先度高：実装推奨機能
1. **コードブロック シンタックスハイライト** - コード表示の改善
2. **メッセージ検索機能** - 過去の会話を効率的に検索
3. **メッセージ編集機能** - 送信済みメッセージの修正
4. **ダークモード切り替え** - UI/UX改善

### 中長期的な機能拡張
- ファイルアップロード対応
- 画像解析機能
- 会話エクスポート機能
- システムプロンプト設定

### 技術的考慮事項
- 検索機能実装時はFirestore full-text searchの制限を考慮
- シンタックスハイライトは`react-syntax-highlighter`ライブラリの導入を検討
- 大量メッセージでのパフォーマンス最適化が必要