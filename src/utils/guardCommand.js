const Discord = require("discord.js");
const guildSettings = require("./guildSettings");

const ACTION_LABELS = {
  delete: "delete only",
  delete_warn: "delete + short warning in channel",
  delete_kick: "delete + kick",
};

// Builds a slash command that configures one detection feature per server.
// `extra` can add feature-specific subcommands: { subcommands: [fn(sub) => sub],
// handlers: { name: async (interaction, guildId) => replyText }, statusLines: (settings) => [] }
function buildGuardCommand({
  name,
  feature,
  description,
  actions,
  thresholdDescription = "Strictness (lower = more aggressive, default 3)",
  thresholdValueDescription = "1 to 10",
  extra,
}) {
  const data = new Discord.SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDefaultMemberPermissions(Discord.PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((sub) => sub.setName("status").setDescription("Show the current settings"))
    .addSubcommand((sub) =>
      sub
        .setName("enable")
        .setDescription("Turn detection on or off")
        .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("action")
        .setDescription("What to do when a message is detected")
        .addStringOption((o) =>
          o
            .setName("action")
            .setDescription("Action")
            .setRequired(true)
            .addChoices(...actions.map((a) => ({ name: ACTION_LABELS[a], value: a })))
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("threshold")
        .setDescription(thresholdDescription)
        .addIntegerOption((o) =>
          o.setName("value").setDescription(thresholdValueDescription).setMinValue(1).setMaxValue(10).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("log-channel")
        .setDescription("Channel where detections are logged (leave empty to disable logs)")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Log channel")
            .addChannelTypes(Discord.ChannelType.GuildText, Discord.ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("exempt-role")
        .setDescription("Toggle a role as exempt from detection")
        .addRoleOption((o) => o.setName("role").setDescription("Role to toggle").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("exempt-channel")
        .setDescription("Toggle a channel as exempt from detection (e.g. a showcase channel)")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Channel to toggle")
            .setRequired(true)
            .addChannelTypes(Discord.ChannelType.GuildText, Discord.ChannelType.GuildAnnouncement, Discord.ChannelType.GuildForum)
        )
    );

  for (const addSubcommand of extra?.subcommands ?? []) data.addSubcommand(addSubcommand);

  const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const current = guildSettings.get(guildId, feature);
    let reply;

    if (sub === "enable") {
      const enabled = interaction.options.getBoolean("enabled");
      guildSettings.set(guildId, feature, { enabled });
      reply = `Detection is now **${enabled ? "on" : "off"}**.`;
    } else if (sub === "action") {
      const action = interaction.options.getString("action");
      guildSettings.set(guildId, feature, { action });
      reply = `Action set to **${ACTION_LABELS[action]}**.`;
    } else if (sub === "threshold") {
      const threshold = interaction.options.getInteger("value");
      guildSettings.set(guildId, feature, { threshold });
      reply = `Threshold set to **${threshold}**.`;
    } else if (sub === "log-channel") {
      const channel = interaction.options.getChannel("channel");
      guildSettings.set(guildId, feature, { logChannelId: channel?.id ?? null });
      reply = channel ? `Detections will be logged in ${channel}.` : "Logging disabled.";
    } else if (sub === "exempt-role") {
      const role = interaction.options.getRole("role");
      const updated = guildSettings.set(guildId, feature, {
        exemptRoleIds: toggle(current.exemptRoleIds, role.id),
      });
      reply = updated.exemptRoleIds.includes(role.id) ? `${role} is now exempt.` : `${role} is no longer exempt.`;
    } else if (sub === "exempt-channel") {
      const channel = interaction.options.getChannel("channel");
      const updated = guildSettings.set(guildId, feature, {
        exemptChannelIds: toggle(current.exemptChannelIds, channel.id),
      });
      reply = updated.exemptChannelIds.includes(channel.id)
        ? `${channel} is now exempt.`
        : `${channel} is no longer exempt.`;
    } else if (extra?.handlers?.[sub]) {
      reply = await extra.handlers[sub](interaction, guildId);
    } else {
      const list = (ids, fmt) => (ids.length ? ids.map(fmt).join(", ") : "none");
      reply = [
        `**Detection:** ${current.enabled ? "on" : "off"}`,
        `**Action:** ${ACTION_LABELS[current.action]}`,
        `**Threshold:** ${current.threshold}`,
        `**Log channel:** ${current.logChannelId ? `<#${current.logChannelId}>` : "none"}`,
        `**Exempt roles:** ${list(current.exemptRoleIds, (id) => `<@&${id}>`)}`,
        `**Exempt channels:** ${list(current.exemptChannelIds, (id) => `<#${id}>`)}`,
        ...(extra?.statusLines?.(current) ?? []),
      ].join("\n");
    }

    await interaction.reply({
      content: reply,
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  }

  return { data, execute };
}

module.exports = { buildGuardCommand };
