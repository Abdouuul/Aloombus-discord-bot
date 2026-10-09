const Discord = require("discord.js");
const guildSettings = require("../../utils/guildSettings");

module.exports = {
  data: new Discord.SlashCommandBuilder()
    .setName("honeypot")
    .setDescription("Permanently ban anyone who posts in a trap channel (catches spam bots)")
    .setDefaultMemberPermissions(Discord.PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((sub) => sub.setName("status").setDescription("Show the current settings"))
    .addSubcommand((sub) =>
      sub
        .setName("channel")
        .setDescription("Set the trap channel")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("The trap channel")
            .setRequired(true)
            .addChannelTypes(Discord.ChannelType.GuildText)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("enable")
        .setDescription("Turn the honeypot on or off")
        .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("log-channel")
        .setDescription("Channel where bans are logged (leave empty to disable logs)")
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
        .setDescription("Toggle a role as exempt from the honeypot")
        .addRoleOption((o) => o.setName("role").setDescription("Role to toggle").setRequired(true))
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const current = guildSettings.get(guildId, "honeypot");
    let reply;

    if (sub === "channel") {
      const channel = interaction.options.getChannel("channel");
      guildSettings.set(guildId, "honeypot", { channelId: channel.id });
      reply =
        `Trap channel set to ${channel}. Anyone posting there will be **permanently banned** once the honeypot is on.\n` +
        "Put a clear warning in the channel topic (e.g. \"DO NOT POST HERE - you will be banned\"), " +
        "and make sure the bot can view the channel and has Ban Members.";
    } else if (sub === "enable") {
      const enabled = interaction.options.getBoolean("enabled");
      if (enabled && !current.channelId) {
        reply = "Set a trap channel first with `/honeypot channel`.";
      } else {
        guildSettings.set(guildId, "honeypot", { enabled });
        reply = `Honeypot is now **${enabled ? "on" : "off"}**.`;
      }
    } else if (sub === "log-channel") {
      const channel = interaction.options.getChannel("channel");
      guildSettings.set(guildId, "honeypot", { logChannelId: channel?.id ?? null });
      reply = channel ? `Bans will be logged in ${channel}.` : "Logging disabled.";
    } else if (sub === "exempt-role") {
      const role = interaction.options.getRole("role");
      const has = current.exemptRoleIds.includes(role.id);
      guildSettings.set(guildId, "honeypot", {
        exemptRoleIds: has ? current.exemptRoleIds.filter((id) => id !== role.id) : [...current.exemptRoleIds, role.id],
      });
      reply = has ? `${role} is no longer exempt.` : `${role} is now exempt.`;
    } else {
      reply = [
        `**Honeypot:** ${current.enabled ? "on" : "off"}`,
        `**Trap channel:** ${current.channelId ? `<#${current.channelId}>` : "none"}`,
        `**Log channel:** ${current.logChannelId ? `<#${current.logChannelId}>` : "none"}`,
        `**Exempt roles:** ${
          current.exemptRoleIds.length ? current.exemptRoleIds.map((id) => `<@&${id}>`).join(", ") : "none"
        }`,
      ].join("\n");
    }

    await interaction.reply({
      content: reply,
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  },
};
