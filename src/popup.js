"use strict";
const C = globalThis.ZohoAutofillCore;
const $ = id => document.getElementById(id);
let tabId, token, polling;
function view(name) {
  document.querySelectorAll('[data-view]').forEach(section => { section.hidden = section.dataset.view !== name; });
  $('footer').hidden = false;
  $('status').hidden = true;
}
function error(message) { $('status').textContent = message; $('status').hidden = false; }
function config() {
  return C.validateConfig({ hours: $('hours').value, description: $('description').value, includeWeekends: $('includeWeekends').checked, skipExisting: $('skipExisting').checked });
}
async function save(value) {
  const { hours, description, includeWeekends, skipExisting } = value;
  await chrome.storage.local.set({ settings: { hours, description, includeWeekends, skipExisting } });
}
async function send(action, extra = {}) {
  const response = await chrome.tabs.sendMessage(tabId, { namespace: 'zoho-monthly-autofill', action, ...extra });
  if (!response?.ok) throw new Error(response?.error || 'Could not connect to Zoho. Reopen the extension.');
  return response.result;
}
function renderResult(result) {
  if (result.running || result.state === 'running') {
    view('running'); $('progress-message').textContent = result.message;
    if (result.report?.planned) { $('progress').max = result.report.planned; $('progress').value = result.report.filled; }
    else $('progress').removeAttribute('value');
    return;
  }
  view('summary');
  const r = result.report || {};
  $('summary-title').textContent = result.state === 'done' ? 'Your month is ready' : 'Filling stopped';
  $('summary-icon').textContent = result.state === 'done' ? '✓' : '!';
  $('summary-message').textContent = result.message;
  $('summary-days').textContent = r.filled || 0;
  $('summary-hours').textContent = Number.isFinite(r.minutesPerDay) ? C.formatMinutes((r.filled || 0) * r.minutesPerDay) : '—';
  $('summary-weekends').textContent = r.skippedWeekends || 0;
  $('summary-existing').textContent = r.skippedExisting || 0;
  $('summary-errors').textContent = r.errors || (result.state === 'error' ? 1 : 0);
}
function watch() {
  clearTimeout(polling);
  polling = setTimeout(async () => {
    try { const result = await send('status'); renderResult(result); if (result.running) watch(); }
    catch (e) { renderResult({ state: 'error', message: e.message }); }
  }, 500);
}
$('settings').addEventListener('submit', async event => {
  event.preventDefault(); $('fields').disabled = true; $('status').hidden = true;
  try {
    const value = config(); $('hours').value = value.hours; await save(value);
    const p = await send('preview', { config: value }); token = p.token;
    $('preview-context').textContent = `Month ${p.month} · Row ${p.row}`;
    $('preview-days').textContent = p.days; $('preview-hours').textContent = p.totalHours;
    $('preview-description').textContent = p.description;
    $('preview-skipped').textContent = `Skipped weekend days: ${p.skippedWeekends}. Existing entries kept: ${p.skippedExisting}.`;
    view('confirmation'); $('continue').disabled = !p.verified || !p.days;
    if (!p.verified) error('The Description integration needs verification.');
    else if (!p.days) error('There are no days to fill with these settings.');
  } catch (e) { error(e.message); }
  finally { $('fields').disabled = false; }
});
$('back').addEventListener('click', () => { token = null; view('settings'); });
$('restart').addEventListener('click', async () => {
  try { const result = await send('availability'); view(result.available ? 'settings' : 'unavailable'); }
  catch { view('unavailable'); }
});
$('settings').addEventListener('change', async () => { try { await save(config()); } catch { /* Keep invalid drafts editable. */ } });
$('continue').addEventListener('click', async () => {
  $('continue').disabled = true; $('stop').disabled = false; view('running');
  $('progress-message').textContent = 'Applying hours and description…'; $('progress').removeAttribute('value');
  // The run response handles this popup; polling is only needed when reopening it.
  try { renderResult(await send('run', { token })); }
  catch (e) { renderResult({ state: 'error', message: e.message }); }
  finally { token = null; }
});
$('stop').addEventListener('click', async () => {
  $('stop').disabled = true;
  try { $('progress-message').textContent = (await send('stop')).message; }
  catch (e) { error(e.message); $('stop').disabled = false; }
});
(async () => {
  try {
    const value = { ...C.defaults, ...(await chrome.storage.local.get('settings')).settings };
    $('hours').value = value.hours; $('description').value = value.description;
    $('includeWeekends').checked = value.includeWeekends === true; $('skipExisting').checked = value.skipExisting !== false;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) { view('unavailable'); return; }
    tabId = tab.id;
    await chrome.scripting.executeScript({ target: { tabId }, files: ['core.js', 'description-adapter.js', 'content.js'] });
    const availability = await send('availability');
    if (!availability.available) { view('unavailable'); return; }
    const result = await send('status');
    if (result.running) { renderResult(result); watch(); }
    else if (result.report) renderResult(result);
    else view('settings');
  } catch { view('unavailable'); }
})();

