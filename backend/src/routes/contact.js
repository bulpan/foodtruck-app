const express = require('express');
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');
const { ContactTicket, ContactMessage, FCMToken } = require('../models');
const { validate, schemas } = require('../middleware/validation');
const { generateAccessKey, notifyNewTicket } = require('../services/contactService');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
    trustProxy: true,
  message: {
    error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  }
});

async function findTicket(identifier) {
  if (!identifier) return null;
  if (/^\d+$/.test(identifier)) {
    return ContactTicket.findOne({ where: { publicId: Number(identifier) } });
  }
  return ContactTicket.findByPk(identifier);
}

async function findFallbackFcmToken(clientId) {
  if (!clientId) return null;
  const match = await FCMToken.findOne({
    where: { deviceId: clientId, isActive: true },
    order: [['updatedAt', 'DESC']]
  });
  return match?.token || null;
}

router.post('/', contactLimiter, validate(schemas.contactCreate), async (req, res) => {
  try {
    const { name, contact, userId, source = 'web', fcmToken, message } = req.body;

    let effectiveFcmToken = (fcmToken || '').trim();
    if (!effectiveFcmToken) {
      const clientId = req.get('x-client-id');
      effectiveFcmToken = await findFallbackFcmToken(clientId);
    }

    const ticket = await ContactTicket.create({
      accessKey: generateAccessKey(),
      name: name?.trim() || null,
      contact: contact?.trim() || null,
      userId: userId?.trim() || null,
      source,
      fcmToken: effectiveFcmToken || null,
      status: 'open',
      lastMessagePreview: message.slice(0, 240),
      lastMessageAt: new Date()
    });

    await ContactMessage.create({
      ticketId: ticket.id,
      sender: 'user',
      body: message,
      channel: source,
      metadata: null
    });

    await notifyNewTicket(ticket, message);

    return res.status(201).json({
      ticket: {
        id: ticket.id,
        publicId: ticket.publicId,
        accessKey: ticket.accessKey,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('contact create failed:', error);
    return res.status(500).json({ error: '문의 접수 중 오류가 발생했습니다' });
  }
});

router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const accessKey = req.query.accessKey || req.get('x-contact-access-key');
    const since = req.query.since;

    const ticket = await findTicket(id);
    if (!ticket) {
      return res.status(404).json({ error: '티켓을 찾을 수 없습니다' });
    }

    if (!accessKey || accessKey !== ticket.accessKey) {
      return res.status(403).json({ error: '유효하지 않은 접근입니다' });
    }

    const where = { ticketId: ticket.id };
    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        where.createdAt = { [Op.gt]: sinceDate };
      }
    }

    const messages = await ContactMessage.findAll({
      where,
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'sender', 'body', 'channel', 'createdAt']
    });

    return res.json({
      ticket: {
        id: ticket.id,
        publicId: ticket.publicId,
        status: ticket.status,
        name: ticket.name,
        contact: ticket.contact,
        createdAt: ticket.createdAt
      },
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error('contact messages fetch failed:', error);
    return res.status(500).json({ error: '메시지 조회 중 오류가 발생했습니다' });
  }
});

module.exports = router;
