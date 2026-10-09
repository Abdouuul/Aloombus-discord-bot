const { buildGuardCommand } = require("../../utils/guardCommand");

module.exports = buildGuardCommand({
  name: "scamguard",
  feature: "scam",
  description: "Configure automatic scam message detection for this server",
  actions: ["delete", "delete_kick"],
});
