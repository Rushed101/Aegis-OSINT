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

        const file = fs.readFileSync(
            filePath,
            "utf8"
        );

        const lines = file
            .replace(/^\uFEFF/, "")
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        // Header überspringen
        const data = lines.slice(1);

        const search = query.toLowerCase();

        const results = [];

        for (const line of data) {

            // Das erste Komma trennt den Namen vom Rest.
            // Dadurch sind Kommas in der Adresse kein Problem.
            const firstComma = line.indexOf(",");

            if (firstComma === -1) {
                continue;
            }

            const fullName =
                line
                    .substring(0, firstComma)
                    .trim();

            if (
                fullName
                    .toLowerCase()
                    .includes(search)
            ) {

                const rest =
                    line.substring(
                        firstComma + 1
                    );

                /*
                 * Erwartetes Format:
                 *
                 * name,
                 * email,
                 * address,
                 * phone,
                 * ip,
                 * history
                 *
                 * Achtung:
                 * Wenn Address selbst Kommas enthält,
                 * kann ein echtes CSV-Parsing nötig sein.
                 */

                const fields =
                    rest.split(",");

                results.push({
                    fullName: fullName,
                    email: fields[0]?.trim() || "",
                    address: fields[1]?.trim() || "",
                    phone: fields[2]?.trim() || "",
                    ip: fields[3]?.trim() || "",
                    history: fields
                        .slice(4)
                        .join(",")
                        .trim()
                });
            }

            if (results.length >= 100) {
                break;
            }
        }

        return res.status(200).json({
            success: true,
            query: query,
            count: results.length,
            results: results
        });

    } catch (error) {

        console.error(
            "Fame search error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
