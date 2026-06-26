import type { InflowChallan, OutflowExpense } from '../services/accounts.api';

function fmtCurrency(val: string | number) {
  return `&#8377;${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function openPrintWindow(html: string) {
  const w = window.open('', '_blank', 'width=960,height=720');
  if (!w) { alert('Please allow pop-ups to print bills.'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.addEventListener('load', () => { w.focus(); w.print(); });
}

const LOGO = `${window.location.origin}/logo.jpeg`;

const STYLE = `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; font-size: 13px; }
  @page { size: A4 portrait; margin: 14mm 16mm 18mm 16mm; }
  .page { max-width: 800px; margin: 0 auto; padding: 0; }

  /* ── Header ──────────────────────────────────────────── */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 22px 0 18px; border-bottom: 3px solid #b89047; }
  .logo-block { display: flex; align-items: center; gap: 14px; }
  .logo-block img { height: 64px; width: auto; object-fit: contain; border-radius: 6px; }
  .company h1 { font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #b89047; line-height: 1; }
  .company p { font-size: 9.5px; letter-spacing: 1.5px; color: #888; margin-top: 4px; text-transform: uppercase; }
  .bill-meta { text-align: right; }
  .bill-type { font-size: 17px; font-weight: 800; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px; }
  .bill-ref { font-size: 12px; color: #555; margin-top: 5px; }
  .bill-date { font-size: 11px; color: #777; margin-top: 3px; }

  /* ── Status ──────────────────────────────────────────── */
  .status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 10px; }
  .APPROVED  { background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; }
  .SUBMITTED { background:#fef3c7; color:#92400e; border:1px solid #fcd34d; }
  .DRAFT     { background:#f3f4f6; color:#4b5563; border:1px solid #d1d5db; }
  .REJECTED  { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }

  /* ── Sections ────────────────────────────────────────── */
  .section { margin: 22px 0 0; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #b89047; border-bottom: 1px solid #ece8df; padding-bottom: 6px; margin-bottom: 14px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; }
  .info-grid.three { grid-template-columns: 1fr 1fr 1fr; }
  .info-item label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #999; display: block; margin-bottom: 3px; }
  .info-item span { font-size: 13px; color: #111; font-weight: 500; }
  .info-item.full { grid-column: 1 / -1; }

  /* ── Amount Table ────────────────────────────────────── */
  .amt-table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13px; }
  .amt-table thead tr { background: #f9f3e8; }
  .amt-table th { padding: 9px 14px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #7a5c1e; border: 1px solid #e8dcc9; }
  .amt-table td { padding: 10px 14px; border: 1px solid #ece8df; }
  .amt-table tbody tr:nth-child(even) td { background: #fdfaf5; }
  .amt-table .total td { background: #b89047; color: #fff; font-weight: 800; font-size: 14.5px; border-color: #b89047; }
  .tr { text-align: right; }

  /* ── Payment Status Pill ─────────────────────────────── */
  .pay-pill { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; }
  .pay-RECEIVED { background:#d1fae5; color:#065f46; }
  .pay-PARTIAL  { background:#fef3c7; color:#92400e; }
  .pay-PENDING  { background:#fee2e2; color:#991b1b; }

  /* ── Approval Box ────────────────────────────────────── */
  .approval-box { margin-top: 18px; background: #f9f5ed; border: 1px solid #e8dcc9; border-radius: 8px; padding: 12px 16px; }
  .approval-box p { font-size: 11px; color: #555; }
  .approval-box strong { color: #1a1a1a; }

  /* ── Signature Row ───────────────────────────────────── */
  .sig-row { display: flex; justify-content: space-between; margin-top: 48px; padding-top: 0; }
  .sig-block { text-align: center; flex: 0 0 180px; }
  .sig-line { border-top: 1px solid #888; padding-top: 6px; font-size: 11px; color: #444; font-weight: 600; }
  .sig-sub  { font-size: 10px; color: #888; margin-top: 2px; }

  /* ── Footer ──────────────────────────────────────────── */
  .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; padding-top: 12px; border-top: 1px solid #ece8df; }
  .footer-note { font-size: 9.5px; color: #aaa; }
  .footer-brand { font-size: 10px; font-weight: 800; color: #b89047; letter-spacing: 1px; }

  /* ── Watermark ───────────────────────────────────────── */
  .wm { position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-28deg); font-size: 90px; font-weight: 900; opacity: 0.035; color: #000; pointer-events: none; white-space: nowrap; }

  @media print { .wm { position: fixed; } }
</style>
`;

function header(billType: string, refNo: string, date: string, status: string) {
  return `
  <div class="header">
    <div class="logo-block">
      <img src="${LOGO}" alt="Grihscape Logo" onerror="this.style.display='none'" />
      <div class="company">
        <h1>GRIHSCAPE</h1>
        <p>Architecture &bull; Interior Design &bull; PMC</p>
      </div>
    </div>
    <div class="bill-meta">
      <div class="bill-type">${billType}</div>
      <div class="bill-ref">Ref: <strong>${refNo}</strong></div>
      <div class="bill-date">Date: ${fmtDate(date)}</div>
      <div><span class="status-badge ${status}">${status}</span></div>
    </div>
  </div>`;
}

function footer(printedOn: string) {
  return `
  <div class="footer">
    <span class="footer-note">Printed on ${printedOn} &bull; This is a computer-generated document.</span>
    <span class="footer-brand">GRIHSCAPE</span>
  </div>`;
}

export function printInflowBill(challan: InflowChallan) {
  const base = Number(challan.amount);
  const tax  = challan.isTaxApplicable && challan.taxAmount ? Number(challan.taxAmount) : 0;
  const final = Number(challan.finalAmount);
  const printedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const taxRow = challan.isTaxApplicable
    ? `<tr><td>Tax (${challan.taxType} @ ${challan.taxPercent}%)</td><td class="tr">${fmtCurrency(tax)}</td></tr>`
    : '';

  const approvalBlock = challan.status === 'APPROVED' && challan.approvedBy
    ? `<div class="approval-box">
        <p>&#10003; Approved by <strong>${challan.approvedBy.name}</strong>${challan.approvedAt ? ` on ${fmtDate(challan.approvedAt)}` : ''}</p>
       </div>`
    : '';

  const rejBlock = challan.status === 'REJECTED' && challan.rejectionReason
    ? `<div class="approval-box" style="background:#fff5f5;border-color:#fca5a5;">
        <p style="color:#991b1b;">&#10007; Rejected: <strong>${challan.rejectionReason}</strong></p>
       </div>`
    : '';

  const wm = challan.status !== 'APPROVED' ? `<div class="wm">${challan.status}</div>` : '';

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Receipt – ${challan.challanNo}</title>${STYLE}</head><body>
  ${wm}
  <div class="page">
    ${header('Payment Receipt', challan.challanNo, challan.date, challan.status)}

    <div class="section">
      <div class="section-title">Client &amp; Site Details</div>
      <div class="info-grid">
        <div class="info-item"><label>Client Name</label><span>${challan.clientName}</span></div>
        <div class="info-item"><label>Site / Project</label><span>${challan.siteName ?? '—'}</span></div>
        <div class="info-item"><label>Purpose</label><span>${challan.purpose?.name ?? '—'}</span></div>
        <div class="info-item"><label>Mode of Payment</label><span>${challan.modeOfPayment}</span></div>
        <div class="info-item"><label>Payment Status</label><span><span class="pay-pill pay-${challan.paymentStatus}">${challan.paymentStatus}</span></span></div>
        ${challan.description ? `<div class="info-item full"><label>Description / Notes</label><span>${challan.description}</span></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Amount Breakdown</div>
      <table class="amt-table">
        <thead>
          <tr><th>Description</th><th class="tr">Amount</th></tr>
        </thead>
        <tbody>
          <tr><td>Base Amount</td><td class="tr">${fmtCurrency(base)}</td></tr>
          ${taxRow}
          <tr class="total"><td>Total Amount Payable</td><td class="tr">${fmtCurrency(final)}</td></tr>
        </tbody>
      </table>
    </div>

    ${approvalBlock}${rejBlock}

    <div class="sig-row">
      <div class="sig-block">
        <div class="sig-line">Client Signature</div>
        <div class="sig-sub">${challan.clientName}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Prepared By</div>
        <div class="sig-sub">${challan.createdBy?.name ?? 'Accounts'}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Authorized Signatory</div>
        <div class="sig-sub">GRIHSCAPE</div>
      </div>
    </div>

    ${footer(printedOn)}
  </div>
  </body></html>`;

  openPrintWindow(html);
}

export function printOutflowBill(expense: OutflowExpense) {
  const printedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const approvalBlock = expense.status === 'APPROVED' && expense.approvedBy
    ? `<div class="approval-box">
        <p>&#10003; Approved by <strong>${expense.approvedBy.name}</strong>${expense.approvedAt ? ` on ${fmtDate(expense.approvedAt)}` : ''}</p>
       </div>`
    : '';

  const rejBlock = expense.status === 'REJECTED' && expense.rejectionReason
    ? `<div class="approval-box" style="background:#fff5f5;border-color:#fca5a5;">
        <p style="color:#991b1b;">&#10007; Rejected: <strong>${expense.rejectionReason}</strong></p>
       </div>`
    : '';

  const wm = expense.status !== 'APPROVED' ? `<div class="wm">${expense.status}</div>` : '';

  const extraRows = [
    expense.employeeName ? `<div class="info-item"><label>Employee</label><span>${expense.employeeName}</span></div>` : '',
    expense.salaryMonth ? `<div class="info-item"><label>Salary Month</label><span>${expense.salaryMonth}</span></div>` : '',
    expense.salaryPayStatus ? `<div class="info-item"><label>Salary Status</label><span>${expense.salaryPayStatus}</span></div>` : '',
    expense.expenseName ? `<div class="info-item"><label>Expense Item</label><span>${expense.expenseName}</span></div>` : '',
    expense.department ? `<div class="info-item"><label>Department</label><span>${expense.department}</span></div>` : '',
    expense.description ? `<div class="info-item full"><label>Description / Notes</label><span>${expense.description}</span></div>` : '',
  ].filter(Boolean).join('');

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Expense Voucher – ${expense.name}</title>${STYLE}</head><body>
  ${wm}
  <div class="page">
    ${header('Expense Voucher', `EXP-${expense.id.slice(-8).toUpperCase()}`, expense.date, expense.status)}

    <div class="section">
      <div class="section-title">Expense Details</div>
      <div class="info-grid">
        <div class="info-item"><label>Paid To</label><span>${expense.name}</span></div>
        <div class="info-item"><label>Category</label><span>${expense.category?.name ?? '—'}</span></div>
        <div class="info-item"><label>Purpose</label><span>${expense.purpose?.name ?? '—'}</span></div>
        <div class="info-item"><label>Expense Type</label><span>${expense.expenseType}</span></div>
        <div class="info-item"><label>Mode of Payment</label><span>${expense.modeOfPayment}</span></div>
        ${expense.siteName ? `<div class="info-item"><label>Site / Project</label><span>${expense.siteName}</span></div>` : ''}
        ${expense.projectManager ? `<div class="info-item"><label>Project Manager</label><span>${expense.projectManager.name}</span></div>` : ''}
        ${extraRows}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Amount</div>
      <table class="amt-table">
        <thead>
          <tr><th>Description</th><th class="tr">Amount</th></tr>
        </thead>
        <tbody>
          <tr class="total"><td>Total Expense Amount</td><td class="tr">${fmtCurrency(expense.amount)}</td></tr>
        </tbody>
      </table>
    </div>

    ${expense.supportingDocName ? `
    <div class="section">
      <div class="section-title">Supporting Document</div>
      <div class="info-grid">
        <div class="info-item full"><label>Attached Proof</label><span>${expense.supportingDocName}</span></div>
      </div>
    </div>` : ''}

    ${approvalBlock}${rejBlock}

    <div class="sig-row">
      <div class="sig-block">
        <div class="sig-line">Submitted By</div>
        <div class="sig-sub">${expense.createdBy?.name ?? 'Accounts'}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Verified By</div>
        <div class="sig-sub">${expense.approvedBy?.name ?? '—'}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Authorized Signatory</div>
        <div class="sig-sub">GRIHSCAPE</div>
      </div>
    </div>

    ${footer(printedOn)}
  </div>
  </body></html>`;

  openPrintWindow(html);
}
