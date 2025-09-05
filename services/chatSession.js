/**
 * ChatSession風の実装
 * Gemini APIのChatSession.historyと同様の機能を提供
 */
class ChatSession {
  constructor(channelId, maxHistory = 50) {
    this.channelId = channelId;
    this.maxHistory = maxHistory;
    this.history = [];
  }

  /**
   * メッセージを送信して応答を取得
   * @param {string} message - ユーザーメッセージ
   * @param {Function} generateFunction - Gemini API呼び出し関数
   * @returns {Promise<string>} モデルの応答
   */
  async sendMessage(message, generateFunction) {
    // ユーザーメッセージを履歴に追加
    this.addToHistory('user', message);

    // Gemini API用の履歴形式に変換
    const geminiHistory = this.getGeminiHistory();

    // Gemini APIを呼び出し
    const response = await generateFunction(message, geminiHistory);

    // モデルの応答を履歴に追加
    this.addToHistory('model', response);

    return response;
  }

  /**
   * 履歴にメッセージを追加
   * @param {string} role - 'user' または 'model'
   * @param {string} content - メッセージ内容
   */
  addToHistory(role, content) {
    this.history.push({
      role,
      parts: [{ text: content }],
      timestamp: Date.now()
    });

    // 履歴数が上限を超えた場合、古いものから削除
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }
  }

  /**
   * Gemini API用の履歴形式に変換
   * @param {number} limit - 取得する履歴数（デフォルト: 10）
   * @returns {Array} Gemini API用の履歴
   */
  getGeminiHistory(limit = 10) {
    const recentHistory = this.history.slice(-limit);
    return recentHistory.map(msg => ({
      role: msg.role,
      parts: msg.parts
    }));
  }

  /**
   * 履歴をクリア
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * 履歴の統計情報を取得
   * @returns {Object} 統計情報
   */
  getStats() {
    return {
      totalMessages: this.history.length,
      userMessages: this.history.filter(msg => msg.role === 'user').length,
      modelMessages: this.history.filter(msg => msg.role === 'model').length,
      recentMessages: this.history.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.parts[0].text.substring(0, 50) + (msg.parts[0].text.length > 50 ? '...' : ''),
        timestamp: new Date(msg.timestamp).toLocaleString('ja-JP')
      }))
    };
  }

  /**
   * 履歴をJSON形式で取得（永続化用）
   * @returns {string} JSON形式の履歴
   */
  toJSON() {
    return JSON.stringify({
      channelId: this.channelId,
      history: this.history,
      maxHistory: this.maxHistory
    });
  }

  /**
   * JSON形式の履歴から復元
   * @param {string} jsonData - JSON形式の履歴データ
   * @returns {ChatSession} 復元されたChatSession
   */
  static fromJSON(jsonData) {
    const data = JSON.parse(jsonData);
    const session = new ChatSession(data.channelId, data.maxHistory);
    session.history = data.history || [];
    return session;
  }
}

module.exports = ChatSession;
