# チャットコンテクスト機能（ChatSession実装）

## 概要
[Google AI Developers Forum](https://discuss.ai.google.dev/t/gemini-chat-history/5933)の情報を参考に、Gemini APIの`ChatSession.history`と同様の機能を実装しました。これにより、Botは会話の流れを理解し、より自然で一貫性のある対話が可能になります。

## 実装した機能

### 1. ChatSession風の実装
- チャンネルごとにChatSessionインスタンスを管理
- 自動的な会話履歴の保存と管理
- Gemini APIの`ChatSession.history`と同様のAPI設計

### 2. 効率的な履歴管理
- メモリベースのストレージ（最大50件/チャンネル）
- 自動的な古い履歴の削除
- 最大100セッションの管理（メモリ使用量制限）

### 3. Gemini APIとの統合
- 過去の会話履歴を含めてGemini APIを呼び出し
- 会話の文脈を理解した応答を生成
- デフォルトで最新10件の履歴を使用

### 4. 管理機能
- `/clear-context` コマンド: チャンネルの会話履歴をクリア
- `/context-stats` コマンド: ChatSession統計情報を表示

## ファイル構成

### 新規作成ファイル
- `services/chatSession.js` - ChatSession風の実装
- `services/chatSessionManager.js` - ChatSession管理マネージャー
- `services/contextStorage.js` - 会話履歴の保存・管理（レガシー）
- `services/contextManager.js` - コンテクスト管理の高レベルAPI（レガシー）
- `docs/context-feature.md` - このドキュメント

### 更新ファイル
- `services/geminiService.js` - ChatSession用のAPI呼び出しに対応
- `app.js` - ChatSessionManagerを使用した実装に更新

## 使用方法

### 基本的な使用
1. 通常通りBotにメッセージを送信
2. Botは過去の会話履歴を参照して応答を生成
3. 会話が続くほど、より文脈を理解した応答が可能

### 管理コマンド
- `/clear-context` - 現在のチャンネルの会話履歴をクリア
- `/context-stats` - 会話履歴の統計情報を表示

## 技術仕様

### データ構造
```javascript
// 会話履歴の構造
{
  role: 'user' | 'assistant',
  content: string,
  timestamp: number
}
```

### Gemini API形式
```javascript
// Gemini API用の会話履歴形式
[
  {
    role: 'user' | 'model',
    parts: [{ text: string }]
  }
]
```

### 設定可能なパラメータ
- `maxHistoryPerChannel`: チャンネルあたりの最大履歴数（デフォルト: 50）
- `historyLimit`: API呼び出し時の履歴取得数（デフォルト: 10）

## 注意事項

1. **メモリ使用量**: 現在はメモリベースの実装のため、大量の会話がある場合はメモリ使用量が増加します
2. **永続化**: アプリケーション再起動時に会話履歴は失われます
3. **本番環境**: 本番環境ではデータベースを使用することを推奨します

## 今後の改善案

1. データベースへの永続化
2. 会話履歴の圧縮・要約機能
3. ユーザーごとの会話履歴管理
4. 会話履歴の検索機能
5. 自動的な古い履歴の削除機能
