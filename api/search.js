const fs = require("fs");
const path = require("path");

module.exports = async (req, res) => {
    // CORS / Method
    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {
        const query = String(req.query.q || "").trim();

        if (!query) {
            return res.status(400).json({
                error: "Missing search query"
            });
        }

        if (query.length > 200) {
            return res.status(400).json({
                error: "Query too long"
            });
        }

        /*
         * db.txt liegt eine Ebene über /api
         *
         * Projekt:
         * ├── index.html
         * ├── package.json
         * ├── db.txt
         * └── api/
         *     └── search.js
         */

        const dbPath = path.join(
            process.cwd(),
            "db.txt"
        );

        if (!fs.existsSync(dbPath)) {
            return res.status(500).json({
                error: "Database file not found"
            });
        }

        const database = fs.readFileSync(
            dbPath,
            "utf8"
        );

        const lines = database
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        const normalizedQuery =
            query.toLowerCase();

        /*
         * Exakte Suche:
         *
         * "Max Mustermann"
         * findet nur:
         * Max Mustermann
         *
         * und nicht:
         * Max Mustermann123
         *
         * Zusätzlich wird jedes durch | getrennte
         * Feld einzeln verglichen.
         */

        const results = lines.filter(line => {

            const fields = line
                .split("|")
                .map(field =>
                    field.trim().toLowerCase()
                );

            return fields.some(
                field =>
                    field === normalizedQuery
            );
        });

        return res.status(200).json({
            success: true,
            query: query,
            count: results.length,
            results: results.slice(0, 50)
        });

    } catch (error) {

        console.error("Search error:", error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};
