const Discord = require("discord.js");
const guildSettings = require("./guildSettings");
const { logEvent } = require("./eventLog");

// Anything the member posted in the last hour is wiped along with the ban,
// since spam bots usually hit many channels at once.
const PURGE_SECONDS = 60 * 60;

// Returns true if the message was posted in the honeypot channel and handled.
async function handleHoneypot(message) {
  const settings = guildSettings.get(message.guild.id, "honeypot");
  if (!settings.enabled || !settings.channelId || message.channel.id !== settings.channelId) return false;

  const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));

  // Never act on moderators or exempt roles
  if (member) {
    if (member.permissions.has(Discord.PermissionFlagsBits.ManageMessages)) return true;
    if (settings.exemptRoleIds.some((id) => member.roles.cache.has(id))) return true;
  }

  let result;
  try {
    await message.guild.members.ban(message.author.id, {
      reason: "Posted in honeypot channel (suspected spam bot)",
      deleteMessageSeconds: PURGE_SECONDS,
    });
    result = "user banned, last hour of messages deleted";
  } catch (error) {
    result = `ban failed (${error.message})`;
    await message.delete().catch(() => {});
  }

  console.log(`[honeypot] ${message.guild.name}: ${message.author.tag} -> ${result}`);
  logEvent({ type: "honeypot", message, action: result });

  if (settings.logChannelId) {
    const channel = await message.guild.channels.fetch(settings.logChannelId).catch(() => null);
    if (channel?.isTextBased()) {
      const embed = new Discord.EmbedBuilder()
        .setTitle("Honeypot triggered")
        .setColor(0xed4245)
        .addFields(
          { name: "User", value: `${message.author.tag} (${message.author.id})` },
          { name: "Action", value: result },
          {
            name: "Content",
            value: "```" + (message.content || "(no text)").replace(/`/g, "'").slice(0, 900) + "```",
          }
        )
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(console.error);
    }
  }

  return true;
}

module.exports = { handleHoneypot };
