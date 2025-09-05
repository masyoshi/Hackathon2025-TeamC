/**
 * チャット履歴を管理するストレージサービス
 * メモリベースのシンプルな実装（本番環境ではデータベースを使用することを推奨）
 */
class ContextStorage {
  constructor() {
    this.conversations = new Map();
    this.maxHistoryPerChannel = 50;
  }

  /**
   * 会話履歴を追加
   * @param {string} channelId - チャンネルID
   * @param {string} role - 'user' または 'assistant'
   * @param {string} content - メッセージ内容
   */
  addMessage(channelId, role, content) {
    if (!this.conversations.has(channelId)) {
      this.conversations.set(channelId, []);
    }

    const conversation = this.conversations.get(channelId);
    conversation.push({
      role,
      content,
      timestamp: Date.now()
    });

    // 履歴数が上限を超えた場合、古いものから削除
    if (conversation.length > this.maxHistoryPerChannel) {
      conversation.splice(0, conversation.length - this.maxHistoryPerChannel);
    }
  }

  /**
   * チャンネルの会話履歴を取得
   * @param {string} channelId - チャンネルID
   * @param {number} limit - 取得する履歴数（デフォルト: 10）
   * @returns {Array} 会話履歴の配列
   */
  getConversationHistory(channelId, limit = 10) {
    if (!this.conversations.has(channelId)) {
      return [];
    }

    const conversation = this.conversations.get(channelId);
    return conversation.slice(-limit);
  }

  /**
   * チャンネルの会話履歴をクリア
   * @param {string} channelId - チャンネルID
   */
  clearConversationHistory(channelId) {
    if (this.conversations.has(channelId)) {
      this.conversations.delete(channelId);
    }
  }

  /**
   * 全チャンネルの会話履歴をクリア
   */
  clearAllConversations() {
    this.conversations.clear();
  }

  /**
   * チャンネルの会話履歴数を取得
   * @param {string} channelId - チャンネルID
   * @returns {number} 履歴数
   */
  getConversationCount(channelId) {
    if (!this.conversations.has(channelId)) {
      return 0;
    }
    return this.conversations.get(channelId).length;
  }

  /**
   * 会話履歴をGemini API用の形式に変換
   * @param {string} channelId - チャンネルID
   * @param {number} limit - 取得する履歴数
   * @returns {Array} Gemini API用の会話履歴
   */
  getFormattedHistory(channelId, limit = 10) {
    const history = this.getConversationHistory(channelId, limit);
    return history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }
}

module.exports = ContextStorage;
