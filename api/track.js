import { Redis } from "@upstash/redis";
import crypto from "crypto";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
});

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function getCookie(req, name) {

    const cookies = req.headers.cookie || "";

    const parts = cookies.split(";");

    for (const part of parts) {

        const [key, ...value] =
            part.trim().split("=");

        if (key === name) {
            return decodeURIComponent(
                value.join("=")
            );
        }
    }

    return null;
}

export default async function handler(req, res) {

    if (req.method !== "POST") {

        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });

    }

    try {

        const today = getToday();

        let visitorId =
            getCookie(req, "aegis_visitor");

        let isNewVisitor = false;

        if (!visitorId) {

            visitorId =
                crypto.randomUUID();

            isNewVisitor = true;
        }

        /*
         * -------------------------------------------------
         * TOTAL PAGE VIEWS
         * -------------------------------------------------
         */

        await redis.incr(
            "aegis:stats:pageviews"
        );

        /*
         * -------------------------------------------------
         * DAILY PAGE VIEWS
         * -------------------------------------------------
         */

        await redis.incr(
            `aegis:stats:views:${today}`
        );

        /*
         * -------------------------------------------------
         * ALL-TIME UNIQUE USERS
         * -------------------------------------------------
         */

        await redis.sadd(
            "aegis:stats:unique",
            visitorId
        );

        /*
         * -------------------------------------------------
         * DAILY UNIQUE USERS
         * -------------------------------------------------
         */

        await redis.sadd(
            `aegis:stats:visitors:${today}`,
            visitorId
        );

        /*
         * -------------------------------------------------
         * EXPIRATION FOR DAILY SET
         * 14 DAYS
         * -------------------------------------------------
         */

        await redis.expire(
            `aegis:stats:visitors:${today}`,
            1209600
        );

        /*
         * -------------------------------------------------
         * COOKIE
         * -------------------------------------------------
         */

        res.setHeader(
            "Set-Cookie",
            `aegis_visitor=${encodeURIComponent(visitorId)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`
        );

        return res.status(200).json({

            success: true,

            newVisitor:
                isNewVisitor

        });

    } catch (error) {

        console.error(
            "Tracking error:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                "Statistics tracking failed"

        });

    }
}
