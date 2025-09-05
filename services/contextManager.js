const ContextStorage = require('./contextStorage');

/**
 * チャットコンテクストを管理するサービス
 * 会話履歴の保存、取得、管理を行う
 */
class ContextManager {
  constructor() {
    this.storage = new ContextStorage();
  }

  /**
   * ユーザーメッセージを記録
   * @param {string} channelId - チャンネルID
   * @param {string} message - ユーザーメッセージ
   */
  recordUserMessage(channelId, message) {
    this.storage.addMessage(channelId, 'user', message);
    console.log(`ユーザーメッセージを記録: チャンネル=${channelId}, メッセージ="${message}"`);
  }

  /**
   * アシスタント（Gemini）の応答を記録
   * @param {string} channelId - チャンネルID
   * @param {string} response - アシスタントの応答
   */
  recordAssistantMessage(channelId, response) {
    this.storage.addMessage(channelId, 'assistant', response);
    console.log(`アシスタント応答を記録: チャンネル=${channelId}, 応答="${response}"`);
  }

  /**
   * 会話履歴を取得してGemini API用の形式に変換
   * @param {string} channelId - チャンネルID
   * @param {number} limit - 取得する履歴数（デフォルト: 10）
   * @returns {Array} Gemini API用の会話履歴
   */
  getConversationHistory(channelId, limit = 10) {
    return this.storage.getFormattedHistory(channelId, limit);
  }

  /**
   * 会話履歴をクリア
   * @param {string} channelId - チャンネルID
   */
  clearConversationHistory(channelId) {
    this.storage.clearConversationHistory(channelId);
    console.log(`会話履歴をクリア: チャンネル=${channelId}`);
  }

  /**
   * 全チャンネルの会話履歴をクリア
   */
  clearAllConversations() {
    this.storage.clearAllConversations();
    console.log('全チャンネルの会話履歴をクリアしました');
  }

  /**
   * チャンネルの会話履歴数を取得
   * @param {string} channelId - チャンネルID
   * @returns {number} 履歴数
   */
  getConversationCount(channelId) {
    return this.storage.getConversationCount(channelId);
  }

  /**
   * 会話履歴の統計情報を取得
   * @param {string} channelId - チャンネルID
   * @returns {Object} 統計情報
   */
  getConversationStats(channelId) {
    const count = this.getConversationCount(channelId);
    const history = this.storage.getConversationHistory(channelId, 5); // 最新5件を取得
    
    return {
      totalMessages: count,
      recentMessages: history.map(msg => ({
        role: msg.role,
        content: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
        timestamp: new Date(msg.timestamp).toLocaleString('ja-JP')
      }))
    };
  }
}

module.exports = ContextManager;
