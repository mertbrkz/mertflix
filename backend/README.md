# Mertflix Backend (Express + PostgreSQL)

## Features
- Email registration + verification code
- Login (JWT)
- Password reset via email code
- My List stored in DB
- Comments on movies/shows stored in DB

## Setup
1) Create a Postgres database (example: `mertflix`).
2) Copy env:

```powershell
Copy-Item .env.example .env
```

3) Fill `DATABASE_URL` and set a strong `JWT_SECRET`.

## Install

```powershell
npm install
```

## Migrate DB

```powershell
npm run migrate
```

## Run

```powershell
npm run dev
```

## Email sending
If SMTP is not configured, the server logs verification/reset codes to the console with `[MAIL:DEV]`.
To send real emails, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` in `.env`.

## API quick test

- Health:

```powershell
curl http://localhost:4000/health
```

- Register:

```powershell
curl -X POST http://localhost:4000/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"123456"}'
```

Then use the code printed in console:

```powershell
curl -X POST http://localhost:4000/auth/verify-email -H "Content-Type: application/json" -d '{"email":"test@example.com","code":"123456"}'
```

- Login:

```powershell
curl -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"123456"}'
```
