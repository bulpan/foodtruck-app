const crypto = require('crypto');
const { FCMToken } = require('../models');
const pushService = require('./pushService');
const { sendMessage: sendTelegramMessage, TELEGRAM_ENABLED, formatNewTicket } = require('./telegramService');

function generateAccessKey() {
  return crypto.randomBytes(16).toString('hex');
}

async function sendReplyPush(ticket, messageBody) {
  if (!ticket?.fcmToken) return;
  const preview = (messageBody || '').slice(0, 100) || '문의에 대한 답변이 도착했어요';
  try {
    const tokenRow = await FCMToken.findOne({ where: { token: ticket.fcmToken } });
    const deviceType = tokenRow?.deviceType === 'ios' ? 'ios' : 'android';
    const tokens = deviceType === 'ios' ? { ios: [ticket.fcmToken], android: [] } : { ios: [], android: [ticket.fcmToken] };

    await pushService.sendPushNotification({
      title: '문의 답변이 도착했습니다',
      body: preview,
      data: {
        ticketId: ticket.id,
        publicId: String(ticket.publicId || ''),
        type: 'contact_reply'
      },
      tokens,
      target: deviceType
    });
  } catch (error) {
    console.error('contact reply push send failed:', error.message);
  }
}

async function notifyNewTicket(ticket, messagePreview) {
  if (!TELEGRAM_ENABLED) return;
  try {
    await sendTelegramMessage(formatNewTicket(ticket, messagePreview));
  } catch (error) {
    console.error('telegram notify failed:', error.message);
  }
}

module.exports = {
  generateAccessKey,
  sendReplyPush,
  notifyNewTicket
};
