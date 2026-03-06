# Badminton Registration UI → Google Sheet

Files created:

- `index.html` — registration form UI
- `styles.css` — styling for the page
- `script.js` — client code that posts the form to Apps Script
- `apps_script.gs` — Google Apps Script to append incoming posts to the spreadsheet

Quick setup

Option A — Embed an existing Google Form (recommended since you already have one)

2. If you want to use your own site form (recommended per your request), follow Option C below.

Option C — Use your site form but send responses to Google Form (preferred for custom UI)

1. In `index.html` the form is already present but contains placeholder names. You must replace these placeholders with the real Google Form entry IDs.

   - The placeholders in `index.html` are: `entry.PLAYER_ENTRY_ID`, `entry.TEAM_ENTRY_ID`, `entry.GENDER_ENTRY_ID`, `entry.ACADEMY_ENTRY_ID`, `entry.FROM_ENTRY_ID`, `entry.MOBILE_ENTRY_ID`.
   - Replace each `entry.YOUR_PLACEHOLDER` with the actual entry id from your Google Form (e.g. `entry.123456789`).

2. To find the `entry.` IDs for each field:
   - Open your Google Form editor.
   - Click the three dots menu (top-right) and choose **Get pre-filled link**.
   - Fill sample values into the form fields and click **Get link**.
   - Copy the generated link and open it in a text editor or browser address bar — you'll see query parameters like `entry.123456789=Sample+Value`.
   - Match each `entry.XXXXX` parameter to the corresponding field and replace the matching `entry.PLAYER_ENTRY_ID` placeholder in `index.html`.

3. The `script.js` file sets the form's action to the Google Form `formResponse` URL derived from the FORM_ID already present (you can change `FORM_ID` if different). If your form id differs, update `FORM_ID` in `script.js`.

4. Open `index.html` in your browser. When users submit, the site form will POST to the Google Form endpoint and responses will be recorded in the Google Form's responses sheet.

Notes and troubleshooting

- If you accidentally leave `entry.PLAYER_ENTRY_ID` placeholders unchanged, the corresponding values won't be submitted to the Google Form.
- The hidden iframe captures the response so the page doesn't navigate away. If submissions appear not to work, check the browser console for network errors or inspect the request parameters to verify the `entry.` names and the `formResponse` URL are correct.

Option B — Use the local HTML form + Apps Script backend (previous approach)

1. Create a new Google Spreadsheet. In row 1 add headers matching the columns you want (example row):

   PLAYER NAME | TEAM NAME | GENDER | ACADEMY | FROM | MOBILE NO

2. Note the spreadsheet ID from the URL: https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit

3. Open the spreadsheet, go to Extensions → Apps Script, create a new project and paste the contents of `apps_script.gs`.
   - Replace `PASTE_SPREADSHEET_ID_HERE` with your spreadsheet id.
   - Save the script.

4. Deploy the script as a Web App:
   - Click **Deploy** → **New deployment** → **Select type** → **Web app**
   - Set **Execute as**: `Me`
   - Set **Who has access**: `Anyone` (or `Anyone, even anonymous`) so the form can post without OAuth.
   - Deploy and copy the **Web app URL**.

5. Restore the local form in `index.html` (replace the embedded iframe with the original `<form>` block) and set `SCRIPT_URL` in `script.js` to the Web app URL. Then open `index.html` to submit via the Apps Script endpoint.

Notes and troubleshooting

- Option A uses Google Form's built-in response handling — easiest if you already have the form.
- Option B uses the local HTML page and Apps Script to append rows directly to your spreadsheet.

---

## Display Registered Players on the Form Page

The registration page now shows a live list of registered players split by gender (Boys & Girls). Follow these steps to enable it:

### Setup Instructions:

1. **Deploy the Web App** (if you haven't already):
   - Open your Google Apps Script project (Extensions → Apps Script in your spreadsheet)
   - Click **Deploy** → **New deployment** → **Web app**
   - Set **Execute as**: `Me`
   - Set **Who has access**: `Anyone`
   - Click **Deploy**
   - Copy the **Deployment URL** (looks like: `https://script.google.com/macros/d/{script-id}/userweb`)

2. **Update `script.js`**:
   - Open `script.js` and find the line: `const PLAYERS_API_URL = "PASTE_YOUR_WEB_APP_URL_HERE";`
   - Replace it with your Web App URL, for example:
   ```javascript
   const PLAYERS_API_URL = "https://script.google.com/macros/d/YOUR_SCRIPT_ID/userweb";
   ```

3. **Features**:
   - **Desktop**: Registered players appear in two columns (Boys & Girls) on the right side of the registration form
   - **Mobile**: Click "View Boys List" or "View Girls List" buttons to see players in a popup
   - Shows total count and breakdown by gender
   - Auto-refreshes when the page loads


