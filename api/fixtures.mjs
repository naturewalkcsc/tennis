import { getRedis } from './_kv.mjs'
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers','Content-Type')
  res.setHeader('Cache-Control','no-store')
  res.setHeader('Content-Type','application/json')
  if(req.method==='OPTIONS')return res.status(200).end()
  const redis=getRedis(); const key='tennis:fixtures'
  if(!redis) return res.status(503).json({error:'KV not configured'})
  try{
    if(req.method==='GET'){
      const list=await redis.get(key)||[]
      list.sort((a,b)=>(a.start||0)-(b.start||0))
      return res.status(200).json(list)
    }
    if(req.method==='POST'){
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})
      if(body.action==='add'){ const f=body.payload; const list=(await redis.get(key))||[]; list.push(f); await redis.set(key,list); return res.status(200).json({ok:true}) }
      if(body.action==='remove'){ const list=(await redis.get(key))||[]; await redis.set(key,list.filter(x=>x.id!==body.id)); return res.status(200).json({ok:true}) }
      if(body.action==='clear'){ await redis.set(key,[]); return res.status(200).json({ok:true}) }
      return res.status(400).json({error:'unknown action'})
    }
    return res.status(405).json({error:'method not allowed'})
  }catch(e){ return res.status(500).json({error:e.message}) }
}