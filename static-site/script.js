const menuButton = document.querySelector(".menu-button");
const closeButton = document.querySelector(".close-button");
const mobileMenu = document.querySelector(".mobile-menu");
const mobileLinks = document.querySelectorAll(".mobile-menu a");
const portalBaseUrl = window.__PORTAL_BASE_URL__;

if (portalBaseUrl) {
  document.querySelectorAll("[data-portal-path]").forEach((link) => {
    const path = link.getAttribute("data-portal-path");
    if (path) {
      link.setAttribute("href", new URL(path, portalBaseUrl).toString());
    }
  });
}

function openMenu() {
  mobileMenu.hidden = false;
  menuButton.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function closeMenu() {
  mobileMenu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

menuButton?.addEventListener("click", openMenu);
closeButton?.addEventListener("click", closeMenu);
mobileLinks.forEach((link) => link.addEventListener("click", closeMenu));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileMenu.hidden) {
    closeMenu();
  }
});
