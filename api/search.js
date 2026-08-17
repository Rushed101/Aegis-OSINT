const fs = require("fs");
const path = require("path");

module.exports = async (req, res) => {
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

        const dbPath = path.join(
            process.cwd(),
            "db.txt"
        );

        if (!fs.existsSync(dbPath)) {
            return res.status(500).json({
                error: "db.txt not found"
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

        const search = query
            .toLowerCase()
            .trim();

        const results = lines.filter(line => {

            const fields = line
                .split(",")
                .map(field =>
                    field.trim().toLowerCase()
                );

            return fields.some(field =>
                field === search
            );
        });

        return res.status(200).json({
            success: true,
            query: query,
            count: results.length,
            results: results.slice(0, 50)
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};
