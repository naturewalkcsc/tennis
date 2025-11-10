import { getRedis } from './_kv.mjs'
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers','Content-Type')
  res.setHeader('Cache-Control','no-store')
  res.setHeader('Content-Type','application/json')
  if(req.method==='OPTIONS')return res.status(200).end()
  const redis=getRedis(); const key='tennis:matches'
  if(!redis) return res.status(503).json({error:'KV not configured'})
  try{
    if(req.method==='GET'){ const list=await redis.get(key)||[]; return res.status(200).json(list) }
    if(req.method==='POST'){ const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{}); const action=body.action;
      if(action==='add'){ const list=(await redis.get(key))||[]; list.unshift(body.payload); if(list.length>500)list.pop(); await redis.set(key,list); return res.status(200).json({ok:true}) }
      if(action==='clear'){ await redis.set(key,[]); return res.status(200).json({ok:true}) }
      return res.status(400).json({error:'unknown action'}) }
    return res.status(405).json({error:'method not allowed'})
  }catch(e){ return res.status(500).json({error:e.message||'server error'}) }
}
