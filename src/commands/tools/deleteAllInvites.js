const Discord = require("discord.js");

module.exports = {
  data: new Discord.SlashCommandBuilder()
    .setName("clear-invites")
    .setDescription("Delete all invite links from the discord"),
  async execute(interaction, client) {
    const message = await interaction.deferReply({
      fetchReply: false,
    });

    try {
      interaction.guild.invites.fetch().then((invites) => {
        invites.each((i) => i.delete());
      });
      console.log("All server invites deleted");
    } catch (error) {
      console.error(error);
    }

    const newMessage = "All invite links have been deleted";
    await interaction.editReply({
      content: newMessage,
    });
  },
};
