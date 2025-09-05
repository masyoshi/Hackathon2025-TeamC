# Slack Bot Application

This is a simple Slack Bot application using Node.js and `@slack/bolt`.

## Setup

1.  Clone this repository.
2.  Install dependencies.

    ```bash
    npm install
    ```

3.  Create a `.env` file in the root directory and add the following environment variables.

    ```
    SLACK_BOT_TOKEN=xoxb-your-token
    SLACK_SIGNING_SECRET=your-signing-secret
    GEMINI_API_KEY=your-gemini-api-key
    ```

    You can get these values from the following sources:

    *   `SLACK_BOT_TOKEN`: `OAuth & Permissions` > `Bot User OAuth Token` (Slack App configuration page)
    *   `SLACK_SIGNING_SECRET`: `Basic Information` > `App Credentials` > `Signing Secret` (Slack App configuration page)
    *   `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキーを取得

## Running Locally

```bash
npm start
```

Your app will be running on `http://localhost:3000`.

To receive events from Slack, you need to use a tool like ngrok to expose your local server to the internet.

1.  Start ngrok.

    ```bash
    ngrok http 3000
    ```

2.  Copy the `https` forwarding URL.
3.  On your Slack App configuration page, go to `Event Subscriptions`.
4.  Enable events and paste the ngrok URL with the `/slack/events` path into the `Request URL` field.
    (e.g., `https://xxxx-xx-xxx-xx-xx.ngrok.io/slack/events`)
5.  Subscribe to `message.channels` bot event under `Subscribe to bot events`.
6.  Save changes and reinstall your app to the workspace.

## Deploying to Render

This application is ready to be deployed on Render.

1.  Create a new `Web Service` on Render and connect your GitHub repository.
2.  Set the following properties:
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
3.  Add your environment variables (`SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `GEMINI_API_KEY`) in the `Environment` section.
4.  Deploy your service.
5.  Once deployed, copy your service URL (e.g., `https://your-app.onrender.com`).
6.  On your Slack App configuration page, go to `Event Subscriptions`.
7.  Set the `Request URL` to your Render service URL with the `/slack/events` path.
    (e.g., `https://your-app.onrender.com/slack/events`)
8.  Make sure you have subscribed to `message.channels` bot event.
9.  Save changes.

Your bot should now be running on Render and responding to messages in Slack.
