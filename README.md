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

- Professional login needs an account created with a supported official agency email and its password.
- Public login needs a valid email and password with 6 or more characters, or use the Google demo button.

Both login types use server-held sessions in an HttpOnly, SameSite cookie.
Repeated failed passwords are rate limited, and an account is temporarily
locked for 15 minutes after five failed attempts.

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

Both passwords are stored as bcrypt hashes in MongoDB.

Public email login requires an existing account. New volunteers register at
`http://127.0.0.1:3000/#/signup/volunteer`.

Professional registration:

1. Open `http://127.0.0.1:3000/#/signup/professional`.
2. Register with a supported agency and official work email.
3. The server validates that the email domain matches the selected agency.
4. The account is stored with `role: "professional"` and a bcrypt password hash.
5. The professional can sign in with the password they chose.

Supported production domains are checked against the selected agency:
`scdf.gov.sg`, `spf.gov.sg`, `moh.gov.sg`, `nea.gov.sg`, `pub.gov.sg`, and
`lta.gov.sg`. For local classroom accounts, domains listed in
`PROFESSIONAL_TEST_DOMAINS` are also accepted. The default is
`quickaid.test`, including subdomains such as `scdf.quickaid.test`.

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
- Original passwords are never displayed, sent through Telegram, or returned by the API.
- Sessions expire after eight hours and are invalidated when the user signs out.
- Login attempts are limited per account and client address.
- Five incorrect passwords temporarily lock the account for 15 minutes.
- Approved professionals can reset a forgotten password at
  `http://127.0.0.1:3000/#/reset/professional`.
- Reset codes expire after five minutes, are stored as hashes, and are sent
  only to the Telegram chat already linked to that user's account.

Telegram OTP:

- Each professional account must link its own Telegram chat before requesting
  an OTP.
- The user clicks `Connect Telegram`, starts the bot, and the backend saves
  that user's Telegram `chat.id` to only their MongoDB record.
- There is no shared `TELEGRAM_CHAT_ID` fallback. If MongoDB is unavailable or
  a professional has not linked Telegram, no OTP is generated or sent.
- Seeded team accounts start with no Telegram chat linked.
- Local development uses Telegram polling, so linking works without ngrok.
- Run only one shared polling server for the bot at a time.

Telegram connect flow:

1. For local development, add these values to `.env`:

```text
TELEGRAM_BOT_USERNAME=your_bot_username_without_at
TELEGRAM_POLLING=true
```

2. Start QuickAid:

```bash
nodemon backend/server.js
```

3. On Professional Login, enter email/password and click `Connect Telegram`.
   Telegram opens. Tap `Start`, and QuickAid saves the user's `telegramChatId`
   to MongoDB.

After that, `Send 6-digit code` sends OTPs to that user's linked Telegram chat.

For a deployed server, set `TELEGRAM_POLLING=false`, configure
`PUBLIC_BASE_URL` and `TELEGRAM_WEBHOOK_SECRET`, then run
`npm run telegram:webhook`.

Check Telegram ownership and webhook health:

```bash
npm run telegram:check
```

This masks chat IDs, reports duplicate ownership, and shows whether Telegram
currently has a webhook URL configured.

Environment variables for Risk & Analytics (optional for demo):

```
ONEMAP_TOKEN=your_onemap_token
RAIN_API_KEY=your_rainfall_api_key
PSI_API_KEY=your_psi_api_key
HOSPITAL_API_KEY=your_hospital_api_key
```

If these are not provided the app runs in mock mode using sample datasets in `backend/APIs/`.

Importing incidents into MongoDB (MongoDB Compass)
-----------------------------------------------

1. Open MongoDB Compass and connect to your cluster using your `MONGO_URI`.
2. Select the target database (the app uses `wad_dev` by default when using Atlas).
3. Create or open the `incidents` collection.
4. Use the Import Data button and choose `JSON`.
5. Select `backend/APIs/FloodAlertsacrossSingapore.json` or `backend/data/compass-incidents.json` (if present) and import.

If you already have a `compass-incidents.json` file from this repo, import it to the `incidents` collection.

Running & verifying the Risk Prediction UI
------------------------------------------

1. Ensure dependencies are installed:

```bash
npm install
```

2. (Optional) Add `MONGO_URI` to a `.env` file in the project root to enable DB-backed reports.

3. Start the app:

```bash
npm start
```

4. Open your browser to `http://127.0.0.1:3000` and navigate to `#/risk-prediction`.

5. Switch between the `Live API` and `DB Reports` tabs. If `DB Reports` shows no markers, confirm your `incidents` collection contains documents.

Quick verification commands
---------------------------

From the project root you can run a quick test script (already included):

```bash
npm test
```

This runs the prediction unit tests located at `backend/test/predictEngine.test.js`.

If you'd like a local dev server with auto-restart, run:

```bash
npm run dev
```

>>>>>>>>> Temporary merge branch 2
