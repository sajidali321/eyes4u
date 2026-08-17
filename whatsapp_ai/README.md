# WhatsApp AI Assistant

Yeh ek asaan WhatsApp bot hai jo Google Gemini AI (Free API) ka istemaal karte hue aapke messages ka automatic aur politely jawab deta hai jab aap busy hote hain. Yeh bot koi faisla khud nahi leta, balke users ko batata hai ke aap busy hain aur aap (Boss) message dekh kar reply karenge.

## Requirements

- Node.js (Aapke laptop/computer par install hona chahiye)
- Ek WhatsApp account

## Setup Karne Ka Tareeqa

### 1. Free Gemini API Key Hasil Karein
Yeh bot ChatGPT ki jagah Google Gemini use karta hai jo ke free hai. API key lene ke liye:
1. Is website par jayein: [Google AI Studio](https://aistudio.google.com/)
2. Apne Google account se Sign In karein.
3. Left side par "Get API key" ya "Create API key" par click karein.
4. Nayi key generate karein aur usay copy kar lein.

### 2. Project ko Configure Karein
1. Is folder (`whatsapp_ai`) mein ek file hai jiska naam `.env.example` hai.
2. Is file ka naam badal kar `.env` kar dein. (Sirf `.env`, aage kuch nahi).
3. Is `.env` file ko Notepad ya kisi bhi text editor mein open karein.
4. `your_gemini_api_key_here` ko mita kar apni copy ki hui Google Gemini API key paste kar dein.
   (Aisa dikhna chahiye: `GEMINI_API_KEY=AIzaSy...`)

### 3. Install aur Run Karein
1. Apna terminal (ya Command Prompt / PowerShell) open karein.
2. Is folder (`whatsapp_ai`) mein jayein.
3. Pehli baar yeh command chalayein taake zaroori packages install ho jayein:
   ```bash
   npm install
   ```
4. Phir bot chalane ke liye yeh command chalayein:
   ```bash
   node index.js
   ```

### 4. WhatsApp Connect Karein
1. Jab aap `node index.js` chalayenge, thori der baad terminal mein ek **QR Code** ban kar aayega.
2. Apne phone par apna **WhatsApp** open karein.
3. Top right corner par 3 dots (⋮) par tap karein aur **Linked Devices** (ya WhatsApp Web) select karein.
4. **"Link a device"** par click karein aur apne laptop ki screen par banay hue QR code ko scan karein.
5. Scan hone ke baad terminal par likha aayega: `Client is ready! The AI assistant is now running...`

Mubarak ho! Aapka bot ab tayyar hai aur chal raha hai. Koi bhi agar aapko message karega, bot usay auto-reply kar dega.

## Ehtiyati Tadabeer (Safety Tips)
- **Account Ban:** Normal reply karne se WhatsApp ban nahi karta. Ban tab hota hai jab aap bot se hazaron logo ko khud pehle message bhejte hain (spamming). Yeh bot sirf un logo ko reply karta hai jo aapko message karte hain, isliye ban ka khatra bohat kam hai.
- **Laptop On Rakhna:** Yeh bot tabhi kaam karega jab tak aapka laptop/computer on rahega, usme internet chal raha hoga aur terminal mein `node index.js` chal raha hoga. Agar laptop band hoga, bot reply nahi karega.
- **Groups:** Yeh bot sirf direct messages ka jawab dega, groups mein message karne walon ko ignore karega taake group chats spam na hon.

## Stop Kaise Karein?
Bot ko band karne ke liye usi terminal window mein `Ctrl + C` dabayein.
