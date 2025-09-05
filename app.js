const { App, ExpressReceiver } = require('@slack/bolt');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });

// Initialize Gemini AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: receiver
});

app.message(async ({ message, say }) => {
  // メッセージ受信時のログ出力
  console.log(`メッセージ受信: ユーザー=${message.user}, チャンネル=${message.channel}, テキスト="${message.text}"`);

  try {
    // ボット自身のメッセージは無視
    if (message.subtype === 'bot_message') {
      return;
    }

    // メッセージが空の場合は無視
    if (!message.text || message.text.trim() === '') {
      return;
    }

    // Gemini APIにメッセージを送信
    console.log('Gemini APIにリクエストを送信中...');
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message.text,
    });

    // Geminiの応答をSlackに送信
    const geminiResponse = response.text;
    console.log(`Gemini応答: ${geminiResponse}`);

    await say(`<@${message.user}> ${geminiResponse}`);

  } catch (error) {
    console.error('エラーが発生しました:', error);
    await say(`<@${message.user}> 申し訳ありませんが、エラーが発生しました: ${error.message}`);
  }
});

// Render's health check
receiver.router.get('/health', (req, res) => {
    res.status(200).send('OK');
});

(async () => {
  // Start your app
  const port = process.env.PORT || 3000;
  await app.start(port);

  console.log('⚡️ Bolt app is running!');
  console.log(`ポート: ${port}`);
  console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
  console.log('メッセージハンドラーが有効になりました');
})();
