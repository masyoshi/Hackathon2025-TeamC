const { App, ExpressReceiver } = require('@slack/bolt');
require('dotenv').config();

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: receiver
});

app.message(async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  await say(`Hello, <@${message.user}>`);
});

// Render's health check
receiver.router.get('/health', (req, res) => {
    res.status(200).send('OK');
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
