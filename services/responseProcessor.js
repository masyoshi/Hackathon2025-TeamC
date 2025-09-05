/**
 * Geminiレスポンス処理サービス
 * レスポンス内容を解析して適切な処理に分岐する
 */
class ResponseProcessor {
  constructor() {
    // 処理を空にした状態
  }

  /**
   * レスポンスに基づいて適切な処理を実行
   * @param {string} response - Geminiからのレスポンス
   * @param {Object} context - 処理コンテキスト（ユーザー情報、チャンネル情報など）
   * @returns {Object} 処理結果
   */
  processResponse(response, context = {}) {
    // 処理を空にした状態
    return {
      type: 'normal',
      message: response,
      actions: []
    };
  }
}

module.exports = ResponseProcessor;
