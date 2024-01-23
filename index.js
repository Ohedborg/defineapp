require("dotenv").config();

// Import your modal definition module
const modals = require('/Users/ohedborg/Desktop/Define-JS/modal/modal.js');
// Import your modal button handling logic module
const handleButtonModal = require('/Users/ohedborg/Desktop/Define-JS/modal/handle_button_modal.js');
// Import your modal deny-button handling logic module
const handleDenyButtonApproval = require('./approvals/handle_deny_definition.js');
// Import your modal approve-button handling logic module
const handleApproveButtonApproval = require('/Users/ohedborg/Desktop/Define-JS/approvals/handle_approve_definition.js');


const { App } = require("@slack/bolt");

// Set our app with all required tokens (living in an external hidden file called .env)
const app = new App({
  token: process.env.BOT_TOKEN,
  appToken: process.env.APP_TOKEN,
  signingSecret: process.env.SIGNING_SECRET,
  socketMode: true,
});

// Call the correct function from the modal definition module
modals.setupModals(app); // Set up modal definition

// Call the correct function from the modal handling logic module
handleButtonModal.handleButtonAction(app); // Handle button actions

// Call the correct function from the modal handling logic module
handleDenyButtonApproval.handleDenyButtonAction(app); // Handle Deny button actions

// Call the correct function from the modal handling logic module
handleApproveButtonApproval.handleApproveButtonAction(app); // Handle Approve button actions


(async () => {
    await app.start();
    console.log('⚡️ Bolt app started');
})();
