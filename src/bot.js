require("dotenv").config();

const { token } = process.env;
const Discord = require("discord.js");
const fs = require("fs");

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.DirectMessages,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildMessageTyping,
    Discord.GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Discord.Collection();
client.commandArray = [];

const functionsFolders = fs.readdirSync("./src/functions");

for (const folder of functionsFolders) {
  const functionFiles = fs
    .readdirSync(`./src/functions/${folder}`)
    .filter((file) => file.endsWith(".js"));

  for (const file of functionFiles) {
    require(`./functions/${folder}/${file}`)(client);
  }
}

client.handleEvents();
client.handleCommands();

client.login(token);

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});
