const { App, ExpressReceiver } = require('@slack/bolt');
require('dotenv').config();

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: receiver
});

app.message(async ({ message, say }) => {
  // メッセージ受信時のログ出力
  console.log(`メッセージ受信: ユーザー=${message.user}, チャンネル=${message.channel}, テキスト="${message.text}"`);
  
  // say() sends a message to the channel where the event was triggered
  await say(`Hello, <@${message.user}>`);
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
