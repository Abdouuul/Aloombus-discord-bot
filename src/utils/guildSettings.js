const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../../data/guildSettings.json");

const DEFAULTS = {
  scam: {
    enabled: false,
    action: "delete_kick", // "delete" | "delete_kick"
    threshold: 3,
    logChannelId: null,
    exemptRoleIds: [],
    exemptChannelIds: [],
  },
  imageSpam: {
    enabled: false,
    action: "delete", // "delete" | "delete_kick"
    threshold: 4, // minimum number of images in a text-less message
    maxMemberAgeHours: 0, // only act on members who joined this recently (0 = any member)
    logChannelId: null,
    exemptRoleIds: [],
    exemptChannelIds: [],
  },
  honeypot: {
    enabled: false,
    channelId: null,
    logChannelId: null,
    exemptRoleIds: [],
  },
  artPromo: {
    enabled: false,
    action: "delete", // "delete" | "delete_warn" (never kicks)
    threshold: 3,
    logChannelId: null,
    exemptRoleIds: [],
    exemptChannelIds: [],
  },
};

let store = {};
try {
  store = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") console.error("Could not read guild settings:", error);
}

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, FILE);
}

// Returns the settings for one feature of a guild, with defaults filled in.
function get(guildId, feature) {
  return { ...DEFAULTS[feature], ...(store[guildId]?.[feature] ?? {}) };
}

function set(guildId, feature, patch) {
  const updated = { ...get(guildId, feature), ...patch };
  store[guildId] = { ...store[guildId], [feature]: updated };
  save();
  return updated;
}

module.exports = { get, set };
