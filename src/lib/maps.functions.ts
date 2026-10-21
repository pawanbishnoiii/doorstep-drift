import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { GeoHit } from "./geo";
async function mapsRequest(path:string, body?:unknown) {
  const key=process.env["GOOGLE_MAPS_API_KEY"], appKey=process.env["LOVABLE_API_KEY"];
  if(!key||!appKey) throw new Error("Google Maps is not configured.");
  const response=await fetch(`https://connector-gateway.lovable.dev/google_maps/${path}`,{method:body?"POST":"GET",headers:{Authorization:`Bearer ${appKey}`,"X-Connection-Api-Key":key,"Content-Type":"application/json","X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents"},...(body?{body:JSON.stringify(body)}:{})});
  if(response.status===403) throw new Error("Google Maps denied access. Check the server key's API permissions and restrictions.");
  if(!response.ok) throw new Error(`Google Maps request failed (${response.status}).`);
  return response.json();
}
export const googlePlaceSearch=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((d:{q:string})=>z.object({q:z.string().trim().min(3).max(120)}).parse(d)).handler(async({data})=>{
  const j=await mapsRequest("places/v1/places:searchText",{textQuery:`${data.q}, India`,pageSize:6,regionCode:"IN"});
  return (j.places??[]).map((p:{location?:{latitude:number;longitude:number};formattedAddress?:string;addressComponents?:{types:string[];longText:string}[]})=>{const c=(type:string)=>p.addressComponents?.find(x=>x.types.includes(type))?.longText; return {lat:p.location?.latitude,lng:p.location?.longitude,label:p.formattedAddress??data.q,pincode:c("postal_code"),city:c("locality")??c("administrative_area_level_2"),state:c("administrative_area_level_1")};}).filter((p:GeoHit)=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)) as GeoHit[];
});
export const googleReverse=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((d:{lat:number;lng:number})=>z.object({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180)}).parse(d)).handler(async({data})=>{
  const j=await mapsRequest(`maps/api/geocode/json?latlng=${data.lat},${data.lng}`); const p=j.results?.[0]; if(!p) return null; const c=(t:string)=>p.address_components?.find((x:{types:string[]})=>x.types.includes(t))?.long_name;
  return {lat:data.lat,lng:data.lng,label:p.formatted_address,pincode:c("postal_code"),city:c("locality")??c("administrative_area_level_2"),state:c("administrative_area_level_1")} as GeoHit;
});