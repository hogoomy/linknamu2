/* eslint-disable @typescript-eslint/no-require-imports */
// 실행: BASE_URL=http://localhost:3000 node tests/e2e-demo.js <스크린샷 폴더>
const { chromium, devices } = require('playwright');
const out = process.argv[2];
const base = process.env.BASE_URL || 'http://localhost:3000';
const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok -', m); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const errors = [];
  const husband = await ctx.newPage();
  husband.on('pageerror', e => errors.push(e.message));
  await husband.goto(base);
  await husband.getByText('장모님 생신 저녁').first().waitFor();
  await husband.screenshot({ path: `${out}/1-calendar-mobile.png` });
  assert(await husband.getByText('데모').isVisible(), 'demo badge shown');

  // second tab = wife
  const wife = await ctx.newPage();
  wife.on('pageerror', e => errors.push(e.message));
  await wife.goto(base);
  await wife.getByRole('button', { name: '설정', exact: true }).click();
  await wife.getByRole('button', { name: '아내(으)로 보기' }).click();
  await wife.getByText('남편 님과 연결되어 있어요').waitFor();
  assert(true, 'wife tab switched user');
  await wife.getByRole('button', { name: '할 일', exact: true }).click();

  // husband requests a task to wife
  await husband.getByRole('button', { name: '+ 할 일' }).click();
  await husband.getByRole('tab', { name: '할 일 · 부탁' }).click();
  await husband.getByPlaceholder('예) 퇴근길에 우유 사 오기').fill('택배 반품 맡기기');
  const both = await husband.getByRole('radio', { name: '함께' }).evaluate(e => getComputedStyle(e).backgroundColor);
  assert(both === 'rgba(0, 0, 0, 0)', 'only selected person highlighted (함께 bg ' + both + ')');
  await husband.screenshot({ path: `${out}/2-editor.png` });
  await husband.getByRole('button', { name: '부탁하기' }).click();
  await husband.getByText('아내에게 부탁했어요').waitFor();
  assert(true, 'husband sent request');

  // wife sees it in realtime
  await wife.getByText('택배 반품 맡기기').waitFor({ timeout: 3000 });
  assert(true, 'wife received request without reload');
  await wife.screenshot({ path: `${out}/3-wife-tasks.png` });
  await wife.getByRole('button', { name: '택배 반품 맡기기 완료' }).click();

  // husband sees done
  await husband.getByRole('button', { name: '할 일', exact: true }).click();
  await husband.getByRole('tab', { name: /부탁한 일/ }).click();
  await husband.getByRole('button', { name: /완료 \d+개 보기/ }).click();
  await husband.getByRole('button', { name: '택배 반품 맡기기 완료 취소' }).waitFor({ timeout: 3000 });
  assert(true, 'husband sees completion');

  // schedule an unscheduled task via calendar
  await husband.getByRole('button', { name: '달력', exact: true }).click();
  await husband.getByRole('button', { name: '이 날 하기' }).first().click();
  await husband.getByText('할 일을 고쳤어요').waitFor();
  await husband.getByRole('button', { name: '이 날 하기' }).waitFor({ state: 'detached', timeout: 3000 });
  assert(await husband.getByText('거실 커튼 새로 고르기').isVisible(), 'unscheduled task scheduled to day');

  // add event
  await husband.getByRole('button', { name: '+ 일정' }).click();
  await husband.getByPlaceholder('예) 친구 결혼식').fill('치과 예약');
  await husband.getByRole('radio', { name: '나' }).click();
  await husband.getByRole('button', { name: '추가하기' }).click();
  await wife.getByRole('button', { name: '달력', exact: true }).click();
  await wife.getByText('치과 예약').first().waitFor({ timeout: 3000 });
  assert(true, 'event synced to wife');
  await wife.screenshot({ path: `${out}/4-wife-calendar.png`, fullPage: true });

  // desktop
  const dctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const d = await dctx.newPage();
  d.on('pageerror', e => errors.push(e.message));
  await d.goto(base);
  await d.getByText('장모님 생신 저녁').first().waitFor();
  await d.screenshot({ path: `${out}/5-desktop.png` });
  const dark = await b.newContext({ ...devices['iPhone 13'], colorScheme: 'dark' });
  const dp = await dark.newPage(); await dp.goto(base); await dp.getByText('장모님 생신 저녁').first().waitFor();
  await dp.getByRole('button', { name: '할 일', exact: true }).click();
  await dp.screenshot({ path: `${out}/6-dark-tasks.png` });
  assert(errors.length === 0, 'no page errors ' + errors.join('|'));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
