const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// System prompt to instruct the AI how to behave
const SYSTEM_PROMPT = `
You are a polite, helpful AI assistant managing WhatsApp messages for a person who is currently busy.
Your goal is to reply to people who message them.
Rules:
1. Be very polite and friendly.
2. Acknowledge their message.
3. Inform them that the person is currently unavailable or busy, and that you are an AI assistant taking messages for them.
4. DO NOT make any decisions, commitments, or answer specific questions on their behalf. Simply say you will pass the message along.
5. If they are talking about a business or a project (like video projects etc.), tell them you will discuss it with your "Boss" (the owner of the phone) and get back to them.
6. Keep the responses relatively short and natural. You can use English or Roman Urdu.
`;

// Initialize WhatsApp Client with LocalAuth to save session
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generate and scan this code with your phone
client.on('qr', (qr) => {
    console.log('Please scan the QR code below with your WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// When the client is ready
client.on('ready', () => {
    console.log('Client is ready! The AI assistant is now running and connected to WhatsApp.');
});

// Listen for incoming messages
client.on('message', async (msg) => {
    // Only reply to normal text messages
    if (msg.type !== 'chat') return;

    // Ignore status updates
    if (msg.isStatus) return;

    // Optional: Avoid replying in groups (only reply to direct messages)
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    console.log(`Received message from ${msg.from}: ${msg.body}`);

    try {
        // Generate AI response
        const prompt = `${SYSTEM_PROMPT}\n\nUser message: "${msg.body}"\n\nAI Response:`;
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Reply back to the user
        console.log(`Replying to ${msg.from} with: ${response}`);
        await msg.reply(response);
    } catch (error) {
        console.error('Error generating AI response:', error);
        // Fallback message in case API fails or key is missing
        await msg.reply("Hi, I am an AI assistant. The owner of this phone is currently busy, but I will make sure they see your message as soon as possible.");
    }
});

// Start the client
client.initialize();
