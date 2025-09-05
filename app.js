const { App, ExpressReceiver } = require('@slack/bolt');
const GeminiService = require('./services/geminiService');
const ResponseProcessor = require('./services/responseProcessor');
const ActionHandlers = require('./services/actionHandlers');
require('dotenv').config();

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });

// Initialize services
const geminiService = new GeminiService();
const responseProcessor = new ResponseProcessor();
const actionHandlers = new ActionHandlers();

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
    const geminiResponse = await geminiService.generateResponse(message.text);

    // レスポンス内容を解析して処理を分岐
    const context = {
      user: message.user,
      channel: message.channel,
      timestamp: message.ts
    };
    
    const processedResponse = responseProcessor.processResponse(geminiResponse, context);
    
    // アクションを実行
    let actionResults = [];
    if (processedResponse.actions && processedResponse.actions.length > 0) {
      for (const action of processedResponse.actions) {
        const actionResult = actionHandlers.executeAction(action, processedResponse, context);
        actionResults.push(actionResult);
      }
    }

    // 結果をSlackに送信
    let responseMessage = `<@${message.user}> ${processedResponse.message}`;
    
    // アクション実行結果があれば追加
    if (actionResults.length > 0) {
      const successfulActions = actionResults.filter(result => result.success);
      if (successfulActions.length > 0) {
        responseMessage += `\n\n✅ 実行されたアクション: ${successfulActions.map(r => r.actionType).join(', ')}`;
      }
    }

    await say(responseMessage);

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
