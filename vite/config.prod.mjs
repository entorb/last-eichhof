import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

const phasermsg = () => {
  return {
    name: "phasermsg",
    buildStart() {
      process.stdout.write(`Building for production...\n`)
    },
    buildEnd() {
      process.stdout.write(`✨ Done ✨\n`)
    },
  }
}

// Matomo visitor counting, prod build only (dev uses config.dev.mjs)
const matomo = () => ({
  name: "matomo",
  transformIndexHtml: {
    order: "post",
    handler(html, ctx) {
      if (ctx.filename && !ctx.filename.endsWith("index.html")) return html
      const script = `<script>
  var _paq = window._paq = window._paq || [];
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u="https://entorb.net/stats/matomo/";
    _paq.push(['setTrackerUrl', u+'matomo.php']);
    _paq.push(['setSiteId', '18']);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
  })();
</script>`
      return html.replace("</head>", `${script}</head>`)
    },
  },
})

export default defineConfig({
  root: "src",
  publicDir: "../public",
  base: "/last-eichhof/",
  logLevel: "warning",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) return "phaser"
        },
      },
    },
    minify: "terser",
    terserOptions: {
      compress: {
        passes: 2,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
  },
  server: {
    port: 8080,
  },
  plugins: [
    phasermsg(),
    matomo(),
    VitePWA({
      registerType: "autoUpdate",
      // Inject the registration script; avoids importing virtual:pwa-register.
      injectRegister: "auto",
      manifest: {
        name: "The Last Eichhof",
        short_name: "Eichhof",
        description:
          "Shoot corks from a beer bottle and blast waves of alcohol-themed enemies. A web remake of the 1993 MS-DOS classic.",
        display: "standalone",
        orientation: "landscape",
        background_color: "#05060d",
        theme_color: "#05060d",
        categories: ["games"],
        id: "/last-eichhof/",
        icons: [
          { src: "icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,webmanifest}"],
        globIgnores: ["**/contact.html", "**/audition.html", "assets/sounds/**"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/sounds\/[^/]+\.ogg$/,
            handler: "CacheFirst",
            options: {
              cacheName: "sounds",
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      // Dev keeps the plain server; test offline from the production build.
      devOptions: { enabled: false },
    }),
  ],
})
