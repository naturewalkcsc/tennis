import { getRedis } from './_kv.js'
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers','Content-Type')
  res.setHeader('Cache-Control','no-store')
  res.setHeader('Content-Type','application/json')
  if(req.method==='OPTIONS')return res.status(200).end()
  const redis=getRedis(); const key='tennis:players'
  if(!redis) return res.status(503).json({error:'KV not configured'})
  try{
    if(req.method==='GET'){ const obj=await redis.get(key)||{singles:[],doubles:[]}; return res.status(200).json(obj) }
    if(req.method==='POST'){
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
      const p=body.payload||{singles:[],doubles:[]};
      const singles=Array.isArray(p.singles)?p.singles.slice(0,500):[];
      const doubles=Array.isArray(p.doubles)?p.doubles.slice(0,500):[];
      await redis.set(key,{singles,doubles});
      return res.status(200).json({ok:true})
    }
    return res.status(405).json({error:'method not allowed'})
  }catch(e){ return res.status(500).json({error:e.message||'server error'}) }
}
