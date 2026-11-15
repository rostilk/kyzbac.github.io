(() => {
  "use strict";
  const config = window.PRICING_CONFIG || { packages: [] };
  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
  const list = document.querySelector("#pricing-grid");

  if (list) {
    list.innerHTML = (Array.isArray(config.packages) ? config.packages : []).map((item) => `
      <article class="price-card ${item.featured ? "is-featured" : ""}">
        <div class="price-card-top"><span>${escapeHTML(item.number)} / SERVICE</span>${item.featured ? '<span class="price-recommended">MOST REQUESTED</span>' : ""}</div>
        <h2>${escapeHTML(item.name)}</h2>
        <p class="price-summary">${escapeHTML(item.summary)}</p>
        <div class="price-amount">${escapeHTML(item.price || "Custom quote")}</div>
        <p class="price-details">${escapeHTML(item.details)}</p>
        <div class="price-includes-label">TYPICALLY INCLUDES</div>
        <ul>${(item.includes || []).map((entry) => `<li><span aria-hidden="true">↗</span>${escapeHTML(entry)}</li>`).join("")}</ul>
        <a class="button ${item.featured ? "button-primary" : "price-outline-button"}" href="#pricing-contact" data-package="${escapeHTML(item.name)}">Discuss this service <span aria-hidden="true">↗</span></a>
      </article>`).join("");
  }

  const siteConfig = window.SITE_CONFIG || {};
  const discord = (siteConfig.socials || []).find((item) => item && String(item.label).toLowerCase() === "discord" && /^https:\/\//i.test(item.url || ""));
  const contact = document.querySelector("#pricing-contact-link");
  if (contact) {
    if (discord) {
      contact.href = discord.url;
      contact.target = "_blank";
      contact.rel = "noopener noreferrer";
    } else if (siteConfig.email && !String(siteConfig.email).includes("YOUR_")) {
      contact.href = `mailto:${siteConfig.email}`;
    }
  }

  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");
  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const open = menuToggle.getAttribute("aria-expanded") !== "true";
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
      nav.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    }));
  }

  const year = document.querySelector("#current-year");
  if (year) year.textContent = new Date().getFullYear();
})();
