const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: `http://127.0.0.1:${process.env.SPELL_API_PORT || 3001}`,
      changeOrigin: true
    })
  );
};
