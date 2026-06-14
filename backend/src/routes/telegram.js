const express = require('express');
const { ContactTicket, ContactMessage } = require('../models');
const { WEBHOOK_SECRET } = require('../services/telegramService');
const { sendReplyPush } = require('../services/contactService');

const router = express.Router();

router.post('/webhook', async (req, res) => {
  try {
    if (process.env.ENABLE_TELEGRAM_BRIDGE === 'false') {
      return res.status(200).json({ skipped: true });
    }

    if (WEBHOOK_SECRET && req.query.secret !== WEBHOOK_SECRET && req.get('x-telegram-secret') !== WEBHOOK_SECRET) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const update = req.body;
    const text = update?.message?.text?.trim() || '';
    const replied = update?.message?.reply_to_message?.text || '';
    const combined = `${text}\n${replied}`;

    if (!combined.trim()) {
      console.log('telegram webhook: no text');
      return res.sendStatus(200);
    }

    const match = combined.match(/#(\d+)/);
    if (!match) {
      console.log('telegram webhook: no ticket id in text', combined);
      return res.sendStatus(200);
    }

    const publicId = parseInt(match[1], 10);
    const ticket = await ContactTicket.findOne({ where: { publicId } });
    if (!ticket) {
      console.log('telegram webhook: ticket not found', publicId);
      return res.sendStatus(200);
    }

    const cleaned = text.replace(new RegExp(`#${publicId}`), '').trim();
    const body = cleaned || '(내용 없음)';

    try {
      const messageRow = await ContactMessage.create({
        ticketId: ticket.id,
        sender: 'admin',
        body,
        channel: 'telegram',
        metadata: {
          from: update.message?.from || null,
          chat: update.message?.chat || null
        }
      });

      await ticket.update({
        status: 'answered',
        lastMessagePreview: body.slice(0, 240),
        lastMessageAt: new Date()
      });

      await sendReplyPush(ticket, body);

      console.log('telegram reply saved', { publicId, messageId: messageRow.id });
      return res.json({ ok: true, saved: true, publicId });
    } catch (err) {
      console.error('telegram webhook save error', err);
      return res.status(200).json({ ok: false, error: 'save_failed' });
    }
  } catch (error) {
    console.error('telegram webhook error:', error);
    return res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
