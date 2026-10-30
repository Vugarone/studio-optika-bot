require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = "studio-optika-gizli_kod_123";
const CONTACT_PHONE = "055 201-23-37";

// 1. Webhook Doğrulaması
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// 2. Mesaj və Rəylərin Qəbulu
app.post('/webhook', async (req, res) => {
    let body = req.body;

    if (body.object === 'instagram') {
        body.entry.forEach(async (entry) => {
            if (entry.messaging) {
                let webhook_event = entry.messaging[0];
                let sender_id = webhook_event.sender.id;
                
                if (webhook_event.message && webhook_event.message.text) {
                    let message_text = webhook_event.message.text.toLowerCase();
                    await handleUserMessage(sender_id, message_text);
                }
            }

            if (entry.changes) {
                let change = entry.changes[0];
                if (change.field === 'comments' && change.value) {
                    let comment_text = change.value.text.toLowerCase();
                    let user_id = change.value.from.id;

                    if (comment_text.includes('qiymət') || comment_text.includes('şüşə') || comment_text.includes('çərçivə')) {
                        await sendWelcomeWithButtons(user_id, "Salam! 👋 Postumuza yazdığınız rəy üçün təşəkkürlər. Studio Optika-da sizə necə kömək edə bilərik?");
                    }
                }
            }
        });

        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// 3. Ağıllı Cavab Məntiqi
async function handleUserMessage(sender_id, text) {
    if (text.includes('qiymət') || text.includes('çərçivə') || text.includes('kataloq')) {
        await sendWelcomeWithButtons(sender_id, "👓 Çərçivə və şüşə seçimlərimizlə tanış olmaq üçün düymələrdən birini seçin və ya birbaşa əlaqə saxlayın:");
    } 
    else if (text.includes('ünvan') || text.includes('harada') || text.includes('yerləşir')) {
        await sendMessage(sender_id, `📍 **Studio Optika** ünvanı:\nQara Qarayev küç. 69 (Zeytun 434 aptekin daxili). \n\n📞 Əlaqə nömrəmiz: ${CONTACT_PHONE}`);
    } 
    else if (text.includes('nazik') || text.includes('şüşə')) {
        await sendMessage(sender_id, `💎 Estetik və yüksək dərəcəli gözlər üçün xüsusi **nazikləşdirilmiş şüşələrimiz** mövcuddur. Sifariş üçün bizə yaza bilərsiniz: ${CONTACT_PHONE}`);
    } 
    else if (text.includes('nömrə') || text.includes('əlaqə') || text.includes('zəng') || text.includes('telefon')) {
        await sendMessage(sender_id, `📞 Bizimlə birbaşa əlaqə saxlamaq üçün nömrəmiz: **${CONTACT_PHONE}** (WhatsApp da mövcuddur).`);
    }
    else {
        await sendWelcomeWithButtons(sender_id, `Salam! Studio Optika-ya xoş gəlmisiniz. 👓 Sualınız olarsa ${CONTACT_PHONE} nömrəsinə də zəng edə bilərsiniz.`);
    }
}

// 4. Düyməli Cavab
async function sendWelcomeWithButtons(recipient_id, text) {
    try {
        await axios.post(
            `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            {
                recipient: { id: recipient_id },
                message: {
                    text: text,
                    quick_replies: [
                        { content_type: "text", title: "👓 Çərçivələr", payload: "CATALOG_FRAMES" },
                        { content_type: "text", title: "💎 Nazik Şüşələr", payload: "THIN_LENSES" },
                        { content_type: "text", title: "📍 Ünvan və Nömrə", payload: "LOCATION_INFO" }
                    ]
                }
            }
        );
    } catch (error) {
        console.error('Düyməli mesaj xətası:', error.response ? error.response.data : error.message);
    }
}

// 5. Mətn Mesajı
async function sendMessage(recipient_id, response_text) {
    try {
        await axios.post(
            `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            {
                recipient: { id: recipient_id },
                message: { text: response_text }
            }
        );
    } catch (error) {
        console.error('Mesaj göndərmə xətası:', error.response ? error.response.data : error.message);
    }
}

// Render üçün vacib olan hissə (Serverin portu tutması üçün)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Studio Optika Satış Botu ${PORT} portunda aktivdir...`);
});
