# システムインストラクション機能 ガイド

## 概要
[Gemini API の公式ドキュメント](https://ai.google.dev/gemini-api/docs/text-generation#system-instructions)に基づいて、外部ファイル化されたシステムインストラクション機能を実装しました。これにより、Botの動作を詳細に制御し、一貫性のある応答を提供できます。

## 機能

### 1. 外部ファイル管理
- `config/system-instructions.md` ファイルからシステムインストラクションを読み込み
- ファイルの更新時刻を監視し、自動的に再読み込み
- キャッシュ機能により、パフォーマンスを最適化

### 2. 動的更新
- Slackコマンドからシステムインストラクションを更新可能
- リアルタイムでの動作変更
- デフォルト設定へのリセット機能

### 3. 統合機能
- マルチターン会話にシステムインストラクションを自動統合
- 会話履歴と組み合わせた一貫性のある応答
- システムインストラクションの有効/無効切り替え

## ファイル構成

### 新規作成ファイル
- `config/system-instructions.md` - システムインストラクションファイル
- `services/systemInstructionService.js` - システムインストラクション管理サービス
- `docs/system-instructions-guide.md` - このドキュメント

### 更新ファイル
- `services/geminiService.js` - システムインストラクション統合機能を追加
- `app.js` - システムインストラクション管理コマンドを追加

## 使用方法

### 1. 基本的な使用

システムインストラクションは自動的に適用されます。特別な設定は不要です。

```javascript
// 通常のメッセージ処理でシステムインストラクションが自動適用される
const response = await geminiService.generateContentWithHistory(message, history);
```

### 2. システムインストラクションの無効化

特定のケースでシステムインストラクションを無効にしたい場合：

```javascript
const response = await geminiService.generateContentWithHistory(message, history, false);
```

### 3. Slackコマンド

#### システムインストラクションの表示
```
/system-instruction
```
現在のシステムインストラクションの内容と情報を表示します。

#### システムインストラクションの更新
```
/update-system-instruction あなたは親切なAIアシスタントです。
```
システムインストラクションを新しい内容で更新します。

#### システムインストラクションのリセット
```
/reset-system-instruction
```
システムインストラクションをデフォルト設定にリセットします。

## API リファレンス

### SystemInstructionService

#### `loadSystemInstruction(forceReload)`
システムインストラクションファイルを読み込みます。

**パラメータ:**
- `forceReload` (boolean): 強制再読み込み（デフォルト: false）

**戻り値:**
```javascript
Promise<string> // システムインストラクションの内容
```

#### `formatForGeminiAPI(instruction)`
システムインストラクションをGemini API用の形式に変換します。

**パラメータ:**
- `instruction` (string): システムインストラクション

**戻り値:**
```javascript
{
  role: 'user',
  parts: [{ text: 'システムインストラクション:\n...' }]
}
```

#### `integrateWithConversation(conversationHistory, systemInstruction)`
システムインストラクションを会話履歴に統合します。

**パラメータ:**
- `conversationHistory` (Array): 会話履歴
- `systemInstruction` (string): システムインストラクション

**戻り値:**
```javascript
Array // システムインストラクション統合済みの会話履歴
```

#### `updateSystemInstruction(newInstruction)`
システムインストラクションを更新します。

**パラメータ:**
- `newInstruction` (string): 新しいシステムインストラクション

**戻り値:**
```javascript
Promise<boolean> // 更新成功フラグ
```

#### `resetSystemInstruction()`
システムインストラクションをデフォルトにリセットします。

**戻り値:**
```javascript
Promise<boolean> // リセット成功フラグ
```

### GeminiService

#### `generateContentWithHistory(message, history, useSystemInstruction)`
マルチターン会話でメッセージを生成します。

**パラメータ:**
- `message` (string): 送信するメッセージ
- `history` (Array): 会話履歴
- `useSystemInstruction` (boolean): システムインストラクションを使用するか（デフォルト: true）

**戻り値:**
```javascript
Promise<string> // Geminiからの応答テキスト
```

#### `getSystemInstruction(forceReload)`
システムインストラクションを取得します。

**パラメータ:**
- `forceReload` (boolean): 強制再読み込み（デフォルト: false）

**戻り値:**
```javascript
Promise<string> // システムインストラクションの内容
```

#### `updateSystemInstruction(newInstruction)`
システムインストラクションを更新します。

**パラメータ:**
- `newInstruction` (string): 新しいシステムインストラクション

**戻り値:**
```javascript
Promise<boolean> // 更新成功フラグ
```

#### `resetSystemInstruction()`
システムインストラクションをリセットします。

**戻り値:**
```javascript
Promise<boolean> // リセット成功フラグ
```

#### `getSystemInstructionInfo()`
システムインストラクションの情報を取得します。

**戻り値:**
```javascript
{
  path: string,
  cached: boolean,
  lastModified: string | null,
  hasFile: boolean
}
```

## システムインストラクションファイルの形式

`config/system-instructions.md` ファイルはMarkdown形式で記述します：

```markdown
# システムインストラクション

あなたはSlack Botとして動作するAIアシスタントです。

## 基本的な役割
- ユーザーの質問や要求に対して、親切で正確な回答を提供する
- 技術的な質問には専門的な知識を活用して回答する

## 応答の形式
- 日本語で回答する
- 必要に応じてコードブロックやリストを使用して見やすく整理する

## 特別な機能
### GitHub統合
- ユーザーが承認した提案は、自動的にGitHubイシューとして作成される

### チャット履歴の活用
- 過去の会話内容を参照して、一貫性のある回答を提供する
```

## 設定例

### 1. 基本的な設定

```markdown
あなたはSlack Botとして動作するAIアシスタントです。ユーザーの質問や要求に対して、親切で正確な回答を提供してください。
```

### 2. 詳細な設定

```markdown
# システムインストラクション

あなたはSlack Botとして動作するAIアシスタントです。

## 基本的な役割
- ユーザーの質問や要求に対して、親切で正確な回答を提供する
- 技術的な質問には専門的な知識を活用して回答する
- 不明な点がある場合は、素直に「分からない」と答える

## 応答の形式
- 日本語で回答する
- 必要に応じてコードブロックやリストを使用して見やすく整理する
- 長い回答の場合は、要点をまとめて段階的に説明する

## 特別な機能
### GitHub統合
- ユーザーが承認した提案は、自動的にGitHubイシューとして作成される
- イシューには適切なラベルが付与される

### チャット履歴の活用
- 過去の会話内容を参照して、一貫性のある回答を提供する
- ユーザーの文脈や状況を理解して、より適切な提案を行う

## 注意事項
- プライバシーや機密情報に関わる内容は扱わない
- 不適切な内容や有害な情報は提供しない
- ユーザーの感情や状況に配慮した回答を心がける
```

## ベストプラクティス

### 1. システムインストラクションの設計
- 明確で具体的な指示を記述する
- Botの役割と責任を明確に定義する
- 応答の形式とスタイルを統一する
- 特別な機能や制約を明記する

### 2. ファイル管理
- 定期的にシステムインストラクションを見直す
- バージョン管理システムでファイルを管理する
- 変更履歴を記録する

### 3. テストと検証
- システムインストラクション変更後は動作を確認する
- 様々なシナリオでテストする
- ユーザーフィードバックを収集する

## トラブルシューティング

### よくある問題

1. **システムインストラクションが適用されない**
   - ファイルパスが正しいか確認
   - ファイルの読み取り権限を確認
   - キャッシュをクリアして再読み込み

2. **更新が反映されない**
   - ファイルの更新時刻を確認
   - 強制再読み込みを実行
   - アプリケーションを再起動

3. **エラーが発生する**
   - ログを確認してエラー内容を特定
   - ファイルの形式が正しいか確認
   - 権限設定を確認

### デバッグ方法

```javascript
// システムインストラクションの情報を確認
const info = geminiService.getSystemInstructionInfo();
console.log('System instruction info:', info);

// 強制再読み込み
const instruction = await geminiService.getSystemInstruction(true);
console.log('Current instruction:', instruction);
```

## 注意事項

1. **ファイルパス**: システムインストラクションファイルは `config/system-instructions.md` に配置してください
2. **権限**: ファイルの読み取り・書き込み権限が必要です
3. **エンコーディング**: ファイルはUTF-8エンコーディングで保存してください
4. **バックアップ**: 重要な設定変更前はバックアップを取ってください
5. **テスト**: 本番環境での変更前は必ずテスト環境で検証してください
