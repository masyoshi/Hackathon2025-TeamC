const { Octokit } = require('@octokit/rest');

/**
 * GitHub APIサービス
 * イシューの作成、プロジェクトへの紐づけ、イシューの管理を行う
 */
class GitHubService {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_PAT,
    });
    this.owner = process.env.GITHUB_ORG;
    this.repo = process.env.GITHUB_REPO;
    this.projectId = process.env.GITHUB_PROJECT_ID;
  }

  /**
   * イシューを作成
   * @param {Object} issueData - イシューデータ
   * @param {string} issueData.title - イシューのタイトル
   * @param {string} issueData.body - イシューの本文
   * @param {Array} issueData.labels - ラベル配列（オプション）
   * @param {Array} issueData.assignees - 担当者配列（オプション）
   * @returns {Promise<Object>} 作成されたイシュー情報
   */
  async createIssue(issueData) {
    try {
      console.log(`GitHubイシューを作成中: ${issueData.title}`);
      
      const issue = await this.octokit.rest.issues.create({
        owner: this.owner,
        repo: this.repo,
        title: issueData.title,
        body: issueData.body,
        labels: issueData.labels || [],
        assignees: issueData.assignees || []
      });

      console.log(`イシュー作成成功: #${issue.data.number} - ${issue.data.title}`);
      return {
        success: true,
        issue: {
          number: issue.data.number,
          title: issue.data.title,
          url: issue.data.html_url,
          state: issue.data.state
        }
      };
    } catch (error) {
      console.error('GitHubイシュー作成でエラーが発生しました:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * イシューをプロジェクトに追加
   * @param {number} issueNumber - イシュー番号
   * @param {string} projectId - プロジェクトID（オプション、デフォルトは環境変数から）
   * @returns {Promise<Object>} プロジェクト追加結果
   */
  async addIssueToProject(issueNumber, projectId = null) {
    try {
      const targetProjectId = projectId || this.projectId;
      
      if (!targetProjectId) {
        throw new Error('プロジェクトIDが設定されていません');
      }

      console.log(`イシュー #${issueNumber} をプロジェクト ${targetProjectId} に追加中...`);

      // プロジェクトにイシューを追加
      const result = await this.octokit.rest.projects.createCard({
        project_id: targetProjectId,
        content_id: issueNumber,
        content_type: 'Issue'
      });

      console.log(`プロジェクト追加成功: イシュー #${issueNumber}`);
      return {
        success: true,
        cardId: result.data.id,
        projectId: targetProjectId
      };
    } catch (error) {
      console.error('プロジェクト追加でエラーが発生しました:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * イシューを作成してプロジェクトに追加（一括処理）
   * @param {Object} issueData - イシューデータ
   * @param {string} projectId - プロジェクトID（オプション）
   * @returns {Promise<Object>} 処理結果
   */
  async createIssueAndAddToProject(issueData, projectId = null) {
    try {
      // イシューを作成
      const issueResult = await this.createIssue(issueData);
      
      if (!issueResult.success) {
        return issueResult;
      }

      // プロジェクトに追加
      const projectResult = await this.addIssueToProject(issueResult.issue.number, projectId);
      
      if (!projectResult.success) {
        return {
          success: false,
          error: `イシュー作成は成功しましたが、プロジェクト追加に失敗しました: ${projectResult.error}`,
          issue: issueResult.issue
        };
      }

      return {
        success: true,
        issue: issueResult.issue,
        project: {
          cardId: projectResult.cardId,
          projectId: projectResult.projectId
        }
      };
    } catch (error) {
      console.error('イシュー作成・プロジェクト追加でエラーが発生しました:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * イシューを取得
   * @param {number} issueNumber - イシュー番号
   * @returns {Promise<Object>} イシュー情報
   */
  async getIssue(issueNumber) {
    try {
      const issue = await this.octokit.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber
      });

      return {
        success: true,
        issue: {
          number: issue.data.number,
          title: issue.data.title,
          body: issue.data.body,
          state: issue.data.state,
          url: issue.data.html_url,
          labels: issue.data.labels.map(label => label.name),
          assignees: issue.data.assignees.map(assignee => assignee.login)
        }
      };
    } catch (error) {
      console.error('イシュー取得でエラーが発生しました:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * イシューを更新
   * @param {number} issueNumber - イシュー番号
   * @param {Object} updateData - 更新データ
   * @returns {Promise<Object>} 更新結果
   */
  async updateIssue(issueNumber, updateData) {
    try {
      const issue = await this.octokit.rest.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        ...updateData
      });

      return {
        success: true,
        issue: {
          number: issue.data.number,
          title: issue.data.title,
          state: issue.data.state,
          url: issue.data.html_url
        }
      };
    } catch (error) {
      console.error('イシュー更新でエラーが発生しました:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * プロジェクトの情報を取得
   * @param {string} projectId - プロジェクトID（オプション）
   * @returns {Promise<Object>} プロジェクト情報
   */
  async getProject(projectId = null) {
    try {
      const targetProjectId = projectId || this.projectId;
      
      if (!targetProjectId) {
        throw new Error('プロジェクトIDが設定されていません');
      }

      const project = await this.octokit.rest.projects.get({
        project_id: targetProjectId
      });

      return {
        success: true,
        project: {
          id: project.data.id,
          name: project.data.name,
          body: project.data.body,
          state: project.data.state,
          url: project.data.html_url
        }
      };
    } catch (error) {
      console.error('プロジェクト取得でエラーが発生しました:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * リポジトリの情報を取得
   * @returns {Promise<Object>} リポジトリ情報
   */
  async getRepository() {
    try {
      const repo = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo
      });

      return {
        success: true,
        repository: {
          name: repo.data.name,
          fullName: repo.data.full_name,
          description: repo.data.description,
          url: repo.data.html_url,
          owner: repo.data.owner.login
        }
      };
    } catch (error) {
      console.error('リポジトリ取得でエラーが発生しました:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 設定情報を取得
   * @returns {Object} 設定情報
   */
  getConfig() {
    return {
      owner: this.owner,
      repo: this.repo,
      projectId: this.projectId,
      hasToken: !!process.env.GITHUB_PAT
    };
  }
}

module.exports = GitHubService;