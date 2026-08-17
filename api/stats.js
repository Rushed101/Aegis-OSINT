import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
});


function formatDate(date) {

    return date
        .toISOString()
        .slice(0, 10);

}


function getLast7Days() {

    const days = [];

    const now =
        new Date();

    for (
        let i = 6;
        i >= 0;
        i--
    ) {

        const date =
            new Date(now);

        date.setUTCDate(
            date.getUTCDate() - i
        );

        days.push(
            formatDate(date)
        );

    }

    return days;

}


function countDatabaseRecords() {

    try {

        const file =
            path.join(
                process.cwd(),
                "db.txt"
            );

        if (
            !fs.existsSync(file)
        ) {
            return 0;
        }

        const content =
            fs.readFileSync(
                file,
                "utf8"
            );

        if (!content.trim()) {
            return 0;
        }

        return content
            .split(/\r?\n/)
            .filter(
                line =>
                    line.trim().length > 0
            )
            .length;

    } catch (error) {

        console.error(
            "Database count error:",
            error
        );

        return 0;

    }

}


export default async function handler(
    req,
    res
) {

    if (req.method !== "GET") {

        return res.status(405).json({

            success: false,

            error:
                "Method not allowed"

        });

    }

    try {

        const days =
            getLast7Days();

        /*
         * ------------------------------------------------
         * ALL TIME UNIQUE USERS
         * ------------------------------------------------
         */

        const totalUsers =
            await redis.scard(
                "aegis:stats:unique"
            );


        /*
         * ------------------------------------------------
         * TOTAL PAGE VIEWS
         * ------------------------------------------------
         */

        const totalPageViews =
            Number(
                await redis.get(
                    "aegis:stats:pageviews"
                ) || 0
            );


        /*
         * ------------------------------------------------
         * DAILY DATA
         * ------------------------------------------------
         */

        const daily =
            await Promise.all(

                days.map(
                    async day => {

                        const views =
                            Number(
                                await redis.get(
                                    `aegis:stats:views:${day}`
                                ) || 0
                            );

                        const visitors =
                            await redis.scard(
                                `aegis:stats:visitors:${day}`
                            );

                        return {

                            date: day,

                            views:
                                views,

                            visitors:
                                Number(
                                    visitors || 0
                                )

                        };

                    }
                )

            );


        /*
         * ------------------------------------------------
         * LAST 7 DAYS
         *
         * Unique users are calculated by combining
         * the daily visitor sets.
         * ------------------------------------------------
         */

        const weeklyVisitors =
            new Set();

        for (
            const day of days
        ) {

            const visitors =
                await redis.smembers(
                    `aegis:stats:visitors:${day}`
                );

            if (
                Array.isArray(visitors)
            ) {

                for (
                    const visitor
                    of visitors
                ) {

                    weeklyVisitors.add(
                        visitor
                    );

                }

            }

        }


        /*
         * ------------------------------------------------
         * WEEKLY PAGE VIEWS
         * ------------------------------------------------
         */

        const weeklyViews =
            daily.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.views,
                0
            );


        /*
         * ------------------------------------------------
         * DATABASE RECORDS
         * ------------------------------------------------
         */

        const totalRecords =
            countDatabaseRecords();


        /*
         * ------------------------------------------------
         * NEW THIS WEEK
         * ------------------------------------------------
         *
         * This is unique visitors during the
         * last 7 days.
         * ------------------------------------------------
         */

        const newThisWeek =
            weeklyVisitors.size;


        /*
         * ------------------------------------------------
         * SEND RESULT
         * ------------------------------------------------
         */

        return res.status(200).json({

            success: true,

            data: {

                trustedUsers:
                    Number(
                        totalUsers || 0
                    ),

                totalRecords:
                    totalRecords,

                newThisWeek:
                    newThisWeek,

                totalPageViews:
                    totalPageViews,

                weeklyVisitors:
                    newThisWeek,

                weeklyViews:
                    weeklyViews,

                daily:
                    daily,

                updatedAt:
                    new Date().toISOString()

            }

        });

    } catch (error) {

        console.error(
            "Stats error:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                "Could not load statistics"

        });

    }

}
