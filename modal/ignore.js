require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios'); // for making HTTP requests

function setupModals(app) {
  app.command('/define', async ({ ack, body, client }) => {
    // Acknowledge the command request
    await ack();

    try {
      // Make a GET request to Airtable to fetch records from your table
      const airtableBaseUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`;
      const response = await axios.get(airtableBaseUrl, {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        },
      });

      if (response.status === 200) {
        const records = response.data.records;

        // Extract relevant data from the records and create options for the multi_external_select
        const options = records.map((record) => ({
          text: {
            type: 'plain_text',
            text: record.fields.Term, // Adjust to your Airtable field name
          },
          value: record.id,
        }));

        // Open a modal with the options populated from Airtable
        await client.views.open({
          trigger_id: body.trigger_id,
          view: {
            type: 'modal',
            title: {
              type: 'plain_text',
              text: 'Search for a definition',
              emoji: true,
            },
            submit: {
              type: 'plain_text',
              text: 'Search',
              emoji: true,
            },
            close: {
              type: 'plain_text',
              text: 'Close',
              emoji: true,
            },
            blocks: [
              {
                type: 'section',
                block_id: 'section678',
                text: {
                  type: 'mrkdwn',
                  text: 'Pick items from the list',
                },
                accessory: {
                  action_id: 'multi_external_select-action',
                  type: 'multi_external_select',
                  placeholder: {
                    type: 'plain_text',
                    text: 'Select items',
                  },
                  min_query_length: 3,
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
                  value: 'click_me_123',
                  action_id: 'definition_button',
                },
              },
            ],
          },
        });
      }
    } catch (error) {
      console.error('Error opening modal:', error);
    }
  });
}

module.exports = {
  setupModals,
};
