QuickAid Webapp
===============

AI emergency coordination webapp for DSTA code_exp 2026.

Install dependencies once:

```bash
npm install
```

Run during development with automatic backend restarts:

```bash
nodemon backend/server.js
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
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/quickaid?retryWrites=true&w=majority
```

This project connects from `backend/server.js` through `backend/config/db.js`.
If `MONGO_URI` is not set, the app still runs without MongoDB.

Create demo users:

```bash
npm run seed
```

This creates or updates the main professional account, four professional team
accounts, and one public account. Running it again updates the same email
addresses instead of creating duplicates.

Configure the passwords in `.env`:

```text
SEED_PRO_EMAIL=aish@gmail.com
SEED_PRO_PASSWORD=your_test_password
SEED_TEAM_PASSWORD=your_shared_demo_password
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

Public email login requires an existing account. New volunteers register at
`http://127.0.0.1:3000/#/signup/volunteer`.

Team MongoDB setup:

The `.env` file is ignored by Git because it contains private credentials.
Every collaborator must create their own `.env` by using `.env.example` as a
template.

For each collaborator:

1. In MongoDB Atlas, open `Database Access`.
2. Create a separate database user for that teammate. Give it read/write
   access to the QuickAid database.
3. Open `Network Access`.
4. Add that teammate's current IP address.
5. Give the teammate their own MongoDB URI privately. Do not commit it or send
   it in a public chat.
6. They put their URI into their local `.env` as `MONGO_URI`. Keep `/quickaid`
   before the `?` so everyone uses the same database.
7. They run:

```bash
npm install
npm run db:check
nodemon backend/server.js
```

`npm run db:check` confirms the database connection and prints the number of
professional and public users without displaying passwords.

For a short classroom demo, Atlas can temporarily allow `0.0.0.0/0` under
Network Access so connections work from any IP. This is less secure: use
strong, limited database credentials and remove that rule after the demo.

Password security:

- Passwords are hashed with `bcrypt.hash()`.
- Login checks use `bcrypt.compare()`.
- Plain-text passwords are never stored in MongoDB.

Telegram OTP:

- Each professional account must link its own Telegram chat before requesting
  an OTP.
- The user clicks `Connect Telegram`, starts the bot, and the backend saves
  that user's Telegram `chat.id` to only their MongoDB record.
- `TELEGRAM_CHAT_ID` is retained only as a no-database local demo fallback. It
  is never used as a fallback for MongoDB professional accounts.
- Seeded team accounts start with no Telegram chat linked.
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
