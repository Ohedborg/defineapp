require('dotenv').config(); // Load environment variables from .env file
const { App } = require('@slack/bolt');
const axios = require('axios');

function setupModals(app) {
  app.command('/define', async ({ ack, body, client }) => {
    await ack();

    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'your_modal_1',
          title: {
            type: 'plain_text',
            text: 'Search for a definition',
            emoji: true,
          },
          blocks: [
            {
              type: 'input',
              block_id: 'term_input_1',
              element: {
                type: 'plain_text_input',
                action_id: 'UserTerm_1',
              },
              label: {
                type: 'plain_text',
                text: 'Term',
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
                text: "Can't find what you are looking for?",
              },
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Add definition',
                  emoji: true,
                },
                action_id: 'definition_button',
              },
            },
          ],
          submit: {
            type: 'plain_text',
            text: 'Search',
            emoji: true,
          },
        },
      });
    } catch (error) {
      console.error('Error opening modal:', error);
    }
  });

  app.view('your_modal_1', async ({ ack, body, view, client }) => {
    await ack();

    const termInput1 = view.state.values['term_input_1']['UserTerm_1'].value;

    // Retrieve text from Airtable using environment variables
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;
    const airtableTableIdOrName = process.env.AIRTABLE_TABLE_NAME;
    const airtableApiKey = process.env.AIRTABLE_API_KEY;

    // Construct the Airtable API URL for listing records
    const airtableEndpoint = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableIdOrName)}`;

    const headers = {
      'Authorization': `Bearer ${airtableApiKey}`,
    };

    const params = {
      pageSize: 1,
      fields: ['Term', 'Definition', 'AddedBy', 'DateAdded'],
      filterByFormula: `FIND(LOWER("${termInput1}"), LOWER({Term}))`,
    };

    try {
      // Make a GET request to list records from Airtable
      const response = await axios.get(airtableEndpoint, { headers, params });

      const airtableRecords = response.data.records;

      if (airtableRecords.length > 0) {
        const firstRecord = airtableRecords[0];
        const textFromAirtable = firstRecord.fields.Definition;
        const addedBy = firstRecord.fields.AddedBy;
        const dateAdded = firstRecord.fields.DateAdded;

        const newView = {
          type: 'modal',
          callback_id: 'your_modal_1',
          title: {
            type: 'plain_text',
            text: termInput1,
            emoji: true,
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: textFromAirtable, // Use the value from Airtable here
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `*Added By:* ${addedBy}\n*Date Added:* ${dateAdded}`,
                },
              ],
            },
          ],
        };

        try {
          await client.views.open({
            trigger_id: body.trigger_id,
            view: newView,
          });
        } catch (error) {
          console.error('Error opening new modal view:', error);
        }
      } else {
        // Display a message when no records are found in Airtable
        const newView = {
          type: 'modal',
          callback_id: 'your_modal_1',
          title: {
            type: 'plain_text',
            text: termInput1,
            emoji: true,
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Sorry, we cannot find a definition for "${termInput1}". Please create a submission for it so we can add it to the database.`,
              },
            },
          ],
        };

        try {
          await client.views.open({
            trigger_id: body.trigger_id,
            view: newView,
          });
        } catch (error) {
          console.error('Error opening new modal view:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching data from Airtable:', error);
    }
  });
}

module.exports = {
  setupModals,
};
