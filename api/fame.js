import fs from "fs";
import path from "path";

export default async function handler(req, res) {
    try {
        const query = String(req.query.q || "").trim();

        if (!query) {
            return res.status(400).json({
                success: false,
                error: "Missing search query"
            });
        }

        const famePath = path.join(
            process.cwd(),
            "Fame.txt"
        );

        if (!fs.existsSync(famePath)) {
            return res.status(404).json({
                success: false,
                error: "Fame.txt not found"
            });
        }

        const content = fs.readFileSync(
            famePath,
            "utf8"
        );

        const lines = content
            .split(/\r?\n/)
            .filter(line => line.trim() !== "");

        const search = query.toLowerCase();

        // Header entfernen
        const dataLines = lines.slice(1);

        const results = dataLines
            .filter(line => {
                const fields = line.split(",");

                const fullName =
                    (fields[0] || "").toLowerCase();

                return fullName.includes(search);
            })
            .slice(0, 100)
            .map(line => {
                const fields = line.split(",");

                return {
                    fullName: fields[0] || "",
                    email: fields[1] || "",
                    address: fields[2] || "",
                    phone: fields[3] || "",
                    ip: fields[4] || "",
                    history: fields.slice(5).join(",")
                };
            });

        return res.status(200).json({
            success: true,
            query,
            count: results.length,
            results
        });

    } catch (error) {
        console.error(
            "Fame database error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Failed to search Fame.txt"
        });
    }
}
