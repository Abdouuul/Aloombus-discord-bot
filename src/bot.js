require("dotenv").config();
const { token } = process.env;
const Discord = require("discord.js");
const fs = require("fs");
// const { Ollama } = require("@langchain/ollama");
const { Ollama } = require("@langchain/community/llms/ollama");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { LLMChain } = require("langchain/chains");
const axios = require("axios");

const ollama = new Ollama({
  model: "tinyllama",
  requestOptions: {
    timeout: 120000, // 60 seconds,
  },
});
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), ms)
  );
  return Promise.race([promise, timeout]);
}

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

const functionsFolders = fs.readdirSync(`./src/functions`);
for (const folder of functionsFolders) {
  const functionFiles = fs
    .readdirSync(`./src/functions/${folder}`)
    .filter((file) => file.endsWith(".js"));

  for (const file of functionFiles)
    require(`./functions/${folder}/${file}`)(client);
}

client.handleEvents();
client.handleCommands();
client.login(token);

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

async function fetchGeneratedImage(prompt) {
  // Get generated image from 127.0.0.1:8000/generate/<prompt>
  prompt = encodeURIComponent(prompt);
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const response = await axios.post(
      `http://localhost:5000/generate/${encodedPrompt}`,
      {},
      {
        responseType: "arraybuffer",
      }
    );

    fs.writeFileSync("output.png", response.data);
    console.log("✅ Image saved as output.png");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  // if message starts with generate or Generate
  if (
    msg.content.startsWith("generate") ||
    msg.content.startsWith("Generate") ||
    msg.content.startsWith("create") ||
    msg.content.startsWith("Create")
  ) {
    console.log("Generating image...");
    try {
      await fetchGeneratedImage(msg.content.slice(9));
    } catch (e) {
      console.log("❌ Error generating image:", e.message);
    }

    try {
      msg.channel.send({ files: ["output.png"] });
    } catch (e) {
      console.log("❌ Error sending image:", e.message);
    }
    return;
  }

  const isMention = msg.mentions.has(client.user) || true;
  const shouldRespond = isMention; // Add your logic here
  if (!shouldRespond) return;

  await msg.channel.sendTyping();

  // Fetch last 5 messages
  const fetchedMessages = await msg.channel.messages.fetch({ limit: 5 });
  const cleanedMessages = [];

  fetchedMessages.forEach((message) => {
    // Skip long messages (over 300 characters) or embeds/attachments
    if (
      message.content.length > 300 ||
      message.embeds.length > 0 ||
      message.attachments.size > 0
    )
      return;

    // Clean message content
    let content = message.content.replace(/```[\s\S]*?```/g, "[code block]");
    content = content.replace(/\n/g, " ").slice(0, 300); // Trim to 300 chars
    cleanedMessages.push(`${message.author.username}: ${content}`);
  });

  const lastMessages = cleanedMessages.reverse().join("\n");

  // Create prompt
  const prompt = ChatPromptTemplate.fromTemplate(
    `<|begin_of_text|>
      <|system|>
     Your a discord AI bot
      <|user|>
      Last 5 messages of this conversation:
      {lastmessages}
      Here is the message you need to reply to: {message}
      <|assistant|`
  );

  const chain = new LLMChain({
    llm: ollama,
    prompt: prompt,
  });

  try {
    const replyMsg = await msg.channel.send("Let me think...");

    const res = await withTimeout(
      chain.invoke({
        message: msg.content.slice(0, 500), // Limit message length
        lastmessages: lastMessages,
      })
    );

    if (res?.text) {
      replyMsg.edit(res.text);
    } else {
      replyMsg.edit("Sorry, I couldn't generate a reply.");
    }
  } catch (error) {
    console.error("Error invoking LLM:", error);
    msg.channel.send("Server is too slow, or the an error occured");
  }
});
