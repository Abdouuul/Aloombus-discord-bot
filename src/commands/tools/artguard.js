const { buildGuardCommand } = require("../../utils/guardCommand");

module.exports = buildGuardCommand({
  name: "artguard",
  feature: "artPromo",
  description: "Configure automatic artwork promotion detection for this server",
  actions: ["delete", "delete_warn"],
});
