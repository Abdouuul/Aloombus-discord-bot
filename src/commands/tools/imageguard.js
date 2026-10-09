const guildSettings = require("../../utils/guildSettings");
const { buildGuardCommand } = require("../../utils/guardCommand");

module.exports = buildGuardCommand({
  name: "imageguard",
  feature: "imageSpam",
  description: "Detect text-less image dumps (e.g. fake giveaway screenshots) in this server",
  actions: ["delete", "delete_kick"],
  thresholdDescription: "Minimum number of images in a message without text (default 4)",
  thresholdValueDescription: "Number of images (1 to 10)",
  extra: {
    subcommands: [
      (sub) =>
        sub
          .setName("member-age")
          .setDescription("Only act on members who joined within this many hours (0 = any member)")
          .addIntegerOption((o) =>
            o.setName("hours").setDescription("0 to 720").setMinValue(0).setMaxValue(720).setRequired(true)
          ),
    ],
    handlers: {
      "member-age": async (interaction, guildId) => {
        const hours = interaction.options.getInteger("hours");
        guildSettings.set(guildId, "imageSpam", { maxMemberAgeHours: hours });
        return hours ? `Only members who joined in the last **${hours}h** will be checked.` : "Any member will be checked.";
      },
    },
    statusLines: (s) => [`**Member age limit:** ${s.maxMemberAgeHours ? `${s.maxMemberAgeHours}h` : "none"}`],
  },
});
