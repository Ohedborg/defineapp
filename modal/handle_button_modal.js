// handle_modal.js
const { WebClient } = require('@slack/web-api');
const { App } = require('@slack/bolt');

function handleButtonAction() {
  const app = new App({
    token: process.env.BOT_TOKEN,
    appToken: process.env.APP_TOKEN,
    signingSecret: process.env.SIGNING_SECRET,
    socketMode: true,
  });

  // ...

  // Handle button action
  app.action('definition_button', async ({ ack, body, client }) => {
    await ack(); // Acknowledge the action request

    // Define the new view you want to show in the modal
    const newView = {
      type: 'modal',
      callback_id: 'your_modal', // Ensure the callback_id matches the registration
      title: {
        type: 'plain_text',
        text: 'Updated Modal',
      },
      blocks: [
        {
          type: 'input',
          block_id: 'term_input', // Unique block_id
          element: {
            type: 'plain_text_input',
            action_id: 'UserTerm', // Unique action_id
          },
          label: {
            type: 'plain_text',
            text: 'Term',
            emoji: true,
          },
        },
        {
          type: 'input',
          block_id: 'definition_input', // Unique block_id
          element: {
            type: 'plain_text_input',
            multiline: true,
            action_id: 'UserDefinition', // Unique action_id
          },
          label: {
            type: 'plain_text',
            text: 'Definition',
            emoji: true,
          },
        },
      ],
      submit: {
        type: 'plain_text',
        text: 'Submit',
      },
    };

    // Update the modal with the new view
    try {
      await client.views.update({
        view_id: body.view.id,
        hash: body.view.hash,
        view: newView,
      });
    } catch (error) {
      console.error('Error updating modal view:', error);
    }
  });

  // Handle submission of the modal form
  app.view('your_modal', async ({ ack, body, view, client }) => {
    await ack(); // Acknowledge the view submission

    // Extract user input from the submitted modal
    const termInput = view.state.values['term_input']['UserTerm'].value;
    const definitionInput = view.state.values['definition_input']['UserDefinition'].value;

    if (termInput && definitionInput) {
      const term = termInput;
      const definition = definitionInput;
      const dateSubmitted = new Date().toUTCString();
      const userName = `@${body.user.name}`; // Mention the user with an "@" symbol

      // Compose the message to send to the Slack channel in the desired JSON format
      const message = {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🔎📝 New Definition Submission",
              emoji: true,
            }
          },
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*📌 Term:*\n"${term}"`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*📝 Definition:*\n"${definition}"`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*🗓️ Date Submitted*\n${dateSubmitted}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*👥 Submitted By:*\n${userName}`
            }
          },
          {
            type: "divider"
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  emoji: true,
                  text: "Approve"
                },
                style: "primary",
                value: "Approve_submission",
                action_id: "Approve_submission"

              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  emoji: true,
                  text: "Deny"
                },
                style: "danger",
                value: "Deny_submission",
                action_id: "Deny_submission"
              }
            ]
          }
        ]
      };

      // Initialize the WebClient to send a message to the channel
      const web = new WebClient(process.env.BOT_TOKEN);

      try {
        // Log before attempting to send the message
        console.log('Sending message:', JSON.stringify(message));

        // Send a message to the Slack channel
        await web.chat.postMessage({
          channel: 'C06448J6YRW', // Replace with the actual channel ID
          blocks: message.blocks,
        });

        // Send a message to the user saying their submission was successful
        const userMessage = `Your submission was successful and is awaiting review.`;
        await web.chat.postMessage({
          channel: body.user.id, // Send a direct message to the user
          text: userMessage,
        });

        // Log after the messages are sent
        console.log('Messages sent successfully');
      } catch (error) {
        console.error('Error sending messages:', error);
      }
    } else {
      console.error('Error: Missing input values.');
    }
  });

  // ...

  (async () => {
    await app.start();
    console.log('App is running with Slack Socket Mode!');
  })();
}

module.exports = {
  handleButtonAction,
};
