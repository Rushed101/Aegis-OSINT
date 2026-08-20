const https = require("https");

// =====================================================
// OSINTDOG API KEY
// =====================================================
const API_KEY = "j9l9nmt7l_j7DU-xUvo4FPYTU-1OACk-JRTNouhYims";

// =====================================================
// VIP SEARCH (OSINTDog)
// =====================================================
module.exports = async (req, res) => {

    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });
    }

    const query = String(
        req.query.q || ""
    ).trim();

    let type = String(
        req.query.type || ""
    ).trim().toLowerCase();

    // -------------------------
    // Basic validation
    // -------------------------
    if (!query) {
        return res.status(400).json({
            success: false,
            error: "Missing query parameter q"
        });
    }

    if (query.length > 256) {
        return res.status(400).json({
            success: false,
            error: "Query is too long"
        });
    }

    // Auto-detect type if missing / invalid
    const allowed = [
        "email",
        "username",
        "phone",
        "domain",
        "ip"
    ];

    if (!allowed.includes(type)) {
        type = detectType(query);
    }

    // -------------------------
    // API key check
    // -------------------------
    if (
        !API_KEY ||
        API_KEY === "YOUR_API_KEY_HERE"
    ) {
        return res.status(500).json({
            success: false,
            error: "OSINTDog API key not configured"
        });
    }

    try {

        const data = await osintdogSearch(
            query,
            type
        );

        return res.status(200).json({
            success: true,
            search_term: data.search_term || query,
            search_type: data.search_type || type,
            results: data.results || data
        });

    } catch (error) {

        console.error(
            "OSINTDog API error:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            error: error.message ||
                "Vip search failed"
        });

    }

};

// =====================================================
// TYPE DETECTION
// =====================================================
function detectType(query) {

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)) {
        return "email";
    }

    if (/^(\+?\d[\d\s\-().]{6,}\d)$/.test(query.replace(/\s/g, ""))) {
        return "phone";
    }

    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(query) || query.includes(":")) {
        return "ip";
    }

    if (
        /^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)+$/i.test(query) &&
        query.includes(".")
    ) {
        return "domain";
    }

    return "username";

}

// =====================================================
// OSINTDOG REQUEST
// =====================================================
function osintdogSearch(query, type) {

    return new Promise(
        (resolve, reject) => {

            const field = {};
            field[type] = query;

            const payload = JSON.stringify({
                field: [field]
            });

            const options = {
                hostname: "osintdog.com",
                path: "/api/search",
                method: "POST",
                headers: {
                    "X-API-Key": API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "User-Agent": "AegisOSINT/1.0",
                    "Content-Length": Buffer.byteLength(payload)
                }
            };

            const request = https.request(
                options,
                response => {

                    let body = "";

                    response.on(
                        "data",
                        chunk => {
                            body += chunk;
                        }
                    );

                    response.on(
                        "end",
                        () => {

                            const status =
                                response.statusCode || 500;

                            const trimmed =
                                String(body || "").trim();

                            if (!trimmed) {
                                const error = new Error(
                                    "Empty response from OSINTDog (HTTP " +
                                    status +
                                    ")"
                                );
                                error.statusCode = status;
                                reject(error);
                                return;
                            }

                            let json;

                            try {
                                json = JSON.parse(trimmed);
                            } catch {
                                const snippet =
                                    trimmed
                                        .replace(/\s+/g, " ")
                                        .slice(0, 180);

                                const error = new Error(
                                    "Invalid response from OSINTDog (HTTP " +
                                    status +
                                    "): " +
                                    snippet
                                );
                                error.statusCode = status;
                                reject(error);
                                return;
                            }

                            // -------------------------
                            // OSINTDog API error
                            // -------------------------
                            if (
                                status < 200 ||
                                status >= 300
                            ) {
                                const message =
                                    json.error ||
                                    json.message ||
                                    ("OSINTDog API error (HTTP " + status + ")");

                                const error =
                                    new Error(message);

                                error.statusCode = status;

                                reject(error);
                                return;
                            }

                            resolve(json);

                        }
                    );

                }
            );

            request.on(
                "error",
                error => {
                    reject(error);
                }
            );

            request.write(payload);
            request.end();

        }
    );

}
