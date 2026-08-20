const fs = require("fs");
const path = require("path");

// =====================================================
// LOGIN LOGS
// GET  /api/logs  -> list logs
// POST /api/logs  -> append login event
// =====================================================

const LOG_FILE = path.join(__dirname, "login-logs.json");
const MAX_LOGS = 1000;

function readLogs() {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return [];
        }

        const raw = fs.readFileSync(LOG_FILE, "utf8");
        const data = JSON.parse(raw);

        return Array.isArray(data) ? data : [];
    } catch (_) {
        return [];
    }
}

function writeLogs(logs) {
    fs.writeFileSync(
        LOG_FILE,
        JSON.stringify(logs, null, 2),
        "utf8"
    );
}

function getClientIp(req) {
    const xf = req.headers["x-forwarded-for"];

    if (typeof xf === "string" && xf.length) {
        return xf.split(",")[0].trim();
    }

    return (
        req.headers["x-real-ip"] ||
        req.socket?.remoteAddress ||
        "unknown"
    );
}

module.exports = async (req, res) => {

    // -------------------------
    // GET – list logs
    // -------------------------
    if (req.method === "GET") {
        try {
            const logs = readLogs().slice().reverse();

            return res.status(200).json({
                success: true,
                count: logs.length,
                logs: logs
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message || "Could not read logs"
            });
        }
    }

    // -------------------------
    // POST – record login
    // -------------------------
    if (req.method === "POST") {
        try {
            let body = req.body;

            if (!body || typeof body !== "object") {
                body = {};

                // raw body fallback
                if (typeof req.body === "string") {
                    try {
                        body = JSON.parse(req.body);
                    } catch (_) {
                        body = {};
                    }
                }
            }

            const user = String(body.user || "").trim();
            const hwid = String(body.hwid || "").trim();
            const ipFromClient = String(body.ip || "").trim();
            const userAgent = String(body.userAgent || "").trim();

            if (!user) {
                return res.status(400).json({
                    success: false,
                    error: "Missing user"
                });
            }

            const entry = {
                user: user,
                ip: ipFromClient || getClientIp(req),
                hwid: hwid || "-",
                userAgent: userAgent.slice(0, 300),
                at: new Date().toISOString()
            };

            const logs = readLogs();
            logs.push(entry);

            while (logs.length > MAX_LOGS) {
                logs.shift();
            }

            writeLogs(logs);

            return res.status(200).json({
                success: true,
                entry: entry
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message || "Could not write log"
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: "Method not allowed"
    });

};
