const { App, ExpressReceiver } = require('@slack/bolt');
const { buildGeminiReviewBlocks, registerGeminiReviewActions } = require('./utils/gemini-review');
const GeminiService = require('./services/geminiService');
const ResponseProcessor = require('./services/responseProcessor');
const ActionHandlers = require('./services/actionHandlers');
const ChatSessionManager = require('./services/chatSessionManager');
require('dotenv').config();

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });

// Initialize services
const geminiService = new GeminiService();
const responseProcessor = new ResponseProcessor();
const actionHandlers = new ActionHandlers();
const chatSessionManager = new ChatSessionManager();

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: receiver
});

// Register Approve/Reject action handlers for Gemini review
registerGeminiReviewActions(app);

app.message(async ({ message, say, client }) => {
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

    // ChatSessionを取得
    const session = chatSessionManager.getSession(message.channel);
    
    // 公式ドキュメント形式の履歴を取得
    const history = session.getOfficialHistory(10);
    
    // 公式のマルチターン会話APIを使用
    const geminiResponse = await geminiService.generateContentWithHistory(message.text, history);
    
    // ユーザーメッセージとモデル応答を履歴に追加
    session.addToHistory('user', message.text);
    session.addToHistory('model', geminiResponse);

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

    // ChatSessionは自動的に履歴を管理するため、手動での記録は不要

    // 結果をSlackに送信
    let responseMessage = `<@${message.user}> ${processedResponse.message}`;
    
    // アクション実行結果があれば追加
    if (actionResults.length > 0) {
      const successfulActions = actionResults.filter(result => result.success);
      if (successfulActions.length > 0) {
        responseMessage += `\n\n✅ 実行されたアクション: ${successfulActions.map(r => r.actionType).join(', ')}`;
      }
    }

    // Send the response with Approve/Reject buttons
    await client.chat.postMessage({
      channel: message.channel,
      text: responseMessage,
      blocks: buildGeminiReviewBlocks(responseMessage),
    });

  } catch (error) {
    console.error('エラーが発生しました:', error);
    await say(`<@${message.user}> 申し訳ありませんが、エラーが発生しました: ${error.message}`);
  }
});

// 会話履歴をクリアするコマンド
app.command('/clear-context', async ({ command, ack, say }) => {
  await ack();
  
  try {
    chatSessionManager.removeSession(command.channel_id);
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
    const stats = chatSessionManager.getSessionStats(command.channel_id);
    const message = `📊 **ChatSession統計**\n` +
      `• セッション存在: ${stats.exists ? '✅' : '❌'}\n` +
      `• 総メッセージ数: ${stats.totalMessages}件\n` +
      `• ユーザーメッセージ: ${stats.userMessages}件\n` +
      `• モデルメッセージ: ${stats.modelMessages}件\n` +
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
