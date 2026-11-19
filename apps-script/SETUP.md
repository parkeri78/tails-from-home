# Booking form setup (about 10 minutes)

Connects the website form to a Google Sheet. Use the **business Google account**, not a personal one.

## Steps
- [ ] 1. Sign in to the business Google account and go to sheets.google.com. Make a blank sheet named **Tails From Home Bookings**.
- [ ] 2. In the sheet: **Extensions → Apps Script**.
- [ ] 3. Delete the sample code. Paste in everything from `apps-script/Code.gs`. Click **Save** (disk icon).
- [ ] 4. At the top, pick `setup` in the function menu and click **Run**. Google asks for permission: click through and **Allow**. (It may say "Google hasn't verified this app". That's normal for your own script: Advanced → Go to project.)
- [ ] 5. Click **Deploy → New deployment**. Gear icon → **Web app**.
  - Execute as: **Me**
  - Who has access: **Anyone**
  - Click **Deploy** and copy the **Web app URL** (ends in `/exec`).
- [ ] 6. In `script.js`, replace `PASTE_YOUR_WEB_APP_URL_HERE` with that URL. Push to GitHub.
- [ ] 7. Test: send a booking on the live site. You should get an email, and a row in the Bookings tab. Then type the same phone number and tap **Look me up**.

## Later changes
- Edited `Code.gs`? **Deploy → Manage deployments → pencil → Version: New version → Deploy.** (The URL stays the same.)
- More people to email: edit `NOTIFY_EMAILS` at the top of `Code.gs`.
- Add old customers by hand: type them into the **Customers** tab (Phone = 10 digits, no dashes). Pets format:
  `[{"name":"Newt","breed":"Labrador Retriever","size":"Large","age":"5"}]`
