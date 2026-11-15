(() => {
  "use strict";

  const config = window.REVIEWS_CONFIG || {};
  const root = (config.supabaseUrl || "").replace(/\/$/, "");
  const key = config.anonKey || "";
  const table = config.table || "portfolio_reviews";
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(root)
    && key.length > 20
    && !/YOUR_|REPLACE_/i.test(key + root);

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
  const endpoint = `${root}/rest/v1/${encodeURIComponent(table)}`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };

  function starString(rating) {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
  }

  function createDock() {
    if ($("#review-rating-dock")) return;
    const dock = document.createElement("a");
    dock.id = "review-rating-dock";
    dock.className = "review-rating-dock";
    dock.href = document.querySelector("#reviews") ? "#reviews" : "./index.html#reviews";
    dock.setAttribute("aria-label", "See client reviews and leave a review");
    dock.innerHTML = `
      <span class="dock-stars" aria-hidden="true">★★★★★</span>
      <span class="dock-rating-copy"><strong id="dock-rating-value">—</strong><small id="dock-rating-count">No ratings yet</small></span>
      <span class="dock-arrow" aria-hidden="true">↗</span>`;
    document.body.append(dock);
  }

  function setSummary(reviews) {
    const count = reviews.length;
    const average = count ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / count : 0;
    const averageText = count ? average.toFixed(1) : "—";
    const countText = count === 1 ? "1 approved review" : `${count} approved reviews`;

    const avgNode = $("#rating-average");
    const countNode = $("#rating-count");
    const starsNode = $("#rating-stars");
    const dockValue = $("#dock-rating-value");
    const dockCount = $("#dock-rating-count");
    const dockStars = $("#review-rating-dock .dock-stars");

    if (avgNode) avgNode.textContent = averageText;
    if (countNode) countNode.textContent = count ? countText : "No approved reviews yet";
    if (starsNode) {
      starsNode.textContent = count ? starString(average) : "☆☆☆☆☆";
      starsNode.setAttribute("aria-label", count ? `${average.toFixed(1)} out of 5 stars` : "No ratings yet");
    }
    if (dockValue) dockValue.textContent = count ? `${averageText} / 5` : "— / 5";
    if (dockCount) dockCount.textContent = count ? countText : "Be the first to review";
    if (dockStars) dockStars.textContent = count ? starString(average) : "☆☆☆☆☆";
  }

  function renderReviews(reviews) {
    const list = $("#reviews-list");
    if (!list) return;
    if (!reviews.length) {
      list.innerHTML = `
        <div class="reviews-empty">
          <span class="reviews-empty-mark" aria-hidden="true">✳</span>
          <div><strong>No published reviews yet.</strong><p>Completed projects deserve honest feedback. Be the first to share yours.</p></div>
        </div>`;
      return;
    }

    list.innerHTML = reviews.slice(0, Number(config.publicLimit) || 8).map((review) => {
      const date = review.created_at ? new Date(review.created_at) : null;
      const dateText = date && !Number.isNaN(date.valueOf())
        ? new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(date)
        : "";
      const project = review.project ? `<span class="review-project">${escapeHTML(review.project)}</span>` : "";
      return `
        <article class="review-card">
          <div class="review-card-top">
            <span class="review-stars" aria-label="${Number(review.rating)} out of 5 stars">${starString(review.rating)}</span>
            <time>${escapeHTML(dateText)}</time>
          </div>
          <p class="review-message">“${escapeHTML(review.message)}”</p>
          <div class="review-author"><span class="review-avatar" aria-hidden="true">${escapeHTML((review.name || "?").trim().charAt(0).toUpperCase())}</span><span><strong>${escapeHTML(review.name)}</strong>${project}</span></div>
        </article>`;
    }).join("");
  }

  async function loadReviews() {
    const list = $("#reviews-list");
    if (!configured) {
      if (list) list.innerHTML = `<div class="reviews-setup-note"><strong>Review feed not connected yet.</strong><p>Add your Supabase URL and anon key in <code>reviews-config.js</code>, then run <code>reviews-schema.sql</code>.</p></div>`;
      setSummary([]);
      const dockCount = $("#dock-rating-count");
      if (dockCount) dockCount.textContent = "Review setup pending";
      return;
    }

    try {
      const limit = Math.max(1, Math.min(Number(config.statsLimit) || 5000, 5000));
      const response = await fetch(`${endpoint}?select=id,name,project,rating,message,created_at&status=eq.approved&order=created_at.desc&limit=${limit}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Review service returned ${response.status}`);
      const reviews = await response.json();
      setSummary(reviews);
      renderReviews(reviews);
    } catch (error) {
      if (list) list.innerHTML = `<div class="reviews-setup-note"><strong>Reviews could not be loaded.</strong><p>Check the Supabase URL, anon key, table name, and Row Level Security policies.</p></div>`;
      setSummary([]);
      console.error("Kyzbac reviews:", error);
    }
  }

  function setupRatingPicker() {
    const picker = $("#review-star-picker");
    const hidden = $("#review-rating");
    if (!picker || !hidden) return;
    const buttons = [...picker.querySelectorAll("[data-rating]")];
    const update = (value) => {
      hidden.value = value;
      buttons.forEach((button) => {
        const active = Number(button.dataset.rating) <= value;
        button.classList.toggle("is-selected", active);
        button.setAttribute("aria-pressed", String(Number(button.dataset.rating) === value));
      });
    };
    buttons.forEach((button) => button.addEventListener("click", () => update(Number(button.dataset.rating))));
    picker.addEventListener("keydown", (event) => {
      if (!buttons.includes(document.activeElement) || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const current = Number(hidden.value) || 0;
      const next = Math.max(1, Math.min(5, current + (event.key === "ArrowRight" ? 1 : -1)));
      update(next);
      buttons.find((button) => Number(button.dataset.rating) === next)?.focus();
    });
  }

  function setupForm() {
    const form = $("#review-form");
    if (!form) return;
    const status = $("#review-form-status");
    const submit = form.querySelector('[type="submit"]');
    const rating = $("#review-rating", form);

    if (!configured) {
      submit.disabled = true;
      if (status) status.textContent = "Review submissions will be enabled after the review backend is configured.";
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (status) status.textContent = "";

      // A hidden honeypot helps discard basic automated form spam.
      if (form.elements.website?.value) return;
      if (!rating.value) {
        if (status) status.textContent = "Please select a star rating.";
        return;
      }
      if (!form.reportValidity()) return;

      const payload = {
        name: form.elements.name.value.trim(),
        project: form.elements.project.value.trim(),
        rating: Number(rating.value),
        message: form.elements.message.value.trim(),
        status: "pending"
      };

      submit.disabled = true;
      submit.classList.add("is-loading");
      if (status) status.textContent = "Sending your review…";
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || `Review service returned ${response.status}`);
        }
        form.reset();
        rating.value = "";
        form.querySelectorAll("#review-star-picker [data-rating]").forEach((button) => {
          button.classList.remove("is-selected");
          button.setAttribute("aria-pressed", "false");
        });
        if (status) status.textContent = "Thank you. Your review was received and will appear after moderation.";
      } catch (error) {
        if (status) status.textContent = "Your review could not be sent. Please try again in a moment.";
        console.error("Kyzbac review submission:", error);
      } finally {
        submit.disabled = false;
        submit.classList.remove("is-loading");
      }
    });
  }

  function setupMotion() {
    const progress = document.createElement("div");
    progress.className = "site-scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.append(progress);
    let scheduled = false;
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      progress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      scheduled = false;
    };
    window.addEventListener("scroll", () => {
      if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();

    const reveals = document.querySelectorAll(".review-reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) {
      reveals.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    reveals.forEach((element) => observer.observe(element));
  }

  createDock();
  setupRatingPicker();
  setupForm();
  setupMotion();
  loadReviews();
})();
