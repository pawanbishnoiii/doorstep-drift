import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useMemo,useState} from 'react';
import {Link} from '@tanstack/react-router';
import {ArrowDownUp,Download,FileText,RefreshCw} from 'lucide-react';
import {toast} from 'sonner';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {sortRows,toCsv,type SortDir} from '@/lib/crm-table';

const COLS=[['tracking_number','Master AWB'],['sender_name','Sender'],['receiver_name','Recipient'],['receiver_city','Route'],['service','Service'],['pieces_count','Parcels'],['price','Price'],['payment_status','Payment'],['status','Status'],['created_at','Booked']] as const;
type Key=typeof COLS[number][0];
const BULK=['picked_up','in_transit','out_for_delivery','delivered','exception','cancelled'];

export function AdminShipmentTable(){
 const qc=useQueryClient();
 const [q,setQ]=useState(''),[status,setStatus]=useState('all'),[pay,setPay]=useState('all'),[sort,setSort]=useState<{k:Key;d:SortDir}>({k:'created_at',d:'desc'}),[sel,setSel]=useState<Set<string>>(new Set()),[bulk,setBulk]=useState(''),[busy,setBusy]=useState(false);
 const {data=[],error,refetch,isFetching}=useQuery({queryKey:['admin-shipment-table'],queryFn:async()=>{const {data,error}=await supabase.from('shipments').select('id,tracking_number,sender_name,receiver_name,sender_city,receiver_city,pieces_count,service,price,status,payment_status,created_at').order('created_at',{ascending:false}).limit(500);if(error)throw error;return data??[]}});
 const rows=useMemo(()=>sortRows(data.filter(r=>(status==='all'||r.status===status)&&(pay==='all'||r.payment_status===pay)&&`${r.tracking_number} ${r.sender_name} ${r.receiver_name} ${r.sender_city} ${r.receiver_city}`.toLowerCase().includes(q.toLowerCase())),sort.k,sort.d),[data,status,pay,q,sort]);
 const flat=rows.map(({id:_id,...r})=>r);
 const exportXlsx=async()=>{const x=await import('xlsx');const w=x.utils.book_new();x.utils.book_append_sheet(w,x.utils.json_to_sheet(flat),'Shipments');x.writeFile(w,'Get-Xpress-shipments.xlsx')};
 const exportCsv=()=>{const b=new Blob([toCsv(flat)],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='Get-Xpress-shipments.csv';a.click();URL.revokeObjectURL(a.href)};
 const toggle=(id:string)=>setSel(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n});
 const allOn=rows.length>0&&rows.every(r=>sel.has(r.id));
 const applyBulk=async()=>{if(!bulk||!sel.size)return;setBusy(true);const ids=[...sel];const {data:upd,error}=await supabase.from('shipments').update({status:bulk,updated_at:new Date().toISOString()}).in('id',ids).select('id');setBusy(false);if(error){toast.error('Bulk update failed: '+error.message);return;}toast.success(`${upd?.length??0} of ${ids.length} shipments updated`);setSel(new Set());qc.invalidateQueries({queryKey:['admin-shipment-table']});qc.invalidateQueries({queryKey:['audit-log']});};
 const head=(k:Key,l:string)=><th key={k}><button onClick={()=>setSort(s=>({k,d:s.k===k&&s.d==='asc'?'desc':'asc'}))} className='inline-flex items-center gap-1 font-bold'>{l}<ArrowDownUp className={`h-3 w-3 ${sort.k===k?'text-primary':'opacity-40'}`}/></button></th>;
 return <section className='mt-8 border-t pt-6'>
  <div className='flex flex-wrap items-center justify-between gap-3'><h2 className='text-2xl font-extrabold'>Shipment register</h2><div className='flex flex-wrap gap-2'><Button asChild variant='outline'><Link to='/demo'>Demo workspace</Link></Button><Button variant='outline' size='icon' aria-label='Refresh shipment register' disabled={isFetching} onClick={()=>refetch()}><RefreshCw/></Button><Button variant='outline' disabled={!rows.length} onClick={exportCsv}><FileText/>CSV</Button><Button disabled={!rows.length} onClick={exportXlsx}><Download/>Excel</Button></div></div>
  <div className='my-4 flex flex-wrap gap-3'><input aria-label='Search shipment register' value={q} onChange={e=>setQ(e.target.value)} placeholder='Search AWB, name or city' className='h-11 min-w-0 flex-1 rounded-md border bg-card px-3'/>
   <select aria-label='Status filter' value={status} onChange={e=>setStatus(e.target.value)} className='h-11 rounded-md border bg-card px-3'><option value='all'>All statuses</option>{[...new Set(data.map(s=>s.status))].map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select>
   <select aria-label='Payment filter' value={pay} onChange={e=>setPay(e.target.value)} className='h-11 rounded-md border bg-card px-3'><option value='all'>All payments</option>{[...new Set(data.map(s=>s.payment_status))].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
  {sel.size>0&&<div className='mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-secondary p-3 text-sm'><b>{sel.size} selected</b><select aria-label='Bulk status' value={bulk} onChange={e=>setBulk(e.target.value)} className='h-10 rounded-md border bg-card px-2'><option value=''>Set status…</option>{BULK.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select><Button size='sm' disabled={!bulk||busy} onClick={applyBulk}>Apply</Button><Button size='sm' variant='ghost' onClick={()=>setSel(new Set())}>Clear</Button></div>}
  {error?<p className='p-4 text-destructive'>Could not load shipments. Please refresh.</p>:<div className='overflow-x-auto border'><table className='enterprise-table'><thead><tr><th><input type='checkbox' aria-label='Select all' checked={allOn} onChange={()=>setSel(allOn?new Set():new Set(rows.map(r=>r.id)))}/></th>{COLS.map(([k,l])=>head(k,l))}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><input type='checkbox' aria-label={`Select ${r.tracking_number}`} checked={sel.has(r.id)} onChange={()=>toggle(r.id)}/></td><td className='whitespace-nowrap font-mono font-bold'>{r.tracking_number}</td><td>{r.sender_name}</td><td>{r.receiver_name}</td><td>{r.sender_city} → {r.receiver_city}</td><td>{r.service}</td><td>{r.pieces_count}</td><td>₹{r.price}</td><td>{r.payment_status}</td><td className='whitespace-nowrap'>{r.status.replaceAll('_',' ')}</td><td className='whitespace-nowrap text-xs'>{new Date(r.created_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table>{!rows.length&&<p className='p-8 text-center text-sm text-muted-foreground'>No matching live shipments. Sample shipments are in the separate demo workspace.</p>}</div>}
  <p className='mt-2 text-xs text-muted-foreground'>Latest 500 shipments · {rows.length} matching rows · bulk changes are recorded in the audit log</p>
 </section>;
}

export function AuditLogPanel(){
 const [kind,setKind]=useState('all');
 const {data=[],error,refetch,isFetching}=useQuery({queryKey:['audit-log'],queryFn:async()=>{const {data,error}=await supabase.from('audit_logs').select('id,actor,action,entity,entity_id,meta,created_at').order('created_at',{ascending:false}).limit(200);if(error)throw error;return data??[]}});
 const rows=data.filter(r=>kind==='all'||r.entity===kind);
 return <section className='mt-8 border-t pt-6'><div className='flex flex-wrap items-center justify-between gap-3'><h2 className='text-2xl font-extrabold'>Audit log</h2><div className='flex gap-2'><select aria-label='Audit entity' value={kind} onChange={e=>setKind(e.target.value)} className='h-10 rounded-md border bg-card px-2'><option value='all'>All activity</option>{[...new Set(data.map(r=>r.entity))].map(e=><option key={e} value={e}>{e.replaceAll('_',' ')}</option>)}</select><Button variant='outline' size='icon' aria-label='Refresh audit log' disabled={isFetching} onClick={()=>refetch()}><RefreshCw/></Button></div></div>
  {error?<p className='p-4 text-destructive'>Could not load audit log.</p>:<div className='mt-4 max-h-[480px] overflow-auto border'><table className='enterprise-table'><thead><tr>{['Time','Action','Area','Record','Details','By'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className='whitespace-nowrap text-xs'>{new Date(r.created_at).toLocaleString('en-IN')}</td><td className='font-semibold'>{r.action}</td><td>{r.entity.replaceAll('_',' ')}</td><td className='max-w-[140px] truncate font-mono text-xs'>{r.entity_id}</td><td className='max-w-[320px] truncate text-xs'>{Object.entries((r.meta??{}) as Record<string,unknown>).map(([k,v])=>`${k}: ${String(v)}`).join(' · ')}</td><td className='font-mono text-xs'>{r.actor?.slice(0,8)??'system'}</td></tr>)}</tbody></table>{!rows.length&&<p className='p-6 text-center text-sm text-muted-foreground'>No activity yet.</p>}</div>}
 </section>;
}
