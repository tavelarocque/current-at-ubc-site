// Netlify Function: submission-created
// Fires automatically on every Netlify form submission.
// Posts a formatted message to Slack via an Incoming Webhook.
//
// Setup (one-time):
// 1. In Slack: create an Incoming Webhook pointing at #general.
//    https://api.slack.com/messaging/webhooks
// 2. In Netlify: Site settings -> Environment variables -> add
//    SLACK_WEBHOOK_URL = https://hooks.slack.com/services/...
// 3. Deploy. Netlify auto-detects this file and wires it to form events.
//    Docs: https://docs.netlify.com/forms/notifications/#email-notifications (see serverless)

export const handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || "{}").payload || {};
    const formName = payload.form_name || "unknown-form";
    const data = payload.data || {};
    const email = data.email || "(no email)";
    const submittedAt = payload.created_at || new Date().toISOString();

    // Only act on the waitlist form. Skip any other forms silently.
    if (formName !== "waitlist") {
      return { statusCode: 200, body: "ignored non-waitlist form" };
    }

    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) {
      console.error("SLACK_WEBHOOK_URL env var not set");
      return { statusCode: 500, body: "internal error" };
    }

    const slackBody = {
      text: `New waitlist signup — ${email}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "New waitlist signup", emoji: false },
        },
        {
          type: "section",
          fields: [
            { type: "plain_text", text: `Email: ${email}` },
            { type: "plain_text", text: `When: ${submittedAt}` },
          ],
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: "currentatubc.com · /thank-you" },
          ],
        },
      ],
    };

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackBody),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Slack webhook failed", res.status, text);
      return { statusCode: 502, body: "internal error" };
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("submission-created handler error", err);
    return { statusCode: 500, body: "internal error" };
  }
};
