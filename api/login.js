import crypto from "node:crypto";
import { sql } from "@vercel/postgres";
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 try{
  const code=req.body?.code||"";
  if(!/^\d{50}$/.test(code))return res.status(401).json({error:"Invalid access code"});
  const codes=[process.env.CHAT_CODE_1,process.env.CHAT_CODE_2,process.env.CHAT_CODE_3,process.env.CHAT_CODE_4,process.env.CHAT_CODE_5].filter(Boolean);
  const h=hash(code);
  if(!codes.some(c=>crypto.timingSafeEqual(Buffer.from(h,"hex"),Buffer.from(hash(c),"hex"))))return res.status(401).json({error:"Invalid access code"});
  const userId=crypto.randomUUID(),token=crypto.randomBytes(32).toString("base64url");
  await sql`INSERT INTO chat_sessions(user_id,token_hash,expires_at) VALUES(${userId},${hash(token)},NOW()+INTERVAL '24 hours')`;
  res.status(200).json({token,userId});
 }catch(e){console.error(e);res.status(500).json({error:"Server error"})}
}
