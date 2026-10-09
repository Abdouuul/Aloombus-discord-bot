# ALOOMBUS DISCORD BOT

This is a discord bot created on the Oct 28th 2022

### by Aloomii

A moderation bot with per-server settings. Every feature is **off by default** and configured by server admins with slash commands.

##### Currently in development. . .💻

Deployed on homelab

## Features

| Command | What it does |
| --- | --- |
| `/scamguard` | Detects Discord scams (fake Nitro/Steam gifts, lookalike domains, QR lures...). Deletes the message and optionally kicks the user. |
| `/artguard` | Detects artwork/commission promotion. Deletes the message (optionally posts a short warning). Never kicks. |
| `/imageguard` | Detects text-less image dumps (e.g. fake giveaway screenshots). Deletes the message and optionally kicks. Can be limited to recently joined members. |
| `/honeypot` | Trap channel: anyone who posts in it is permanently banned and their last hour of messages is deleted. |
| `/clear-invites` | Deletes all invite links of the server. |
| `/hello` | Test command. |

All the `*guard` commands share the same subcommands: `status`, `enable`, `action`, `threshold`, `log-channel`, `exempt-role` and `exempt-channel`. `/imageguard` also has `member-age`, and `/honeypot` has `channel`, `enable`, `log-channel` and `exempt-role`.
Configuration commands require the **Manage Server** permission.

Members with **Manage Messages** are never acted on.

## Setup

1. Install dependencies: `npm install`
2. Create a `.env` file with your bot token:
   ```
   token=YOUR_BOT_TOKEN
   ```
3. Enable the **Message Content** intent for the bot in the Discord developer portal.
4. Give the bot **Manage Messages**, **Kick Members** and **Ban Members** in your server, with its role above the members it may act on.
5. Start the bot: `npm test` (runs `node .`)

Commands are currently registered to a single server, set by `clientId` and `guildId` in `src/functions/handlers/handleCommands.js`.

## Recommended rollout

Per server, turn a feature on with a log channel and the `delete` action first. Switch to kicking once the logs look right.

## Data

Stored in the `data/` folder (git-ignored):

- `guildSettings.json`: per-server settings.
- `moderationLog.json`: every detection with user, message content, attachments, date and time (UTC), and the action taken.
