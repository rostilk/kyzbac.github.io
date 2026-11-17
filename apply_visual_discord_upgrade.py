#!/usr/bin/env python3
"""Safely add Kyzbac cursor/hover interactions, Discord review identity and OG metadata.

Run from the root of the existing GitHub Pages repository. Existing site-config.js,
reviews-config.js, pricing configuration, and the main styles.css are left untouched.
"""
from __future__ import annotations

from datetime import datetime
from html import escape
from pathlib import Path
import re
import shutil

ROOT = Path.cwd()
DEFAULT_SITE_URL = "https://rostilk.github.io/kyzbac.github.io/"
IMAGE_NAME = "og-preview.png"

REVIEW_FORM = '''<form class="review-form" id="review-form">
            <div class="review-discord-gate" id="review-discord-gate">
              <p class="review-discord-gate-copy"><strong>Reviews are linked to a real Discord account.</strong> Continue with Discord to attach your public display name, avatar, and Discord ID. Only the basic identity permission is requested — no email access.</p>
              <button class="review-discord-login" id="review-discord-login" type="button"><span class="review-discord-login-mark" aria-hidden="true">◉</span> Continue with Discord</button>
              <div class="review-discord-profile" id="review-discord-profile" hidden>
                <img class="review-discord-profile-avatar" id="review-discord-avatar" src="" alt="" referrerpolicy="no-referrer">
                <span class="review-discord-profile-copy"><strong id="review-discord-name">Discord user</strong><small id="review-discord-username">@username</small><small class="review-discord-id-note" id="review-discord-id">DISCORD ID</small></span>
                <button class="review-discord-logout" id="review-discord-logout" type="button">Disconnect</button>
              </div>
            </div>
            <fieldset class="review-form-fields" id="review-form-fields" disabled hidden>
              <div class="review-field"><label for="review-project-name">Project (optional)</label><input id="review-project-name" name="project" type="text" maxlength="100" placeholder="What did we work on?"></div>
              <fieldset class="rating-fieldset"><legend>Your rating</legend><div class="star-picker" id="review-star-picker" role="group" aria-label="Choose a rating from one to five stars">
                <button type="button" data-rating="1" aria-label="1 star" aria-pressed="false">★</button>
                <button type="button" data-rating="2" aria-label="2 stars" aria-pressed="false">★</button>
                <button type="button" data-rating="3" aria-label="3 stars" aria-pressed="false">★</button>
                <button type="button" data-rating="4" aria-label="4 stars" aria-pressed="false">★</button>
                <button type="button" data-rating="5" aria-label="5 stars" aria-pressed="false">★</button>
              </div><input id="review-rating" name="rating" type="hidden" value=""></fieldset>
              <div class="review-field"><label for="review-message">Your experience</label><textarea id="review-message" name="message" minlength="10" maxlength="1200" placeholder="What was it like working together?" required></textarea></div>
              <div class="review-honeypot" aria-hidden="true"><label for="review-website">Leave this field empty</label><input id="review-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
              <button class="button button-primary review-submit" type="submit">Submit review <span aria-hidden="true">↗</span></button>
            </fieldset>
            <p id="review-form-status" role="status" aria-live="polite">Connect your Discord account to unlock the review form.</p>
          </form>'''


def site_url() -> str:
    cname = ROOT / "CNAME"
    if cname.exists():
        domain = cname.read_text(encoding="utf-8").strip().splitlines()[0].strip()
        if domain and " " not in domain:
            return f"https://{domain.strip('/')}/"
    return DEFAULT_SITE_URL


def upsert_meta(document: str, attr: str, name: str, content: str) -> str:
    key = re.escape(name)
    pattern = re.compile(rf"<meta\b(?=[^>]*\b{attr}\s*=\s*['\"]{key}['\"])[^>]*>", re.I)
    tag = f'<meta {attr}="{escape(name, quote=True)}" content="{escape(content, quote=True)}">'
    if pattern.search(document):
        return pattern.sub(tag, document, count=1)
    head_close = re.search(r"</head\s*>", document, re.I)
    if not head_close:
        raise RuntimeError("Could not find </head> while adding share metadata.")
    return document[:head_close.start()] + "  " + tag + "\n" + document[head_close.start():]


def upsert_link(document: str, href: str, tag: str) -> str:
    pattern = re.compile(rf"<link\b(?=[^>]*\bhref\s*=\s*['\"]{re.escape(href)}['\"])[^>]*>", re.I)
    if pattern.search(document):
        return document
    target = None
    if href == "site-interactions.css":
        target = re.search(r'<link\b[^>]*href=["\']site-enhancements\.css["\'][^>]*>', document, re.I)
    if not target:
        target = re.search(r'<link\b[^>]*href=["\']styles\.css["\'][^>]*>', document, re.I)
    if target:
        return document[:target.end()] + "\n  " + tag + document[target.end():]
    head_close = re.search(r"</head\s*>", document, re.I)
    if not head_close:
        raise RuntimeError("Could not find </head> while adding stylesheet.")
    return document[:head_close.start()] + "  " + tag + "\n" + document[head_close.start():]


def ensure_script_after(document: str, src: str, after_src: str) -> str:
    if re.search(rf'<script\b[^>]*src=["\']{re.escape(src)}["\']', document, re.I):
        return document
    anchor = re.search(rf'<script\b[^>]*src=["\']{re.escape(after_src)}["\'][^>]*>\s*</script>', document, re.I)
    tag = f'<script src="{src}" defer></script>'
    if anchor:
        return document[:anchor.end()] + "\n  " + tag + document[anchor.end():]
    head_close = re.search(r"</head\s*>", document, re.I)
    if not head_close:
        raise RuntimeError(f"Could not find </head> while adding {src}.")
    return document[:head_close.start()] + "  " + tag + "\n" + document[head_close.start():]


def add_share_metadata(document: str, page_url: str, title: str, description: str, image_url: str) -> str:
    metadata = [
        ("property", "og:title", title),
        ("property", "og:description", description),
        ("property", "og:type", "website"),
        ("property", "og:site_name", "Kyzbac"),
        ("property", "og:url", page_url),
        ("property", "og:image", image_url),
        ("property", "og:image:secure_url", image_url),
        ("property", "og:image:type", "image/png"),
        ("property", "og:image:width", "1200"),
        ("property", "og:image:height", "630"),
        ("property", "og:image:alt", "Kyzbac — Roblox Luau developer portfolio"),
        ("name", "twitter:card", "summary_large_image"),
        ("name", "twitter:title", title),
        ("name", "twitter:description", description),
        ("name", "twitter:image", image_url),
    ]
    for attr, key, value in metadata:
        document = upsert_meta(document, attr, key, value)
    canonical = re.compile(r'<link\b(?=[^>]*\brel=["\']canonical["\'])[^>]*>', re.I)
    canonical_tag = f'<link rel="canonical" href="{escape(page_url, quote=True)}">'
    if canonical.search(document):
        document = canonical.sub(canonical_tag, document, count=1)
    else:
        document = upsert_link(document, "__canonical_placeholder__", canonical_tag)
        document = document.replace('href="__canonical_placeholder__"', f'href="{escape(page_url, quote=True)}"', 1)
    return document


def main() -> None:
    index_path = ROOT / "index.html"
    pricing_path = ROOT / "pricing.html"
    if not index_path.exists():
        raise SystemExit("Run this script from the root of your kyzbac.github.io repository (where index.html is located).")

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backups = []
    for path in (index_path, pricing_path):
        if path.exists():
            backup = path.with_name(f"{path.name}.before-discord-{timestamp}")
            shutil.copy2(path, backup)
            backups.append(backup.name)

    base = site_url().rstrip("/") + "/"
    image_url = base + IMAGE_NAME

    index = index_path.read_text(encoding="utf-8")
    form_pattern = re.compile(r'(<form\b[^>]*\bid=["\']review-form["\'][^>]*>).*?(</form>)', re.I | re.S)
    if 'id="review-discord-login"' not in index:
        match = form_pattern.search(index)
        if not match:
            raise SystemExit("Could not locate #review-form in index.html. No changes were written; check the backup files.")
        index = index[:match.start()] + REVIEW_FORM + index[match.end():]

    index = upsert_link(index, "site-interactions.css", '<link rel="stylesheet" href="site-interactions.css">')
    index = ensure_script_after(index, "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "reviews-config.js")
    index = ensure_script_after(index, "site-interactions.js", "app.js")
    index = add_share_metadata(
        index,
        base,
        "M1sterFygy (Kyzbac) — Roblox Luau Developer",
        "Roblox Luau developer building gameplay systems, developer tools, and clean, scalable architecture.",
        image_url,
    )
    index_path.write_text(index, encoding="utf-8")

    if pricing_path.exists():
        pricing = pricing_path.read_text(encoding="utf-8")
        pricing = upsert_link(pricing, "site-interactions.css", '<link rel="stylesheet" href="site-interactions.css">')
        pricing = ensure_script_after(pricing, "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "reviews-config.js")
        pricing = ensure_script_after(pricing, "site-interactions.js", "pricing.js")
        pricing = add_share_metadata(
            pricing,
            base + "pricing.html",
            "Pricing — Kyzbac Roblox Luau Developer",
            "Scope-based pricing for Roblox gameplay systems, tools, and custom development.",
            image_url,
        )
        pricing_path.write_text(pricing, encoding="utf-8")
    else:
        print("NOTE: pricing.html was not found; only index.html was updated.")

    print("Visual and Discord review upgrade applied.")
    print("Updated: index.html" + (", pricing.html" if pricing_path.exists() else ""))
    print("Added links: site-interactions.css, site-interactions.js, Supabase JS CDN")
    print(f"Discord share image: {image_url}")
    if backups:
        print("Backups: " + ", ".join(backups))
    print("Existing styles.css, site-config.js, reviews-config.js, and pricing-config.js were left untouched.")


if __name__ == "__main__":
    main()
