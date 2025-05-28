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
- `/api/openai` - GPT models (4.1, 4.1-mini, 4.1-nano, legacy models)
- `/api/claude` - Claude models (Sonnet 4, 3-5-Haiku) with web search capability
- Client-side routing based on model selection
- Full conversation context sent with each request
- **Web Search Tool**: Claude models support real-time web search via `web_search_20250305` tool

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

### Latest Work Completed (2025/5/29)
- **Feature**: Claude Web Search Tool統合 (commit: 415876c)
  - 新機能：Claude APIの`web_search_20250305` tool実装
  - UI改善：Claudeモデル限定でweb検索オン/オフのチェックボックス追加
  - 性能向上：max_tokens 1000→4000（web検索時6000）に増加
  - ストリーミング対応：tool_useイベント処理で検索進行状況表示
  - モデル更新：Claude Sonnet 4、GPT-4.1シリーズ対応
  - 変更ファイル：`route.ts` (+116/-25), `Chat.tsx` (+30/-4), `models.ts` (+8/-2)
  - 主な機能：リアルタイム最新情報検索、🔍検索中表示、完全な検索結果回答生成

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

### Recent Work Completed (2024/12/30 - レスポンシブ&モデル比較&PRレビュー対応)
- **Feature**: レスポンシブデザイン改善とAIモデル比較機能を実装
  - レスポンシブデザイン：固定幅→完全レスポンシブ、モバイル用ハンバーガーメニュー実装
  - AIモデル比較機能：4つのモデル(GPT-4o/mini, Claude-3-5-Sonnet/Haiku)で並列実行
  - チャットヘッダー固定表示：スクロール時もコントロール部分が常に見える
  - 新規ファイル：`src/app/components/ModelComparison.tsx`, `src/constants/models.ts`
  - 変更ファイル：`src/app/page.tsx`, `src/app/components/Chat.tsx`, `src/app/components/Sidebar.tsx`

- **PRレビュー対応**: コードレビューフィードバックに基づく品質向上
  - `bg-custom-blue`未定義クラスを`bg-blue-900`に修正
  - モデル定義を一元化（`constants/models.ts`）してDRY原則に準拠
  - TypeScript型安全性向上：`ComparisonResult`型を明示的に使用
  - アクセシビリティ改善：ハンバーガーメニューに`aria-label`、`aria-expanded`属性追加
  - セマンティックHTML：サイドバーを`<nav>`要素に変更

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
- ✅ レスポンシブデザイン（モバイル対応完了）
- ✅ AIモデル比較機能（4モデル並列実行）
- ✅ 固定ヘッダー/フッター（スクロール時の操作性向上）
- ✅ **Web検索機能（Claudeモデル限定）** - リアルタイム最新情報取得

## Next Actions

### 優先度高：実装推奨機能
1. **Web検索機能の拡張** ✅ **完了 (2025/5/29)**
   - Claude APIのweb_search_20250305 tool統合
   - UI: Claudeモデル限定チェックボックス
   - ストリーミング対応とmax_tokens最適化
   
2. **AIモデル更新** ✅ **部分完了 (2025/5/29)**
   
   **実装済みモデル:**
   | Provider | 実装済み | 状況 |
   |----------|----------|------|
   | OpenAI | gpt-4.1, gpt-4.1-mini, gpt-4.1-nano | 最新モデル対応済み |
   | Anthropic | claude-sonnet-4-20250514 | 最新モデル対応済み |
   | Anthropic | claude-3-5-haiku-latest | 継続サポート |
   
   **追加検討:**
   - レガシーモデルの段階的廃止
   - 新モデルの性能・コスト特性の最適化
   
3. **コードブロック シンタックスハイライト** - コード表示の改善
4. **メッセージ検索機能** - 過去の会話を効率的に検索
5. **メッセージ編集機能** - 送信済みメッセージの修正
6. **ダークモード切り替え** - UI/UX改善

### 中長期的な機能拡張
- ファイルアップロード対応
- 画像解析機能
- 会話エクスポート機能
- システムプロンプト設定

### 技術的考慮事項
- **Web検索機能の運用**:
  - Anthropic Consoleでのweb search tool有効化確認
  - max_tokens設定（通常4000、web検索時6000）の監視
  - tool_useイベントのストリーミング処理安定性
  - 検索クエリ最適化とレート制限管理
- **AIモデル更新時の注意点**:
  - 新モデルのAPI仕様変更への対応
  - モデル別レート制限とコスト構造の確認
  - 既存会話への後方互換性の維持
  - モデル比較機能の対象モデル見直し
- 検索機能実装時はFirestore full-text searchの制限を考慮
- シンタックスハイライトは`react-syntax-highlighter`ライブラリの導入を検討
- 大量メッセージでのパフォーマンス最適化が必要
- モデル比較機能のAPI使用量監視とコスト管理
- アクセシビリティ対応の継続的改善
- TypeScript型安全性の向上（`any`型の削除）