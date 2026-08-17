import fs from "fs";
import path from "path";

export default function handler(req, res) {
    try {
        const query = String(req.query.q || "").trim();

        if (!query) {
            return res.status(400).json({
                success: false,
                error: "Missing query"
            });
        }

        const filePath = path.join(
            process.cwd(),
            "Fame.txt"
        );

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: "Fame.txt not found"
            });
        }

        const content = fs.readFileSync(
            filePath,
            "utf8"
        );

        const lines = content
            .replace(/^\uFEFF/, "")
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        const search = query.toLowerCase();

        const results = [];

        for (const line of lines) {

            // Header überspringen
            if (
                line
                    .toLowerCase()
                    .startsWith("full name,")
            ) {
                continue;
            }

            const parts = line.split(",");

            if (parts.length < 5) {
                continue;
            }

            const fullName =
                parts[0]?.trim() || "";

            if (
                !fullName
                    .toLowerCase()
                    .includes(search)
            ) {
                continue;
            }

            const email =
                parts[1]?.trim() || "";

            /*
             * IP = vorletztes Feld
             * History = letztes Feld
             */
            const history =
                parts[parts.length - 1]
                    ?.trim() || "";

            const ip =
                parts[parts.length - 2]
                    ?.trim() || "";

            /*
             * Phone kann leer sein.
             *
             * Wir nehmen das Feld direkt
             * vor der IP.
             */
            const phoneIndex =
                parts.length - 3;

            const phone =
                parts[phoneIndex]?.trim() || "";

            /*
             * Alles zwischen Email und
             * Phone ist die Adresse.
             */
            const address =
                parts
                    .slice(
                        2,
                        phoneIndex
                    )
                    .join(", ")
                    .trim();

            results.push({
                fullName,
                email,
                address,
                phone,
                ip,
                history
            });

            if (results.length >= 100) {
                break;
            }
        }

        return res.status(200).json({
            success: true,
            query,
            count: results.length,
            results
        });

    } catch (error) {

        console.error(
            "Fame Database Error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
