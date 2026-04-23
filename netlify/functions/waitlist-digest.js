// Netlify Scheduled Function: waitlist-digest
// Runs every Monday at 16:00 UTC (9:00 AM Vancouver time during PDT, 8:00 AM during PST).
// Pulls total waitlist submissions from Netlify's Forms API and posts a digest to Slack.
//
// Setup (one-time):
// 1. Reuse SLACK_WEBHOOK_URL (same one as submission-created).
// 2. Create a Netlify Personal Access Token:
//    https://app.netlify.com/user/applications#personal-access-tokens
//    Add it as env var NETLIFY_ACCESS_TOKEN.
// 3. Find the site ID: Netlify Site -> Site configuration -> Site information.
//    Add it as env var NETLIFY_SITE_ID.
// 4. Deploy. Scheduled config below wires the cron.
//
// Docs: https://docs.netlify.com/functions/scheduled-functions/

export const config = {
  schedule: "0 16 * * 1", // Monday 16:00 UTC
};

export const handler = async () => {
  try {
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    const siteId = process.env.NETLIFY_SITE_ID;
    const webhook = process.env.SLACK_WEBHOOK_URL;

    if (!token || !siteId || !webhook) {
      console.error("Missing required env vars", {
        hasToken: !!token,
        hasSite: !!siteId,
        hasWebhook: !!webhook,
      });
      return { statusCode: 500, body: "missing config" };
    }

    // 1. Fetch forms on the site.
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/forms`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!formsRes.ok) {
      const t = await formsRes.text();
      console.error("Netlify forms fetch failed", formsRes.status, t);
      return { statusCode: 502, body: "forms fetch failed" };
    }
    const forms = await formsRes.json();
    const waitlist = forms.find((f) => f.name === "waitlist");
    if (!waitlist) {
      console.error("No waitlist form found on site");
      return { statusCode: 404, body: "waitlist form not found" };
    }

    const total = waitlist.submission_count ?? 0;

    // 2. Count signups in the last 7 days. Pull recent submissions, page 1.
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const subsRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${waitlist.id}/submissions?per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    let weekCount = 0;
    if (subsRes.ok) {
      const subs = await subsRes.json();
      weekCount = subs.filter(
        (s) => new Date(s.created_at).getTime() >= weekAgo
      ).length;
    }

    // 3. Post to Slack.
    const progressBar = buildProgressBar(total, 100);
    const slackBody = {
      text: `Waitlist weekly: ${total} total (+${weekCount} this week)`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Waitlist weekly digest",
            emoji: false,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Total signups*\n${total}` },
            { type: "mrkdwn", text: `*Last 7 days*\n+${weekCount}` },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Progress to 100*\n\`${progressBar}\` ${Math.min(
              100,
              Math.round((total / 100) * 100)
            )}%`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `currentatubc.com · posted every Monday 9am PT`,
            },
          ],
        },
      ],
    };

    const slackRes = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackBody),
    });
    if (!slackRes.ok) {
      const t = await slackRes.text();
      console.error("Slack post failed", slackRes.status, t);
      return { statusCode: 502, body: "slack post failed" };
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("waitlist-digest error", err);
    return { statusCode: 500, body: "handler error" };
  }
};

function buildProgressBar(current, goal, width = 20) {
  const ratio = Math.min(1, current / goal);
  const filled = Math.round(ratio * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}
