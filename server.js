const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
};

function send(res, status, body, type) {
	const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
	res.writeHead(status, {
		"Content-Type": type,
		"Content-Length": payload.length,
	});
	res.end(payload);
}

function resolveSafePath(urlPath) {
	let decoded;

	try {
		decoded = decodeURIComponent(urlPath);
	} catch (error) {
		return null;
	}

	const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
	const resolved = path.resolve(ROOT, relative);
	const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;

	if (resolved !== ROOT && !resolved.startsWith(rootWithSep)) {
		return null;
	}

	return resolved;
}

const server = http.createServer((req, res) => {
	const url = new URL(req.url, `http://${req.headers.host}`);

	if (req.method !== "GET") {
		send(res, 405, "Method not allowed", "text/plain; charset=utf-8");
		return;
	}

	const filePath = resolveSafePath(url.pathname);

	if (!filePath) {
		send(res, 404, "Not found", "text/plain; charset=utf-8");
		return;
	}

	const ext = path.extname(filePath).toLowerCase();
	const type = MIME_TYPES[ext];

	if (!type) {
		send(res, 404, "Not found", "text/plain; charset=utf-8");
		return;
	}

	fs.readFile(filePath, (error, data) => {
		if (error) {
			if (error.code === "ENOENT") {
				send(res, 404, "Not found", "text/plain; charset=utf-8");
				return;
			}

			send(res, 500, "Could not load flash cards.", "text/plain; charset=utf-8");
			return;
		}

		send(res, 200, data, type);
	});
});

server.listen(PORT, () => {
	console.log(`Flash cards at http://localhost:${PORT}`);
});
