const { GoogleGenAI } = require('@google/genai');
const SystemInstructionService = require('./systemInstructionService');

class GeminiService {
  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
    this.systemInstructionService = new SystemInstructionService();
  }

  /**
   * Gemini APIにメッセージを送信して応答を取得
   * @param {string} message - 送信するメッセージ
   * @param {Array} conversationHistory - 会話履歴（オプション）
   * @returns {Promise<string>} Geminiからの応答テキスト
   * @throws {Error} API呼び出しでエラーが発生した場合
   */
  async generateResponse(message, conversationHistory = []) {
    try {
      console.log('Gemini APIにリクエストを送信中...');
      
      // 会話履歴と現在のメッセージを組み合わせてcontentsを作成
      const contents = [...conversationHistory];
      
      // 現在のメッセージを追加
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      console.log(`会話履歴数: ${conversationHistory.length}, 現在のメッセージ: ${message}`);
      
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      const geminiResponse = response.text;
      console.log(`Gemini応答: ${geminiResponse}`);
      
      return geminiResponse;
    } catch (error) {
      console.error('Gemini API呼び出しでエラーが発生しました:', error);
      throw new Error(`Gemini API呼び出しエラー: ${error.message}`);
    }
  }

  /**
   * 公式ドキュメントに基づくマルチターン会話の実装
   * @param {string} message - 送信するメッセージ
   * @param {Array} history - 会話履歴
   * @param {boolean} useSystemInstruction - システムインストラクションを使用するか（デフォルト: true）
   * @returns {Promise<string>} Geminiからの応答テキスト
   */
  async generateContentWithHistory(message, history = [], useSystemInstruction = true) {
    try {
      console.log('Gemini API（マルチターン会話）にリクエストを送信中...');
      
      let contents = [...history];
      
      // システムインストラクションを使用する場合
      if (useSystemInstruction) {
        const systemInstruction = await this.systemInstructionService.loadSystemInstruction();
        contents = this.systemInstructionService.integrateWithConversation(contents, systemInstruction);
        console.log('システムインストラクションを統合しました');
      }
      
      // 現在のメッセージを追加
      contents.push({
        role: "user",
        parts: [{ text: message }],
      });

      console.log(`会話履歴数: ${history.length}, システムインストラクション: ${useSystemInstruction}, 現在のメッセージ: ${message}`);
      
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      const geminiResponse = response.text;
      console.log(`Gemini応答: ${geminiResponse}`);
      
      return geminiResponse;
    } catch (error) {
      console.error('Gemini API呼び出しでエラーが発生しました:', error);
      throw new Error(`Gemini API呼び出しエラー: ${error.message}`);
    }
  }

  /**
   * ChatSession用のメッセージ生成関数
   * @param {string} message - 送信するメッセージ
   * @param {Array} conversationHistory - 会話履歴
   * @param {boolean} useSystemInstruction - システムインストラクションを使用するか（デフォルト: true）
   * @returns {Promise<string>} Geminiからの応答テキスト
   */
  async generateResponseForSession(message, conversationHistory, useSystemInstruction = true) {
    return this.generateContentWithHistory(message, conversationHistory, useSystemInstruction);
  }

  /**
   * システムインストラクションを取得
   * @param {boolean} forceReload - 強制再読み込み（デフォルト: false）
   * @returns {Promise<string>} システムインストラクションの内容
   */
  async getSystemInstruction(forceReload = false) {
    return await this.systemInstructionService.loadSystemInstruction(forceReload);
  }

  /**
   * システムインストラクションを更新
   * @param {string} newInstruction - 新しいシステムインストラクション
   * @returns {Promise<boolean>} 更新成功フラグ
   */
  async updateSystemInstruction(newInstruction) {
    return await this.systemInstructionService.updateSystemInstruction(newInstruction);
  }

  /**
   * システムインストラクションをリセット
   * @returns {Promise<boolean>} リセット成功フラグ
   */
  async resetSystemInstruction() {
    return await this.systemInstructionService.resetSystemInstruction();
  }

  /**
   * システムインストラクションの情報を取得
   * @returns {Object} システムインストラクションの情報
   */
  getSystemInstructionInfo() {
    return this.systemInstructionService.getSystemInstructionInfo();
  }
}

module.exports = GeminiService;
