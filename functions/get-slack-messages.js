// This is the code for your Kinsta Serverless Function.
// It has been updated to use CommonJS syntax for better compatibility.

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  console.log("Function invoked.");

  // These values will be securely stored in Kinsta's environment variables.
  const SLACK_TOKEN = process.env.VITE_SLACK_API_TOKEN;
  const SLACK_CHANNEL_ID = process.env.VITE_SLACK_CHANNEL_ID;

  // Check if the secrets are configured
  if (!SLACK_TOKEN || !SLACK_CHANNEL_ID) {
    console.error("Error: Slack environment variables not configured.");
    return res.status(500).json({ error: 'Slack environment variables not configured.' });
  }
  
  console.log("Found environment variables. Channel ID:", SLACK_CHANNEL_ID);

  const slackApiUrl = `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=10`;

  try {
    console.log("Calling Slack API...");
    // Call the Slack API
    const slackResponse = await fetch(slackApiUrl, {
      headers: {
        'Authorization': `Bearer ${SLACK_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log("Slack API response status:", slackResponse.status);

    if (!slackResponse.ok) {
      const errorData = await slackResponse.json();
      console.error('Slack API Error:', errorData);
      throw new Error(`Slack API error: ${errorData.error || slackResponse.statusText}`);
    }

    const slackData = await slackResponse.json();
    console.log("Successfully fetched data from Slack.");

    // Send the messages back to the front-end
    res.status(200).json({
      messages: slackData.messages || [],
    });
  } catch (error) {
    console.error('Fatal error fetching from Slack:', error);
    res.status(500).json({ error: error.message });
  }
};