# Node.js GitHub API 実行ガイド

## 概要
Node.jsサーバー上でGitHub APIを使用してイシューを作成し、プロジェクトに自動連携するための完全なガイドです。

## 前提条件

### 1. 必要なパッケージ
```bash
npm install axios dotenv
# または
npm install node-fetch dotenv
# または
npm install @octokit/rest dotenv
```

### 2. 環境変数の設定
`.env` ファイルを作成：
```env
GITHUB_PAT=<<GITHUB_PAT>>
GITHUB_ORG=Adobe-ACS-JAPAN
GITHUB_REPO=Hackathon2025-TeamC
GITHUB_PROJECT_ID=PVT_kwDOCgNtjs4BBkvd
GITHUB_PROJECT_NUMBER=19
```

## 実装方法

### 方法1: Axios を使用した実装

#### package.json
```json
{
  "name": "github-api-integration",
  "version": "1.0.0",
  "description": "GitHub API integration for issue and project management",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

#### github-api.js (Axios版)
```javascript
const axios = require('axios');
require('dotenv').config();

class GitHubAPI {
  constructor() {
    this.token = process.env.GITHUB_PAT;
    this.org = process.env.GITHUB_ORG;
    this.repo = process.env.GITHUB_REPO;
    this.projectId = process.env.GITHUB_PROJECT_ID;
    this.projectNumber = process.env.GITHUB_PROJECT_NUMBER;
    
    if (!this.token) {
      throw new Error('GITHUB_PAT is required');
    }
    
    this.axiosInstance = axios.create({
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * プロジェクト情報を取得
   */
  async getProjectInfo() {
    try {
      const query = `
        query {
          organization(login: "${this.org}") {
            projectV2(number: ${this.projectNumber}) {
              id
              title
              url
              items(first: 10) {
                nodes {
                  id
                  content {
                    ... on Issue {
                      number
                      title
                      url
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await axios.post('https://api.github.com/graphql', {
        query
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('プロジェクト情報取得エラー:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * イシューを作成
   */
  async createIssue(title, body, labels = []) {
    try {
      const issueData = {
        title,
        body,
        labels
      };

      const response = await this.axiosInstance.post(
        `https://api.github.com/repos/${this.org}/${this.repo}/issues`,
        issueData
      );

      console.log(`✅ イシュー作成成功: #${response.data.number}`);
      return response.data;
    } catch (error) {
      console.error('イシュー作成エラー:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * イシューをプロジェクトに追加
   */
  async addIssueToProject(issueNodeId) {
    try {
      const mutation = `
        mutation {
          addProjectV2ItemById(input: {
            projectId: "${this.projectId}",
            contentId: "${issueNodeId}"
          }) {
            item {
              id
            }
          }
        }
      `;

      const response = await axios.post('https://api.github.com/graphql', {
        query: mutation
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        throw new Error(JSON.stringify(response.data.errors));
      }

      console.log('✅ プロジェクト追加成功:', response.data.data.addProjectV2ItemById.item.id);
      return response.data.data.addProjectV2ItemById.item;
    } catch (error) {
      console.error('プロジェクト追加エラー:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * イシュー作成とプロジェクト追加を一括実行
   */
  async createIssueAndAddToProject(title, body, labels = []) {
    try {
      // 1. イシューを作成
      const issue = await this.createIssue(title, body, labels);
      
      // 2. プロジェクトに追加
      const projectItem = await this.addIssueToProject(issue.node_id);
      
      return {
        issue,
        projectItem,
        success: true
      };
    } catch (error) {
      console.error('一括処理エラー:', error.message);
      return {
        error: error.message,
        success: false
      };
    }
  }
}

module.exports = GitHubAPI;
```

#### server.js (Express サーバー例)
```javascript
const express = require('express');
const GitHubAPI = require('./github-api');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// JSON パースミドルウェア
app.use(express.json());

// GitHub API インスタンス
const githubAPI = new GitHubAPI();

/**
 * プロジェクト情報取得エンドポイント
 */
app.get('/api/project', async (req, res) => {
  try {
    const projectInfo = await githubAPI.getProjectInfo();
    res.json(projectInfo);
  } catch (error) {
    res.status(500).json({
      error: 'プロジェクト情報の取得に失敗しました',
      details: error.message
    });
  }
});

/**
 * イシュー作成エンドポイント
 */
app.post('/api/issues', async (req, res) => {
  try {
    const { title, body, labels } = req.body;
    
    if (!title) {
      return res.status(400).json({
        error: 'タイトルは必須です'
      });
    }

    const result = await githubAPI.createIssueAndAddToProject(title, body, labels);
    
    if (result.success) {
      res.json({
        message: 'イシューの作成とプロジェクト追加が完了しました',
        issue: {
          number: result.issue.number,
          title: result.issue.title,
          url: result.issue.html_url
        },
        projectItemId: result.projectItem.id
      });
    } else {
      res.status(500).json({
        error: 'イシューの作成に失敗しました',
        details: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'サーバーエラーが発生しました',
      details: error.message
    });
  }
});

/**
 * ヘルスチェックエンドポイント
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// サーバー起動
app.listen(port, () => {
  console.log(`🚀 サーバーが起動しました: http://localhost:${port}`);
  console.log(`📊 プロジェクト情報: GET /api/project`);
  console.log(`📝 イシュー作成: POST /api/issues`);
  console.log(`❤️ ヘルスチェック: GET /health`);
});

module.exports = app;
```

### 方法2: @octokit/rest を使用した実装

#### github-api-octokit.js
```javascript
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

class GitHubAPIOctokit {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_PAT
    });
    
    this.org = process.env.GITHUB_ORG;
    this.repo = process.env.GITHUB_REPO;
    this.projectId = process.env.GITHUB_PROJECT_ID;
    this.projectNumber = process.env.GITHUB_PROJECT_NUMBER;
  }

  /**
   * イシューを作成
   */
  async createIssue(title, body, labels = []) {
    try {
      const response = await this.octokit.rest.issues.create({
        owner: this.org,
        repo: this.repo,
        title,
        body,
        labels
      });

      console.log(`✅ イシュー作成成功: #${response.data.number}`);
      return response.data;
    } catch (error) {
      console.error('イシュー作成エラー:', error.message);
      throw error;
    }
  }

  /**
   * GraphQL でプロジェクトに追加
   */
  async addIssueToProject(issueNodeId) {
    try {
      const mutation = `
        mutation($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: {
            projectId: $projectId,
            contentId: $contentId
          }) {
            item {
              id
            }
          }
        }
      `;

      const response = await this.octokit.graphql(mutation, {
        projectId: this.projectId,
        contentId: issueNodeId
      });

      console.log('✅ プロジェクト追加成功:', response.addProjectV2ItemById.item.id);
      return response.addProjectV2ItemById.item;
    } catch (error) {
      console.error('プロジェクト追加エラー:', error.message);
      throw error;
    }
  }
}

module.exports = GitHubAPIOctokit;
```

## 使用例

### 基本的な使用方法
```javascript
const GitHubAPI = require('./github-api');

async function example() {
  const api = new GitHubAPI();
  
  try {
    // プロジェクト情報を取得
    const projectInfo = await api.getProjectInfo();
    console.log('プロジェクト:', projectInfo.data.organization.projectV2.title);
    
    // イシューを作成してプロジェクトに追加
    const result = await api.createIssueAndAddToProject(
      'APIテストイシュー',
      '## 概要\nNode.jsからのAPIテストです。\n\n## 作成日時\n' + new Date().toISOString(),
      ['test', 'api', 'nodejs']
    );
    
    if (result.success) {
      console.log('✅ 処理完了:', result.issue.html_url);
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

example();
```

### Express API の使用例
```bash
# サーバー起動
npm start

# プロジェクト情報取得
curl http://localhost:3000/api/project

# イシュー作成
curl -X POST http://localhost:3000/api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新機能の提案",
    "body": "## 概要\n新しい機能の提案です。\n\n## 詳細\n...",
    "labels": ["enhancement", "feature"]
  }'
```

## エラーハンドリング

### よくあるエラーと対処法

#### 1. 認証エラー
```javascript
// エラー例
{
  "message": "Bad credentials",
  "documentation_url": "https://docs.github.com/rest"
}

// 対処法: トークンの確認
if (!process.env.GITHUB_PAT) {
  throw new Error('GITHUB_PAT環境変数が設定されていません');
}
```

#### 2. 権限エラー
```javascript
// エラー例
{
  "type": "FORBIDDEN",
  "message": "Resource not accessible by personal access token"
}

// 対処法: Fine-grained PATの権限確認
// - Organization permissions: Projects = Read and write
// - Repository permissions: Issues = Read and write
```

#### 3. レート制限エラー
```javascript
// エラー例
{
  "message": "API rate limit exceeded",
  "documentation_url": "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting"
}

// 対処法: リトライ機能の実装
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 403 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

## セキュリティ考慮事項

### 1. 環境変数の管理
```javascript
// .env ファイル (gitignoreに追加)
GITHUB_PAT=your_token_here

// 本番環境では環境変数で設定
process.env.GITHUB_PAT
```

### 2. トークンの検証
```javascript
async function validateToken() {
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${process.env.GITHUB_PAT}` }
    });
    console.log('✅ トークン有効:', response.data.login);
    return true;
  } catch (error) {
    console.error('❌ トークン無効:', error.message);
    return false;
  }
}
```

### 3. CORS設定（フロントエンドから呼び出す場合）
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
```

## デプロイメント

### 1. Heroku
```bash
# Procfile
web: node server.js

# 環境変数設定
heroku config:set GITHUB_PAT=your_token
heroku config:set GITHUB_ORG=Adobe-ACS-JAPAN
heroku config:set GITHUB_REPO=Hackathon2025-TeamC
heroku config:set GITHUB_PROJECT_ID=PVT_kwDOCgNtjs4BBkvd
```

### 2. Vercel
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

### 3. Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["node", "server.js"]
```

## 監視とログ

### 1. ログ出力
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// 使用例
logger.info('イシュー作成開始', { title, labels });
logger.error('API呼び出しエラー', { error: error.message });
```

### 2. メトリクス収集
```javascript
let apiCallCount = 0;
let successCount = 0;
let errorCount = 0;

app.get('/metrics', (req, res) => {
  res.json({
    apiCalls: apiCallCount,
    successes: successCount,
    errors: errorCount,
    successRate: apiCallCount > 0 ? (successCount / apiCallCount * 100).toFixed(2) + '%' : '0%'
  });
});
```

## テスト

### 1. 単体テスト (Jest)
```javascript
const GitHubAPI = require('./github-api');

describe('GitHubAPI', () => {
  let api;
  
  beforeEach(() => {
    api = new GitHubAPI();
  });
  
  test('イシュー作成が成功する', async () => {
    const result = await api.createIssue('テストイシュー', 'テスト内容');
    expect(result.title).toBe('テストイシュー');
    expect(result.number).toBeGreaterThan(0);
  });
});
```

### 2. 統合テスト
```javascript
const request = require('supertest');
const app = require('./server');

describe('API Endpoints', () => {
  test('POST /api/issues', async () => {
    const response = await request(app)
      .post('/api/issues')
      .send({
        title: 'テストイシュー',
        body: 'テスト内容',
        labels: ['test']
      });
      
    expect(response.status).toBe(200);
    expect(response.body.issue.title).toBe('テストイシュー');
  });
});
```

## 実際のAPIテスト結果

### テスト実行日時
2025年9月5日 12:35 (JST)

### 1. プロジェクト情報取得テスト
```bash
curl -X POST https://api.github.com/graphql \
-H "Authorization: Bearer $GITHUB_PAT" \
-H "Content-Type: application/json" \
-d '{
  "query": "query { organization(login: \"Adobe-ACS-JAPAN\") { projectV2(number: 19) { id title url } } }"
}'
```

**結果**: ✅ 成功
```json
{
  "data": {
    "organization": {
      "projectV2": {
        "id": "PVT_kwDOCgNtjs4BBkvd",
        "title": "Hackathon2025 TeamC Project",
        "url": "https://github.com/orgs/Adobe-ACS-JAPAN/projects/19"
      }
    }
  }
}
```

### 2. イシュー作成テスト
```bash
curl -X POST https://api.github.com/repos/Adobe-ACS-JAPAN/Hackathon2025-TeamC/issues \
-H "Authorization: Bearer $GITHUB_PAT" \
-H "Accept: application/vnd.github.v3+json" \
-H "Content-Type: application/json" \
-d '{
  "title": "Node.js API テスト用イシュー",
  "body": "## 概要\nNode.jsサーバーからのAPI実行テスト用のイシューです。\n\n## 作成日時\n2025年9月5日\n\n## 目的\n- API動作確認\n- プロジェクト自動連携テスト",
  "labels": ["test", "nodejs", "api"]
}'
```

**結果**: ✅ 成功
- **イシュー番号**: #11
- **イシューID**: 3386151601
- **Node ID**: I_kwDOPgZB-c7J1JKx
- **URL**: https://github.com/Adobe-ACS-JAPAN/Hackathon2025-TeamC/issues/11

### 3. プロジェクト追加テスト
```bash
curl -X POST https://api.github.com/graphql \
-H "Authorization: Bearer $GITHUB_PAT" \
-H "Content-Type: application/json" \
-d '{
  "query": "mutation { addProjectV2ItemById(input: {projectId: \"PVT_kwDOCgNtjs4BBkvd\", contentId: \"I_kwDOPgZB-c7J1JKx\"}) { item { id } } }"
}'
```

**結果**: ✅ 成功
```json
{
  "data": {
    "addProjectV2ItemById": {
      "item": {
        "id": "PVTI_lADOCgNtjs4BBkvdzgeZg04"
      }
    }
  }
}
```

### テスト結果サマリー
- ✅ プロジェクト情報取得: 成功
- ✅ イシュー作成: 成功 (イシュー #11)
- ✅ プロジェクト自動追加: 成功
- ✅ 全体的な連携フロー: 完全動作

### 使用した環境変数
```env
GITHUB_PAT=fine_grained_personal_access_token
GITHUB_ORG=Adobe-ACS-JAPAN
GITHUB_REPO=Hackathon2025-TeamC
GITHUB_PROJECT_ID=PVT_kwDOCgNtjs4BBkvd
GITHUB_PROJECT_NUMBER=19
```

## 参考リンク

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub GraphQL API Documentation](https://docs.github.com/en/graphql)
- [Octokit.js Documentation](https://octokit.github.io/rest.js/)
- [Fine-grained Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)
