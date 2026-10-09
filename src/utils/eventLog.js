const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../../data/moderationLog.json");

let entries = [];
try {
  entries = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") console.error("Could not read moderation log:", error);
}

// Appends one moderation event to the JSON log. Date and time are in UTC.
function logEvent({ type, message, action, score = null, reasons = [] }) {
  const iso = new Date().toISOString();
  entries.push({
    timestamp: iso,
    date: iso.slice(0, 10),
    time: iso.slice(11, 19),
    type,
    guildId: message.guild.id,
    guildName: message.guild.name,
    userId: message.author.id,
    userName: message.author.tag,
    channelId: message.channel.id,
    channelName: message.channel.name,
    content: message.content,
    attachments: message.attachments.map((a) => a.url),
    score,
    reasons,
    action,
  });

  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(entries, null, 2));
    fs.renameSync(tmp, FILE);
  } catch (error) {
    console.error("Could not write moderation log:", error);
  }
}

module.exports = { logEvent };
