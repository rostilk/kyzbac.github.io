(() => {
  "use strict";

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!finePointer || reducedMotion) return;

  const body = document.body;
  body.classList.add("has-custom-cursor");

  const ring = document.createElement("span");
  ring.className = "site-cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  const dot = document.createElement("span");
  dot.className = "site-cursor-dot";
  dot.setAttribute("aria-hidden", "true");
  body.append(ring, dot);

  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let ringX = pointerX;
  let ringY = pointerY;
  let animationFrame = 0;

  function drawCursor() {
    const deltaX = pointerX - ringX;
    const deltaY = pointerY - ringY;
    if (Math.abs(deltaX) < 0.15 && Math.abs(deltaY) < 0.15) {
      ringX = pointerX;
      ringY = pointerY;
      animationFrame = 0;
    } else {
      ringX += deltaX * 0.2;
      ringY += deltaY * 0.2;
      animationFrame = window.requestAnimationFrame(drawCursor);
    }
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
  }

  window.addEventListener("pointermove", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    ring.classList.add("is-visible");
    dot.classList.add("is-visible");
    dot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
    if (!animationFrame) animationFrame = window.requestAnimationFrame(drawCursor);
  }, { passive: true });

  window.addEventListener("blur", () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    ring.classList.remove("is-visible", "is-hovering");
    dot.classList.remove("is-visible");
  });
  document.addEventListener("pointerover", (event) => {
    const target = event.target instanceof Element
      ? event.target.closest("a, button, [role='button'], .project-card, .stack-card, .price-card, .review-card")
      : null;
    ring.classList.toggle("is-hovering", Boolean(target));
  });
  document.addEventListener("pointerout", (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest("a, button, [role='button'], .project-card, .stack-card, .price-card, .review-card");
    if (target && (!event.relatedTarget || !target.contains(event.relatedTarget))) {
      ring.classList.remove("is-hovering");
    }
  });
  // The ring animation only schedules frames while the pointer is moving.

  // Small magnetic movement. The CSS `translate` property keeps the existing
  // hover transforms (for example, button lift) intact.
  const magneticTargets = document.querySelectorAll(".button, .header-cta, .filter-button, .text-link, .review-rating-dock");
  magneticTargets.forEach((element) => {
    element.classList.add("is-magnetic");
    element.addEventListener("pointermove", (event) => {
      const bounds = element.getBoundingClientRect();
      const dx = event.clientX - (bounds.left + bounds.width / 2);
      const dy = event.clientY - (bounds.top + bounds.height / 2);
      element.style.setProperty("--magnet-x", `${(dx * 0.11).toFixed(2)}px`);
      element.style.setProperty("--magnet-y", `${(dy * 0.11).toFixed(2)}px`);
    });
    element.addEventListener("pointerleave", () => {
      element.style.setProperty("--magnet-x", "0px");
      element.style.setProperty("--magnet-y", "0px");
    });
  });

  // Lightweight 3D card tilt + cursor-following light. Delegated listeners
  // continue to work when the project filter re-renders its cards.
  let activeCard = null;
  function resetCard(card) {
    if (!card) return;
    card.classList.remove("is-tilting");
    card.style.removeProperty("--tilt-x");
    card.style.removeProperty("--tilt-y");
    card.style.removeProperty("--spot-x");
    card.style.removeProperty("--spot-y");
    if (activeCard === card) activeCard = null;
  }

  document.addEventListener("pointermove", (event) => {
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest(".project-card, .stack-card, .price-card, .review-card");
    if (!card) {
      resetCard(activeCard);
      return;
    }
    if (activeCard && activeCard !== card) resetCard(activeCard);
    activeCard = card;
    const bounds = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    card.style.setProperty("--tilt-x", `${((0.5 - y) * 5).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${((x - 0.5) * 6).toFixed(2)}deg`);
    card.style.setProperty("--spot-x", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--spot-y", `${(y * 100).toFixed(1)}%`);
    card.classList.add("is-tilting");
  }, { passive: true });

  document.addEventListener("pointerout", (event) => {
    if (!activeCard || !(event.target instanceof Element)) return;
    if (activeCard.contains(event.target) && (!event.relatedTarget || !activeCard.contains(event.relatedTarget))) {
      resetCard(activeCard);
    }
  });

  window.addEventListener("pagehide", () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    resetCard(activeCard);
  }, { once: true });
})();
