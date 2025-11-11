# Aspirant Library Seat Manager – AI Coding Agent Instructions

## Project Overview

**Aspirant Library Seat Manager** is a full-stack seat allocation system for the Aspirant Library study space (75 seats). It consists of:
- **Frontend** (`index.html`, `app.js`, `style.css`): React-free SPA for student registration, seat assignment, PDF receipt generation, and WhatsApp integration
- **Backend** (`server.js`): Node.js/Express API that maintains shared seat state in JSON (no database)
- **Data** (`data/seats.json`): Single source of truth, synced across all admin clients

## Architecture & Data Flow

### Seat State Model
Each seat object (see `data/seats.json` and `createSeat()` in both files) contains:
```javascript
{ number, studentName, phoneNumber, gender, plan, startDate, endDate, amount, assignedAt, receiptId }
```
- **null values** = available seat; **populated values** = occupied
- `receiptId` format: `AL-{seatNumber}-{randomHash}` (e.g., `AL-1-2164`)
- Dates always ISO strings (`YYYY-MM-DD` format for display fields)
- Gender: `'male'` or `'female'` (affects seat grid color styling)

### API Contract (REST only, no websockets)
Located in `server.js`, three endpoints share JSON-file storage:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Returns `{ status: 'ok', updatedAt }` |
| `/api/seats` | GET | Returns `{ seats: [...], updatedAt }` |
| `/api/seats/assign` | POST | Assigns seat; validates payload before write |
| `/api/seats/release` | POST | Clears seat back to null state |

**Assign payload validation** (`validateAssignPayload()` in `server.js`):
- **Required**: `seatNumber`, `studentName`, `phoneNumber`, `plan`, `startDate`, `endDate`, `gender`, `issuedAt`, `receiptId`
- **Optional**: `amount`
- Returns `409 Conflict` if seat already occupied; `400 Bad Request` if validation fails

### Client-Server Sync Pattern
`app.js` uses `SeatService` object:
- `SeatService.list()` → fetches from API, populates `seats[]` array, re-renders all UI (seat select, grid, admin table)
- `SeatService.assign(payload)` → POSTs to API, triggers full re-sync on success
- `SeatService.release(seatNumber)` → POSTs to API, triggers full re-sync on success
- **Manual refresh**: `Refresh Seats` button in UI triggers `syncSeats()` (useful when multiple admins operate simultaneously)

## Frontend Patterns

### DOM Manipulation & Templating
- **No frameworks**: Direct `document.createElement()` and fragment-based rendering
- **Selectors cached globally**: `const $ = selector => document.querySelector(selector)` at top of `app.js`
- **Template cloning**: Receipt display uses `<template id="receipt-template">` (see `index.html` ~line 290), cloned in `showReceipt()` and populated with data attributes

### Form & Receipt Workflow
1. User fills form → `submit` event triggers `buildReceiptPayload()` (transforms FormData into seat object + generates `receiptId`)
2. `assignSeat()` sends to API via `SeatService.assign()`
3. On success, `showReceipt(payload)` clones template and displays preview
4. `latestReceipt` global variable stores the current receipt for PDF/WhatsApp actions

### PDF Generation
- **Libraries**: `html2canvas` (DOM → canvas) + `jsPDF` (canvas → PDF)
- **CDN-loaded** in `index.html` (~line 332–333); scripts check `window.html2canvas` and `window.jspdf` at startup
- **Function**: `downloadReceiptPdf()` captures `#receiptPrintable`, scales to 2–3× DPI, converts to JPEG, embeds in PDF, triggers download
- **Fallback**: If CDN fails, falls back to `window.printReceipt()` (browser print dialog)

### Seat Grid Rendering
- `renderSeatGrid()` builds `#seat-grid` with color-coded divs:
  - `.seat.available` → light background
  - `.seat.occupied.male` → blue tint (see `style.css`)
  - `.seat.occupied.female` → pink tint
- Each occupied seat shows occupant's first name + "days remaining" badge
- Hover title includes full name, gender, and days left

## Development & Deployment

### Local Setup
```bash
cd server
npm install
npm run dev   # uses nodemon; watches server.js for changes
```
- Default: `http://localhost:4000`
- Frontend (static) served from root: open `index.html` in browser or serve with `python -m http.server 8000`

### Environment & Configuration
- **Port**: `process.env.PORT || 4000`
- **Total seats**: `process.env.TOTAL_SEATS || 75` (both frontend constant and backend initialize to 75)
- **Remote API**: Frontend looks for `window.ASPIRANT_API_BASE`; defaults to production URL (see `index.html` ~line 350)
  - Override by setting global **before** `app.js` loads: `<script> window.ASPIRANT_API_BASE = '...'; </script>`

### Asset Path
- Logo used in hero bar and receipt PDF: `assets/logo.svg`
- If serving remotely, ensure CORS headers are correct; `allowTaint: true` in `html2canvas` config allows cross-origin images

## Critical Patterns & Gotchas

### 1. **Occupancy Check Before Assign**
Server-side validation in `POST /api/seats/assign`:
```javascript
if (seat.studentName) {
  return res.status(409).json({ message: `Seat already assigned to ${seat.studentName}.` });
}
```
If two admins submit simultaneously, second will get 409. Frontend must handle this gracefully (already does in error handler).

### 2. **Gender-Based Styling**
Gender field determines CSS class in `renderSeatGrid()`:
```javascript
if (seat.gender === 'female') { className += ' female'; }
else if (seat.gender === 'male') { className += ' male'; }
```
Ensure gender is always set during assignment; missing gender defaults to "Male" in form defaults and UI display.

### 3. **Date Calculation for "Days Remaining"**
`getDaysRemaining(endDate)` returns `Math.max(0, Math.ceil((end - today) / ms_per_day))`.
- Used in seat grid badges, admin table, and receipt
- **Negative dates show as 0 days**, not negative (prevents confusion)

### 4. **Receipt ID Generation**
Format: `AL-${seatNumber}-${Math.floor(Math.random() * 9000 + 1000)}`
- Ensures rough uniqueness without server-side ID counter
- **Not guaranteed globally unique** if > 100 seats assigned per second (but acceptable for this library use case)

### 5. **Phone Number Normalization**
Both display and WhatsApp require cleaned format:
- `buildReceiptPayload()` formats for display: `+91 XXXXX XXXXX`
- `cleanPhoneForWhatsApp()` strips all non-digits for WhatsApp API: `91XXXXXXXXXX`

### 6. **Sync Races with Multiple Admins**
No real-time WebSocket sync; all clients pull fresh data on:
- Form submission
- Manual "Refresh Seats" click
- Seat release action
- Page load (`init()` calls `syncSeats()`)

**Recommendation**: Instruct admins to refresh manually if they notice stale seat state after ~30 sec (acceptable for low-concurrency study space).

## Testing & Validation

### Manual Tests Mentioned in README
1. **Dual assignment**: Try assigning two students to same seat → expect 409 error
2. **Release sync**: Release seat in one browser → verify grid updates in others after manual refresh
3. **PDF receipt**: Download and check logo + owner block render correctly
4. **WhatsApp flow**: Test with your phone number (include country code); manually attach PDF before send

### Files to Inspect for Issues
- `server.js`: API logic, validation, file I/O
- `app.js`: State management (seats array), sync logic, event handlers
- `index.html`: Template structure, CDN script loading order
- `data/seats.json`: Current seat state (editable for testing, but reset on `npm run dev` if you restore defaults)

## When Adding Features

- **New fields**: Update `createSeat()` in both `server.js` and `app.js`; update payload validation; update seat render functions
- **New API endpoint**: Add to `server.js`; add to `SeatService` in `app.js`; handle async errors consistently
- **New UI section**: Build with `document.createElement()` (no JSX); use cached `$()` selectors where possible; delegate event listeners to parent (see admin table release button)
- **PDF changes**: Modify receipt template in `index.html` AND ensure template fields match `data-field="..."` attributes used in `showReceipt()`
