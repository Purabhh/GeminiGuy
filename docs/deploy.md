# Deploying Mochee

Production runs on one DigitalOcean droplet (Ubuntu 24.04, 2 GB) at
**https://138-197-85-46.sslip.io**.

## Ship an update

Commit your changes, then from the repo root:

```bash
bash scripts/deploy.sh
```

It uploads `HEAD`, runs `npm ci` and `npm run build` on the droplet, swaps the
new build in and restarts the service (the old one is kept as
`/opt/mochee/prev`). It needs the `~/.ssh/mochee_deploy` key on your machine.

## What runs where

- **Caddy** (`/etc/caddy/Caddyfile`) serves HTTPS for the sslip.io name (a free
  certificate, renewed automatically) and forwards to the app on
  `127.0.0.1:4176`. HTTPS is required: browsers only allow the microphone on
  secure pages.
- **The app** is the `mochee` systemd service: `npm start` = `vite preview`,
  the built site plus the same API plugins as `npm run dev` (Gemini ask,
  ElevenLabs voice, documents, Teach It Back, lectures). Code lives in
  `/opt/mochee/app`.
- **Keys and settings** are in `/etc/mochee.env` (`GEMINI_API_KEY`,
  `ELEVENLABS_API_KEY`, `MOCHEE_HOSTS`), readable only by root and the service.
- **Data that survives deploys**: `/opt/mochee/shared/data` (uploaded
  documents, SQLite index) and `/opt/mochee/shared/tts-cache` (voice clips and
  the daily ElevenLabs budget), linked into each build.

## Handy commands (on the droplet)

```bash
systemctl status mochee          # is it up
journalctl -u mochee -n 100      # app logs
systemctl restart mochee         # restart
```

## Test mode: nothing is kept

- **In the browser:** the droplet build keeps no visitor progress past the tab
  (`VITE_FRESH_EACH_TAB=1`, see `src/freshStart.ts`).
- **On the server:** uploaded documents are wiped every night at 4 AM New York
  time by `/usr/local/bin/mochee-reset-docs` (cron: `/etc/cron.d/mochee-reset`,
  log: `/var/log/mochee-reset.log`). The voice cache is kept. Run that command
  by hand to wipe now.

Everyone who opens the site uses these API keys and shares each class's
uploads until the nightly wipe (there are no accounts yet).
