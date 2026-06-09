QuickAid Webapp
===============

AI emergency coordination webapp for DSTA code_exp 2026.

Install dependencies once:

```bash
npm install
```

Run during development with automatic backend restarts:

```bash
npm run dev
```

Then open:

```text
http://127.0.0.1:3000
```

Use `npm start` when you do not need automatic restarts.

When editing files in `frontend/public/`, refresh the browser to see the
changes. Nodemon automatically restarts when backend files change.

Implemented flow:

- Landing page
- Role selection page
- Professional login page
- Public login page
- Live dashboard after successful sign-in

Project structure:

```text
backend/
  server.js              Node backend API and static frontend server
frontend/
  public/
    index.html           Webapp shell
    app.js               Frontend routing and form logic
    styles.css           Responsive UI styling
    assets/              Webapp image assets
```

Demo login rules:

- Professional login needs a valid email, password with 8 or more characters, and a generated 6-digit verification code.
- Public login needs a valid email and password with 6 or more characters, or use the Google demo button.

Professional verification code:

1. Enter professional email and password.
2. Click `Send 6-digit code`.
3. Enter the generated code.
4. Click `Sign In`.

Without Telegram setup, the app shows the demo code on the page and prints it
in the terminal.

For Telegram delivery, create a `.env` file in the project root:

```text
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_BOT_USERNAME=your_bot_username_without_at
OTP_SECRET=change_this_to_any_long_random_text
```

Then run:

```bash
nodemon backend/server.js
```

The verification code expires after 5 minutes and allows 5 attempts.

MongoDB setup:

Add your Atlas connection string to `.env`:

```text
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/wad_dev?retryWrites=true&w=majority
```

This project connects from `backend/server.js` through `backend/config/db.js`.
If `MONGO_URI` is not set, the app still runs without MongoDB.

Create demo users:

```bash
npm run seed
```

This creates or updates:

```text
Professional: agency@example.com / password123
Public: public@example.com / secret123
```

To create your own test professional user, add these to `.env`:

```text
SEED_PRO_EMAIL=aish@gmail.com
SEED_PRO_PASSWORD=your_test_password
SEED_PRO_NAME=Aishani
SEED_PRO_AGENCY=SCDF
SEED_PRO_ROLE_TITLE=Emergency Operations Officer
```

Then run:

```bash
npm run seed
```

Both passwords are stored as hashes in MongoDB. Professional users must have
`role: "professional"` and `status: "approved"` before they can request an OTP.

For this prototype, public email login creates a public user automatically if
the email is new. Professional accounts should be created by an admin or seeded
as approved users.

Password security:

- Passwords are hashed with `bcrypt.hash()`.
- Login checks use `bcrypt.compare()`.
- Plain-text passwords are never stored in MongoDB.

Telegram OTP:

- The working prototype sends OTPs to `TELEGRAM_CHAT_ID` in `.env`.
- Seeded professional users also store that chat id in MongoDB as
  `telegramChatId`.
- In a full production flow, users should not manually find their chat id.
  They would click a `Connect Telegram` link, start the bot, and the backend
  would save their Telegram `chat.id` to their user record.
- Full automatic linking requires a public Telegram webhook URL. Localhost
  cannot receive Telegram webhook calls directly.

Telegram connect flow:

1. Add these values to `.env`:

```text
TELEGRAM_BOT_USERNAME=your_bot_username_without_at
TELEGRAM_WEBHOOK_SECRET=any_random_secret
PUBLIC_BASE_URL=https://your-public-url
```

2. During local development, create a public HTTPS URL with a tunnel such as
   ngrok:

```bash
ngrok http 3000
```

3. Put the ngrok HTTPS URL into `.env` as `PUBLIC_BASE_URL`.

4. Register the webhook with Telegram:

```bash
npm run telegram:webhook
```

5. Start QuickAid:

```bash
nodemon backend/server.js
```

6. On Professional Login, enter email/password and click `Connect Telegram`.
   Telegram opens. Tap `Start`, and QuickAid saves the user's `telegramChatId`
   to MongoDB.

After that, `Send 6-digit code` sends OTPs to that user's linked Telegram chat.
