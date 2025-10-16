import index from "./index.html";

Bun.serve({
  port: process.env.PORT || 5173,

  routes: {
    "/": index,
  },

  development: {
    hmr: true,
  },
});

console.log(`🚀 Server running on port ${process.env.PORT || 5173}`);
