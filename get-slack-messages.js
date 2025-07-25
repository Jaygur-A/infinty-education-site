// This is the code for your Kinsta Serverless Function.
// Create a file named 'get-slack-messages.js' inside a 'functions' folder in your project.

// The 'node-fetch' library is required to make API calls.
// You'll need to add 'node-fetch' to your project's package.json file.
import fetch from 'node-fetch';

export default async (req, res) => {
  // These values will be securely stored in Kinsta's environment variables, not here in the code.
  const SLACK_TOKEN = process.env.VITE_SLACK_API_TOKEN;
  const SLACK_CHANNEL_ID = process.env.VITE_SLACK_CHANNEL_ID;

  // Check if the secrets are configured
  if (!SLACK_TOKEN || !SLACK_CHANNEL_ID) {
    return res.status(500).json({ error: 'Slack environment variables not configured.' });
  }

  const slackApiUrl = `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=10`;

  try {
    // Call the Slack API
    const slackResponse = await fetch(slackApiUrl, {
      headers: {
        'Authorization': `Bearer ${SLACK_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!slackResponse.ok) {
      const errorData = await slackResponse.json();
      console.error('Slack API Error:', errorData);
      throw new Error(`Slack API error: ${errorData.error || slackResponse.statusText}`);
    }

    const slackData = await slackResponse.json();

    // Send the messages back to the front-end
    res.status(200).json({
      messages: slackData.messages || [],
    });
  } catch (error) {
    console.error('Error fetching from Slack:', error);
    res.status(500).json({ error: error.message });
  }
};
