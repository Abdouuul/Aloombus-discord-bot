// Heuristic scam scoring. Each signal adds to a score; the per-server
// threshold decides when a message counts as a scam.

const URL_REGEX = /(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/gi;

const LEGIT_DOMAINS = [
  "discord.com",
  "discord.gg",
  "discord.gift",
  "discord.new",
  "discord.media",
  "discordapp.com",
  "discordapp.net",
  "dis.gd",
  "steampowered.com",
  "steamcommunity.com",
  "store.steampowered.com",
];

const BRAND_WORDS = ["discord", "nitro", "steam", "dlscord", "disc0rd", "discorcl"];
const SHORTENERS = ["bit.ly", "tinyurl.com", "cutt.ly", "is.gd", "rebrand.ly", "shorturl.at", "t.ly"];
const SUSPICIOUS_TLDS = ["xyz", "click", "top", "icu", "buzz", "monster", "cfd", "sbs", "gift", "ru", "cc"];

const PHRASES = [
  { regex: /free\s+(discord\s+)?nitro/, label: "free nitro offer", weight: 2 },
  { regex: /nitro\s+(gift|giveaway|for\s+free)/, label: "nitro gift", weight: 2 },
  { regex: /(steam|cs2?|csgo)\s+(gift|giveaway|skins?\s+giveaway)/, label: "steam/cs giveaway", weight: 2 },
  { regex: /claim\s+(your|the)\s+(gift|reward|prize|airdrop|nitro)/, label: "claim your reward", weight: 2 },
  { regex: /airdrop/, label: "airdrop", weight: 1 },
  { regex: /\b(gifted|giving\s+away)\b.*\b(nitro|steam|skins?)\b/, label: "gifting nitro/steam", weight: 2 },
  { regex: /scan\s+(the\s+)?qr/, label: "QR code login lure", weight: 2 },
  { regex: /(you\s+(have\s+)?been\s+(selected|chosen)|you\s+won)/, label: "'you won' lure", weight: 1 },
  { regex: /(account|nitro)\s+(will\s+be|has\s+been)\s+(suspended|disabled|terminated)/, label: "account suspension threat", weight: 2 },
  { regex: /(verify|validate)\s+your\s+(account|age)/, label: "fake verification", weight: 1 },
];

function normalize(text) {
  return text
    .normalize("NFKC")
    .replace(/[​-‍⁠﻿]/g, "")
    .toLowerCase();
}

function hostOf(rawUrl) {
  return rawUrl
    .replace(/^https?:\/\//, "")
    .split(/[/?#]/)[0]
    .replace(/^www\./, "");
}

function isLegit(host) {
  return LEGIT_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function detectScam(content, { mentionsEveryone = false } = {}) {
  const text = normalize(content);
  const reasons = [];
  let score = 0;
  const add = (weight, reason) => {
    score += weight;
    reasons.push(reason);
  };

  const hosts = [...new Set((text.match(URL_REGEX) ?? []).map(hostOf))];
  const foreignHosts = hosts.filter((h) => !isLegit(h));
  const hasLink = foreignHosts.length > 0;

  for (const host of foreignHosts) {
    if (BRAND_WORDS.some((w) => host.includes(w))) {
      add(3, `lookalike domain (${host})`);
    } else if (SHORTENERS.includes(host)) {
      add(1, `link shortener (${host})`);
    } else if (SUSPICIOUS_TLDS.includes(host.split(".").pop())) {
      add(1, `suspicious domain (${host})`);
    }
  }

  // Phrase signals only count when paired with a link or mass ping, so
  // ordinary chat about nitro/steam isn't flagged.
  if (hasLink || mentionsEveryone) {
    for (const { regex, label, weight } of PHRASES) {
      if (regex.test(text)) add(weight, label);
    }
  }

  if (mentionsEveryone && hasLink) add(2, "@everyone/@here with external link");

  return { score, reasons, isScam: score > 0 && reasons.length > 0 };
}

module.exports = { detectScam };
