/**
 * Utilities to present Gemini output to Slack with Approve/Reject actions.
 *
 * This file is self-contained. Import and use the exported functions from your app setup
 * without modifying existing files.
 *
 * Exports:
 *  - buildGeminiReviewBlocks(responseMessage)
 *  - registerGeminiReviewActions(app, { onApprove, onReject })
 *  - createGitHubIssueFromApproval(approvalData, githubService)
 */

const GitHubService = require('../services/githubService');

/**
 * Build Block Kit blocks for a Gemini suggestion with Approve/Reject.
 * @param {string} responseMessage - The final response text to display (e.g., from app.js line 69).
 * @returns {Array<object>} Slack Block Kit blocks.
 */
const buildGeminiReviewBlocks = (responseMessage) => [ // Build Block Kit blocks for the review message
  { type: 'section', text: { type: 'mrkdwn', text: responseMessage } }, // Show the response text as markdown
  { type: 'actions', elements: [ // Action row with buttons
    { type: 'button', action_id: 'gemini_review_approve', text: { type: 'plain_text', text: 'Approve' } }, // Approve button
    { type: 'button', action_id: 'gemini_review_reject', text: { type: 'plain_text', text: 'Reject' }, style: 'danger' }, // Reject button
  ] }, // End actions
]; // End blocks array

/**
 * Register handlers for Approve/Reject actions.
 *
 * @param {import('@slack/bolt').App} app - Bolt App instance.
 * @param {object} [callbacks]
 * @param {(args: { body: any, client: any, context: any }) => Promise<void>|void} [callbacks.onApprove]
 * @param {(args: { body: any, client: any, context: any }) => Promise<void>|void} [callbacks.onReject]
 */
const registerGeminiReviewActions = (app, callbacks = {}) => { // Register button action handlers
  const { onApprove, onReject } = callbacks; // Optional callbacks for external handling

  app.action('gemini_review_approve', async ({ ack, body, client }) => { // Handle Approve button
    await ack(); // Acknowledge the action
    await client.chat.update({ // Update the original message
      channel: body?.container?.channel_id, // Target channel
      ts: body?.container?.message_ts, // Original message ts
      text: 'Gemini suggestion approved', // Fallback text
      blocks: [ { type: 'section', text: { type: 'mrkdwn', text: ':white_check_mark: Approved' } } ], // Minimal approved state
    });
    if (typeof onApprove === 'function') await onApprove({ body, client }); // Invoke optional callback
  }); // End approve handler

  app.action('gemini_review_reject', async ({ ack, body, client }) => { // Handle Reject button
    await ack(); // Acknowledge the action
    await client.chat.update({ // Update the original message
      channel: body?.container?.channel_id, // Target channel
      ts: body?.container?.message_ts, // Original message ts
      text: 'Gemini suggestion rejected', // Fallback text
      blocks: [ { type: 'section', text: { type: 'mrkdwn', text: ':x: Rejected' } } ], // Minimal rejected state
    });
    if (typeof onReject === 'function') await onReject({ body, client }); // Invoke optional callback
  }); // End reject handler
}; // End registration function

/**
 * Create GitHub issue from approved Gemini suggestion
 * @param {Object} approvalData - Approval data
 * @param {string} approvalData.originalMessage - Original user message
 * @param {string} approvalData.geminiResponse - Gemini's response
 * @param {string} approvalData.userId - Slack user ID who approved
 * @param {string} approvalData.channelId - Slack channel ID
 * @param {string} approvalData.timestamp - Approval timestamp
 * @param {GitHubService} githubService - GitHub service instance
 * @returns {Promise<Object>} GitHub issue creation result
 */
const createGitHubIssueFromApproval = async (approvalData, githubService) => {
  try {
    console.log('GitHubイシューを作成中...', approvalData);
    
    // イシューのタイトルを生成
    const title = `[Slack Bot] ${approvalData.originalMessage.substring(0, 50)}${approvalData.originalMessage.length > 50 ? '...' : ''}`;
    
    // イシューの本文を生成
    const body = `## 概要
このイシューはSlack Bot経由で承認されたGeminiの提案から自動生成されました。

## 元のメッセージ
\`\`\`
${approvalData.originalMessage}
\`\`\`

## Geminiの提案
${approvalData.geminiResponse}

## メタデータ
- **承認者**: <@${approvalData.userId}>
- **チャンネル**: <#${approvalData.channelId}>
- **承認日時**: ${new Date(approvalData.timestamp * 1000).toLocaleString('ja-JP')}
- **自動生成**: このイシューはSlack Botによって自動的に作成されました

---
*このイシューはSlack Botの承認機能によって自動生成されました。*`;

    // イシューデータを準備
    const issueData = {
      title: title,
      body: body,
      labels: ['slack-bot', 'gemini-approved', 'auto-generated'],
      assignees: []
    };

    // イシューを作成してプロジェクトに追加
    const result = await githubService.createIssueAndAddToProject(issueData);
    
    if (result.success) {
      console.log(`✅ GitHubイシュー作成成功: #${result.issue.number}`);
      return {
        success: true,
        issue: result.issue,
        project: result.project,
        message: `GitHubイシューを作成しました: ${result.issue.url}`
      };
    } else {
      console.error(`❌ GitHubイシュー作成失敗: ${result.error}`);
      return {
        success: false,
        error: result.error,
        message: `GitHubイシュー作成に失敗しました: ${result.error}`
      };
    }
  } catch (error) {
    console.error('GitHubイシュー作成でエラーが発生しました:', error);
    return {
      success: false,
      error: error.message,
      message: `GitHubイシュー作成でエラーが発生しました: ${error.message}`
    };
  }
};

/**
 * Enhanced approve handler with GitHub integration
 * @param {Object} args - Action arguments
 * @param {Object} args.body - Slack action body
 * @param {Object} args.client - Slack client
 * @param {Object} args.context - Slack context
 * @param {GitHubService} githubService - GitHub service instance
 * @param {string} originalMessage - Original user message
 * @param {string} geminiResponse - Gemini's response
 */
const handleApprovalWithGitHub = async (args, githubService, originalMessage, geminiResponse) => {
  const { body, client } = args;
  
  try {
    // 承認データを準備
    const approvalData = {
      originalMessage: originalMessage,
      geminiResponse: geminiResponse,
      userId: body.user.id,
      channelId: body.container.channel_id,
      timestamp: body.message.ts
    };

    // GitHubイシューを作成
    const githubResult = await createGitHubIssueFromApproval(approvalData, githubService);
    
    // Slackメッセージを更新
    let updateMessage = ':white_check_mark: **Approved**';
    if (githubResult.success) {
      updateMessage += `\n\n✅ GitHubイシューを作成しました: ${githubResult.issue.url}`;
    } else {
      updateMessage += `\n\n❌ GitHubイシュー作成に失敗しました: ${githubResult.error}`;
    }

    await client.chat.update({
      channel: body.container.channel_id,
      ts: body.container.message_ts,
      text: 'Gemini suggestion approved',
      blocks: [
        { 
          type: 'section', 
          text: { 
            type: 'mrkdwn', 
            text: updateMessage 
          } 
        }
      ],
    });

  } catch (error) {
    console.error('承認処理でエラーが発生しました:', error);
    
    // エラー時もSlackメッセージを更新
    await client.chat.update({
      channel: body.container.channel_id,
      ts: body.container.message_ts,
      text: 'Gemini suggestion approved with error',
      blocks: [
        { 
          type: 'section', 
          text: { 
            type: 'mrkdwn', 
            text: `:white_check_mark: **Approved**\n\n❌ エラーが発生しました: ${error.message}` 
          } 
        }
      ],
    });
  }
};

/**
 * Enhanced reject handler with Gemini feedback
 * @param {Object} args - Action arguments
 * @param {Object} args.body - Slack action body
 * @param {Object} args.client - Slack client
 * @param {Object} args.context - Slack context
 * @param {GeminiService} geminiService - Gemini service instance
 * @param {string} originalMessage - Original user message
 * @param {string} geminiResponse - Gemini's response
 * @param {Array} conversationHistory - Conversation history
 */
const handleRejectionWithFeedback = async (args, geminiService, originalMessage, geminiResponse, conversationHistory) => {
  const { body, client } = args;
  
  try {
    console.log('Reject処理を開始:', { originalMessage, geminiResponse });
    
    // フィードバックメッセージを作成
    const feedbackMessage = `ユーザーがあなたの提案を拒否しました。

**元のメッセージ**: ${originalMessage}
**あなたの提案**: ${geminiResponse}

ユーザーのフィードバックを考慮して、より良い提案をしてください。`;

    // フィードバックを含む会話履歴を作成
    const feedbackHistory = [
      ...conversationHistory,
      {
        role: 'user',
        parts: [{ text: originalMessage }]
      },
      {
        role: 'model',
        parts: [{ text: geminiResponse }]
      },
      {
        role: 'user',
        parts: [{ text: feedbackMessage }]
      }
    ];

    // Geminiにフィードバックを送信して新しい提案を取得
    const newResponse = await geminiService.generateContentWithHistory(
      feedbackMessage,
      feedbackHistory.slice(0, -1), // 最後のフィードバックメッセージを除く
      true // システムインストラクションを使用
    );

    // Slackメッセージを更新
    const updateMessage = `:x: **Rejected**\n\n🤖 **新しい提案:**\n${newResponse}`;

    await client.chat.update({
      channel: body.container.channel_id,
      ts: body.container.message_ts,
      text: 'Gemini suggestion rejected with new proposal',
      blocks: [
        { 
          type: 'section', 
          text: { 
            type: 'mrkdwn', 
            text: updateMessage 
          } 
        },
        { 
          type: 'actions', 
          elements: [
            { 
              type: 'button', 
              action_id: 'gemini_review_approve', 
              text: { type: 'plain_text', text: 'Approve' } 
            },
            { 
              type: 'button', 
              action_id: 'gemini_review_reject', 
              text: { type: 'plain_text', text: 'Reject' }, 
              style: 'danger' 
            }
          ] 
        }
      ],
    });

    console.log('Reject処理完了: 新しい提案を生成しました');

  } catch (error) {
    console.error('Reject処理でエラーが発生しました:', error);
    
    // エラー時もSlackメッセージを更新
    await client.chat.update({
      channel: body.container.channel_id,
      ts: body.container.message_ts,
      text: 'Gemini suggestion rejected with error',
      blocks: [
        { 
          type: 'section', 
          text: { 
            type: 'mrkdwn', 
            text: `:x: **Rejected**\n\n❌ エラーが発生しました: ${error.message}` 
          } 
        }
      ],
    });
  }
};

module.exports = {
  buildGeminiReviewBlocks, // Export blocks builder
  registerGeminiReviewActions, // Export action registrar
  createGitHubIssueFromApproval, // Export GitHub issue creator
  handleApprovalWithGitHub, // Export enhanced approve handler
  handleRejectionWithFeedback, // Export enhanced reject handler
}; // End exports


