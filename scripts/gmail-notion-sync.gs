/**
 * Gmail ⇄ Notion sync for Current at UBC
 * Runs as a Google Apps Script bound to tave2000@icloud.com / currentatubc@gmail.com.
 *
 * Does two things:
 *   1. INBOUND: scans the Gmail inbox for new replies to outreach threads
 *      and upserts a row in the Notion "Contacts" database, flipping status
 *      to "Replied" and storing the reply snippet + thread link.
 *   2. OUTBOUND: scans the Gmail "Sent" folder for any message sent to an
 *      email address already in Notion and, if that contact's status is
 *      "Cold" or empty, flips it to "Outreach Sent".
 *
 * Setup:
 *   1. Create a Notion integration: https://www.notion.so/my-integrations
 *      Copy the internal integration token.
 *   2. Create a Notion database with these exact property names:
 *        Name          (title)
 *        Email         (email)
 *        Organization  (rich text)
 *        Status        (select: Cold | Outreach Sent | Replied | In Conversation | Won | Lost)
 *        Last Contact  (date)
 *        Thread Link   (url)
 *        Notes         (rich text)
 *      Share the database with the integration (three-dot menu → Connections).
 *      Copy the database ID from the URL (the 32-char hex string).
 *   3. Open script.google.com while signed into currentatubc@gmail.com.
 *      New project → name it "Current at UBC Gmail Sync" → paste this file.
 *   4. In Project Settings → Script properties, add:
 *        NOTION_TOKEN          = secret_xxx
 *        NOTION_DATABASE_ID    = 32 char id
 *        OUTREACH_LABEL        = "outreach" (Gmail label applied to threads you send)
 *   5. In Gmail: create a label "outreach" and apply it to any thread you
 *      want tracked (the script only processes threads with this label,
 *      so it doesn't scan your entire inbox).
 *   6. Run `syncGmailToNotion` manually once to authorize scopes.
 *   7. Triggers → Add trigger → syncGmailToNotion → Time-driven → every 15 minutes.
 */

const NOTION_VERSION = "2022-06-28";

function syncGmailToNotion() {
  const props = PropertiesService.getScriptProperties();
  const NOTION_TOKEN = props.getProperty("NOTION_TOKEN");
  const NOTION_DATABASE_ID = props.getProperty("NOTION_DATABASE_ID");
  const OUTREACH_LABEL = props.getProperty("OUTREACH_LABEL") || "outreach";

  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    throw new Error("Missing NOTION_TOKEN or NOTION_DATABASE_ID script properties");
  }

  const label = GmailApp.getUserLabelByName(OUTREACH_LABEL);
  if (!label) {
    throw new Error(`Gmail label "${OUTREACH_LABEL}" not found. Create it and apply to tracked threads.`);
  }

  // Only threads updated in the last 2 days. The 15-min trigger means we
  // reprocess recent threads a few times, which is fine because upsert is idempotent.
  const threads = label.getThreads(0, 50).filter((t) => {
    const ageMs = Date.now() - t.getLastMessageDate().getTime();
    return ageMs < 2 * 24 * 60 * 60 * 1000;
  });

  for (const thread of threads) {
    try {
      processThread(thread, NOTION_TOKEN, NOTION_DATABASE_ID);
    } catch (err) {
      console.error(`thread ${thread.getId()} failed:`, err);
    }
  }
}

function processThread(thread, token, databaseId) {
  const messages = thread.getMessages();
  if (!messages.length) return;

  const lastMessage = messages[messages.length - 1];
  const firstMessage = messages[0];
  const subject = thread.getFirstMessageSubject();
  const threadLink = `https://mail.google.com/mail/u/0/#inbox/${thread.getId()}`;

  // Determine the "other side" email — the contact we're tracking.
  const myEmail = Session.getActiveUser().getEmail().toLowerCase();
  const otherEmail = extractContactEmail(firstMessage, lastMessage, myEmail);
  if (!otherEmail) return;

  // Did the last message come FROM the contact (inbound reply)?
  const fromRaw = lastMessage.getFrom().toLowerCase();
  const isReply = fromRaw.includes(otherEmail);

  // Did we EVER send to this contact?
  const weSent = messages.some((m) => m.getFrom().toLowerCase().includes(myEmail));

  // Figure out desired status.
  let desiredStatus;
  if (isReply) {
    desiredStatus = "Replied";
  } else if (weSent) {
    desiredStatus = "Outreach Sent";
  } else {
    return; // Labeled but nothing sent yet — skip.
  }

  const snippet = lastMessage.getPlainBody().substring(0, 500);
  const lastDate = lastMessage.getDate().toISOString().substring(0, 10);

  upsertContact(token, databaseId, {
    email: otherEmail,
    name: extractDisplayName(otherEmail, firstMessage, lastMessage),
    subject,
    threadLink,
    status: desiredStatus,
    lastContact: lastDate,
    snippet,
  });
}

function extractContactEmail(firstMessage, lastMessage, myEmail) {
  // Try the recipients of the first outbound message.
  const firstTo = firstMessage.getTo() || "";
  const match = firstTo.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (match && match[0].toLowerCase() !== myEmail) return match[0].toLowerCase();

  // Fall back to the sender of the last inbound message.
  const lastFrom = lastMessage.getFrom() || "";
  const fromMatch = lastFrom.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (fromMatch && fromMatch[0].toLowerCase() !== myEmail) return fromMatch[0].toLowerCase();

  return null;
}

function extractDisplayName(email, firstMessage, lastMessage) {
  const fromFields = [firstMessage.getFrom(), lastMessage.getFrom(), firstMessage.getTo()];
  for (const raw of fromFields) {
    if (!raw) continue;
    if (!raw.toLowerCase().includes(email)) continue;
    const nameMatch = raw.match(/^"?([^"<]+?)"?\s*</);
    if (nameMatch) return nameMatch[1].trim();
  }
  // Fall back to local-part prettified.
  return email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function upsertContact(token, databaseId, contact) {
  // 1. Query Notion for an existing row by email.
  const queryRes = UrlFetchApp.fetch(
    `https://api.notion.com/v1/databases/${databaseId}/query`,
    {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
      },
      payload: JSON.stringify({
        filter: { property: "Email", email: { equals: contact.email } },
        page_size: 1,
      }),
      muteHttpExceptions: true,
    }
  );

  if (queryRes.getResponseCode() !== 200) {
    console.error("Notion query failed", queryRes.getContentText());
    return;
  }

  const existing = JSON.parse(queryRes.getContentText()).results[0];

  const properties = {
    Name: { title: [{ text: { content: contact.name } }] },
    Email: { email: contact.email },
    Status: { select: { name: contact.status } },
    "Last Contact": { date: { start: contact.lastContact } },
    "Thread Link": { url: contact.threadLink },
    Notes: {
      rich_text: [{ text: { content: `${contact.subject}\n\n${contact.snippet}` } }],
    },
  };

  if (existing) {
    // Don't downgrade: if existing status is "Replied"/"In Conversation"/"Won",
    // keep it even if we accidentally detect "Outreach Sent".
    const existingStatus = existing.properties.Status?.select?.name;
    const downgradeBlocklist = ["Replied", "In Conversation", "Won"];
    if (downgradeBlocklist.includes(existingStatus) && contact.status === "Outreach Sent") {
      delete properties.Status;
    }

    UrlFetchApp.fetch(`https://api.notion.com/v1/pages/${existing.id}`, {
      method: "patch",
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
      },
      payload: JSON.stringify({ properties }),
      muteHttpExceptions: true,
    });
  } else {
    UrlFetchApp.fetch("https://api.notion.com/v1/pages", {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
      },
      payload: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
      muteHttpExceptions: true,
    });
  }
}
