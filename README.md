# Wedding Weekend Frontend

This project now runs on Vite + React + Tailwind CSS.

## Scripts

- `npm run dev`: start the Vite frontend and the RSVP database server together
- `npm run build`: create a production build
- `npm run preview`: preview the production build locally
- `npm run responses`: run just the RSVP database server

## Project structure

- `src/App.jsx`: page UI and bilingual content
- `src/index.css`: Tailwind import plus theme tokens and global background styles
- `vite.config.js`: Vite config with React and Tailwind
- `server.js`: RSVP API and SQLite-backed responses table

## Fast edits

Most content lives in the `content` object at the top of `src/App.jsx`.

- `content.en.scheduleItems` and `content.fr.scheduleItems`
- `content.en.menuOptions` and `content.fr.menuOptions`
- `content.en.logisticsCards` and `content.fr.logisticsCards`

## RSVP setup

The RSVP form now posts to a local API backed by SQLite.

1. Submissions are saved in `data/rsvps.sqlite`.
2. The frontend posts to `/api/rsvps`.
3. You can see all answers in a table at `http://127.0.0.1:8787/responses` while the server is running.
