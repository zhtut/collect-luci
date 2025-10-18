# LuCI Theme Aurora

**English** | [简体中文](README_zh.md)

## Introduction

**luci-theme-aurora** is an OpenWrt theme designed for modern browsers.  
Its inspiration comes from the **Aurora** — in Tromsø, Northern Norway, the daytime brings views of pure white snowy mountains, while at night, the sky comes alive with the dancing northern lights.  
In this theme, I aim to reflect the same contrast: daytime mode as pure as snowy mountains, and nighttime mode as captivating as the aurora.

> ⚠️ **Notice**  
> The theme is currently in Beta, and the code updates frequently. The released packaged version on GitHub may not always be the latest.  
> If possible, it is recommended to compile from source to get the newest version.  
> If any issues are encountered, feel free to submit an issue — every bit of feedback helps make the theme better 🙏💖.

## Compatibility

- **OpenWrt**: Since the theme uses ucode templates, it requires **OpenWrt 22.03** or later.
- **Browsers**: The theme is built with **TailwindCSS v4**, please use the following modern browsers:
  - **Chrome/Edge 111** _(released March 2023)_
  - **Safari 16.4** _(released March 2023)_
  - **Firefox 128** _(released July 2024)_

## Preview

### Desktop

![light](./.dev/docs/preview/light.png)  
![dark](./.dev/docs/preview/dark.png)

### Mobile

![mobile](./.dev/docs/preview/mobile.png)

## About Development

As we step into 2025, the development of OpenWrt themes in the market remains fairly primitive, while the frontend toolchain has already become mature and advanced.  
Embracing the modern frontend ecosystem is therefore the core philosophy of the Aurora theme.

Aurora uses **Vite** as the build tool.

- During development, you can freely choose and integrate any CSS toolchain.
- In production, multiple strategies are available to optimize bundled assets.
- Most importantly, with the help of a local proxy server, style changes can be previewed in real time!
