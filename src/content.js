(() => {
  "use strict";
  if (globalThis.ZohoMonthlyAutofill) return;
  const C = globalThis.ZohoAutofillCore;
  const PREFIX = "[Zoho Monthly Autofill]";
  const INPUT = 'td[logperiod="month"] input[textinput="monthlyLog"]';
  const EDITABLE = 'textarea, input:not([type]), input[type="text"], [contenteditable="true"]';
  let pending = null;
  let running = false;
  let controller = null;
  let status = { state: "idle", message: "Ready to detect the open month." };
  const log = (...args) => console.debug(PREFIX, ...args);
  const all = (root, selector) => [...root.querySelectorAll(selector)];
  function visible(element) {
    if (!element?.isConnected || element.closest('[hidden], .zpl_DNI, [aria-hidden="true"]')) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  }
  function editable(element) {
    return visible(element) && !element.matches(':disabled, [readonly], [aria-disabled="true"]');
  }
  function setNativeInputValue(element, value) {
    if (!editable(element)) throw new Error("The field is not editable.");
    if (element.maxLength >= 0 && value.length > element.maxLength) throw new Error("The text exceeds the length allowed by Zoho.");
    element.focus();
    const view = element.ownerDocument.defaultView;
    const prototype = element.tagName === "TEXTAREA" ? view.HTMLTextAreaElement.prototype : view.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (!setter) throw new Error("Unsupported editor type.");
    setter.call(element, value);
    element.dispatchEvent(new view.Event("input", { bubbles: true }));
    element.dispatchEvent(new view.Event("change", { bubbles: true }));
    element.blur();
    if (!element.isConnected || element.value !== value) throw new Error("Zoho replaced or rejected the field value. Review the indicated date.");
  }
  function waitFor(check, { timeout = 6000, signal } = {}) {
    return new Promise((resolve, reject) => {
      let timer;
      const observer = new MutationObserver(probe);
      function done(error, value) {
        observer.disconnect(); clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        document.removeEventListener("transitionend", probe, true);
        error ? reject(error) : resolve(value);
      }
      function abort() { done(new Error("Operation stopped. Review partial changes.")); }
      function probe() {
        try { const found = check(); if (found) done(null, found); } catch (error) { done(error); }
      }
      if (signal?.aborted) return abort();
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      signal?.addEventListener("abort", abort, { once: true });
      document.addEventListener("transitionend", probe, true);
      timer = setTimeout(() => done(new Error("Timed out: Zoho did not show the expected state.")), timeout);
      probe();
    });
  }
  function selection(row, name) {
    const input = row.querySelector(`[name="${name}"]`);
    if (!input || input.disabled) return null;
    const box = input.parentElement.querySelector('.zselectbox');
    const text = box?.querySelector('.zselectbox__text');
    const label = text?.textContent.trim() || "";
    if (box && (!visible(box) || box.getAttribute("aria-disabled") === "true" || !label || text.classList.contains("zselectbox__placeholder") || /^(select|seleccionar|seleccione)(\s.*)?$/i.test(label))) return null;
    const value = input.value.trim();
    if (!box && (!value || value === "-1" || value === "0")) return null;
    return { value, label };
  }
  function identity(row) {
    const project = selection(row, "project"), job = selection(row, "job");
    return project && job ? JSON.stringify({ project, job }) : null;
  }
  function headers(view) {
    const head = view.querySelector("#monthheader");
    if (!head) throw new Error("Monthly header not found.");
    const dates = all(head, 'th[date]').filter(visible).map(th => {
      const date = th.getAttribute("date"); C.parseDate(date);
      return { date, weekend: th.getAttribute("weekend") === "true" };
    });
    const keys = dates.map(x => x.date);
    if (!keys.length || new Set(keys).size !== keys.length || new Set(keys.map(x => x.slice(0, 7))).size !== 1) throw new Error("The monthly calendar is incomplete or ambiguous.");
    const first = C.parseDate(keys[0]);
    const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    if (dates.length !== count) throw new Error("The monthly calendar is not fully loaded yet.");
    return dates.sort((a, b) => a.date.localeCompare(b.date));
  }
  function getView() {
    const views = all(document, '#monthlylogtime').filter(visible);
    if (views.length !== 1 || !views[0].querySelector('#month_viewlist')) throw new Error("Zoho Monthly Log view not found.");
    return views[0];
  }
  function dayInput(row, date) {
    const inputs = all(row, INPUT).filter(input => (input.getAttribute("actualdate") || input.getAttribute("date")) === date && editable(input));
    if (inputs.length !== 1) throw new Error(`Expected one editable hours field for ${date}.`);
    const input = inputs[0];
    if (input.getAttribute("date") && input.getAttribute("date") !== date) throw new Error(`Inconsistent dates for ${date}.`);
    return input;
  }
  function descriptionIcon(input) {
    // Both duration and from/to widgets have an icon: use the duration sibling.
    const icons = all(input.parentElement, '[data-popup-open="descriptionEntry"]').filter(visible);
    if (icons.length !== 1) throw new Error("Expected one Description icon next to the hours field.");
    return icons[0];
  }
  function snapshot(config) {
    const view = getView();
    const dates = headers(view);
    const row = all(view.querySelector('#month_viewlist'), 'tr[rowno]').find(row => visible(row) && identity(row));
    if (!row) throw new Error("No Project/Job is selected. Select both in Zoho before running Auto Fill.");
    const rowKey = row.getAttribute("rowno");
    if (!/^\d+$/.test(rowKey)) throw new Error("Invalid row identifier.");
    const days = dates.map(day => ({ ...day, value: dayInput(row, day.date).value }));
    const plan = C.planDays(days, config);
    for (const day of plan.targets) descriptionIcon(dayInput(row, day.date));
    log("Monthly view detected");
    return { view, row, rowKey, identity: identity(row), dates, days, plan };
  }
  function currentRow(plan) {
    const view = getView();
    if (view !== plan.view || JSON.stringify(headers(view)) !== JSON.stringify(plan.dates)) throw new Error("Zoho changed the month or rebuilt the view. Generate a new preview.");
    const rows = all(view.querySelector('#month_viewlist'), 'tr[rowno]').filter(row => row.getAttribute("rowno") === plan.rowKey && visible(row));
    if (rows.length !== 1 || rows[0] !== plan.row || identity(rows[0]) !== plan.identity) throw new Error("Zoho changed the row, Project or Job. Operation stopped.");
    return rows[0];
  }
  function structuralInfo(element) {
    // No values, text, outerHTML, project names or descriptions in logs.
    return { tag: element.tagName, id: element.id, role: element.getAttribute("role"), type: element.getAttribute("type") };
  }
  function popups() {
    return all(document, '#bulklog_add_edit, [role="dialog"], [aria-modal="true"], [data-type="modal"]').filter(visible);
  }
  async function openDescription(input, signal) {
    if (popups().length) throw new Error("Close open Zoho popups before continuing.");
    const previouslyVisible = new Set(all(document, EDITABLE).filter(visible));
    descriptionIcon(input).click();
    let popup;
    try {
      popup = await waitFor(() => {
        const exact = all(document, '#bulklog_add_edit').filter(visible);
        if (exact.length > 1) throw new Error("Multiple Description popups are visible.");
        if (exact.length === 1 && all(exact[0], EDITABLE).some(editable)) return exact[0];
        const candidates = popups().filter(p => all(p, EDITABLE).some(e => editable(e) && !previouslyVisible.has(e)));
        if (candidates.length > 1) throw new Error("The detected popup is ambiguous.");
        return candidates.length === 1 ? candidates[0] : null;
      }, { signal });
    } catch (error) {
      log("Popup detection failed", popups().map(structuralInfo));
      throw error;
    }
    log("Description popup detected", structuralInfo(popup), {
      editors: all(popup, EDITABLE).filter(editable).map(structuralInfo),
      buttons: all(popup, 'button, [role="button"]').filter(visible).map(structuralInfo)
    });
    return popup;
  }
  async function inspect(config) {
    if (running) throw new Error("An operation is already in progress.");
    running = true; pending = null; controller = new AbortController();
    let date;
    try {
      const data = snapshot(config);
      date = data.plan.targets[0]?.date;
      if (!date) throw new Error("There are no eligible days to inspect.");
      log("Opening description popup for", date);
      const popup = await openDescription(dayInput(data.row, date), controller.signal);
      status = { state: "inspected", message: `Popup detected for ${date}. Editors: ${all(popup, EDITABLE).filter(editable).length}. No values were written or confirmed. Close it with Cancel in Zoho. Structural details are in console.debug.` };
      return status;
    } catch (error) {
      status = { state: "error", message: `${date ? date + ": " : ""}${error.message}` }; throw new Error(status.message);
    } finally { running = false; controller = null; }
  }
  function preview(config) {
    if (running) throw new Error("An operation is already in progress.");
    const data = snapshot(config);
    const token = crypto.randomUUID();
    pending = { ...data, config, token, created: Date.now() };
    return { token, row: data.rowKey, month: data.dates[0].date.slice(0, 7), days: data.plan.targets.length, totalHours: data.plan.totalHours, skippedWeekends: data.plan.skippedWeekends, skippedExisting: data.plan.skippedExisting, description: config.description, verified: globalThis.ZohoDescriptionAdapter.verified };
  }
  async function run(token) {
    if (running) throw new Error("An operation is already in progress.");
    const job = pending; pending = null;
    if (!job || job.token !== token || Date.now() - job.created > 120000) throw new Error("The preview expired. Generate a new one.");
    const adapter = globalThis.ZohoDescriptionAdapter;
    if (!adapter.verified) throw new Error(adapter.reason);
    currentRow(job);
    if (popups().length) throw new Error("Close open Zoho popups before continuing.");
    // Abort stale previews before the first write, even when overwriting is enabled.
    for (const day of job.days) if (dayInput(job.row, day.date).value !== day.value) throw new Error("Values changed since the preview. Generate a new one.");
    running = true; controller = new AbortController();
    const report = { filled: 0, planned: job.plan.targets.length, minutesPerDay: job.config.minutes, skippedWeekends: job.plan.skippedWeekends, skippedExisting: job.plan.skippedExisting, errors: 0, failedDate: null, partialDate: null };
    for (const day of job.days) {
      if (!job.config.includeWeekends && C.isWeekend(day.date, day.weekend)) log("Skipping weekend", day.date);
      else if (job.config.skipExisting && C.hasExisting(day.value)) log("Existing entry found", day.date);
    }
    status = { state: "running", message: "Filling days…", report };
    let date;
    try {
      for (const day of job.plan.targets) {
        date = day.date;
        if (controller.signal.aborted) throw new Error("Operation stopped.");
        const row = currentRow(job);
        const input = dayInput(row, date);
        if (input.value !== day.value) throw new Error("The value changed during the operation.");
        log("Processing", date);
        report.partialDate = date;
        setNativeInputValue(input, job.config.hours);
        currentRow(job);
        const popup = await openDescription(dayInput(row, date), controller.signal);
        await adapter.apply({ popup, row, date, description: job.config.description, setNativeInputValue, waitFor, visible, signal: controller.signal,
          guard: () => { if (controller.signal.aborted) throw new Error("Operation stopped."); currentRow(job); },
          reopen: () => openDescription(dayInput(currentRow(job), date), controller.signal)
        });
        currentRow(job);
        if (dayInput(row, date).value !== job.config.hours) throw new Error("Zoho changed the hours after confirming the description.");
        report.filled++; report.partialDate = null;
        status.message = `Completed ${report.filled} of ${job.plan.targets.length} days.`;
      }
      status = { state: "done", message: "Filling complete. Review hours and descriptions before saving manually in Zoho.", report };
    } catch (error) {
      report.errors++; report.failedDate = date;
      log("Stopped at", date, "Review the partially edited day; no automatic retry.");
      status = { state: "error", message: `${date || ""}: ${error.message} Review partial changes; they were not automatically reverted.`, report };
    } finally { running = false; controller = null; }
    return status;
  }
  const api = Object.freeze({ preview, run, inspect, getStatus: () => status, stop: () => controller?.abort(), visible, setNativeInputValue, waitFor });
  globalThis.ZohoMonthlyAutofill = api;
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || message?.namespace !== "zoho-monthly-autofill") return;
    (async () => {
      switch (message.action) {
        case "availability": {
          try { getView(); return { available: true }; }
          catch { return { available: false }; }
        }
        case "preview": return preview(C.validateConfig(message.config));
        case "inspect": return inspect(C.validateConfig(message.config));
        case "run": return run(message.token);
        case "status": return { ...status, running };
        case "stop": controller?.abort(); return { message: "Stop requested. Review the last modified day." };
        default: throw new Error("Unknown action.");
      }
    })().then(result => respond({ ok: true, result }), error => respond({ ok: false, error: error.message }));
    return true;
  });
})();
