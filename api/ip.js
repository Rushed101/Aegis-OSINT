const https = require("https");

// =====================================================
// IPINFO.IO API KEY
// =====================================================

const API_KEY = "HIER_DEIN_IPINFO_API_KEY";


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

    if (!API_KEY || API_KEY === "HIER_DEIN_IPINFO_API_KEY") {
        return res.status(500).json({
            error: "IPinfo API key not configured"
        });
    }

    try {

        const result = await new Promise((resolve, reject) => {

            const url =
                `https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(API_KEY)}`;

            https.get(url, response => {

                let body = "";

                response.on("data", chunk => {
                    body += chunk;
                });

                response.on("end", () => {

                    try {

                        const data = JSON.parse(body);

                        if (response.statusCode < 200 ||
                            response.statusCode >= 300) {

                            reject(
                                new Error(
                                    data.error?.message ||
                                    `IPinfo HTTP ${response.statusCode}`
                                )
                            );

                            return;
                        }

                        resolve(data);

                    } catch (error) {

                        reject(
                            new Error(
                                "Invalid response from IPinfo"
                            )
                        );
                    }
                });

            }).on("error", reject);
        });


        return res.status(200).json({
            success: true,
            data: result
        });


    } catch (error) {

        console.error("IPinfo error:", error);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
