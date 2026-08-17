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

            // Header ignorieren
            if (
                line.toLowerCase()
                    .startsWith("full name,")
            ) {
                continue;
            }

            const parts = line.split(",");

            if (parts.length < 4) {
                continue;
            }

            /*
             * Format:
             *
             * 0 = full name
             * 1 = email
             * 2...n = address
             * n+1 = phone/status
             * n+2 = IP
             *
             * Beispiel:
             *
             * Kaden Mont
             * kadennn577@gmail.com
             * 1114 W 53rd St
             * Minneapolis
             * MN 55419
             * not found
             * 75.98.153.193
             */

            const fullName =
                parts[0].trim();

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
             * Die IP ist immer das letzte Feld.
             */
            const ip =
                parts[parts.length - 1]
                    .trim();

            /*
             * Das Feld vor der IP ist
             * phone/status.
             */
            const phone =
                parts[parts.length - 2]
                    ?.trim() || "";

            /*
             * Alles zwischen Email und
             * phone/status ist die Adresse.
             */
            const address =
                parts
                    .slice(
                        2,
                        parts.length - 2
                    )
                    .join(", ")
                    .trim();

            results.push({
                fullName,
                email,
                address,
                phone,
                ip,
                history: ""
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
