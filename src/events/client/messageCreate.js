const Discord = require("discord.js");
const guildSettings = require("../../utils/guildSettings");
const { detectScam } = require("../../utils/scamDetector");
const { detectArtPromo } = require("../../utils/artDetector");
const { detectImageSpam } = require("../../utils/imageSpamDetector");
const { handleHoneypot } = require("../../utils/honeypot");
const { logEvent } = require("../../utils/eventLog");

const FEATURES = [
  {
    feature: "scam",
    title: "Scam message detected",
    detect: (message) => detectScam(message.content, { mentionsEveryone: message.mentions.everyone }),
  },
  {
    feature: "artPromo",
    title: "Artwork promotion detected",
    detect: (message) =>
      detectArtPromo(message.content, {
        mentionsEveryone: message.mentions.everyone,
        hasImage: message.attachments.some((a) => a.contentType?.startsWith("image/")),
      }),
  },
  {
    feature: "imageSpam",
    title: "Image-only spam detected",
    detect: (message, settings) => detectImageSpam(message, settings),
  },
];

async function enforce(message, member, feature, settings, title, score, reasons) {
  const results = [];

  try {
    await message.delete();
    results.push("message deleted");
  } catch (error) {
    results.push(`could not delete message (${error.message})`);
  }

  if (settings.action === "delete_kick" && feature === "scam") {
    if (member.kickable) {
      try {
        await member.kick(`${title}: ${reasons.join(", ")}`);
        results.push("user kicked");
      } catch (error) {
        results.push(`kick failed (${error.message})`);
      }
    } else {
      results.push("kick skipped (bot lacks permission or role hierarchy)");
    }
  } else if (settings.action === "delete_warn") {
    try {
      const notice = await message.channel.send({
        content: `${message.author}, self-promotion isn't allowed in this channel.`,
        allowedMentions: { users: [message.author.id] },
      });
      setTimeout(() => notice.delete().catch(() => {}), 10_000);
      results.push("warning posted");
    } catch (error) {
      results.push(`warning failed (${error.message})`);
    }
  }

  console.log(`[${title}] ${message.guild.name}: ${message.author.tag} score=${score} -> ${results.join(", ")}`);
  logEvent({ type: feature, message, action: results.join(", "), score, reasons });

  if (settings.logChannelId) {
    const channel = await message.guild.channels.fetch(settings.logChannelId).catch(() => null);
    if (channel?.isTextBased()) {
      const embed = new Discord.EmbedBuilder()
        .setTitle(title)
        .setColor(0xed4245)
        .addFields(
          { name: "User", value: `${message.author.tag} (${message.author.id})` },
          { name: "Channel", value: `<#${message.channel.id}>` },
          { name: "Score", value: `${score} (threshold ${settings.threshold})` },
          { name: "Signals", value: reasons.join("\n").slice(0, 1024) },
          { name: "Action", value: results.join("\n").slice(0, 1024) },
          {
            name: "Content",
            value: "```" + (message.content || `(no text, ${message.attachments.size} attachment(s))`).replace(/`/g, "'").slice(0, 900) + "```",
          }
        )
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(console.error);
    }
  }
}

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    // Runs before the content check: spam bots often post only an image or embed
    if (await handleHoneypot(message)) return;

    // Messages with neither text nor attachments (stickers, etc.) have nothing to check
    if (!message.content && message.attachments.size === 0) return;

    const active = FEATURES.map((f) => ({ ...f, settings: guildSettings.get(message.guild.id, f.feature) })).filter(
      (f) => f.settings.enabled
    );
    if (!active.length) return;

    const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (!member) return;

    // Never act on moderators
    if (member.permissions.has(Discord.PermissionFlagsBits.ManageMessages)) return;

    // First matching feature wins, so a message is only handled once
    for (const { feature, title, detect, settings } of active) {
      if (settings.exemptChannelIds.includes(message.channel.id)) continue;
      if (settings.exemptRoleIds.some((id) => member.roles.cache.has(id))) continue;

      const { score, reasons } = detect(message, settings);
      if (score >= settings.threshold) {
        await enforce(message, member, feature, settings, title, score, reasons);
        return;
      }
    }
  },
};
