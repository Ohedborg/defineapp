const { WebClient } = require('@slack/web-api');
const { App } = require('@slack/bolt');
const axios = require('axios');

const app = new App({
  token: process.env.BOT_TOKEN,
  appToken: process.env.APP_TOKEN,
  signingSecret: process.env.SIGNING_SECRET,
  socketMode: true,
});

// Define the function to handle the "Approve_submission" action and insert data into Airtable
const handleApproveButtonAction = async (body) => {
  if (!body.message || !body.message.blocks) {
    console.error('Message or blocks not found in the request.');
    return;
  }

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

  // Construct the data to be sent to Airtable
  const data = {
    records: [
      {
        fields: {
          Term: term,
          Definition: definition,
          AddedBy: userName,
          DateAdded: dateAdded,
        },
      },
    ],
  };

  // Access Airtable base ID and table name from environment variables
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  // Construct the Airtable API URL
  const airtableBaseUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

  try {
    const response = await axios.post(airtableBaseUrl, data, {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data && response.data.records) {
      const newRecordIds = response.data.records.map((record) => record.id);
      console.log('Data inserted into Airtable successfully. New record IDs:', newRecordIds);
    } else {
      console.error('Failed to insert data into Airtable.');
    }
  } catch (error) {
    console.error('Error inserting data into Airtable:', error);
  }

  // Create the updated message block structure for Slack
  const updatedMessageBlocks = [
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
        text: `*📌 Term:*\n ${term}`,
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
        text: `*🗓️ Date Submitted* \n ${dateAdded}`,
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
          text: `:white_check_mark: This submission was approved by @${body.user.username}`,
        },
      ],
    },
  ];

  // Update the message with the new block structure
  try {
    const web = new WebClient(process.env.BOT_TOKEN);
    await web.chat.update({
      channel: body.container.channel_id,
      ts: body.message.ts,
      blocks: updatedMessageBlocks,
    });

    console.log('Message updated successfully');
  } catch (error) {
    console.error('Error updating message:', error);
  }
};

// Handle button action
app.action('Approve_submission', async ({ ack, body, client }) => {
  await ack(); // Acknowledge the action request

  // Call the handleApproveButtonAction function to insert data into Airtable and update Slack message
  await handleApproveButtonAction(body);
});

// ... Rest of your code

(async () => {
  await app.start();
  console.log('App is running with Slack Socket Mode!');
})();

module.exports = {
  handleApproveButtonAction,
};
