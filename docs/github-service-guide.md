# GitHub API サービス ガイド

## 概要
GitHub APIを使用してイシューの作成、プロジェクトへの紐づけ、イシューの管理を行うサービスです。

## 環境変数設定

以下の環境変数を`.env`ファイルに設定してください：

```bash
GITHUB_PAT=your-github-personal-access-token
GITHUB_ORG=your-github-username-or-org
GITHUB_REPO=your-repository-name
GITHUB_PROJECT_ID=your-project-number
```

### 環境変数の取得方法

1. **GITHUB_PAT**: GitHub Personal Access Token
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - 必要な権限: `repo`, `project`, `issues`

2. **GITHUB_ORG**: GitHubのユーザー名または組織名

3. **GITHUB_REPO**: リポジトリ名

4. **GITHUB_PROJECT_ID**: プロジェクトの番号
   - プロジェクトページのURLから取得: `https://github.com/orgs/your-org/projects/1` → `1`

## 使用方法

### 基本的な使用例

```javascript
const GitHubService = require('./services/githubService');

const githubService = new GitHubService();

// イシューを作成
const issueResult = await githubService.createIssue({
  title: '新しい機能の実装',
  body: 'この機能を実装してください',
  labels: ['enhancement', 'priority-high'],
  assignees: ['username']
});

// イシューをプロジェクトに追加
if (issueResult.success) {
  const projectResult = await githubService.addIssueToProject(issueResult.issue.number);
}

// 一括でイシュー作成とプロジェクト追加
const result = await githubService.createIssueAndAddToProject({
  title: 'バグ修正',
  body: 'このバグを修正してください',
  labels: ['bug'],
  assignees: []
});
```

### テスト機能の使用

```javascript
const GitHubTestService = require('./services/githubTestService');

const testService = new GitHubTestService();

// 設定テスト
const configTest = testService.testConfiguration();
console.log('設定テスト結果:', configTest);

// 全体テスト実行
const fullTest = await testService.runFullTest();
console.log('全体テスト結果:', fullTest);
```

## API リファレンス

### GitHubService

#### `createIssue(issueData)`
イシューを作成します。

**パラメータ:**
- `issueData.title` (string): イシューのタイトル
- `issueData.body` (string): イシューの本文
- `issueData.labels` (Array): ラベル配列（オプション）
- `issueData.assignees` (Array): 担当者配列（オプション）

**戻り値:**
```javascript
{
  success: boolean,
  issue: {
    number: number,
    title: string,
    url: string,
    state: string
  }
}
```

#### `addIssueToProject(issueNumber, projectId)`
イシューをプロジェクトに追加します。

**パラメータ:**
- `issueNumber` (number): イシュー番号
- `projectId` (string): プロジェクトID（オプション）

**戻り値:**
```javascript
{
  success: boolean,
  cardId: string,
  projectId: string
}
```

#### `createIssueAndAddToProject(issueData, projectId)`
イシューを作成してプロジェクトに追加します（一括処理）。

**パラメータ:**
- `issueData` (Object): イシューデータ
- `projectId` (string): プロジェクトID（オプション）

**戻り値:**
```javascript
{
  success: boolean,
  issue: {
    number: number,
    title: string,
    url: string,
    state: string
  },
  project: {
    cardId: string,
    projectId: string
  }
}
```

#### `getIssue(issueNumber)`
イシューを取得します。

**パラメータ:**
- `issueNumber` (number): イシュー番号

**戻り値:**
```javascript
{
  success: boolean,
  issue: {
    number: number,
    title: string,
    body: string,
    state: string,
    url: string,
    labels: Array,
    assignees: Array
  }
}
```

#### `updateIssue(issueNumber, updateData)`
イシューを更新します。

**パラメータ:**
- `issueNumber` (number): イシュー番号
- `updateData` (Object): 更新データ

**戻り値:**
```javascript
{
  success: boolean,
  issue: {
    number: number,
    title: string,
    state: string,
    url: string
  }
}
```

#### `getProject(projectId)`
プロジェクトの情報を取得します。

**パラメータ:**
- `projectId` (string): プロジェクトID（オプション）

**戻り値:**
```javascript
{
  success: boolean,
  project: {
    id: string,
    name: string,
    body: string,
    state: string,
    url: string
  }
}
```

#### `getRepository()`
リポジトリの情報を取得します。

**戻り値:**
```javascript
{
  success: boolean,
  repository: {
    name: string,
    fullName: string,
    description: string,
    url: string,
    owner: string
  }
}
```

#### `getConfig()`
設定情報を取得します。

**戻り値:**
```javascript
{
  owner: string,
  repo: string,
  projectId: string,
  hasToken: boolean
}
```

### GitHubTestService

#### `testConfiguration()`
設定情報をテストします。

**戻り値:**
```javascript
{
  success: boolean,
  config: Object,
  issues: Array
}
```

#### `testRepositoryConnection()`
リポジトリ接続をテストします。

**戻り値:**
```javascript
{
  success: boolean,
  message: string,
  repository: Object
}
```

#### `testProjectConnection()`
プロジェクト接続をテストします。

**戻り値:**
```javascript
{
  success: boolean,
  message: string,
  project: Object
}
```

#### `createTestIssue(title, addToProject)`
テスト用イシューを作成します。

**パラメータ:**
- `title` (string): テストイシューのタイトル
- `addToProject` (boolean): プロジェクトに追加するかどうか

**戻り値:**
```javascript
{
  success: boolean,
  message: string,
  issue: Object,
  project: Object
}
```

#### `runFullTest()`
全体的なテストを実行します。

**戻り値:**
```javascript
{
  success: boolean,
  tests: Array,
  summary: {
    total: number,
    passed: number,
    failed: number
  }
}
```

## エラーハンドリング

すべてのメソッドは以下の形式でエラーを返します：

```javascript
{
  success: false,
  error: "エラーメッセージ"
}
```

## 使用例

### Slack Botとの統合例

```javascript
// app.jsでの使用例
const GitHubService = require('./services/githubService');
const githubService = new GitHubService();

app.message(async ({ message, say }) => {
  if (message.text.startsWith('/create-issue')) {
    const issueData = {
      title: 'Slack Bot経由で作成されたイシュー',
      body: `ユーザー: <@${message.user}>\nメッセージ: ${message.text}`,
      labels: ['slack-bot'],
      assignees: []
    };

    const result = await githubService.createIssueAndAddToProject(issueData);
    
    if (result.success) {
      await say(`✅ イシューを作成しました: ${result.issue.url}`);
    } else {
      await say(`❌ イシュー作成に失敗しました: ${result.error}`);
    }
  }
});
```

## 注意事項

1. **認証**: GitHub Personal Access Tokenには適切な権限が必要です
2. **レート制限**: GitHub APIにはレート制限があります
3. **プロジェクト**: プロジェクトは組織またはユーザーのリポジトリに存在する必要があります
4. **エラーハンドリング**: すべてのAPI呼び出しでエラーハンドリングを実装してください
