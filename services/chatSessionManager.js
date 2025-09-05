const ChatSession = require('./chatSession');

/**
 * ChatSessionを管理するマネージャー
 * チャンネルごとのChatSessionを管理
 */
class ChatSessionManager {
  constructor() {
    // チャンネルID -> ChatSession のマッピング
    this.sessions = new Map();
    
    // 最大セッション数を設定（メモリ使用量を制限）
    this.maxSessions = 100;
  }

  /**
   * チャンネルのChatSessionを取得（存在しない場合は作成）
   * @param {string} channelId - チャンネルID
   * @returns {ChatSession} ChatSessionインスタンス
   */
  getSession(channelId) {
    if (!this.sessions.has(channelId)) {
      // セッション数が上限を超えた場合、古いセッションを削除
      if (this.sessions.size >= this.maxSessions) {
        const firstChannelId = this.sessions.keys().next().value;
        this.sessions.delete(firstChannelId);
        console.log(`古いセッションを削除: ${firstChannelId}`);
      }

      this.sessions.set(channelId, new ChatSession(channelId));
      console.log(`新しいChatSessionを作成: ${channelId}`);
    }

    return this.sessions.get(channelId);
  }

  /**
   * チャンネルのChatSessionを削除
   * @param {string} channelId - チャンネルID
   */
  removeSession(channelId) {
    if (this.sessions.has(channelId)) {
      this.sessions.delete(channelId);
      console.log(`ChatSessionを削除: ${channelId}`);
    }
  }

  /**
   * 全セッションをクリア
   */
  clearAllSessions() {
    this.sessions.clear();
    console.log('全ChatSessionをクリアしました');
  }

  /**
   * セッションの統計情報を取得
   * @param {string} channelId - チャンネルID
   * @returns {Object} 統計情報
   */
  getSessionStats(channelId) {
    const session = this.sessions.get(channelId);
    if (!session) {
      return {
        exists: false,
        totalMessages: 0,
        userMessages: 0,
        modelMessages: 0,
        recentMessages: []
      };
    }

    return {
      exists: true,
      ...session.getStats()
    };
  }

  /**
   * 全セッションの統計情報を取得
   * @returns {Object} 全セッションの統計情報
   */
  getAllSessionsStats() {
    const stats = {
      totalSessions: this.sessions.size,
      maxSessions: this.maxSessions,
      sessions: []
    };

    for (const [channelId, session] of this.sessions) {
      stats.sessions.push({
        channelId,
        ...session.getStats()
      });
    }

    return stats;
  }

  /**
   * セッションを永続化（JSON形式）
   * @param {string} channelId - チャンネルID
   * @returns {string} JSON形式のセッションデータ
   */
  exportSession(channelId) {
    const session = this.sessions.get(channelId);
    if (!session) {
      return null;
    }
    return session.toJSON();
  }

  /**
   * セッションを復元（JSON形式から）
   * @param {string} jsonData - JSON形式のセッションデータ
   * @returns {boolean} 復元成功フラグ
   */
  importSession(jsonData) {
    try {
      const session = ChatSession.fromJSON(jsonData);
      this.sessions.set(session.channelId, session);
      console.log(`セッションを復元: ${session.channelId}`);
      return true;
    } catch (error) {
      console.error('セッション復元でエラーが発生しました:', error);
      return false;
    }
  }
}

module.exports = ChatSessionManager;
