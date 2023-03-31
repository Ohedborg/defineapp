require("dotenv").config();

// import slack bolt, jsforce packages and initiate connection with salesforce
const jsforce = require("jsforce");
const conn = new jsforce.Connection({
  loginUrl: "https://login.salesforce.com",
});
const { App } = require("@slack/bolt");

// Set our app with all required tokens (living in an external hidden file called .env)
const app = new App({
  token: process.env.BOT_TOKEN,
  appToken: process.env.APP_TOKEN,
  signingSecret: process.env.SIGNING_SECRET,
  socketMode: true,
});

// Setting up the ability to query Salesforce with hardcoded login / password
async function querySalesforce(query) {
  try {
    await conn.login(
      process.env.SALESFORCE_USERNAME,
      process.env.SALESFORCE_PASSWORD
    );
    const result = await conn.query(query);
    return result;
  } catch (error) {
    console.error(error);
  }
}

// Fetching escalated cases in Service Cloud
async function getEscalatedCasesCount() {
  try {
    const query = "SELECT COUNT() FROM Case WHERE Status = 'Waiting on Customer' AND OwnerId = '0058Y00000CT6Z8QAL'";
    const result = await querySalesforce(query);
    return result.totalSize;
  } catch (error) {
    console.error(error);
  }
}

// Post a message to a channel your app is in using ID and message text
async function publishMessage(id, escalatedCasesCount) {
  try {
    // Call the chat.postMessage method using the built-in WebClient
    const result = await app.client.chat.postMessage({
      // The token you used to initialize your app
      token: process.env.BOT_TOKEN,
      channel: id,
      // Using blocks[] array with a button containing the link
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "Hi <@U02ASF7S056> you have *" +
              escalatedCasesCount +
              " escalated pending items*\n\nAccess your pending items list in your Home Tab :arrow_up: ",
          },
          accessory: {
            type: "image",
            image_url:
              "https://files.slack.com/files-pri/T02A2RM6XDG-F04VCGWKU5P/screenshot_2023-03-21_at_17.53.31.png?pub_secret=9ba45d548c",
            alt_text: "cute cat",
          },
        },
        {
          type: "divider",
        },
      ],
    });

    // Print result, which includes information about the message (like TS)
    console.log(result);
  } catch (error) {
    console.error(error);
  }
}

// Send escalated cases to Message Tab App
async function sendescalated() {
  const escalatedCasesCount = await getEscalatedCasesCount();
  const channelId = "D04UBQF0FKR";
  await publishMessage(channelId, escalatedCasesCount);
}

sendescalated();

// Build the home view
app.event("app_home_opened", async ({ payload, client }) => {
  const userId = payload.user;

  // Query Salesforce data for Cases
  const caseQuery = "SELECT Id, Subject, toLabel(Status), CreatedDate FROM Case WHERE OwnerId = '0058Y00000CT6Z8QAL' AND (Status = 'Waiting on Customer' OR Status = 'Working' OR Status = 'Closed') ORDER BY CreatedDate DESC LIMIT 5";
  const caseResult = await querySalesforce(caseQuery);

  const caseBlocks = [
    
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: "*Subject*",
        },
        {
          type: "mrkdwn",
          text: "*Status*",
        },
      ],
    },
    ...caseResult.records.flatMap((record) => [
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `<https://abouhamidi-230316-537-demo.lightning.force.com/${record.Id}|${record.Subject}>`,
          },
          {
            type: "mrkdwn",
            text: `${record.Status}`,
          },
        ],
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: `${Math.round((new Date() - new Date(record.CreatedDate)) / (1000 * 60 * 60 * 24))} days`,
            emoji: true,
          },
          value: "view_case",
          action_id: `view_case_${record.Id}`,
        },
        
      },
      {
        type: "divider",
      },
    ]),
  ];

  try {
    // Call the views.publish method using the WebClient passed to listeners
    const result = await client.views.publish({
      user_id: userId,
      view: {
        // Home tabs must be enabled in your app configuration page under "App Home"
        type: "home",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                "*Welcome home, <@" +
                userId +
                "> :house:* \n\nPlease find your pending cases below\nYou can view and approve these cases right from Slack :slack:",
            },
            accessory: {
              type: "image",
              image_url:
                "https://www.ifp-school.com/sites/ifp-school.com/files/telechargements/images/offres_sponsoring/Logo_Technip_Energies.jpg",
              alt_text: "cute cat",
            },
          },

          {
            type: "divider",
          },
          {
            type: "section",
            block_id: "filter_section",
            text: {
              type: "mrkdwn",
              text: "Filter cases by:",
            },
            accessory: {
              type: "static_select",
              placeholder: {
                type: "plain_text",
                text: "Select a filter",
              },
              options: [
                {
                  text: {
                    type: "plain_text",
                    text: "Status",
                  },
                  value: "filter_status",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Alphabetical",
                  },
                  value: "filter_alphabetical",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Most Recent",
                  },
                  value: "filter_most_recent",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Oldest",
                  },
                  value: "filter_oldest",
                },
              ],
              action_id: "case_filter",
            },
          },
          ...caseBlocks,
        ],
      },
    });

    console.log(result);
  } catch (error) {
    console.error(error);
  }
});

// Rebuild home view when filtering cases
app.action("case_filter", async ({ ack, body, context, client }) => {
  await ack();

  const selectedFilter = body.actions[0].selected_option.value;
  let filteredCases = [];
  let caseQuery = "";

  // Modify the query based on the selected filter
  switch (selectedFilter) {
    case "filter_status":
  caseQuery =
    "SELECT Id, Subject, toLabel(Status), CreatedDate FROM Case WHERE OwnerId = '0058Y00000CT6Z8QAL' ORDER BY Status ASC LIMIT 5";
  break;
case "filter_alphabetical":
  caseQuery =
    "SELECT Id, Subject, toLabel(Status), CreatedDate FROM Case WHERE OwnerId = '0058Y00000CT6Z8QAL' ORDER BY Subject ASC LIMIT 5";
  break;
case "filter_most_recent":
  caseQuery =
    "SELECT Id, Subject, toLabel(Status), CreatedDate FROM Case WHERE OwnerId = '0058Y00000CT6Z8QAL' ORDER BY CreatedDate DESC LIMIT 5";
  break;
case "filter_oldest":
  caseQuery =
    "SELECT Id, Subject, toLabel(Status), CreatedDate FROM Case WHERE OwnerId = '0058Y00000CT6Z8QAL' ORDER BY CreatedDate ASC LIMIT 5";
  break;

  }

  // Query Salesforce with the modified query
  const caseResult = await querySalesforce(caseQuery);
  filteredCases = caseResult.records;
  try {
    // Call the views.publish method using the WebClient passed to listeners
    const result = await client.views.publish({
      user_id: body.user.id,
      view: {
        // Home tabs must be enabled in your app configuration page under "App Home"
        type: "home",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                "*Welcome home, <@" +
                body.user.id +
                "> :house:* \n\nPlease find your pending cases below\nYou can view and approve these cases right from Slack :slack:",
            },
            accessory: {
              type: "image",
              image_url:
                "https://www.ifp-school.com/sites/ifp-school.com/files/telechargements/images/offres_sponsoring/Logo_Technip_Energies.jpg",
              alt_text: "cute cat",
            },
          },

          {
            type: "divider",
          },
          {
            type: "section",
            block_id: "filter_section",
            text: {
              type: "mrkdwn",
              text: "Filter cases by:",
            },
            accessory: {
              type: "static_select",
              placeholder: {
                type: "plain_text",
                text: "Select a filter",
              },
              options: [
                {
                  text: {
                    type: "plain_text",
                    text: "Status",
                  },
                  value: "filter_status",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Alphabetical",
                  },
                  value: "filter_alphabetical",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Most Recent",
                  },
                  value: "filter_most_recent",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Oldest",
                  },
                  value: "filter_oldest",
                },
              ],
              action_id: "case_filter",
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: "*Subject*",
              },
              {
                type: "mrkdwn",
                text: "*Status*",
              },
            ],
          },
          ...filteredCases.flatMap((record) => [
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `<https://abouhamidi-230316-537-demo.lightning.force.com/${record.Id}|${record.Subject}>`,
                },
                {
                  type: "mrkdwn",
                  text: `${record.Status}`,
                },
              ],
              accessory: {
                type: "button",
                text: {
                  type: "plain_text",
                  text: `${Math.round((new Date() - new Date(record.CreatedDate)) / (1000 * 60 * 60 * 24))} days`,
                  emoji: true,
                },
                value: "view_case",
                action_id: `view_case_${record.Id}`,
              },
              
            },
            {
              type: "divider",
            },
          ]),
        ],
      },
    });

    console.log(result);
  } catch (error) {
    console.error(error);
  }
});

// Build modal when clicking view button on a case
app.action(/^view_case_.*/, async ({ ack, body, context, client }) => {
  await ack();

  const caseId = body.actions[0].action_id.split("_")[2];

  try {
    const caseQuery = `SELECT Id, Subject, Status, Description FROM Case WHERE Id='${caseId}'`;
    const caseResult = await querySalesforce(caseQuery);
    const caseDetails = caseResult.records[0];

    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        title: {
          type: "plain_text",
          text: "Case Details",
        },
        blocks: [
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Subject:*\n${caseDetails.Subject}`,
              },
              {
                type: "mrkdwn",
                text: `*Status:*\n${caseDetails.Status}`,
              },
            ],
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Description:*\n${
                  caseDetails.Description || "No description provided"
                }`,
              },
            ],
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Approve",
                  emoji: true,
                },
                style: "primary",
                value: "approve_case",
                action_id: `approve_case_${caseId}`,
              },
            ],
          },
        ],
        close: {
          type: "plain_text",
          text: "Close",
        },
      },
    });
  } catch (error) {
    console.error(error);
  }
});

app.action(/^approve_case_.*/, async ({ ack, body, context, client }) => {
  await ack();

  const caseId = body.actions[0].action_id.split("_")[2];

  // Update the case in Salesforce or perform any approval-related actions here
  // ...

  try {
    await client.views.update({
      view_id: body.view.id,
      view: {
        type: "modal",
        title: {
          type: "plain_text",
          text: "Case Details",
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:white_check_mark: Case *${caseId}* has been approved by <@${body.user.id}>.`,
            },
          },
        ],
        close: {
          type: "plain_text",
          text: "Close",
        },
      },
    });
  } catch (error) {
    console.error(error);
  }
});

// Run everything that's above with node.js
(async () => {
  // Start your app
  await app.start();

  console.log("⚡️ Bolt app is running!");
})();