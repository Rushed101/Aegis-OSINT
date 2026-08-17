const https = require("https");

/*
 * =====================================================
 * DEIN API KEY
 * =====================================================
 */

const API_KEY = "ca1ff120de2b51";


module.exports = async (req, res) => {

    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    const ip = String(req.query.ip || "").trim();

    if (!ip) {
        return res.status(400).json({
            error: "Missing IP address"
        });
    }

    if (!/^[0-9a-fA-F:.]+$/.test(ip)) {
        return res.status(400).json({
            error: "Invalid IP address"
        });
    }

    if (
        !API_KEY ||
        API_KEY === "HIER_DEIN_IPINFO_KEY_EINSETZEN"
    ) {
        return res.status(500).json({
            error: "IP API key has not been configured"
        });
    }

    try {

        const data = await new Promise(
            (resolve, reject) => {

                const url =
                    "https://ipinfo.io/" +
                    encodeURIComponent(ip) +
                    "/json?token=" +
                    encodeURIComponent(API_KEY);

                https.get(url, response => {

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

                            if (
                                response.statusCode < 200 ||
                                response.statusCode >= 300
                            ) {
                                reject(
                                    new Error(
                                        "IP API error: " +
                                        response.statusCode
                                    )
                                );
                                return;
                            }

                            try {
                                resolve(
                                    JSON.parse(body)
                                );
                            } catch {
                                reject(
                                    new Error(
                                        "Invalid JSON response"
                                    )
                                );
                            }
                        }
                    );

                }).on(
                    "error",
                    reject
                );
            }
        );

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "IP lookup failed"
        });
    }
};
