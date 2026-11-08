(() => {
  "use strict";

  const projects = Array.isArray(window.PORTFOLIO_PROJECTS) ? window.PORTFOLIO_PROJECTS : [];
  const config = window.SITE_CONFIG || {};
  const grid = document.querySelector("#project-grid");
  const modal = document.querySelector("#project-modal");
  const modalMedia = document.querySelector("#modal-media");
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");
  let lastFocusedElement = null;

  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);

  const isConfiguredUrl = (value) => typeof value === "string" && value.trim() !== "" && !value.includes("YOUR_") && !value.includes("REPLACE_");

  function getStreamableEmbed(url) {
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed) && /streamable\.com\/e\//i.test(trimmed)) return trimmed;
    try {
      const parsed = new URL(trimmed);
      if (!/(^|\.)streamable\.com$/i.test(parsed.hostname)) return null;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const videoId = parts[0] === "e" ? parts[1] : parts[0];
      if (!videoId) return null;
      return `https://streamable.com/e/${encodeURIComponent(videoId)}?autoplay=1&muted=1`;
    } catch {
      return null;
    }
  }

  function previewConfigured(project) {
    return project.preview && isConfiguredUrl(project.preview.url);
  }

  function renderPreview(project) {
    if (!previewConfigured(project)) {
      return `<div class="media-placeholder">
        <div class="placeholder-corner placeholder-corner-tl"></div><div class="placeholder-corner placeholder-corner-br"></div>
        <span class="placeholder-index">MEDIA SLOT / ${escapeHTML(project.number || "00")}</span>
        <span class="placeholder-symbol">${escapeHTML(project.number || "↗")}</span>
        <span class="placeholder-bottom"><b>PREVIEW TEMPLATE</b><small>ADD LINK IN PROJECTS.JS</small></span>
      </div>`;
    }

    if (project.preview.type === "image") {
      return `<img class="project-image" src="${escapeHTML(project.preview.url)}" alt="${escapeHTML(project.title)} preview" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'), { className: 'image-error', textContent: 'Image unavailable — check the preview URL in projects.js.' }))">`;
    }

    return `<div class="video-cover"><span class="video-cover-index">VIDEO PREVIEW / ${escapeHTML(project.number || "00")}</span><span class="play-button" aria-hidden="true">▶</span><span class="video-cover-label">PLAY PROJECT</span><span class="video-cover-lines" aria-hidden="true"></span></div>`;
  }

  function renderProject(project, index) {
    const categoryLabel = { gameplay: "GAMEPLAY", systems: "SYSTEMS", tools: "TOOLS" }[project.category] || "PROJECT";
    const tags = (project.tags || []).slice(0, 4).map((tag) => `<span>${escapeHTML(tag)}</span>`).join("");
    const configured = previewConfigured(project);
    const previewLabel = configured ? (project.preview.type === "image" ? "VIEW IMAGE" : "PLAY PREVIEW") : "ADD PREVIEW";
    return `<article class="project-card ${project.featured ? "project-card-featured" : ""} reveal" data-category="${escapeHTML(project.category || "systems")}" style="--card-index:${index}">
      <button class="project-open" type="button" data-project-id="${escapeHTML(project.id)}" aria-label="Open ${escapeHTML(project.title)} project details">
        <div class="project-media ${configured && project.preview.type === "image" ? "has-image" : ""}">
          ${renderPreview(project)}
          <span class="media-open-label">${previewLabel} <b>↗</b></span>
        </div>
        <div class="project-info">
          <div class="project-kicker"><span>${escapeHTML(project.number || String(index + 1).padStart(2, "0"))} / ${categoryLabel}</span><span class="project-arrow">↗</span></div>
          <h3>${escapeHTML(project.title)}</h3>
          <p class="project-subtitle">${escapeHTML(project.subtitle || "")}</p>
          <p class="project-description">${escapeHTML(project.description || "")}</p>
          <div class="project-tags">${tags}</div>
        </div>
      </button>
    </article>`;
  }

  function renderProjects(filter = "all") {
    if (!grid) return;
    const visible = projects.filter((project) => filter === "all" || project.category === filter);
    grid.innerHTML = visible.length
      ? visible.map(renderProject).join("")
      : `<div class="empty-state">No projects in this category yet.</div>`;
    observeReveals(grid);
    grid.querySelectorAll("[data-project-id]").forEach((button) => {
      button.addEventListener("click", () => openProject(button.dataset.projectId));
    });
  }

  function openProject(id) {
    const project = projects.find((item) => item.id === id);
    if (!project || !modal) return;
    lastFocusedElement = document.activeElement;
    document.querySelector("#modal-title").textContent = project.title;
    document.querySelector("#modal-category").textContent = `${project.category || "PROJECT"} / ${project.subtitle || "PREVIEW"}`.toUpperCase();
    document.querySelector("#modal-description").textContent = project.description || "";
    document.querySelector("#modal-role").textContent = project.contribution || "";
    document.querySelector("#modal-tags").innerHTML = (project.tags || []).map((tag) => `<span>${escapeHTML(tag)}</span>`).join("");

    modalMedia.innerHTML = "";
    if (!previewConfigured(project)) {
      modalMedia.innerHTML = `<div class="modal-empty"><span class="modal-empty-mark">${escapeHTML(project.number || "00")}</span><span class="eyebrow">PREVIEW NOT CONNECTED</span><p>Open <code>projects.js</code> and paste a Streamable URL or direct PNG/JPG/WEBP link into this project's <code>preview.url</code> field.</p></div>`;
    } else if (project.preview.type === "image") {
      const image = document.createElement("img");
      image.src = project.preview.url;
      image.alt = `${project.title} preview`;
      image.className = "modal-image";
      image.onerror = () => { modalMedia.innerHTML = `<div class="modal-empty"><span class="eyebrow">IMAGE COULD NOT LOAD</span><p>Check that the image URL is public and points directly to an image file.</p></div>`; };
      modalMedia.append(image);
    } else {
      const embedUrl = getStreamableEmbed(project.preview.url);
      if (embedUrl) {
        const frame = document.createElement("iframe");
        frame.src = embedUrl;
        frame.title = `${project.title} video preview`;
        frame.allow = "autoplay; fullscreen; picture-in-picture";
        frame.allowFullscreen = true;
        frame.loading = "eager";
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        modalMedia.append(frame);
      } else {
        modalMedia.innerHTML = `<div class="modal-empty"><span class="eyebrow">INVALID STREAMABLE LINK</span><p>Paste a normal Streamable share URL or an embed URL beginning with <code>https://streamable.com/e/</code>.</p></div>`;
      }
    }

    const external = document.querySelector("#modal-link");
    if (isConfiguredUrl(project.projectUrl)) {
      external.href = project.projectUrl;
      external.hidden = false;
    } else {
      external.hidden = true;
      external.removeAttribute("href");
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    modal.querySelector(".modal-close").focus();
  }

  function closeProject() {
    if (!modal || !modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    modalMedia.innerHTML = ""; // Stop video playback when the modal closes.
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
  }

  function observeReveals(root = document) {
    const elements = root.querySelectorAll(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    elements.forEach((element) => observer.observe(element));
  }

  function setupFilters() {
    const buttons = document.querySelectorAll(".filter-button");
    const counts = { all: projects.length, gameplay: 0, systems: 0, tools: 0 };
    projects.forEach((project) => { if (Object.hasOwn(counts, project.category)) counts[project.category] += 1; });
    buttons.forEach((button) => {
      const count = button.querySelector("span");
      if (count) count.textContent = String(counts[button.dataset.filter] ?? 0).padStart(2, "0");
      button.addEventListener("click", () => {
        buttons.forEach((item) => item.classList.toggle("is-active", item === button));
        renderProjects(button.dataset.filter);
      });
    });
  }

  function setupContact() {
    const emailLink = document.querySelector("#email-link");
    const socialLinks = document.querySelector("#social-links");

    const discord = config.socials?.find(
        (item) => item.label.toLowerCase() === "discord" && isConfiguredUrl(item.url)
    );

    if (emailLink && discord) {
        emailLink.href = discord.url;
        emailLink.target = "_blank";
        emailLink.rel = "noopener noreferrer";
    }

    if (socialLinks) {
        socialLinks.innerHTML = (Array.isArray(config.socials) ? config.socials : [])
            .filter((item) => item && isConfiguredUrl(item.url))
            .map((item) =>
                `<a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.label)} <span aria-hidden="true">↗</span></a>`
            ).join("");
    }
}

  function setupNavigation() {
    if (!menuToggle || !nav) return;
    menuToggle.addEventListener("click", () => {
      const expanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!expanded));
      menuToggle.setAttribute("aria-label", expanded ? "Open navigation" : "Close navigation");
      nav.classList.toggle("is-open", !expanded);
      document.body.classList.toggle("nav-open", !expanded);
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
      nav.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    }));
  }

  function setupModal() {
    modal?.querySelectorAll("[data-close-modal]").forEach((element) => element.addEventListener("click", closeProject));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeProject();
        if (nav?.classList.contains("is-open")) {
          nav.classList.remove("is-open");
          document.body.classList.remove("nav-open");
          menuToggle?.setAttribute("aria-expanded", "false");
        }
      }
      if (event.key === "Tab" && modal?.classList.contains("is-open")) {
        const focusable = [...modal.querySelectorAll('button:not([disabled]), a[href], iframe')].filter((element) => element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  document.querySelector("#current-year").textContent = new Date().getFullYear();
  renderProjects();
  setupFilters();
  setupContact();
  setupNavigation();
  setupModal();
  observeReveals();
})();
