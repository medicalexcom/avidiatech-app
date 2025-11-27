// require('./request-logger')(app) - attach early, before route handlers
module.exports = function requestLogger(app) {
  app.use(express.json({ limit: "1mb" })); // ensure JSON body parsing for logs and handlers
  app.use((req, res, next) => {
    const now = new Date().toISOString();
    const safeHeaders = { ...req.headers };
    if (safeHeaders['x-engine-key']) safeHeaders['x-engine-key'] = '***REDACTED***';
    console.log(`[render:request] ${now} ${req.method} ${req.originalUrl} headers=${JSON.stringify(safeHeaders)}`);
    // capture body asynchronously for readability
    if (req.body) {
      try {
        console.log(`[render:request] body=${JSON.stringify(req.body)}`);
      } catch (e) {
        console.log(`[render:request] body=<unserializable>`);
      }
    }
    // Also log when response finishes
    res.on('finish', () => {
      console.log(`[render:response] ${now} ${req.method} ${req.originalUrl} status=${res.statusCode}`);
    });
    next();
  });
};
