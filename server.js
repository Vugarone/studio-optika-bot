const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Təhlükəsizlik və doğrulama tokeni
const VERIFY_TOKEN = "studio-optika-gizli_kod_123";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // Render-dəki .env-dən oxuyacaq

// 1. Ana səhifə yoxlaması (Render linkinə brauzerdə girəndə görünəcək)
app.get('/', (req, res) => {
  res.send('Studio Optika Satış Botu uğurla işləyir!');
});

// 2. Meta (Instagram) Webhook Doğrulaması (GET sorğusu - qırmızı xətanı aradan qaldıran hissə)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// 3. Instagram-dan gələn mesajları qəbul edən hissə (POST sorğusu)
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'instagram') {
    body.entry.forEach(async (entry) => {
      // Mesajları emal edirik
      const webhookEvent = entry.messaging ? entry.messaging[0] : null;
      
      if (webhookEvent && webhookEvent.message) {
        const senderId = webhookEvent.sender.id;
        const messageText = webhookEvent.message.text;

        console.log(`Gələn mesaj (${senderId}): ${messageText}`);

        // Avtomatik cavab məntiqi
        await sendAutomatedReply(senderId, messageText);
      }
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Müştəriyə avtomatik cavab göndərmə funksiyası
async function sendAutomatedReply(recipientId, text) {
  try {
    let replyText = "Salam! Studio Optika-ya xoş gəlmisiniz. Sizinlə necə kömək edə bilərik?";
    
    const lowerText = text.toLowerCase();
    if (lowerText.includes('qiymət') || lowerText.includes('şüşə') || lowerText.includes('neçəyə')) {
      replyText = "Optik şüşələrimizin qiymətləri çeşidə və uyğunluğa görə dəyişir. Ətraflı məlumat və ya sifariş üçün bizimlə əlaqə saxlaya bilərsiniz: 055 201-23-37";
    } else if (lowerText.includes('ünvan') || lowerText.includes('yer') || lowerText.includes('haradasınız')) {
      replyText = "Ünvanımız: Qara Qarayev küç. 69 (Zeytun 434 aptekin daxili). Gəlişinizi gözləyirik!";
    }

    await axios.post(`https://graph.facebook.com/v18.0/me/messages`, {
      recipient: { id: recipientId },
      message: { text: replyText },
      access_token: PAGE_ACCESS_TOKEN
    });
  } catch (error) {
    console.error('Mesaj göndərilərkən xəta baş verdi:', error.response?.data || error.message);
  }
}

// Serverin işə düşdüyü port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Studio Optika Satış Botu ${PORT} portunda aktivdir...`);
});
