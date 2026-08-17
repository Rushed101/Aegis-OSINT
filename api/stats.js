import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

const redis = Redis.fromEnv();

export default async function handler(req, res) {

    res.setHeader("Cache-Control", "no-store");

    try {

        // -----------------------------------------
        // DATABASE RECORDS
        // -----------------------------------------

        let totalRecords = 0;

        try {

            const filePath =
                path.join(process.cwd(), "db.txt");

            if (fs.existsSync(filePath)) {

                const content =
                    fs.readFileSync(
                        filePath,
                        "utf8"
                    );

                totalRecords =
                    content
                        .split(/\r?\n/)
                        .filter(
                            line =>
                                line.trim() !== ""
                        )
                        .length;
            }

        } catch (e) {

            console.log(
                "db.txt error:",
                e.message
            );

        }


        // -----------------------------------------
        // TOTAL USERS
        // -----------------------------------------

        const totalUsers =
            Number(
                await redis.scard(
                    "aegis:stats:unique"
                ) || 0
            );


        // -----------------------------------------
        // TOTAL VIEWS
        // -----------------------------------------

        const totalViews =
            Number(
                await redis.get(
                    "aegis:stats:pageviews"
                ) || 0
            );


        // -----------------------------------------
        // LAST 7 DAYS
        // -----------------------------------------

        const daily = [];

        let weeklyVisitors = new Set();

        for (
            let i = 6;
            i >= 0;
            i--
        ) {

            const date =
                new Date();

            date.setHours(
                0,
                0,
                0,
                0
            );

            date.setDate(
                date.getDate() - i
            );

            const year =
                date.getFullYear();

            const month =
                String(
                    date.getMonth() + 1
                ).padStart(2, "0");

            const day =
                String(
                    date.getDate()
                ).padStart(2, "0");

            const dateKey =
                `${year}-${month}-${day}`;


            const views =
                Number(
                    await redis.get(
                        `aegis:stats:views:${dateKey}`
                    ) || 0
                );


            let visitors = [];

            try {

                visitors =
                    await redis.smembers(
                        `aegis:stats:visitors:${dateKey}`
                    );

            } catch (e) {

                visitors = [];

            }


            if (
                Array.isArray(visitors)
            ) {

                visitors.forEach(
                    visitor => {
                        weeklyVisitors.add(
                            visitor
                        );
                    }
                );

            }


            daily.push({

                date: dateKey,

                views: views,

                visitors:
                    Array.isArray(visitors)
                        ? visitors.length
                        : 0

            });

        }


        // -----------------------------------------
        // RESPONSE
        // -----------------------------------------

        return res.status(200).json({

            success: true,

            data: {

                trustedUsers:
                    totalUsers,

                totalRecords:
                    totalRecords,

                newThisWeek:
                    weeklyVisitors.size,

                totalPageViews:
                    totalViews,

                weeklyViews:
                    daily.reduce(
                        (sum, item) =>
                            sum + item.views,
                        0
                    ),

                daily:
                    daily,

                updatedAt:
                    new Date().toISOString()

            }

        });

    } catch (error) {

        console.error(
            "STATS API ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                error.message ||
                "Statistics API failed"

        });

    }

}
