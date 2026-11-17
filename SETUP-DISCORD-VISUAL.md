# Kyzbac visual + Discord reviews upgrade

This patch adds desktop cursor interactions, restrained card tilt/spotlight effects, Discord-authenticated reviews, and a branded Open Graph thumbnail for Discord link previews. It is additive: it keeps your existing `styles.css`, `site-config.js`, `reviews-config.js`, and `pricing-config.js` intact.

## Files in this package

- `apply_visual_discord_upgrade.py` — idempotent patcher for the existing `index.html` and `pricing.html`; creates timestamped backups.
- `reviews.js` — replacement review loader/form script. It uses Supabase Auth with Discord and displays the real Discord avatar, global display name, username, and ID.
- `reviews-discord-migration.sql` — database migration. Run this after your original `reviews-schema.sql`.
- `site-interactions.js` and `site-interactions.css` — desktop-only custom cursor, magnetic button movement, gentle card tilt, and cursor-following card light. Touch devices and reduced-motion users keep the normal cursor and simple layout.
- `og-preview.png` — 1200 × 630 branded share image for Discord and other link unfurlers.
- `og-preview.svg` — editable vector source for the share image.

## 1. Apply the patch in GitHub Codespaces

1. Open your existing `rostilk/kyzbac.github.io` Codespace.
2. Upload this ZIP to the repository root and extract it there, or upload the listed files individually.
3. Make sure `index.html` and `pricing.html` are in the same folder as the patcher.
4. Open **Terminal → New Terminal** and run:

   ```bash
   python3 apply_visual_discord_upgrade.py
   ```

5. The patcher updates the HTML metadata, replaces the review form with a Discord sign-in gate, loads the interaction files and Supabase browser SDK, and creates timestamped HTML backups.
6. Keep your existing `reviews-config.js` unchanged. It must still contain your Supabase project URL and publishable/anon key.

The patcher uses `https://rostilk.github.io/kyzbac.github.io/` as the default GitHub Pages URL. If the repository has a `CNAME` file, the script uses that domain automatically. If your live URL is different and there is no `CNAME` file, edit `DEFAULT_SITE_URL` near the top of the patcher before running it.

## 2. Configure Discord sign-in in Supabase

The site uses Supabase Auth's Discord provider. Reviewers sign in with Discord; the site does not ask them to type an unverified ID. The page displays their Discord ID after sign-in, and the database trigger attaches the identity to the review.

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create an application for the portfolio.
2. Open the Supabase project used by the reviews, then go to **Authentication → Sign In / Providers → Discord**.
3. Copy the callback URL shown by Supabase. It looks like:

   ```text
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```

4. In the Discord Developer Portal, open **OAuth2 → Redirects**, add that exact Supabase callback URL, and save.
5. Copy the Discord **Client ID** and **Client Secret** into the Discord provider settings in Supabase. Enable the provider and save.
6. In Supabase, open **Authentication → URL Configuration**. Set **Site URL** to your live portfolio URL and add that same URL to **Redirect URLs**. Also add any local preview URL you actually use (for example, your Codespaces preview URL) if you test sign-in there.
7. Save the provider configuration.

The code requests only the `identify` scope. It does not request the reviewer's email address, server access, or permission to join any Discord server.

## 3. Run the database migration

Your existing `portfolio_reviews` table must already exist. In Supabase **SQL Editor**, run the full contents of `reviews-discord-migration.sql`.

The migration:

- Adds Discord identity columns and a Supabase user ID to existing reviews without deleting old rows.
- Requires a signed-in Supabase user to submit new reviews.
- Uses a database trigger to read the Discord identity from `auth.identities`; it does not trust a name, ID, or avatar URL submitted by browser JavaScript.
- Forces every new review to `pending`.
- Keeps public reads limited to approved reviews and provides no public update/delete policy.

Existing reviews remain in the table. Rows created before this migration may have no Discord avatar/ID; those are rendered using the previous initials fallback.

## 4. Test the flow

1. Open the deployed homepage and scroll to Reviews.
2. Click **Continue with Discord** and authorize the basic identity request.
3. After returning to the site, check that your display name, username, avatar, and Discord ID are shown in the review form.
4. Enter a project (optional), choose a star rating, write a review, and submit.
5. In Supabase **Table Editor → portfolio_reviews**, verify that the new row has Discord identity fields and `status = pending`.
6. Change that row's status to `approved`. Refresh the public site; the avatar and display name should appear in the review card and the average rating should update.

The UI displays the Discord **global display name** (with the `@username` underneath). It does not fetch a nickname specific to one Discord server; that would require additional guild-member access and a configured guild.

## 5. Discord link thumbnail

The patcher adds server-rendered Open Graph and Twitter card metadata to both `index.html` and `pricing.html`, pointing to `og-preview.png`. Upload the PNG to the repository root with the other files. It is 1200 × 630 and uses vector artwork/text rather than generated or stock imagery.

After GitHub Pages deploys, check that these URLs load publicly:

```text
https://YOUR_SITE_URL/og-preview.png
https://YOUR_SITE_URL/og-preview.svg
```

Discord fetches metadata from the returned HTML; it does not run client-side JavaScript to discover metadata. If Discord shows an old preview, it may be cached; change the image filename (for example, `og-preview-v2.png`) and update the `og:image` value by rerunning the patcher after changing `IMAGE_NAME` at the top of the script.

## 6. Publish

Check the changed files with:

```bash
 git status --short
```

Then commit the patch files, updated HTML files, and SQL migration to the `main` branch. Do not commit the timestamped `*.before-discord-*` backups or publish any Supabase service-role/secret key. The `anon`/publishable key in `reviews-config.js` is intended for browser use with the database's Row Level Security policies enabled.
