QuickAid Webapp
===============

AI emergency coordination webapp for DSTA code_exp 2026.

Run locally:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

Implemented flow:

- Landing page
- Role selection page
- Professional login page
- Public / volunteer login page
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

- Professional login needs a valid email, password with 8 or more characters, and a 6-digit verification code.
- Public login needs a valid email and password with 6 or more characters, or use the Google demo button.
