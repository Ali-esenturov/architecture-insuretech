const http = require("http");

function cpuWork() {
  const end = Date.now() + 1000;
  while (Date.now() < end) {}
}

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    cpuWork(); // нагружаем CPU
    res.end("Hello from Node.js pod\n");
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(7777, () => {
  console.log("Server running on port 7777");
});