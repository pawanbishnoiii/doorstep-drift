import { supabase } from '@/integrations/supabase/client';
import { searchLocations } from './location-search';
import { createSearchCache } from './search-cache';
export type PinHit = { pincode:string; city:string; state:string; zone?:string|null; source:'master'|'map'; lat?:number; lng?:number; label?:string };
const cache=createSearchCache<PinHit[]>(120_000);
export async function lookupPins(raw:string):Promise<PinHit[]> {
 const q=raw.trim().slice(0,120); if(q.length<2) return [];
 return cache.get(q.toLowerCase(),async()=>{
  const isPin=/^\d+$/.test(q);
  const master=async():Promise<PinHit[]>=>{
   const base=supabase.from('pincodes').select('pincode,city,state,zone').eq('active',true).limit(12);
   const {data,error}=isPin?await base.like('pincode',`${q}%`).order('pincode'):await base.ilike('city',`${q.replace(/[%_]/g,'')}%`).order('city');
   if(error) throw new Error('Could not check serviceable pincodes. Please retry.');
   return (data??[]).map(r=>({...r,source:'master'}));
  };
  const maps=async():Promise<PinHit[]>=>{
   if(isPin||q.length<3) return [];
   const places=await searchLocations(q);
   const codes=[...new Set(places.map(p=>p.pincode).filter((p):p is string=>Boolean(p&&/^\d{6}$/.test(p))))];
   if(!codes.length) return [];
   const {data}=await supabase.from('pincodes').select('pincode,city,state').eq('active',true).in('pincode',codes);
   return places.flatMap(p=>{const found=data?.find(s=>s.pincode===p.pincode);return found?[{...found,source:'map' as const,lat:p.lat,lng:p.lng,label:p.label}]:[]});
  };
  const [a,b]=await Promise.all([master(),maps().catch(()=>[])]);
  return [...a,...b.filter(p=>!a.some(s=>s.pincode===p.pincode))].slice(0,12);
 });
}
export async function pinInfo(pin:string):Promise<PinHit|null>{if(!/^\d{6}$/.test(pin))return null;return (await lookupPins(pin)).find(r=>r.pincode===pin&&r.source==='master')??null;}
