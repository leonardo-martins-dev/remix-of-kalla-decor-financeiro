module.exports = {
  apps: [
    {
      name: "remix-of-kalla-decor",
      cwd: "/root/remix-of-kalla-decor-financeiro",
      script: "npm",
      args: "run preview -- --host 127.0.0.1 --port 5175 --strictPort",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
    },
  ],
};
