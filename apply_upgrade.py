#!/usr/bin/env python3
"""Patch the current Kyzbac GitHub Pages index.html safely and idempotently."""
from pathlib import Path
from datetime import datetime
import re
import shutil
import sys

ROOT = Path.cwd()
INDEX = ROOT / "index.html"

REVIEW_SECTION = '''    <section class="reviews-section section-wrap section-pad" id="reviews" aria-labelledby="reviews-title">
      <div class="reviews-header review-reveal">
        <div>
          <div class="eyebrow section-eyebrow">04 / CLIENT FEEDBACK</div>
          <h2 id="reviews-title">Built on trust.<br><span>Backed by feedback.</span></h2>
        </div>
        <p class="reviews-intro">Honest feedback from people I have worked with. Reviews are published after moderation so the rating reflects real, approved submissions.</p>
      </div>

      <div class="reviews-layout">
        <div class="reviews-feed" id="reviews-list" aria-live="polite">
          <div class="reviews-empty"><span class="reviews-empty-mark" aria-hidden="true">✳</span><div><strong>Loading client feedback…</strong><p>Approved reviews will appear here.</p></div></div>
        </div>

        <aside class="review-form-panel review-reveal" aria-labelledby="review-form-title">
          <h3 class="review-form-title" id="review-form-title">Leave a review</h3>
          <p class="review-form-description">Worked together? Share your experience. Your review will appear publicly after approval.</p>
          <form class="review-form" id="review-form">
            <div class="review-field"><label for="review-name">Your name</label><input id="review-name" name="name" type="text" minlength="2" maxlength="60" autocomplete="name" placeholder="Name or display name" required></div>
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
            <p id="review-form-status" role="status" aria-live="polite">Submissions are reviewed before appearing publicly.</p>
          </form>
        </aside>
      </div>
    </section>

'''


def backup(path: Path) -> None:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    destination = path.with_name(path.name + f".backup-{stamp}")
    shutil.copy2(path, destination)
    print(f"Backup: {destination.name}")


def main() -> int:
    if not INDEX.exists():
        print("ERROR: Run this script from the root of your cloned kyzbac.github.io repository (where index.html is located).")
        return 1

    html = INDEX.read_text(encoding="utf-8")
    original = html
    if 'id="reviews"' not in html:
        contact_match = re.search(r'^[ \t]*<section class="contact-section', html, re.MULTILINE)
        if not contact_match:
            print("ERROR: Could not find the current contact section in index.html. No files were changed.")
            return 1
        html = html[:contact_match.start()] + REVIEW_SECTION + html[contact_match.start():]
        print("Added reviews section.")
    else:
        print("Reviews section already exists; skipped.")

    # Replace the contact nav item with Reviews + Pricing + Contact.
    if 'href="pricing.html"' not in html:
        pattern = r'(<nav class="primary-nav"[\s\S]*?</nav>)'
        match = re.search(pattern, html)
        if not match:
            print("ERROR: Could not locate the primary navigation. No files were changed.")
            return 1
        nav = match.group(1)
        contact = re.search(r'<a href="#contact">Contact\s*<span>\d+</span></a>', nav)
        if not contact:
            print("ERROR: Could not locate the Contact link in the primary navigation. No files were changed.")
            return 1
        replacement = '''<a href="#reviews">Reviews <span>04</span></a>
      <a href="pricing.html">Pricing <span>05</span></a>
      <a href="#contact">Contact <span>06</span></a>'''
        nav = nav[:contact.start()] + replacement + nav[contact.end():]
        html = html[:match.start(1)] + nav + html[match.end(1):]
        print("Added Reviews and Pricing navigation links.")
    else:
        print("Pricing navigation already exists; skipped.")

    # Correct the current favicon links if they were placed before <head>.
    favicon_pattern = re.compile(r'^<link rel="(?:icon|shortcut icon|apple-touch-icon)"[^\n]*\n?', re.MULTILINE)
    favicon_lines = favicon_pattern.findall(html.split("<head>", 1)[0]) if "<head>" in html else []
    if favicon_lines:
        html = favicon_pattern.sub("", html, count=len(favicon_lines))
        insert_after = '<meta name="theme-color" content="#0a0c0f">'
        icons = "\n" + "".join(line if line.endswith("\n") else line + "\n" for line in favicon_lines).rstrip()
        if insert_after in html:
            html = html.replace(insert_after, insert_after + icons, 1)
        print("Moved favicon links inside <head>.")

    # Keep the section index sequential after inserting reviews before contact.
    html = html.replace('>04 / CONTACT</div>', '>05 / CONTACT</div>', 1)

    # Add the enhancements stylesheet.
    if 'href="site-enhancements.css"' not in html:
        base_link = '<link rel="stylesheet" href="styles.css">'
        if base_link not in html:
            print("ERROR: Could not locate styles.css link in <head>. No files were changed.")
            return 1
        html = html.replace(base_link, base_link + '\n  <link rel="stylesheet" href="site-enhancements.css">', 1)
        print("Linked site-enhancements.css.")

    # Load the public review config before the reviews script.
    if 'src="reviews.js"' not in html:
        app_script = '<script src="app.js" defer></script>'
        if app_script not in html:
            print("ERROR: Could not locate app.js script tag in <head>. No files were changed.")
            return 1
        html = html.replace(app_script, '<script src="reviews-config.js" defer></script>\n  <script src="reviews.js" defer></script>\n  ' + app_script, 1)
        print("Linked reviews-config.js and reviews.js.")

    if html != original:
        backup(INDEX)
        INDEX.write_text(html, encoding="utf-8")
        print("Updated index.html.")
    else:
        print("index.html already contains all changes.")

    required = ["site-enhancements.css", "reviews-config.js", "reviews.js", "reviews-schema.sql", "pricing.html", "pricing-config.js", "pricing.js"]
    missing = [name for name in required if not (ROOT / name).exists()]
    if missing:
        print("WARNING: These files need to be copied into the repository root:")
        for name in missing:
            print("  - " + name)
        return 2

    css = ROOT / "styles.css"
    if css.exists():
        print("Existing styles.css preserved; new styles are isolated in site-enhancements.css.")
    print("\nUpgrade applied. Review the setup guide before publishing.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
