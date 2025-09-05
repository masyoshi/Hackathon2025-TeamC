const { App, ExpressReceiver } = require('@slack/bolt');
const { buildGeminiReviewBlocks, registerGeminiReviewActions, handleApprovalWithGitHub, handleRejectionWithFeedback } = require('./utils/gemini-review');
const GeminiService = require('./services/geminiService');
const ResponseProcessor = require('./services/responseProcessor');
const ActionHandlers = require('./services/actionHandlers');
const ChatSessionManager = require('./services/chatSessionManager');
const GitHubService = require('./services/githubService');
require('dotenv').config();

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });

// Initialize services
const geminiService = new GeminiService();
const responseProcessor = new ResponseProcessor();
const actionHandlers = new ActionHandlers();
const chatSessionManager = new ChatSessionManager();
const githubService = new GitHubService();

// Store message context for GitHub integration
const messageContext = new Map();

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: receiver
});

// Register Approve/Reject action handlers for Gemini review with GitHub integration
registerGeminiReviewActions(app, {
  onApprove: async (args) => {
    const { body, client } = args;
    const messageTs = body.container.message_ts;
    const channelId = body.container.channel_id;
    
    // メッセージコンテキストを取得
    const contextKey = `${channelId}-${messageTs}`;
    const context = messageContext.get(contextKey);
    
    if (context) {
      console.log('Approval action triggered with context:', context);
      
      // GitHubイシューを作成
      await handleApprovalWithGitHub(args, githubService, context.originalMessage, context.geminiResponse);
      
      // コンテキストを削除（メモリ節約）
      messageContext.delete(contextKey);
    } else {
      console.log('Approval action triggered, but context not found for message:', contextKey);
      
      // コンテキストが見つからない場合のフォールバック
      await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: 'Gemini suggestion approved',
        blocks: [
          { 
            type: 'section', 
            text: { 
              type: 'mrkdwn', 
              text: ':white_check_mark: **Approved**\n\n⚠️ コンテキストが見つからないため、GitHubイシューは作成されませんでした。' 
            } 
          }
        ],
      });
    }
  },
  onReject: async (args) => {
    const { body, client } = args;
    const messageTs = body.container.message_ts;
    const channelId = body.container.channel_id;
    
    // メッセージコンテキストを取得
    const contextKey = `${channelId}-${messageTs}`;
    const context = messageContext.get(contextKey);
    
    if (context) {
      console.log('Rejection action triggered with context:', context);
      
      // ChatSessionから会話履歴を取得
      const session = chatSessionManager.getSession(channelId);
      const conversationHistory = session.getOfficialHistory(10);
      
      // Reject処理を実行（フィードバック付き）
      await handleRejectionWithFeedback(
        args, 
        geminiService, 
        context.originalMessage, 
        context.geminiResponse, 
        conversationHistory
      );
      
      // コンテキストを削除（メモリ節約）
      messageContext.delete(contextKey);
    } else {
      console.log('Rejection action triggered, but context not found for message:', contextKey);
      
      // コンテキストが見つからない場合のフォールバック
      await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: 'Gemini suggestion rejected',
        blocks: [
          { 
            type: 'section', 
            text: { 
              type: 'mrkdwn', 
              text: ':x: **Rejected**\n\n⚠️ コンテキストが見つからないため、フィードバックは送信されませんでした。' 
            } 
          }
        ],
      });
    }
  }
});

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
    const response = await client.chat.postMessage({
      channel: message.channel,
      text: responseMessage,
      blocks: buildGeminiReviewBlocks(responseMessage),
    });
    
    // 実際のメッセージタイムスタンプでコンテキストを保存
    const actualMessageTs = response.ts;
    const contextKey = `${message.channel}-${actualMessageTs}`;
    messageContext.set(contextKey, {
      originalMessage: message.text,
      geminiResponse: processedResponse.message,
      userId: message.user,
      channelId: message.channel,
      timestamp: actualMessageTs
    });
    
    // コンテキストのクリーンアップ（5分後に削除）
    setTimeout(() => {
      messageContext.delete(contextKey);
    }, 5 * 60 * 1000); // 5分

  } catch (error) {
    console.error('エラーが発生しました:', error);
    await say(`<@${message.user}> 申し訳ありませんが、エラーが発生しました: ${error.message}`);
  }
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
