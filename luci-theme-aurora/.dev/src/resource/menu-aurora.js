"use strict";
"require baseclass";
"require ui";

// Constants for DOM selectors and CSS classes
const SELECTORS = {
  MOBILE_MENU_BTN: "#mobile-menu-btn",
  MOBILE_MENU_OVERLAY: "#mobile-menu-overlay",
  MOBILE_NAV_CLOSE: "#mobile-nav-close",
  MOBILE_NAV_LIST: "#mobile-nav-list",
  MOBILE_NAV_ITEM: ".mobile-nav-item",
  MOBILE_NAV_LINK: ".mobile-nav-link",
  MOBILE_NAV_SUBMENU: ".mobile-nav-submenu",
  SUBMENU_EXPANDED: ".mobile-nav-item.submenu-expanded",
  TABMENU: "#tabmenu",
  TOPMENU: "#topmenu",
  MODEMENU: "#modemenu",
  DESKTOP_MENU_OVERLAY: ".desktop-menu-overlay",
  DESKTOP_NAV: ".desktop-nav",
  HEADER: "header",
};

const CLASSES = {
  MOBILE_MENU_OPEN: "mobile-menu-open",
  ACTIVE: "active",
  SUBMENU_EXPANDED: "submenu-expanded",
  HAS_DESKTOP_NAV: "has-desktop-nav",
  TABS: "tabs",
  DESKTOP_NAV: "desktop-nav",
  DESKTOP_NAV_LIST: "desktop-nav-list",
};

return baseclass.extend({
  __init__() {
    ui.menu.load().then(L.bind(this.render, this));
    this.initMobileMenu();
  },

  // Get DOM element by selector with optional parent
  getElement(selector, parent = document) {
    return parent.querySelector(selector);
  },

  // Get all DOM elements by selector
  getElements(selector, parent = document) {
    return parent.querySelectorAll(selector);
  },

  // Check if mobile menu is open
  isMobileMenuOpen() {
    const overlay = this.getElement(SELECTORS.MOBILE_MENU_OVERLAY);
    return overlay?.classList.contains(CLASSES.MOBILE_MENU_OPEN);
  },

  // Setup mobile menu toggle handler
  setupMobileMenuToggle(menuToggle, overlay) {
    menuToggle.addEventListener("click", L.bind(function (e) {
      e.stopPropagation();
      this.isMobileMenuOpen() ? this.closeMobileMenu() : this.openMobileMenu();
    }, this));
  },

  // Setup mobile menu close button handler
  setupMobileMenuCloseBtn(closeBtn) {
    if (!closeBtn) return;

    closeBtn.addEventListener("click", L.bind(function (e) {
      e.stopPropagation();
      this.closeMobileMenu();
    }, this));
  },

  // Setup overlay click handler
  setupOverlayClickHandler(overlay) {
    overlay.addEventListener("click", L.bind(function (e) {
      if (e.target === overlay) this.closeMobileMenu();
    }, this));
  },

  // Setup escape key handler
  setupEscapeKeyHandler() {
    document.addEventListener("keydown", L.bind(function (e) {
      if (e.key === "Escape" && this.isMobileMenuOpen()) {
        this.closeMobileMenu();
      }
    }, this));
  },

  // Setup submenu click handler
  setupSubmenuClickHandler() {
    document.addEventListener("click", L.bind(function (e) {
      const mobileNavLink = e.target.closest(SELECTORS.MOBILE_NAV_LINK);
      if (!mobileNavLink) return;

      const parentItem = mobileNavLink.closest(SELECTORS.MOBILE_NAV_ITEM);
      const submenu = parentItem?.querySelector(SELECTORS.MOBILE_NAV_SUBMENU);

      if (submenu) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleMobileSubmenu(parentItem);
      }
    }, this));
  },

  initMobileMenu() {
    const menuToggle = this.getElement(SELECTORS.MOBILE_MENU_BTN);
    const overlay = this.getElement(SELECTORS.MOBILE_MENU_OVERLAY);
    const closeBtn = this.getElement(SELECTORS.MOBILE_NAV_CLOSE);

    if (!menuToggle || !overlay) return;

    this.setupMobileMenuToggle(menuToggle, overlay);
    this.setupMobileMenuCloseBtn(closeBtn);
    this.setupOverlayClickHandler(overlay);
    this.setupEscapeKeyHandler();
    this.setupSubmenuClickHandler();
  },

  // Set submenu visual state (expanded/collapsed)
  setSubmenuState(submenu, expanded) {
    submenu.style.maxHeight = expanded ? `${submenu.scrollHeight}px` : "0";
    submenu.style.opacity = expanded ? "1" : "0";
  },

  // Toggle body scroll lock
  setBodyScrollLock(locked) {
    document.body.style.overflow = locked ? "hidden" : "";
  },

  // Close all expanded submenus
  closeAllSubmenus(exceptItem = null) {
    const allItems = this.getElements(SELECTORS.SUBMENU_EXPANDED);

    allItems.forEach((item) => {
      if (item === exceptItem) return;

      item.classList.remove(CLASSES.SUBMENU_EXPANDED);
      const submenu = item.querySelector(SELECTORS.MOBILE_NAV_SUBMENU);
      if (submenu) this.setSubmenuState(submenu, false);
    });
  },

  openMobileMenu() {
    const overlay = this.getElement(SELECTORS.MOBILE_MENU_OVERLAY);
    const menuToggle = this.getElement(SELECTORS.MOBILE_MENU_BTN);

    overlay.classList.add(CLASSES.MOBILE_MENU_OPEN);
    menuToggle.classList.add(CLASSES.ACTIVE);
    menuToggle.setAttribute("aria-expanded", "true");
    this.setBodyScrollLock(true);
  },

  closeMobileMenu() {
    const overlay = this.getElement(SELECTORS.MOBILE_MENU_OVERLAY);
    const menuToggle = this.getElement(SELECTORS.MOBILE_MENU_BTN);

    overlay.classList.remove(CLASSES.MOBILE_MENU_OPEN);
    menuToggle.classList.remove(CLASSES.ACTIVE);
    menuToggle.setAttribute("aria-expanded", "false");

    this.closeAllSubmenus();
    this.setBodyScrollLock(false);
  },

  toggleMobileSubmenu(parentItem) {
    const submenu = parentItem.querySelector(SELECTORS.MOBILE_NAV_SUBMENU);
    const isExpanded = parentItem.classList.contains(CLASSES.SUBMENU_EXPANDED);

    // Close other expanded submenus
    this.closeAllSubmenus(parentItem);

    // Toggle current submenu
    parentItem.classList.toggle(CLASSES.SUBMENU_EXPANDED, !isExpanded);
    this.setSubmenuState(submenu, !isExpanded);
  },

  // Create mobile submenu element
  createMobileSubmenu(submenuItems, baseUrl, parentName) {
    const submenuUl = E("ul", {
      class: "mobile-nav-submenu",
      style: "max-height: 0; opacity: 0;",
    });

    submenuItems.forEach((item) => {
      const subitemLi = E("li", { class: "mobile-nav-subitem" }, [
        E("a", {
          class: "mobile-nav-sublink",
          href: L.url(baseUrl, parentName, item.name),
        }, [_(item.title)]),
      ]);
      submenuUl.appendChild(subitemLi);
    });

    return submenuUl;
  },

  // Create mobile menu item
  createMobileMenuItem(child, url) {
    const submenu = ui.menu.getChildren(child);
    const hasSubmenu = submenu.length > 0;
    const linkUrl = hasSubmenu ? "#" : L.url(url, child.name);

    const li = E("li", { class: "mobile-nav-item" });
    const mainLink = E("a", {
      class: "mobile-nav-link",
      href: linkUrl,
    }, [_(child.title)]);

    li.appendChild(mainLink);

    if (hasSubmenu) {
      const submenuUl = this.createMobileSubmenu(submenu, url, child.name);
      li.appendChild(submenuUl);
    }

    return li;
  },

  renderMobileMenu(tree, url) {
    const mobileNavList = this.getElement(SELECTORS.MOBILE_NAV_LIST);
    const children = ui.menu.getChildren(tree);

    if (!mobileNavList || !children.length) return;

    mobileNavList.innerHTML = "";

    children.forEach((child) => {
      const menuItem = this.createMobileMenuItem(child, url);
      mobileNavList.appendChild(menuItem);
    });
  },

  // Navigate to node in tree based on dispatch path
  navigateToNode(tree, maxDepth = 3) {
    let node = tree;
    let url = "";

    const pathLength = Math.min(L.env.dispatchpath.length, maxDepth);

    for (let i = 0; i < pathLength && node; i++) {
      const pathSegment = L.env.dispatchpath[i];
      node = node.children?.[pathSegment];
      url += (url ? "/" : "") + pathSegment;
    }

    return { node, url };
  },

  render(tree) {
    this.renderModeMenu(tree);

    if (L.env.dispatchpath.length >= 3) {
      const { node, url } = this.navigateToNode(tree);
      if (node) this.renderTabMenu(node, url);
    }
  },

  // Create tab menu item
  createTabMenuItem(child, url, level = 0) {
    const isActive = L.env.dispatchpath[3 + level] === child.name;
    const className = `tabmenu-item-${child.name}${isActive ? " active" : ""}`;

    return {
      element: E("li", { class: className }, [
        E("a", { href: L.url(url, child.name) }, [_(child.title)]),
      ]),
      isActive,
      child,
    };
  },

  renderTabMenu(tree, url, level = 0) {
    const container = this.getElement(SELECTORS.TABMENU);
    const ul = E("ul", { class: CLASSES.TABS });
    const children = ui.menu.getChildren(tree);
    let activeNode = null;

    children.forEach((child) => {
      const { element, isActive, child: childNode } = this.createTabMenuItem(child, url, level);
      ul.appendChild(element);
      if (isActive) activeNode = childNode;
    });

    if (!ul.children.length) return E([]);

    container.appendChild(ul);
    container.style.display = "";

    // Recursively render nested tab menus
    if (activeNode) {
      this.renderTabMenu(activeNode, `${url}/${activeNode.name}`, level + 1);
    }

    return ul;
  },

  // Create top-level menu item with desktop navigation
  createTopLevelMenuItem(child, url, menuId, level = 0) {
    const submenuChildren = ui.menu.getChildren(child);
    const hasSubmenu = submenuChildren.length > 0;

    const li = E("li", {
      class: hasSubmenu ? CLASSES.HAS_DESKTOP_NAV : "",
      "data-menu-id": menuId,
    }, [
      E("a", {
        class: "menu",
        href: hasSubmenu ? "#" : L.url(url, child.name),
      }, [_(child.title)]),
    ]);

    return { li, hasSubmenu, submenuChildren };
  },

  // Create desktop navigation content
  createDesktopNav(menuId, child, url, level) {
    return E("div", {
      class: CLASSES.DESKTOP_NAV,
      "data-menu-for": menuId,
    }, [
      this.renderMainMenu(child, `${url}/${child.name}`, level + 1),
    ]);
  },

  // Setup desktop navigation hover handler for a menu item
  setupDesktopNavHover(li, menuId) {
    li.addEventListener("mouseenter", L.bind(function (id) {
      return function () { this.showDesktopNav(id); };
    }(menuId), this));
  },

  // Render top-level menu items
  renderTopLevelMenu(children, ul, url, level) {
    const desktopMenuOverlay = this.getElement(SELECTORS.DESKTOP_MENU_OVERLAY);
    const header = this.getElement(SELECTORS.HEADER);

    if (desktopMenuOverlay) desktopMenuOverlay.innerHTML = "";

    children.forEach((child) => {
      const menuId = `menu-${child.name}`;
      const { li, hasSubmenu } = this.createTopLevelMenuItem(child, url, menuId, level);

      ul.appendChild(li);

      if (hasSubmenu && desktopMenuOverlay) {
        const desktopNav = this.createDesktopNav(menuId, child, url, level);
        desktopMenuOverlay.appendChild(desktopNav);
        this.setupDesktopNavHover(li, menuId);
      }
    });

    // Setup mouseleave handler with relatedTarget check
    if (header && desktopMenuOverlay) {
      header.addEventListener("mouseleave", L.bind(function(e) {
        // Check if mouse is moving to desktop-menu-overlay
        if (e.relatedTarget && (e.relatedTarget === desktopMenuOverlay || desktopMenuOverlay.contains(e.relatedTarget))) {
          return; // Don't hide
        }
        this.hideDesktopNav();
      }, this));

      desktopMenuOverlay.addEventListener("mouseleave", L.bind(function(e) {
        // Check if mouse is moving back to header
        if (e.relatedTarget && (e.relatedTarget === header || header.contains(e.relatedTarget))) {
          return; // Don't hide
        }
        this.hideDesktopNav();
      }, this));
    }
  },

  // Render submenu items
  renderSubmenuItems(children, ul, url) {
    children.forEach((child) => {
      ul.appendChild(
        E("li", {}, [
          E("a", { href: L.url(url, child.name) }, [_(child.title)]),
        ])
      );
    });
  },

  renderMainMenu(tree, url, level = 0) {
    const ul = level
      ? E("ul", { class: CLASSES.DESKTOP_NAV_LIST })
      : this.getElement(SELECTORS.TOPMENU);
    const children = ui.menu.getChildren(tree);

    if (!children.length || level > 1) return E([]);

    if (level === 0) {
      this.renderTopLevelMenu(children, ul, url, level);
    } else {
      this.renderSubmenuItems(children, ul, url);
    }

    ul.style.display = "";
    return ul;
  },

  // Toggle all desktop navigations active state
  toggleAllDesktopNavs(active) {
    const desktopMenuOverlay = this.getElement(SELECTORS.DESKTOP_MENU_OVERLAY);
    if (!desktopMenuOverlay) return;

    const allNavs = this.getElements(SELECTORS.DESKTOP_NAV, desktopMenuOverlay);
    allNavs.forEach((nav) => {
      nav.classList.toggle(CLASSES.ACTIVE, active);
    });

    desktopMenuOverlay.classList.toggle(CLASSES.ACTIVE, active);
  },

  showDesktopNav(menuId) {
    const desktopMenuOverlay = this.getElement(SELECTORS.DESKTOP_MENU_OVERLAY);
    const targetNav = this.getElement(`${SELECTORS.DESKTOP_NAV}[data-menu-for="${menuId}"]`);

    if (!desktopMenuOverlay || !targetNav) return;

    // Hide all navigations first
    const allNavs = this.getElements(SELECTORS.DESKTOP_NAV, desktopMenuOverlay);
    allNavs.forEach((nav) => nav.classList.remove(CLASSES.ACTIVE));

    // Show target navigation
    targetNav.classList.add(CLASSES.ACTIVE);
    desktopMenuOverlay.classList.add(CLASSES.ACTIVE);
  },

  hideDesktopNav() {
    this.toggleAllDesktopNavs(false);
  },

  // Check if mode menu item is active
  isModeMenuItemActive(child, index) {
    return L.env.requestpath.length
      ? child.name === L.env.requestpath[0]
      : index === 0;
  },

  // Create mode menu item
  createModeMenuItem(child, isActive) {
    return E("li", { class: isActive ? CLASSES.ACTIVE : "" }, [
      E("a", { href: L.url(child.name) }, [_(child.title)]),
    ]);
  },

  renderModeMenu(tree) {
    const ul = this.getElement(SELECTORS.MODEMENU);
    const children = ui.menu.getChildren(tree);
    let activeChild = null;

    children.forEach((child, index) => {
      const isActive = this.isModeMenuItemActive(child, index);
      const menuItem = this.createModeMenuItem(child, isActive);
      ul.appendChild(menuItem);

      if (isActive) {
        activeChild = child;
      }
    });

    if (activeChild) {
      this.renderMainMenu(activeChild, activeChild.name);
      this.renderMobileMenu(activeChild, activeChild.name);
    }

    if (ul.children.length > 1) {
      ul.style.display = "";
    }
  },
});
