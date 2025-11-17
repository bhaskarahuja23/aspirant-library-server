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



