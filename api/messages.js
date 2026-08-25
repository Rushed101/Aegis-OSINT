import crypto from "node:crypto";
import { sql } from "@vercel/postgres";
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
async function auth(req){const h=req.headers.authorization||"";if(!h.startsWith("Bearer "))return null;const r=await sql`SELECT user_id FROM chat_sessions WHERE token_hash=${hash(h.slice(7))} AND expires_at>NOW() LIMIT 1`;return r.rows[0]?.user_id||null}
export default async function handler(req,res){try{
 const uid=await auth(req);if(!uid)return res.status(401).json({error:"Unauthorized"});
 if(req.method==="GET"){const r=await sql`SELECT id,user_id,username,content,created_at FROM chat_messages ORDER BY created_at ASC LIMIT 200`;return res.json({messages:r.rows})}
 if(req.method==="POST"){const content=String(req.body?.content||"").trim();if(!content||content.length>2000)return res.status(400).json({error:"Invalid message"});await sql`INSERT INTO chat_messages(user_id,username,content) VALUES(${uid},${"User-"+uid.slice(0,6)},${content})`;return res.status(201).json({ok:true})}
 res.status(405).json({error:"Method not allowed"})
}catch(e){console.error(e);res.status(500).json({error:"Server error"})}}
