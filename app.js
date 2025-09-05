const { App, ExpressReceiver } = require('@slack/bolt');
const GeminiService = require('./services/geminiService');
const ResponseProcessor = require('./services/responseProcessor');
const ActionHandlers = require('./services/actionHandlers');
const ContextManager = require('./services/contextManager');
require('dotenv').config();

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });

// Initialize services
const geminiService = new GeminiService();
const responseProcessor = new ResponseProcessor();
const actionHandlers = new ActionHandlers();
const contextManager = new ContextManager();

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

    // ユーザーメッセージを記録
    contextManager.recordUserMessage(message.channel, message.text);

    // 会話履歴を取得
    const conversationHistory = contextManager.getConversationHistory(message.channel, 10);
    console.log(`会話履歴を取得: ${conversationHistory.length}件`);

    // Gemini APIにメッセージと会話履歴を送信
    const geminiResponse = await geminiService.generateResponse(message.text, conversationHistory);

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

    // アシスタントの応答を記録
    contextManager.recordAssistantMessage(message.channel, processedResponse.message);

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

// 会話履歴をクリアするコマンド
app.command('/clear-context', async ({ command, ack, say }) => {
  await ack();
  
  try {
    contextManager.clearConversationHistory(command.channel_id);
    await say(`<@${command.user_id}> このチャンネルの会話履歴をクリアしました。`);
  } catch (error) {
    console.error('会話履歴クリアでエラーが発生しました:', error);
    await say(`<@${command.user_id}> 申し訳ありませんが、エラーが発生しました: ${error.message}`);
  }
});

// 会話履歴の統計を表示するコマンド
app.command('/context-stats', async ({ command, ack, say }) => {
  await ack();
  
  try {
    const stats = contextManager.getConversationStats(command.channel_id);
    const message = `📊 **会話履歴統計**\n` +
      `• 総メッセージ数: ${stats.totalMessages}件\n` +
      `• 最新メッセージ:\n` +
      stats.recentMessages.map(msg => 
        `  ${msg.role === 'user' ? '👤' : '🤖'} ${msg.content} (${msg.timestamp})`
      ).join('\n');
    
    await say(`<@${command.user_id}> ${message}`);
  } catch (error) {
    console.error('会話履歴統計でエラーが発生しました:', error);
    await say(`<@${command.user_id}> 申し訳ありませんが、エラーが発生しました: ${error.message}`);
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
