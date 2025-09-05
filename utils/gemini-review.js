/**
 * Utilities to present Gemini output to Slack with Approve/Reject actions.
 *
 * This file is self-contained. Import and use the exported functions from your app setup
 * without modifying existing files.
 *
 * Exports:
 *  - buildGeminiReviewBlocks(responseMessage)
 *  - registerGeminiReviewActions(app, { onApprove, onReject })
 */

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

module.exports = {
  buildGeminiReviewBlocks, // Export blocks builder
  registerGeminiReviewActions, // Export action registrar
}; // End exports


