import React, { useEffect, useState } from 'react';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { accountsMasterApi, type PurposeMaster, type ExpenseCategoryMaster } from '../../services/accounts.api.js';
import { api } from '../../services/api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface Props { currentUser: User; }

export const AccountsMasters: React.FC<Props> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [purposes, setPurposes] = useState<PurposeMaster[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryMaster[]>([]);
  const [newPurpose, setNewPurpose] = useState({ name: '', module: 'INFLOW' });
  const [newCategory, setNewCategory] = useState('');
  const [addingP, setAddingP] = useState(false);
  const [addingC, setAddingC] = useState(false);
  const [loading, setLoading] = useState(true);

  const canManage = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';

  const loadAll = async () => {
    try {
      const [p, c] = await Promise.all([
        // Pass all=true so inactive entries appear for toggling
        api.get<{ success: boolean; data: PurposeMaster[] }>('/accounts/masters/purposes?all=true'),
        api.get<{ success: boolean; data: ExpenseCategoryMaster[] }>('/accounts/masters/expense-categories?all=true'),
      ]);
      setPurposes(p.data.data);
      setCategories(c.data.data);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const handleAddPurpose = async () => {
    if (!newPurpose.name.trim()) return;
    setAddingP(true);
    try {
      await accountsMasterApi.createPurpose({ name: newPurpose.name.trim(), module: newPurpose.module });
      showToast('Purpose added.', 'success');
      setNewPurpose({ name: '', module: 'INFLOW' });
      loadAll();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed.', 'error');
    } finally { setAddingP(false); }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setAddingC(true);
    try {
      await accountsMasterApi.createCategory(newCategory.trim());
      showToast('Category added.', 'success');
      setNewCategory('');
      loadAll();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed.', 'error');
    } finally { setAddingC(false); }
  };

  const togglePurpose = async (id: string) => {
    try { await accountsMasterApi.togglePurpose(id); loadAll(); }
    catch { showToast('Failed to toggle.', 'error'); }
  };

  const toggleCategory = async (id: string) => {
    try { await accountsMasterApi.toggleCategory(id); loadAll(); }
    catch { showToast('Failed to toggle.', 'error'); }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-[12px] text-[var(--text-muted)]">Loading…</div>;

  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
      {/* Purpose Master */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Purpose Master</h3>
          <span className="text-[11px] text-[var(--text-muted)]">{purposes.length} entries</span>
        </div>

        {canManage && (
          <div className="flex gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)]/40">
            <input
              value={newPurpose.name}
              onChange={e => setNewPurpose(p => ({ ...p, name: e.target.value }))}
              placeholder="Purpose name…"
              onKeyDown={e => e.key === 'Enter' && handleAddPurpose()}
              className="flex-1 px-3 py-2 text-[11px] rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[#b89047]/60"
            />
            <select
              value={newPurpose.module}
              onChange={e => setNewPurpose(p => ({ ...p, module: e.target.value }))}
              className="px-3 py-2 text-[11px] rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="INFLOW">Inflow</option>
              <option value="OUTFLOW">Outflow</option>
              <option value="BOTH">Both</option>
            </select>
            <button
              onClick={handleAddPurpose}
              disabled={addingP || !newPurpose.name.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] disabled:opacity-60"
            >
              <Plus size={13} /> Add
            </button>
          </div>
        )}

        <div className="divide-y divide-[var(--border)]">
          {purposes.map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <span className="text-[11px] font-medium text-[var(--text-primary)]">{p.name}</span>
                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[var(--bg)] text-[var(--text-muted)]">{p.module}</span>
              </div>
              {canManage && (
                <button onClick={() => togglePurpose(p.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  {p.isActive ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                </button>
              )}
            </div>
          ))}
          {purposes.length === 0 && (
            <div className="px-5 py-8 text-[11px] text-[var(--text-muted)] text-center">No purposes yet.</div>
          )}
        </div>
      </section>

      {/* Expense Category Master */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Expense Category Master</h3>
          <span className="text-[11px] text-[var(--text-muted)]">{categories.length} entries</span>
        </div>

        {canManage && (
          <div className="flex gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)]/40">
            <input
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="Category name…"
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              className="flex-1 px-3 py-2 text-[11px] rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[#b89047]/60"
            />
            <button
              onClick={handleAddCategory}
              disabled={addingC || !newCategory.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] disabled:opacity-60"
            >
              <Plus size={13} /> Add
            </button>
          </div>
        )}

        <div className="divide-y divide-[var(--border)]">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3">
              <span className="text-[11px] font-medium text-[var(--text-primary)]">{c.name}</span>
              {canManage && (
                <button onClick={() => toggleCategory(c.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  {c.isActive ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                </button>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <div className="px-5 py-8 text-[11px] text-[var(--text-muted)] text-center">No categories yet.</div>
          )}
        </div>
      </section>
    </div>
  );
};
