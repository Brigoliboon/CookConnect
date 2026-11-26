# Contact Form — Testcase

Scope: landing page Contact form (`components/landing/Contact.tsx`) and `POST /api/contact` (FR-51). Sends through the same Gmail SMTP setup as FR-49 (`GMAIL_USER`, `GMAIL_APP_PASSWORD`), to `CONTACT_TO_EMAIL` or else `GMAIL_USER`, with Reply-To set to the visitor.

Run date: 2026-11-26 · `npx tsc --noEmit` clean · eslint clean on the touched files · `npm run build` not run (the sandbox cannot reach Google Fonts).

## U — Route handler (real `POST` code, `nodemailer` stubbed, 21 assertions pass)

- [x] **U1** Valid body → 200; one mail built with `service: "gmail"` and the `GMAIL_USER` / `GMAIL_APP_PASSWORD` credentials
- [x] **U2** `to` defaults to `GMAIL_USER`; `CONTACT_TO_EMAIL` overrides it
- [x] **U3** `replyTo` is the visitor's name and email; `from` is the Gmail account; subject `Website message from <name>`; body contains the message
- [x] **U4** Honeypot field `website` filled → 200 and nothing sent
- [x] **U5** Missing name, bad email, message over 2000 chars, invalid JSON, array body → 400 and nothing sent
- [x] **U6** Line breaks in the name are stripped; a line break in the email is rejected (header injection)
- [x] **U7** SMTP failure → 502; Gmail env vars missing → 503
- [x] **U8** Sixth request from one IP within 10 minutes → 429; another IP is unaffected

## F — Form in a browser (page rendered with a stubbed API)

- [x] **F1** Empty submit is blocked by the browser and makes no request
- [x] **F2** Submitting shows "Sending…" with the button disabled, then the green success text; the fields are cleared
- [x] **F3** 429, 502 and 400 responses show the matching red message and keep what the visitor typed
- [x] **F4** The honeypot input is not in the accessibility tree and not visible

## L — Live (NOT run yet; needs the Gmail env vars)

- [ ] **L1** With `GMAIL_USER` and `GMAIL_APP_PASSWORD` set, send a message from the landing page: it arrives in the restaurant inbox (or `CONTACT_TO_EMAIL`), not in spam, and Reply-To is the visitor's address
- [ ] **L2** Press Reply in the inbox: the draft is addressed to the visitor
- [ ] **L3** Arabic page (`/ar`): the labels, success and error messages are Arabic and the form layout is mirrored correctly
- [ ] **L4** With `GMAIL_APP_PASSWORD` removed, the form shows "We couldn't send your message…" (503) and the server logs a warning without the secret
- [ ] **L5** Send 6 messages quickly from one browser: the 6th is refused with the "Too many messages" text. On Vercel the limit is per server instance, so a refusal may take more tries
- [ ] **L6** Gmail's daily sending limit and the From address: confirm replies and delivery are fine from the production domain
