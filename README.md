# SaWedding — wedding photo wall

Guests scan a QR code, upload photos from their phone (no app, no account), and the photos appear on a live slideshow on a TV or projector.

| Page | What it's for |
|---|---|
| `/` | Guest upload page (what the QR code opens) |
| `/slideshow` | Full-screen slideshow for the TV. New uploads jump the queue and show "Just shared" |
| `/qr` | Printable QR cards: one large card, or four table cards per A4 sheet |
| `/admin` | Remove photos and get the slideshow, QR and guest links |

It runs on Vercel: static pages in `public/`, Vercel Functions in `api/`, and photos in Vercel Blob.

## Set up on Vercel (about 10 minutes)

1. **Import the repo.** In Vercel choose **Add New → Project**, pick this GitHub repo, and leave the framework as **Other**. If you've already imported it, skip this step.

2. **Add photo storage.** In the project, open **Storage → Create → Blob**, create a store and connect it to this project. That adds `BLOB_READ_WRITE_TOKEN` automatically.

3. **Add settings.** Under **Settings → Environment Variables**, add these for Production and Preview:

   | Name | Example | What it does |
   |---|---|---|
   | `TITLE` | `Sara & Alex` | Shown on every page |
   | `SUBTITLE` | `12 June 2027 · Stockholm` | Shown under the title |
   | `EVENT_CODE` | `lavender42` | Put in the QR link; without it nobody can upload or see photos |
   | `ADMIN_KEY` | a password | Logs you in to `/admin` |

4. **Make the site public.** Under **Settings → Deployment Protection**, turn off **Vercel Authentication**. Otherwise guests land on a Vercel login page.

5. **Redeploy.** Under **Deployments**, open the latest one and choose **Redeploy** so it picks up the storage and settings. Future pushes to `main` deploy automatically.

6. **Open `/admin` on your production address.** That's the short one under **Domains** on the project page, like `sawedding.vercel.app`. Don't use the long per-deployment address, because the QR code contains whatever address you open it from. From `/admin`:
   - **Print QR cards** opens the print page with the code built in.
   - **Open slideshow** opens the TV view. Click once to go full screen.

## Before the wedding

- Do a test run on the venue's wifi: scan the QR card, upload a photo, and watch it appear on the slideshow.
- Use the laptop that will drive the TV, and turn off its sleep and screensaver. The slideshow also asks the browser to keep the screen awake.
- Remove test photos in `/admin`.
- If you add a custom domain like `photos.yourwedding.se`, print the QR cards afterwards.

## After the wedding: download every photo

In Vercel, open **Storage → your Blob store**, where you can browse and download files one by one. To download everything at once, ask Claude to add a small download script.

## Good to know

- **Privacy:** the photo list and uploads need the event code from the QR link. Each photo's own address is public but random and unguessable, so it's only visible to people who were given it.
- **Size:** phone photos are shrunk to at most 2400px and under 4 MB on the guest's phone before upload. That keeps uploads fast and fits Vercel's 4.5 MB limit per request. iPhone HEIC photos become JPEG.
- **Free tier:** the free (Hobby) plan includes 1 GB of Blob storage, about 1,000 photos. Check your usage in the Storage tab, or upgrade the plan for a big wedding.
- **Removing a photo** in `/admin` takes it off the slideshow within about 10 seconds.
- **Timing:** each photo shows for 9 seconds. Change `SLIDE_MS` at the top of the script in `public/slideshow.html`.
- **Colors and fonts** are at the top of `public/style.css`.
