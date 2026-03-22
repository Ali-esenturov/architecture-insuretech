const client = require('prom-client');
const http = require("http");

client.collectDefaultMetrics();

function cpuWork() {
  const end = Date.now() + 30;
  while (Date.now() < end) {}
}

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['path']
});

const server = http.createServer(async (req, res) => {
  console.log("REQ:", req.url);

  if (req.url === '/metrics') {
    res.setHeader('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
    return;
  }

  const end = httpRequestDuration.startTimer();

  if (req.url === "/") {
    cpuWork();
    res.end("Hello from Node.js pod\n");
  } else {
    res.statusCode = 404;
    res.end();
  }

  end({ path: req.url });
});


server.listen(7777, () => {
  console.log("Server running on port 7777");
});