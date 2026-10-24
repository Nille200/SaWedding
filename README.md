# SaWedding — wedding photo wall

Guests scan a QR code, upload photos from their phone (no app, no account), and the photos appear on a live slideshow on a TV or projector.

| Page | What it's for |
|---|---|
| `/` | Guest upload page (what the QR code opens) |
| `/slideshow` | Full-screen slideshow for the TV. New uploads jump the queue and show "Just shared" |
| `/qr` | Printable QR cards: one large card, or four table cards per A4 sheet |
| `/admin` | Remove photos and get the slideshow, QR and guest links |

It runs on Cloudflare's free tier: a Worker serves the pages, and photos are stored in R2.

## Set up (about 15 minutes)

You need [Node.js](https://nodejs.org) (version 18 or newer) and a free [Cloudflare account](https://dash.cloudflare.com/sign-up).

1. **Install**
   ```sh
   git clone https://github.com/Nille200/SaWedding.git
   cd SaWedding
   npm install
   npx wrangler login
   ```

2. **Turn on R2 and create the photo bucket.** In the Cloudflare dashboard, open **R2** and enable it. Cloudflare may ask for a card even though usage within the free tier costs nothing. Then:
   ```sh
   npx wrangler r2 bucket create sawedding-photos
   ```

3. **Add your names.** In `wrangler.toml`, change `TITLE` and `SUBTITLE`, for example `"Sara & Alex"` and `"12 June 2027 · Stockholm"`. Colors and fonts are at the top of `public/style.css`.

4. **Set two secrets.** Pick any values; you don't need to remember the event code.
   ```sh
   npx wrangler secret put EVENT_CODE   # e.g. a random word like "lavender42"; goes into the QR link
   npx wrangler secret put ADMIN_KEY    # your admin password
   ```

5. **Deploy**
   ```sh
   npm run deploy
   ```
   Wrangler prints your address, something like `https://sawedding.<your-name>.workers.dev`.

6. **Open `/admin`** at that address and log in with your admin key. From there:
   - **Print QR cards** opens the print page with the right code built in.
   - **Open slideshow** opens the TV view. Click once to go full screen.

## Before the wedding

- Do a test run on the venue's wifi: scan the QR card, upload a photo, and watch it appear on the slideshow.
- Use the laptop that will drive the TV, and turn off its sleep and screensaver. The slideshow also asks the browser to keep the screen awake.
- Remove test photos in `/admin`.
- Optional: add a custom domain such as `photos.yourwedding.se` under the Worker's **Settings → Domains & Routes** in Cloudflare. Print the QR cards after you set it up, because the code contains the address.

## After the wedding: download every photo

The Cloudflare dashboard has no "download all" button, so use [rclone](https://rclone.org):

1. In Cloudflare go to **R2 → Manage API tokens → Create API token** with *Object Read* permission. Note the Access Key ID, Secret Access Key and endpoint.
2. Run `rclone config`, add a remote named `r2` of type **S3 → Cloudflare R2**, and paste in those values.
3. Download:
   ```sh
   rclone copy r2:sawedding-photos/photos ./wedding-photos --progress
   ```

## Good to know

- **Privacy:** only people with the QR link (which contains the event code) can upload or view photos. Don't post the link publicly.
- **Phone photos** are shrunk to 2400px on the guest's phone before upload. That keeps uploads fast on venue wifi and converts iPhone HEIC photos to JPEG.
- **Removing a photo** in `/admin` takes it off the slideshow within about 10 seconds.
- **Timing:** each photo shows for 9 seconds. Change `SLIDE_MS` at the top of the script in `public/slideshow.html`.
- **Local testing:** copy `.dev.vars.example` to `.dev.vars` and run `npm run dev`.
- **Limits:** the free tier covers 10 GB of storage, around 5,000 photos at typical sizes, and far more traffic than a wedding needs.
