import {it,expect} from 'vitest';
import {DEMO_SHIPMENTS,advanceDemo,demoPieceIds} from './demo-data';
it('advances booked demo parcels through delivery without real provider calls',()=>{let s={...DEMO_SHIPMENTS[0]};if(!s.tracking_number)throw Error('Missing fixture');for(let i=0;i<5;i++)s=advanceDemo(s);expect(s.status).toBe('delivered');expect(advanceDemo(s).status).toBe('delivered')});
it('every sample parcel has a separate nonproduction identifier',()=>{const ids=DEMO_SHIPMENTS.flatMap(demoPieceIds);expect(new Set(ids).size).toBe(ids.length);expect(ids.every(id=>id.startsWith('DEMO-'))).toBe(true)});
