const https = require("https");

// =====================================================
// HUNTER.IO API KEY
// =====================================================

const API_KEY = "5992a26bfc314b3716d3aff751fab8eae45fbba2";


// =====================================================
// EMAIL LOOKUP
// =====================================================

module.exports = async (req, res) => {

    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });
    }

    const email = String(
        req.query.email || ""
    ).trim();


    // -------------------------
    // Basic validation
    // -------------------------

    if (!email) {
        return res.status(400).json({
            success: false,
            error: "Missing email address"
        });
    }

    if (email.length > 254) {
        return res.status(400).json({
            success: false,
            error: "Email address is too long"
        });
    }


    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            error: "Invalid email format"
        });
    }


    // -------------------------
    // API key check
    // -------------------------

    if (
        !API_KEY ||
        API_KEY === "HIER_DEIN_HUNTER_API_KEY"
    ) {
        return res.status(500).json({
            success: false,
            error: "Hunter API key not configured"
        });
    }


    try {

        const data = await hunterLookup(email);

        return res.status(200).json({
            success: true,
            data: data
        });


    } catch (error) {

        console.error(
            "Hunter API error:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            error: error.message ||
                "Hunter lookup failed"
        });
    }
};


// =====================================================
// HUNTER REQUEST
// =====================================================

function hunterLookup(email) {

    return new Promise(
        (resolve, reject) => {

            const url =
                "https://api.hunter.io/v2/email-verifier" +
                "?email=" +
                encodeURIComponent(email) +
                "&api_key=" +
                encodeURIComponent(API_KEY);


            https.get(
                url,
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

                            let json;

                            try {

                                json =
                                    JSON.parse(body);

                            } catch {

                                const error =
                                    new Error(
                                        "Invalid response from Hunter"
                                    );

                                error.statusCode =
                                    response.statusCode || 500;

                                reject(error);

                                return;
                            }


                            // -------------------------
                            // Hunter API error
                            // -------------------------

                            if (
                                response.statusCode < 200 ||
                                response.statusCode >= 300
                            ) {

                                let message =
                                    "Hunter API error";

                                if (
                                    json.errors &&
                                    json.errors.length
                                ) {

                                    message =
                                        json.errors
                                            .map(
                                                error =>
                                                    error.details ||
                                                    error.id ||
                                                    "Unknown error"
                                            )
                                            .join(", ");
                                }


                                const error =
                                    new Error(message);

                                error.statusCode =
                                    response.statusCode;

                                reject(error);

                                return;
                            }


                            // -------------------------
                            // Successful response
                            // -------------------------

                            if (!json.data) {

                                const error =
                                    new Error(
                                        "Hunter returned no data"
                                    );

                                error.statusCode = 502;

                                reject(error);

                                return;
                            }


                            resolve(json.data);
                        }
                    );

                }
            ).on(
                "error",
                error => {
                    reject(error);
                }
            );
        }
    );
}
