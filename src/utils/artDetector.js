// Heuristic detection of self-promotion of artwork / commissions.

const URL_REGEX = /(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/gi;

const PROMO_DOMAINS = [
  "artstation.com",
  "deviantart.com",
  "behance.net",
  "ko-fi.com",
  "patreon.com",
  "instagram.com",
  "linktr.ee",
  "carrd.co",
  "vgen.co",
  "fiverr.com",
  "etsy.com",
  "gumroad.com",
  "cara.app",
  "bsky.app",
];

const PHRASES = [
  { regex: /commissions?\s+(are\s+|is\s+)?(now\s+)?(open|available)/, label: "commissions open", weight: 3 },
  { regex: /(open|available)\s+(for|to)\s+(art\s+)?commissions?/, label: "open for commissions", weight: 3 },
  { regex: /(taking|accepting|offering)\s+(art\s+|custom\s+)?commissions?/, label: "taking commissions", weight: 3 },
  { regex: /commissions?\s+(slots?|sheet|info|prices?)/, label: "commission info", weight: 2 },
  { regex: /\bi('m|\s+am)\s+(a|an)\s+([a-z]+\s+)?(artist|illustrator|animator|designer)\b/, label: "'I'm an artist'", weight: 2 },
  { regex: /check\s+(out\s+)?my\s+(art|artwork|work|portfolio|page|commissions?|shop|store)/, label: "check out my art", weight: 2 },
  { regex: /(dm|message|pm|contact)\s+me\s+.*(commission|art\b|artwork|portfolio|prices?|rates?|order)/, label: "DM me for art", weight: 2 },
  { regex: /\b(prices?|rates?)\s+(start|starting)\s+(at|from)/, label: "pricing", weight: 2 },
  { regex: /custom\s+(art|artwork|emotes?|emojis?|avatars?|logos?|banners?|illustrations?)/, label: "custom art offer", weight: 2 },
  { regex: /(logo|emote|emoji|banner|avatar|pfp|vtuber\s+model|illustration)s?\s+(design|commissions?)/, label: "design service", weight: 1 },
  { regex: /(support|follow)\s+(me|my\s+(art|work|page))/, label: "support/follow me", weight: 1 },
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

function detectArtPromo(content, { mentionsEveryone = false, hasImage = false } = {}) {
  const text = normalize(content);
  const reasons = [];
  let score = 0;
  const add = (weight, reason) => {
    score += weight;
    reasons.push(reason);
  };

  for (const { regex, label, weight } of PHRASES) {
    if (regex.test(text)) add(weight, label);
  }

  const hosts = [...new Set((text.match(URL_REGEX) ?? []).map(hostOf))];
  const promoHosts = hosts.filter((h) => PROMO_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)));
  if (promoHosts.length) add(1, `art/shop link (${promoHosts.join(", ")})`);

  // Extra weight only when there is already some promo wording, so a plain
  // image post or a lone portfolio link isn't flagged on its own.
  if (score > 0) {
    if (hasImage) add(1, "image attached to promo message");
    if (mentionsEveryone) add(1, "@everyone/@here");
  }

  return { score, reasons };
}

module.exports = { detectArtPromo };
