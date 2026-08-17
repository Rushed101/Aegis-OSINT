import fs from "fs";
import path from "path";

export default async function handler(req, res) {
    try {
        const page = Math.max(
            1,
            parseInt(req.query.page || "1", 10)
        );

        const limit = Math.min(
            100,
            Math.max(
                1,
                parseInt(req.query.limit || "100", 10)
            )
        );

        const dbPath = path.join(
            process.cwd(),
            "db.txt"
        );

        if (!fs.existsSync(dbPath)) {
            return res.status(404).json({
                success: false,
                error: "db.txt not found"
            });
        }

        const file = fs.readFileSync(
            dbPath,
            "utf8"
        );

        const lines = file
            .split(/\r?\n/)
            .filter(line => line.trim() !== "");

        const total = lines.length;

        const start =
            (page - 1) * limit;

        if (start >= total) {
            return res.status(200).json({
                success: true,
                page,
                limit,
                total,
                lines: []
            });
        }

        const results = lines.slice(
            start,
            start + limit
        );

        return res.status(200).json({
            success: true,
            page,
            limit,
            total,
            lines: results
        });

    } catch (error) {

        console.error(
            "Aegis Base error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Failed to read database"
        });
    }
}
