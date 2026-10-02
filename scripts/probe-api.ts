// Phase 0 probe: GET-only calls to the Nexus API using the saved session. Only POST: /api/auth/refresh.
import 'dotenv/config';
import fs from 'node:fs';
const base = process.env.NEXUS_BASE_URL!;
const api = 'https://api-students.mesaschool.co.in/api/v1';
const sp = process.env.NEXUS_STORAGE_STATE_PATH || './.auth/nexus-state.json';
const state = JSON.parse(fs.readFileSync(sp, 'utf8'));
const rt = state.cookies.find((c: any) => c.name === 'refresh_token');
const r = await fetch(`${base}/api/auth/refresh`, { method: 'POST', headers: { cookie: `refresh_token=${rt.value}`, origin: base, 'content-type': 'application/json' }, body: '{}' });
console.log('refresh', r.status, [...r.headers.keys()].filter(k=>/set-cookie|content-type/.test(k)));
const body: any = await r.json().catch(() => ({}));
console.log('refresh body keys', Object.keys(body), body.data ? Object.keys(body.data) : '');
const sc = r.headers.getSetCookie?.() ?? [];
const nrt = sc.map(s => s.match(/^refresh_token=([^;]+)/)?.[1]).find(Boolean);
if (nrt) { rt.value = nrt; fs.writeFileSync(sp, JSON.stringify(state)); console.log('refresh token rotated + saved'); }
const token = body.accessToken ?? body.access_token ?? body.data?.accessToken ?? body.data?.access_token ?? body.token;
if (!token) { console.log('no token found'); process.exit(1); }
const paths = ['assignments/my','announcements','notifications','events/my','attendance/student/summary','startup-leaders/student/weeks','mrs/assessments','banners/student','coach/scenarios','courses','courses/my'];
for (const p of paths) {
  await new Promise(r => setTimeout(r, Number(process.env.NEXUS_REQUEST_DELAY_MS || 1500)));
  const x = await fetch(`${api}/${p}`, { headers: { authorization: `Bearer ${token}` } });
  const t = await x.text();
  fs.writeFileSync(`data/discovery/${p.replace(/\//g, '_')}.json`, t);
  console.log(p, x.status, t.length);
}
