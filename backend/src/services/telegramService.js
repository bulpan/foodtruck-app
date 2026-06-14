const TELEGRAM_ENABLED = process.env.ENABLE_TELEGRAM_BRIDGE !== 'false';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

const hasFetch = typeof fetch === 'function';

async function sendMessage(text) {
  if (!TELEGRAM_ENABLED || !BOT_TOKEN || !CHAT_ID) {
    return { skipped: true, reason: 'telegram disabled or missing config' };
  }
  if (!hasFetch) {
    console.warn('Telegram send skipped: fetch is not available in this runtime');
    return { skipped: true, reason: 'fetch not available' };
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = { chat_id: CHAT_ID, text, disable_web_page_preview: true };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram send failed: ${res.status} ${body}`);
  }
  return res.json();
}

function formatNewTicket(ticket, messagePreview) {
  const name = ticket.name ? ticket.name : '고객';
  const contact = ticket.contact ? ` (${ticket.contact})` : '';
  const source = ticket.source ? ` via ${ticket.source}` : '';
  const preview = messagePreview?.slice(0, 400) || '';
  return `[#${ticket.publicId}] 새 문의 - ${name}${contact}${source}\n${preview}\n답장: #${ticket.publicId} 내용`;
}

module.exports = {
  TELEGRAM_ENABLED,
  BOT_TOKEN,
  CHAT_ID,
  WEBHOOK_SECRET,
  sendMessage,
  formatNewTicket
};
