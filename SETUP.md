# Kyzbac portfolio upgrade

This add-on adds an always-visible rating shortcut, a public review feed with 1–5 star submissions, a separate pricing page, and subtle motion effects. It is designed for the current `rostilk/kyzbac.github.io` repository and keeps the existing HTML/CSS/JS site in place.

## Files

- `apply_upgrade.py` — safely patches the existing `index.html` and makes a timestamped backup first.
- `site-enhancements.css` — new styles and restrained animations; the existing `styles.css` is not replaced.
- `reviews-config.js`, `reviews.js` — dynamic approved-review feed, star submission form, and fixed rating shortcut.
- `reviews-schema.sql` — Supabase table and security policies.
- `pricing.html`, `pricing-config.js`, `pricing.js` — separate pricing page and editable service cards.

## 1. Copy files into your repository

1. Download and extract the ZIP.
2. Copy all files from the extracted folder into the root of your local `kyzbac.github.io` repository (the same folder as `index.html`).
3. Open a terminal in that repository folder and run:

   ```bash
   python apply_upgrade.py
   ```

4. The script creates a timestamped backup of `index.html` before changing it. It adds the Reviews and Pricing links, inserts the review section, fixes favicon links that were outside `<head>`, and loads the new CSS/JS.
5. Open `index.html` and `pricing.html` locally to check the layout before publishing.

If you prefer not to run the patch script, make these changes manually: add `site-enhancements.css` after `styles.css`; load `reviews-config.js` before `reviews.js` in the `<head>`; add the contents of `REVIEW_SECTION` from `apply_upgrade.py` immediately before the existing contact section; and add Reviews/Pricing links to the primary navigation.

## 2. Configure real reviews (Supabase)

GitHub Pages only hosts static files. It cannot securely store visitor-submitted reviews by itself. This package uses Supabase's public REST API for storage.

1. Create a free project at <https://supabase.com/>.
2. In Supabase, open **SQL Editor** and run `reviews-schema.sql`.
3. Open **Project Settings → API** and copy the Project URL and the publishable/anon key.
4. Paste them into `reviews-config.js`:

   ```js
   window.REVIEWS_CONFIG = {
     supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
     anonKey: "YOUR_SUPABASE_ANON_KEY",
     table: "portfolio_reviews",
     publicLimit: 8,
     statsLimit: 5000
   };
   ```

   Use only the public publishable/anon key. Never place a `service_role` or secret key in browser code.

5. Visitors can submit a name, optional project, 1–5 star rating, and comment. New rows are `pending`; only approved entries appear in the public feed or affect the average rating.
6. To approve a review, open **Table Editor → portfolio_reviews**, inspect the submission, and change `status` to `approved`. Use `rejected` for submissions you do not want published.

The fixed rating shortcut appears on both the home page and pricing page. Until there are approved reviews it accurately says “No ratings yet”; it does not show invented testimonials or ratings.

## 3. Set your prices

Edit `pricing-config.js`. Each package has a `price` field. It currently says `Custom quote` because your actual rates were not provided. Replace these values with your real prices, for example `From $50`, `€40–€80`, or `Custom quote`.

The three editable service types are:

- Feature or fix
- Custom system
- Tools and ongoing work

## 4. Publish

Commit the new files and the updated `index.html` to the `main` branch. GitHub Pages will publish `pricing.html` at `/pricing.html` after deployment. Test the review flow after configuring Supabase.

## Security and moderation

The SQL enables Row Level Security. Visitors can read approved reviews and insert only pending reviews; there are no public update or delete policies. This prevents a visitor from approving their own review through the public API. For a public-facing form with more traffic, add CAPTCHA/rate limiting (for example, Turnstile checked by an Edge Function) before promoting it widely.
