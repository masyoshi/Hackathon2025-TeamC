const fs = require('fs').promises;
const path = require('path');

/**
 * システムインストラクション管理サービス
 * 外部ファイルからシステムインストラクションを読み込み、管理する
 */
class SystemInstructionService {
  constructor() {
    this.systemInstructionPath = path.join(__dirname, '../config/system-instructions.md');
    this.cachedInstruction = null;
    this.lastModified = null;
  }

  /**
   * システムインストラクションファイルを読み込む
   * @param {boolean} forceReload - 強制再読み込み（デフォルト: false）
   * @returns {Promise<string>} システムインストラクションの内容
   */
  async loadSystemInstruction(forceReload = false) {
    try {
      // ファイルの存在確認
      await fs.access(this.systemInstructionPath);
      
      // ファイルの更新時刻を取得
      const stats = await fs.stat(this.systemInstructionPath);
      const currentModified = stats.mtime.getTime();
      
      // キャッシュが有効で、ファイルが更新されていない場合はキャッシュを返す
      if (!forceReload && this.cachedInstruction && this.lastModified === currentModified) {
        console.log('システムインストラクションをキャッシュから取得');
        return this.cachedInstruction;
      }
      
      // ファイルを読み込み
      const content = await fs.readFile(this.systemInstructionPath, 'utf-8');
      
      // キャッシュを更新
      this.cachedInstruction = content;
      this.lastModified = currentModified;
      
      console.log('システムインストラクションをファイルから読み込み');
      return content;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn('システムインストラクションファイルが見つかりません:', this.systemInstructionPath);
        return this.getDefaultSystemInstruction();
      }
      
      console.error('システムインストラクション読み込みでエラーが発生しました:', error);
      return this.getDefaultSystemInstruction();
    }
  }

  /**
   * デフォルトのシステムインストラクションを取得
   * @returns {string} デフォルトのシステムインストラクション
   */
  getDefaultSystemInstruction() {
    return `あなたはSlack Botとして動作するAIアシスタントです。ユーザーの質問や要求に対して、親切で正確な回答を提供してください。日本語で回答し、必要に応じてコードブロックやリストを使用して見やすく整理してください。`;
  }

  /**
   * システムインストラクションをGemini API用の形式に変換
   * @param {string} instruction - システムインストラクション
   * @returns {Object} Gemini API用のシステムインストラクション形式
   */
  formatForGeminiAPI(instruction) {
    return {
      role: 'user',
      parts: [{ text: `システムインストラクション:\n${instruction}` }]
    };
  }

  /**
   * システムインストラクションをマルチターン会話用に統合
   * @param {Array} conversationHistory - 会話履歴
   * @param {string} systemInstruction - システムインストラクション
   * @returns {Array} システムインストラクション統合済みの会話履歴
   */
  integrateWithConversation(conversationHistory, systemInstruction) {
    // システムインストラクションを最初に追加
    const systemInstructionContent = this.formatForGeminiAPI(systemInstruction);
    
    // 既存の会話履歴と組み合わせ
    return [systemInstructionContent, ...conversationHistory];
  }

  /**
   * システムインストラクションの情報を取得
   * @returns {Object} システムインストラクションの情報
   */
  getSystemInstructionInfo() {
    return {
      path: this.systemInstructionPath,
      cached: !!this.cachedInstruction,
      lastModified: this.lastModified ? new Date(this.lastModified).toISOString() : null,
      hasFile: true // ファイルの存在確認は非同期なので、ここでは基本的な情報のみ
    };
  }

  /**
   * システムインストラクションを更新
   * @param {string} newInstruction - 新しいシステムインストラクション
   * @returns {Promise<boolean>} 更新成功フラグ
   */
  async updateSystemInstruction(newInstruction) {
    try {
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(this.systemInstructionPath);
      await fs.mkdir(dir, { recursive: true });
      
      // ファイルに書き込み
      await fs.writeFile(this.systemInstructionPath, newInstruction, 'utf-8');
      
      // キャッシュをクリア
      this.cachedInstruction = null;
      this.lastModified = null;
      
      console.log('システムインストラクションを更新しました');
      return true;
      
    } catch (error) {
      console.error('システムインストラクション更新でエラーが発生しました:', error);
      return false;
    }
  }

  /**
   * システムインストラクションをリセット（デフォルトに戻す）
   * @returns {Promise<boolean>} リセット成功フラグ
   */
  async resetSystemInstruction() {
    const defaultInstruction = this.getDefaultSystemInstruction();
    return await this.updateSystemInstruction(defaultInstruction);
  }
}

module.exports = SystemInstructionService;
