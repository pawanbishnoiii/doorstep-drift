import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useEffect,useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft,ArrowRight,Check,Loader2,ShieldCheck } from 'lucide-react';
import { AppShell,PageHeader } from '@/components/site/AppShell';
import { PhoneVerify } from '@/components/site/PhoneVerify';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/integrations/supabase/client';
import { contactSchema } from '@/lib/contact-schema';
import { INDIA_STATES, isLoginOnlyEmail } from '@/lib/india-states';
import { saveContactDetails,finishOnboarding } from '@/lib/onboarding.functions';
export const Route=createFileRoute('/_authenticated/onboarding')({head:()=>({meta:[{title:'Your details & contact verification — Get Xpress'},{name:'description',content:'Set up your Get Xpress customer profile in two quick steps.'},{property:'og:title',content:'Your Get Xpress profile'},{property:'og:description',content:'Personal details, region and contact verification.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:Onboarding});
const input='mt-1 h-12 w-full rounded-md border bg-card px-3';
function Onboarding(){
 const {data}=useProfile();const p=data?.profile as (NonNullable<typeof data>['profile'] & {state?:string|null;district?:string|null})|undefined;const qc=useQueryClient();const navigate=useNavigate();
 const saveDetails=useServerFn(saveContactDetails);const finish=useServerFn(finishOnboarding);
 const [step,setStep]=useState(1);const [busy,setBusy]=useState(false);const [number,setNumber]=useState('');
 const [f,setF]=useState({first_name:'',last_name:'',age:'',gender:'',contact_email:'',phone:'',whatsapp:'',state:'',district:''});
 const verified=Boolean(p?.phone_verified&&p?.phone);
 useEffect(()=>{if(p)setF({first_name:p.first_name??p.full_name?.split(' ')[0]??'',last_name:p.last_name??p.full_name?.split(' ').slice(1).join(' ')??'',age:String(p.age??''),gender:p.gender??'',contact_email:isLoginOnlyEmail(p.contact_email)?'':(p.contact_email??''),phone:p.phone?.replace(/^\+91/,'')??'',whatsapp:p.whatsapp?.replace(/^\+91/,'')??'',state:p.state??'',district:p.district??''})},[p]);
 const set=(k:keyof typeof f)=>(v:string)=>setF(x=>({...x,[k]:v}));
 const {data:districts=[]}=useQuery({queryKey:['districts',f.state],enabled:!!f.state,staleTime:600000,queryFn:async()=>{const {data}=await supabase.from('pincodes').select('city').eq('state',f.state).limit(1000);return [...new Set((data??[]).map(r=>r.city))].sort()}});
 const done=async()=>{await finish({data:{state:f.state,district:f.district}});await qc.invalidateQueries({queryKey:['profile']});toast.success('Your profile is ready');navigate({to:'/users/dashboard'});};
 const next=async(e:React.FormEvent)=>{e.preventDefault();if(isLoginOnlyEmail(f.contact_email)){toast.error('Please enter your own email address');return;}if(!f.state||f.district.trim().length<2){toast.error('Select your state and district');return;}const result=contactSchema.safeParse(f);if(!result.success){toast.error(result.error.issues[0]?.message??'Check your details');return;}setBusy(true);try{const r=await saveDetails({data:result.data});setNumber(r.number);await qc.invalidateQueries({queryKey:['profile']});if(r.verified)await done();else setStep(2);}catch(e){toast.error((e as Error).message)}finally{setBusy(false)}};
 const complete=async()=>{setBusy(true);try{await done()}catch(e){toast.error((e as Error).message)}finally{setBusy(false)}};
 return <AppShell skipOnboarding requirePhone={false}><PageHeader title='Welcome to Get Xpress' sub='Your profile'/><div className='max-w-2xl'><div className='mb-8 flex items-center gap-4 border-b pb-5'>{['Personal details','Verify mobile'].map((s,i)=><div key={s} className={`flex items-center gap-2 text-sm font-semibold ${step===i+1?'text-primary':'text-muted-foreground'}`}><span className='grid h-8 w-8 shrink-0 place-items-center rounded-full border'>{step>i+1||(i===1&&verified)?<Check className='h-4 w-4'/>:i+1}</span>{s}</div>)}</div>
 {step===1?<form onSubmit={next} className='grid gap-4 sm:grid-cols-2'>
  <label className='text-sm font-semibold'>First name<input aria-label='First name' maxLength={60} autoComplete='given-name' value={f.first_name} onChange={e=>set('first_name')(e.target.value)} required className={input}/></label>
  <label className='text-sm font-semibold'>Last name<input aria-label='Last name' maxLength={60} autoComplete='family-name' value={f.last_name} onChange={e=>set('last_name')(e.target.value)} required className={input}/></label>
  <label className='text-sm font-semibold'>Age<input aria-label='Age' type='number' min={13} max={100} required value={f.age} onChange={e=>set('age')(e.target.value)} className={input}/></label>
  <label className='text-sm font-semibold'>Gender<select aria-label='Gender' required value={f.gender} onChange={e=>set('gender')(e.target.value)} className={input}><option value=''>Select</option><option value='female'>Female</option><option value='male'>Male</option><option value='other'>Other</option></select></label>
  <label className='text-sm font-semibold sm:col-span-2'>Your email<input aria-label='Email' type='email' autoComplete='email' maxLength={255} required placeholder='you@example.com' value={f.contact_email} onChange={e=>set('contact_email')(e.target.value)} className={input}/></label>
  <label className='text-sm font-semibold'>State<select aria-label='State' required value={f.state} onChange={e=>setF(x=>({...x,state:e.target.value,district:''}))} className={input}><option value=''>Select state</option>{INDIA_STATES.map(s=><option key={s}>{s}</option>)}</select></label>
  <label className='text-sm font-semibold'>District<input aria-label='District' list='district-list' required maxLength={80} disabled={!f.state} placeholder={f.state?'Type or pick district':'Select state first'} value={f.district} onChange={e=>set('district')(e.target.value)} className={input}/><datalist id='district-list'>{districts.map(d=><option key={d} value={d}/>)}</datalist></label>
  {verified?<p className='flex items-center gap-2 text-sm font-semibold text-primary sm:col-span-2'><ShieldCheck className='h-4 w-4'/>Mobile verified · {p?.phone}</p>:(['phone','whatsapp'] as const).map(k=><label key={k} className='text-sm font-semibold'>{k==='phone'?'Phone number':'WhatsApp number'}<div className='relative'><span className='absolute left-3 top-5 text-muted-foreground'>+91</span><input aria-label={k==='phone'?'Phone number':'WhatsApp number'} inputMode='numeric' maxLength={10} value={f[k]} onChange={e=>set(k)(e.target.value.replace(/\D/g,''))} className={`${input} pl-12`}/></div></label>)}
  {!verified&&<p className='text-xs text-muted-foreground sm:col-span-2'>Phone or WhatsApp — at least one is required.</p>}
  <Button disabled={busy} type='submit' className='mt-2 h-12 sm:col-span-2'>{busy?<Loader2 className='animate-spin'/>:<ArrowRight/>}{verified?'Finish setup':'Continue'}</Button>
 </form>:<div><Button variant='ghost' onClick={()=>setStep(1)}><ArrowLeft/>Personal details</Button>{!p?.phone_verified?<PhoneVerify key={number} initialPhone={number} onDone={()=>qc.invalidateQueries({queryKey:['profile']})}/>:<><p className='my-5 flex items-center gap-2 text-sm font-semibold text-primary'><ShieldCheck/>Contact verified · {p.phone}</p><Button disabled={busy} onClick={complete} className='h-12 w-full'>{busy?<Loader2 className='animate-spin'/>:<Check/>}Finish setup</Button></>}</div>}
 </div></AppShell>;
}
