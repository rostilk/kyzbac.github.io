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

  let authClient = null;
  let currentSession = null;
  let currentDiscordProfile = null;

  function starString(rating) {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
  }

  function createDock() {
    if ($("#review-rating-dock")) return;
    const dock = document.createElement("a");
    dock.id = "review-rating-dock";
    dock.className = "review-rating-dock";
    dock.href = $("#reviews") ? "#reviews" : "./index.html#reviews";
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

  function safeDiscordAvatar(value) {
    if (typeof value !== "string" || !value) return "";
    try {
      const url = new URL(value);
      const allowedPath = url.pathname.startsWith("/avatars/") || url.pathname.startsWith("/embed/avatars/");
      return url.protocol === "https:" && url.hostname === "cdn.discordapp.com" && allowedPath ? url.href : "";
    } catch {
      return "";
    }
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
      const displayName = review.discord_global_name || review.discord_username || review.name || "Discord user";
      const username = review.discord_username ? `@${review.discord_username}` : "";
      const project = review.project ? `<span class="review-project">${escapeHTML(review.project)}</span>` : "";
      // Prefer the verified Discord avatar hash over a cached/default URL.
      // This also repairs older rows whose URL was saved as Discord's default avatar.
      const discordId = String(review.discord_user_id || "");
      const avatarHash = String(review.discord_avatar_hash || "");
      const hashedAvatarUrl = /^\\d{15,22}$/.test(discordId) && /^[a-zA-Z0-9_]{1,128}$/.test(avatarHash)
        ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(discordId)}/${encodeURIComponent(avatarHash)}.${avatarHash.startsWith("a_") ? "gif" : "png"}?size=128`
        : "";
      const avatarUrl = hashedAvatarUrl || safeDiscordAvatar(review.discord_avatar_url);
      const avatar = avatarUrl
        ? `<img class="review-avatar-image" src="${escapeHTML(avatarUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
        : `<span class="review-avatar" aria-hidden="true">${escapeHTML(displayName.trim().charAt(0).toUpperCase() || "?")}</span>`;

      return `
        <article class="review-card">
          <div class="review-card-top">
            <span class="review-stars" aria-label="${Number(review.rating)} out of 5 stars">${starString(review.rating)}</span>
            <time>${escapeHTML(dateText)}</time>
          </div>
          <p class="review-message">“${escapeHTML(review.message)}”</p>
          <div class="review-author">
            ${avatar}
            <span class="review-author-copy">
              <strong>${escapeHTML(displayName)}</strong>
              ${username ? `<small class="review-discord-handle">${escapeHTML(username)} · Discord</small>` : `<small class="review-discord-handle">Discord account</small>`}
              ${project}
            </span>
            <span class="review-discord-check" aria-label="Discord identity verified" title="Discord identity verified">✓</span>
          </div>
        </article>`;
    }).join("");
  }

  async function loadReviews() {
    const list = $("#reviews-list");
    if (!configured) {
      if (list) list.innerHTML = `<div class="reviews-setup-note"><strong>Review feed not connected yet.</strong><p>Add your Supabase URL and publishable/anon key in <code>reviews-config.js</code>, then run the review SQL setup.</p></div>`;
      setSummary([]);
      const dockCount = $("#dock-rating-count");
      if (dockCount) dockCount.textContent = "Review setup pending";
      return;
    }

    try {
      const limit = Math.max(1, Math.min(Number(config.statsLimit) || 5000, 5000));
      const select = "id,name,project,rating,message,created_at,discord_user_id,discord_username,discord_global_name,discord_avatar_hash,discord_avatar_url";
      const response = await fetch(`${endpoint}?select=${select}&status=eq.approved&order=created_at.desc&limit=${limit}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Review service returned ${response.status}`);
      const reviews = await response.json();
      setSummary(reviews);
      renderReviews(reviews);
    } catch (error) {
      if (list) list.innerHTML = `<div class="reviews-setup-note"><strong>Reviews could not be loaded.</strong><p>Check the Supabase URL, public key, table columns, and Row Level Security policies.</p></div>`;
      setSummary([]);
      console.error("Kyzbac reviews:", error);
    }
  }

  function buildDiscordAvatar(profile) {
    const directUrl = safeDiscordAvatar(profile.avatarUrl || profile.avatar_url || profile.picture || "");
    if (directUrl) return directUrl;

    const avatarHash = String(profile.avatar || profile.avatar_hash || "");
    if (avatarHash && /^\d{15,22}$/.test(String(profile.id))) {
      const extension = avatarHash.startsWith("a_") ? "gif" : "png";
      return "https://cdn.discordapp.com/avatars/" + encodeURIComponent(profile.id) + "/" + encodeURIComponent(avatarHash) + "." + extension + "?size=128";
    }

    try {
      const defaultIndex = Number((BigInt(profile.id) >> 22n) % 6n);
      return "https://cdn.discordapp.com/embed/avatars/" + defaultIndex + ".png";
    } catch {
      return "https://cdn.discordapp.com/embed/avatars/0.png";
    }
  }

  function extractDiscordProfile(user, extraIdentities = []) {
    if (!user) return null;

    const identities = [
      ...(Array.isArray(user.identities) ? user.identities : []),
      ...(Array.isArray(extraIdentities) ? extraIdentities : [])
    ];
    const identity = identities.find((item) => item?.provider === "discord") || null;
    const providers = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [];
    const isDiscordUser = Boolean(
      identity || user.app_metadata?.provider === "discord" || providers.includes("discord")
    );
    if (!isDiscordUser) return null;

    // Supabase can expose provider fields on identity_data or user_metadata.
    const data = { ...(user.user_metadata || {}), ...(identity?.identity_data || {}) };
    const id = String(
      identity?.provider_id || data.provider_id || data.id || data.sub || data.user_id || ""
    );
    if (!/^\d{15,22}$/.test(id)) return null;

    const username = String(
      data.username || data.preferred_username || data.user_name || ("discord-" + id.slice(-6))
    );
    const globalName = String(
      data.global_name || data.globalName || data.display_name || data.name || data.full_name || ""
    );
    const avatar = typeof data.avatar === "string"
      ? data.avatar
      : typeof data.avatar_hash === "string" ? data.avatar_hash : "";
    const avatarUrl = typeof data.avatar_url === "string"
      ? data.avatar_url
      : typeof data.picture === "string" ? data.picture : "";

    return {
      id,
      username,
      displayName: globalName || username,
      avatar,
      avatarUrl: buildDiscordAvatar({ id, avatar, avatarUrl })
    };
  }

  function setProfileUI(profile) {
    const gate = $("#review-discord-gate");
    const profilePanel = $("#review-discord-profile");
    const fields = $("#review-form-fields");
    const loginButton = $("#review-discord-login");
    const logoutButton = $("#review-discord-logout");
    const status = $("#review-form-status");
    const avatar = $("#review-discord-avatar");
    const name = $("#review-discord-name");
    const username = $("#review-discord-username");
    const id = $("#review-discord-id");

    if (!gate || !fields) return;
    currentDiscordProfile = profile;
    fields.disabled = !profile;
    fields.hidden = !profile;
    if (loginButton) loginButton.hidden = Boolean(profile);
    if (logoutButton) logoutButton.hidden = !profile;
    if (profilePanel) profilePanel.hidden = !profile;

    if (profile) {
      if (avatar) {
        avatar.src = profile.avatarUrl;
        avatar.alt = profile.displayName + " Discord avatar";
      }
      if (name) name.textContent = profile.displayName;
      if (username) username.textContent = "@" + profile.username;
      if (id) id.textContent = "DISCORD ID · " + profile.id;
      if (status) status.textContent = "Discord connected. Your verified display name and avatar will be attached to the review.";
    } else {
      if (avatar) avatar.removeAttribute("src");
      if (status) status.textContent = "Connect Discord to unlock the review form. Your Discord ID, display name, and avatar are attached automatically.";
    }
  }

  function clearOAuthCallbackParameters() {
    const url = new URL(window.location.href);
    ["code", "error", "error_description", "error_code", "state"].forEach((key) => {
      url.searchParams.delete(key);
    });
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  }

  async function refreshDiscordSession() {
    if (!authClient) {
      setProfileUI(null);
      const status = $("#review-form-status");
      if (status) status.textContent = "Discord sign-in is unavailable until Supabase and its Discord provider are configured.";
      return null;
    }

    try {
      const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
      if (sessionError) throw sessionError;
      currentSession = sessionData.session || null;
      if (!currentSession) {
        setProfileUI(null);
        return null;
      }

      let user = currentSession.user;
      const { data: userData, error: userError } = await authClient.auth.getUser(currentSession.access_token);
      if (!userError && userData?.user) user = userData.user;

      let identities = Array.isArray(user?.identities) ? user.identities : [];
      if (!identities.some((identity) => identity?.provider === "discord")
        && typeof authClient.auth.getUserIdentities === "function") {
        const { data: identityData, error: identityError } = await authClient.auth.getUserIdentities();
        if (!identityError && Array.isArray(identityData?.identities)) {
          identities = identityData.identities;
        }
      }

      const profile = extractDiscordProfile(user, identities);
      setProfileUI(profile);
      if (!profile) {
        const status = $("#review-form-status");
        if (status) status.textContent = "Supabase has a session, but the Discord profile was not returned. Check that Discord is listed under Authentication → Users → your user → Identities, then try signing in again.";
      }
      return profile;
    } catch (error) {
      currentSession = null;
      setProfileUI(null);
      const status = $("#review-form-status");
      if (status) status.textContent = "Could not restore your Discord session. Please try connecting again.";
      console.error("Kyzbac Discord session:", error);
      return null;
    }
  }

  function setupDiscordAuth() {
    const form = $("#review-form");
    if (!form) return;
    const status = $("#review-form-status");
    const loginButton = $("#review-discord-login");
    const logoutButton = $("#review-discord-logout");

    if (!configured || !window.supabase?.createClient) {
      setProfileUI(null);
      const submit = form.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      if (status) status.textContent = !configured
        ? "Review submissions will be enabled after Supabase is configured."
        : "Supabase Auth could not load. Check the browser connection to the Supabase CDN.";
      return;
    }

    // Exchange the OAuth PKCE callback explicitly before checking the session.
    authClient = window.supabase.createClient(root, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce"
      }
    });

    authClient.auth.onAuthStateChange((_event, session) => {
      currentSession = session || null;
      if (!session) {
        setProfileUI(null);
        return;
      }
      const provisionalProfile = extractDiscordProfile(session.user);
      if (provisionalProfile) setProfileUI(provisionalProfile);
      // Do not await Supabase API calls inside onAuthStateChange.
      window.setTimeout(() => { void refreshDiscordSession(); }, 0);
    });

    async function completeOAuthCallback() {
      const callbackUrl = new URL(window.location.href);
      const code = callbackUrl.searchParams.get("code");
      const callbackError = callbackUrl.searchParams.get("error_description")
        || callbackUrl.searchParams.get("error");

      if (callbackError) {
        clearOAuthCallbackParameters();
        if (status) status.textContent = "Discord authorization failed: " + callbackError;
        return;
      }

      if (code) {
        if (loginButton) loginButton.disabled = true;
        if (status) status.textContent = "Finishing Discord sign-in…";
        try {
          const { data, error } = await authClient.auth.exchangeCodeForSession(code);
          if (error) throw error;
          currentSession = data.session || null;
          clearOAuthCallbackParameters();
          const profile = await refreshDiscordSession();
          if (loginButton) loginButton.disabled = false;
          if (!profile && status) {
            status.textContent = "Discord authorization completed, but Supabase did not return a Discord identity. Check Authentication → Users → Identities in Supabase.";
          }
        } catch (error) {
          clearOAuthCallbackParameters();
          if (status) status.textContent = "Discord sign-in could not be completed: " + (error.message || "OAuth callback error") + ". Try connecting again.";
          console.error("Kyzbac Discord callback:", error);
          if (loginButton) loginButton.disabled = false;
        }
        return;
      }

      if (loginButton) loginButton.disabled = false;
      await refreshDiscordSession();
    }

    loginButton?.addEventListener("click", async () => {
      loginButton.disabled = true;
      if (status) status.textContent = "Opening Discord authorization…";
      try {
        const redirectUrl = new URL(window.location.pathname, window.location.origin);
        redirectUrl.hash = "reviews";
        const { error } = await authClient.auth.signInWithOAuth({
          provider: "discord",
          options: {
            scopes: "identify",
            redirectTo: redirectUrl.href
          }
        });
        if (error) throw error;
      } catch (error) {
        if (status) status.textContent = "Discord sign-in could not start: " + (error.message || "provider configuration error") + ".";
        console.error("Kyzbac Discord sign-in:", error);
        loginButton.disabled = false;
      }
    });

    logoutButton?.addEventListener("click", async () => {
      logoutButton.disabled = true;
      try {
        const { error } = await authClient.auth.signOut();
        if (error) throw error;
        currentSession = null;
        setProfileUI(null);
      } catch (error) {
        if (status) status.textContent = "Discord could not be disconnected. Please try again.";
        console.error("Kyzbac Discord sign-out:", error);
      } finally {
        logoutButton.disabled = false;
      }
    });

    void completeOAuthCallback();
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
    const fields = $("#review-form-fields", form);
    const rating = $("#review-rating", form);
    if (!configured || !authClient) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (status) status.textContent = "";
      if (form.elements.website?.value) return;
      if (!currentDiscordProfile || !fields || fields.disabled) {
        if (status) status.textContent = "Connect your Discord account before submitting a review.";
        return;
      }
      if (!rating?.value) {
        if (status) status.textContent = "Please select a star rating.";
        return;
      }
      if (!form.reportValidity()) return;

      const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        setProfileUI(null);
        if (status) status.textContent = "Your Discord session expired. Connect Discord again before submitting.";
        return;
      }
      currentSession = sessionData.session;

      // The SQL trigger reads the Discord identity from auth.identities. The browser
      // sends only the review content, never a client-supplied name or avatar.
      const payload = {
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
          headers: {
            ...headers,
            Authorization: `Bearer ${currentSession.access_token}`,
            Prefer: "return=minimal"
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || `Review service returned ${response.status}`);
        }
        form.reset();
        if (status) status.textContent = "Thank you. Your Discord-linked review was received and is waiting for approval.";
        if (fields) fields.disabled = false;
        if (fields) fields.hidden = false;
        pickerReset();
      } catch (error) {
        if (status) status.textContent = "Your review could not be sent. Check the Discord review migration and try again.";
        console.error("Kyzbac review submission:", error);
      } finally {
        submit.disabled = false;
        submit.classList.remove("is-loading");
      }
    });
  }

  function pickerReset() {
    const hidden = $("#review-rating");
    if (hidden) hidden.value = "";
    $("#review-star-picker")?.querySelectorAll("[data-rating]").forEach((button) => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
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
  setupDiscordAuth();
  setupRatingPicker();
  setupForm();
  setupMotion();
  loadReviews();
})();
