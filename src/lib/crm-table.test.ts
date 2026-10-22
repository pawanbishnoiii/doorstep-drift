import { describe, expect, it } from 'vitest';
import { sortRows, toCsv } from './crm-table';
import { isLoginOnlyEmail } from './india-states';
describe('crm table', () => {
  it('sorts numbers descending', () => { expect(sortRows([{ p: 2 }, { p: 9 }, { p: 5 }], 'p', 'desc').map(r => r.p)).toEqual([9, 5, 2]); });
  it('escapes csv commas and quotes', () => { expect(toCsv([{ a: 'x,y', b: 'he said "hi"' }])).toBe('a,b\n"x,y","he said ""hi"""'); });
  it('treats phone login emails as login-only', () => { expect(isLoginOnlyEmail('919876543210@phone.getxpress.in')).toBe(true); expect(isLoginOnlyEmail('me@gmail.com')).toBe(false); });
});
