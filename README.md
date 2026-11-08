# M1sterFygy — Roblox Luau Developer Portfolio

A responsive, single-page portfolio built with plain HTML, CSS, and JavaScript. It is ready for GitHub Pages and does not use stock photos, AI-generated images, or image assets. The visual elements in the hero and empty project previews are made with CSS.

## Files

- `index.html` — page structure and metadata.
- `styles.css` — layout, responsive styling, transitions, and CSS-only visuals.
- `app.js` — project rendering, filters, preview modal, and mobile navigation.
- `projects.js` — project descriptions and preview URL templates.
- `site-config.js` — email and social profile links.

## Add your Streamable previews or images

Open `projects.js`. Find a project's `preview` property and replace the empty `url` value.

### Streamable video

```js
preview: { type: "video", url: "https://streamable.com/VIDEO_ID" },
```

You can use a normal Streamable share URL or the `/e/VIDEO_ID` embed URL. The video loads when a visitor opens that project's preview modal, not on initial page load.

### PNG, JPG, or WEBP image

```js
preview: { type: "image", url: "https://your-host.com/your-preview.png" },
```

A local image works too. Put it in `assets/previews/`, then use a path such as:

```js
preview: { type: "image", url: "assets/previews/combat-system.png" },
```

The URL must be publicly accessible. For best results, use a 16:9 image at least 1200 × 675 pixels.

### Add another project

Duplicate one project object in `projects.js`, give it a unique `id`, and set its `category` to `gameplay`, `systems`, or `tools`. The project filters and cards update automatically.

You can also set `projectUrl` to a public demo, GitHub repository, or other project page. Leave it empty to hide the external link.

## Update your contact links

Open `site-config.js` and replace:

- `YOUR_EMAIL@example.com` with your email address.
- `YOUR_USERNAME` with your GitHub username.
- `YOUR_USER_ID` with your Discord user ID and Roblox user ID.

Remove any social entry you do not want to display.

## Publish on GitHub Pages

1. Create a **public** GitHub repository named exactly `YOUR_USERNAME.github.io`.
2. Upload all files and folders from this project to the repository root. Do not upload the outer `kyzbac-portfolio` folder itself as a nested directory.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then save.
6. Wait for the deployment to finish. Your site will be at `https://YOUR_USERNAME.github.io`.

## Before publishing

- Replace the sample email and social links in `site-config.js`.
- Add your own Streamable or image previews in `projects.js`.
- Review project descriptions and edit any wording that does not accurately describe your contribution.
- Only publish screenshots, videos, source code, and project links you have permission to share.

No build step, package manager, framework, or backend is required.
