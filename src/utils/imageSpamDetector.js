// Detects image-only spam: a message with no text whose attachments are all
// images (e.g. a screenshot dump advertising a fake giveaway). The "score" is
// the image count, so the server's threshold acts as the minimum image count.

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp)$/i;

function isImage(attachment) {
  return attachment.contentType?.startsWith("image/") || IMAGE_EXT.test(attachment.name ?? "");
}

function detectImageSpam(message, settings) {
  const none = { score: 0, reasons: [] };

  if (message.content.trim() || message.attachments.size === 0) return none;
  if (!message.attachments.every(isImage)) return none;

  const reasons = [`${message.attachments.size} images and no text`];

  if (settings.maxMemberAgeHours > 0) {
    const joinedAt = message.member?.joinedTimestamp;
    const ageHours = joinedAt ? (Date.now() - joinedAt) / 3_600_000 : Infinity;
    if (ageHours > settings.maxMemberAgeHours) return none;
    reasons.push(`member joined ${ageHours.toFixed(1)}h ago`);
  }

  return { score: message.attachments.size, reasons };
}

module.exports = { detectImageSpam };
