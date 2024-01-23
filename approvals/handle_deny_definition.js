const { WebClient } = require('@slack/web-api');
const { App } = require('@slack/bolt');

function handleDenyButtonAction() {
  const app = new App({
    token: process.env.BOT_TOKEN,
    appToken: process.env.APP_TOKEN,
    signingSecret: process.env.SIGNING_SECRET,
    socketMode: true,
  });

  // ...

  // Handle 'Deny' button action
  app.action('Deny_submission', async ({ ack, body, client }) => {
    await ack(); // Acknowledge the action request

    // Extract the user who pressed the 'Deny button'
    const denyingUser = `@${body.user.name}`;
  // Updated text matching to match the received text format
  const termBlock = body.message.blocks.find((block) => block.text && block.text.text.includes('*:pushpin: Term:*'));
  const definitionBlock = body.message.blocks.find((block) => block.text && block.text.text.includes('*:memo: Definition:*'));
  const userNameBlock = body.message.blocks.find((block) => block.text && block.text.text.includes('*:busts_in_silhouette: Submitted By:*'));
  const dateAddedBlock = body.message.blocks.find((block) => block.text && block.text.text.includes('*:spiral_calendar_pad: Date Submitted*'));

  if (!termBlock || !definitionBlock || !userNameBlock || !dateAddedBlock) {
    console.error('One or more required blocks not found in the message.');
    return;
  }

  const term = termBlock.text.text.replace('*:pushpin: Term:*', '').trim();
  const definition = definitionBlock.text.text.replace('*:memo: Definition:*', '').trim();
  const userName = userNameBlock.text.text.replace('*:busts_in_silhouette: Submitted By:*', '').trim();
  const dateAdded = dateAddedBlock.text.text.replace('*:spiral_calendar_pad: Date Submitted*', '').trim();

    // Update the message with the provided block structure, including the original values
    try {
      const updatedMessage = {
        channel: body.container.channel_id,
        ts: body.message.ts, // Use the timestamp of the original message
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🔎📝 New Definition Submission',
              emoji: true,
            },
          },
          {
            type: 'divider',
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*📌 Term:* \n ${term}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*📝 Definition:* \n ${definition}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*🗓️ Date Submitted:* \n ${dateAdded}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*👥 Submitted By:* \n ${userName}`,
            },
          },
          {
            type: 'divider',
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `❌ This submission was denied by ${denyingUser}`,
              },
            ],
          },
        ],
      };

      // Use the WebClient to update the message
      const web = new WebClient(process.env.BOT_TOKEN);
      await web.chat.update(updatedMessage);

      console.log('Message updated successfully');
    } catch (error) {
      console.error('Error updating message:', error);
    }
  });

  // ...

  (async () => {
    await app.start();
    console.log('App is running with Slack Socket Mode!');
  })();
}

module.exports = {
  handleDenyButtonAction
};
