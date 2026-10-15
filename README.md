# NAF CARE GROUP PWA — Starter

This is a safe frontend starter for the new `naf-care-group-pwa` repository.

## Current status

- Responsive static PWA shell
- Member-name preview only
- Search and refresh interaction
- PWA manifest and service worker
- **No financial data is loaded**
- **No login or server-side authorization is implemented yet**
- Google Apps Script API is intentionally not connected yet

## Deploy to GitHub Pages (GitHub Free)

1. Upload the contents of this folder to the root of the public repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then Save.
5. Wait for the Pages deployment to complete.

The project site will generally be available at:

`https://YOUR-GITHUB-USERNAME.github.io/naf-care-group-pwa/`

## Important security notes

GitHub Pages is static hosting. A login form in HTML/JavaScript alone cannot protect data or enforce admin-only edits.

Do not put passwords, tokens, API secrets, spreadsheet data, member financial records, or Apps Script owner credentials in this repository.

The existing Apps Script endpoints must not be publicly deployed with unauthenticated access to member or payment data. Before connecting this frontend, implement and test server-side authentication and authorization. Only then connect a protected API.

## Planned integration

- Google Sheets: member records and Deposit Balance payment matrix
- Apps Script: calculation API and Blogger feed reader
- Authentication: server-verified sessions and role checks
- Admin: edit payment/capital records only through protected server-side actions
- Members: read-only access to approved member/payment views

## Branding

- Logo: `https://nafcare.github.io/nafcare.png`
- Blogger: `https://nafcaregroup.blogspot.com/`
- Main color: `#0b8043`
