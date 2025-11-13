# Aspirant Library Seat Manager

Static website + lightweight Node API for managing seats at the Aspirant Library self-study space. Assign seats (now up to **75**), capture plan details, instantly generate a branded digital receipt, and draft a WhatsApp confirmation for each student.

## Features

- Branding bar with the Aspirant Library logo, address (Bighar Rd, Fatehabad), 24x7 badge, and owner contact (Chirag Kumar, +91&nbsp;99914&nbsp;18414).
- 75-seat allocation grid and selector that automatically disables already assigned seats.
- Shared API (Express + file storage) so multiple admins can assign/release seats in sync.
- Admin console listing all occupied seats with one-click **Release** actions.
- Digital receipt preview with auto-generated IDs plus embedded contact/location details.
- Export option: **Download PDF** (via `html2canvas` + `jsPDF`) that captures the full branded receipt.
- WhatsApp deep-link that opens a pre-filled confirmation message reminding staff to attach the downloaded PDF. 

## Usage

1. Start the shared API (see below) so every admin talks to the same data source.
2. Open `index.html` in any modern browser (double-click the file or serve it through a lightweight dev server).
3. Fill in the student details, seat number, plan, fee, and start date.
4. Submit to lock the seat, update the grid, and produce the receipt with logo and contact info.
5. Use **Download PDF** to save the receipt (hand the file over the counter or attach inside WhatsApp).
6. Hit **Send via WhatsApp** to open the chat. Select the freshly downloaded PDF inside WhatsApp before pressing send.

> **Note:** WhatsApp cannot auto-attach files from the browser. After the chat opens, attach the downloaded PDF manually.

## Shared API (multi-admin storage)

The `/server` folder contains a tiny Express service that stores seat data in `server/data/seats.json`. Run it on any computer (or deploy to Render/Renderfly/etc.) so every admin panel talks to a single source of truth.

```bash
cd AspirantLibrarySite/server
npm install
npm run dev   # or: npm start
```

- Default port is `4000`; override with `PORT=8080 npm start` if needed.
- When you host it remotely, expose the HTTPS URL (e.g. `https://aspirant-library-api.example.com/api`).
- Point the front-end at that URL by defining `window.ASPIRANT_API_BASE` **before** `app.js` loads:

```html
<script>
  window.ASPIRANT_API_BASE = 'https://aspirant-library-api.example.com/api';
</script>
<script src="app.js" defer></script>
```

## Logo replacement

Both the hero bar and receipt pull their artwork from `assets/logo.svg`. Replace that file with the official logo you shared (or drop a `logo.png`/`logo.webp` and update the `<img>` sources) to see the exact brand mark everywhere.

## Customisation

- Adjust `TOTAL_SEATS`, plan types, or receipt fields inside `app.js`.
- Swap the logo by overwriting `assets/logo.svg` (or change the `<img>` paths if you prefer PNG/JPG assets).
- Extend `server/server.js` or back it with a real database whenever you’re ready for analytics, reporting, or audit logs.

## Testing tips

- Try assigning two students to the same seat to confirm the blocking message from the server.
- Run the admin **Release** button on a seat and verify it reappears as available in every open browser (after hitting Refresh Seats).
- Generate a PDF receipt and confirm it captures the logo + owner block.
- Test the WhatsApp flow with your own phone number (include country/area code) and attach the saved PDF before final send.
