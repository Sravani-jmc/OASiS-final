module.exports = {
  apps: [
    {
      name: 'oasis',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1, // For t3.medium, we use 1 instance to conserve memory
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Configure error and out logs
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      // Performance optimizations
      node_args: [
        '--max-old-space-size=1536', // 1.5GB max heap for Node.js
        '--optimize-for-size',       // Optimize for memory footprint
        '--gc-interval=100'          // More frequent garbage collection
      ]
    }
  ]
}; 