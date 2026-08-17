import { Redis } from "@upstash/redis";
import crypto from "crypto";

const redis = Redis.fromEnv();

function getCookie(req, name) {

    const cookies =
        req.headers.cookie || "";

    const parts =
        cookies.split(";");

    for (
        const part of parts
    ) {

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


function getDateKey() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


export default async function handler(
    req,
    res
) {

    if (
        req.method !== "POST"
    ) {

        return res.status(405).json({

            success: false,

            error:
                "POST required"

        });

    }


    try {

        const date =
            getDateKey();


        let visitor =
            getCookie(
                req,
                "aegis_visitor"
            );


        if (!visitor) {

            visitor =
                crypto.randomUUID();

        }


        // -----------------------------------------
        // TOTAL PAGE VIEWS
        // -----------------------------------------

        await redis.incr(
            "aegis:stats:pageviews"
        );


        // -----------------------------------------
        // TODAY VIEWS
        // -----------------------------------------

        await redis.incr(
            `aegis:stats:views:${date}`
        );


        // -----------------------------------------
        // ALL TIME UNIQUE USERS
        // -----------------------------------------

        await redis.sadd(
            "aegis:stats:unique",
            visitor
        );


        // -----------------------------------------
        // TODAY UNIQUE USERS
        // -----------------------------------------

        await redis.sadd(
            `aegis:stats:visitors:${date}`,
            visitor
        );


        await redis.expire(
            `aegis:stats:visitors:${date}`,
            1209600
        );


        // -----------------------------------------
        // COOKIE
        // -----------------------------------------

        res.setHeader(
            "Set-Cookie",
            `aegis_visitor=${visitor}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`
        );


        return res.status(200).json({

            success: true

        });

    } catch (error) {

        console.error(
            "TRACK ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                error.message

        });

    }

}
