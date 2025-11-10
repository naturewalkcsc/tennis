import { getRedis } from './_kv.mjs'
export default async function handler(req,res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.status(200).json({kv:!!getRedis()})}
