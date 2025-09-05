const { GoogleGenAI } = require('@google/genai');

class GeminiService {
  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }

  /**
   * Gemini APIにメッセージを送信して応答を取得
   * @param {string} message - 送信するメッセージ
   * @returns {Promise<string>} Geminiからの応答テキスト
   * @throws {Error} API呼び出しでエラーが発生した場合
   */
  async generateResponse(message) {
    try {
      console.log('Gemini APIにリクエストを送信中...');
      
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: message,
      });

      const geminiResponse = response.text;
      console.log(`Gemini応答: ${geminiResponse}`);
      
      return geminiResponse;
    } catch (error) {
      console.error('Gemini API呼び出しでエラーが発生しました:', error);
      throw new Error(`Gemini API呼び出しエラー: ${error.message}`);
    }
  }
}

module.exports = GeminiService;
