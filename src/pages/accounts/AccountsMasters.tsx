import React, { useEffect, useState } from 'react';
import { Plus, ToggleLeft, ToggleRight, Edit2, Search, Filter } from 'lucide-react';
import { accountsMasterApi, type PurposeMaster, type ExpenseCategoryMaster, type DrawingMaster } from '../../services/accounts.api.js';
import { api } from '../../services/api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface Props { currentUser: User; }

const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  LAYOUT: 'Layout Planning',
  ARCHITECTURAL: 'Architectural (A)',
  PLUMBING: 'Plumbing / MEP (B2)',
  ELECTRICAL: 'Electrical / RCP (C)',
  STRUCTURAL: 'Structural (D)',
  INTERIOR: 'Interior Works',
};

type TabId = 'purposes' | 'categories' | 'drawings';

export const AccountsMasters: React.FC<Props> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('purposes');
  
  const [purposes, setPurposes] = useState<PurposeMaster[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryMaster[]>([]);
  const [drawings, setDrawings] = useState<DrawingMaster[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>(DEFAULT_CATEGORY_LABELS);
  
  // Creation States
  const [newPurpose, setNewPurpose] = useState({ name: '', module: 'INFLOW' });
  const [newCategory, setNewCategory] = useState('');
  const [newDrawing, setNewDrawing] = useState({ name: '', category: 'LAYOUT', isRoomBased: false, isWallBased: false });
  const [customCategory, setCustomCategory] = useState('');
  
  const [addingP, setAddingP] = useState(false);
  const [addingC, setAddingC] = useState(false);
  const [addingD, setAddingD] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search & Filtering States
  const [purposeSearch, setPurposeSearch] = useState('');
  const [purposeModuleFilter, setPurposeModuleFilter] = useState('ALL');
  const [categorySearch, setCategorySearch] = useState('');
  const [drawingSearch, setDrawingSearch] = useState('');
  const [drawingCatFilter, setDrawingCatFilter] = useState('ALL');

  // Local Pagination States
  const [purposePage, setPurposePage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [drawingPage, setDrawingPage] = useState(1);
  const itemsPerPage = 10;

  // Edit Overlay Modal state
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'purpose' | 'category' | 'drawing'; name: string; extra?: any } | null>(null);
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [updatingItem, setUpdatingItem] = useState(false);

  const canManage = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';

  const loadAll = async () => {
    try {
      const [p, c, d] = await Promise.all([
        api.get<{ success: boolean; data: PurposeMaster[] }>('/accounts/masters/purposes?all=true'),
        api.get<{ success: boolean; data: ExpenseCategoryMaster[] }>('/accounts/masters/expense-categories?all=true'),
        api.get<{ success: boolean; data: DrawingMaster[] }>('/accounts/masters/drawings?all=true'),
      ]);
      setPurposes(p.data.data);
      setCategories(c.data.data);
      
      const loadedDrawings = d.data.data;
      setDrawings(loadedDrawings);

      // Dynamically build categories mapping based on standard ones + any custom ones found in DB
      const newMap = { ...DEFAULT_CATEGORY_LABELS };
      loadedDrawings.forEach(item => {
        const cat = item.category;
        if (cat && !newMap[cat]) {
          newMap[cat] = cat.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
        }
      });
      setCategoriesMap(newMap);
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
      setPurposePage(1);
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
      setCategoryPage(1);
      loadAll();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed.', 'error');
    } finally { setAddingC(false); }
  };

  const handleAddDrawing = async () => {
    if (!newDrawing.name.trim()) return;
    
    let targetCategory = newDrawing.category;
    if (targetCategory === 'NEW_CATEGORY') {
      if (!customCategory.trim()) {
        showToast('Please specify a category name.', 'error');
        return;
      }
      targetCategory = customCategory.trim().toUpperCase().replace(/\s+/g, '_');
    }

    setAddingD(true);
    try {
      await accountsMasterApi.createDrawing({
        name: newDrawing.name.trim(),
        category: targetCategory,
        isRoomBased: newDrawing.isRoomBased,
        isWallBased: newDrawing.isWallBased,
      });
      showToast('Drawing template added.', 'success');
      setNewDrawing({ name: '', category: 'LAYOUT', isRoomBased: false, isWallBased: false });
      setCustomCategory('');
      setDrawingPage(1);
      loadAll();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed.', 'error');
    } finally { setAddingD(false); }
  };

  const togglePurpose = async (id: string) => {
    try { await accountsMasterApi.togglePurpose(id); loadAll(); }
    catch { showToast('Failed to toggle.', 'error'); }
  };

  const toggleCategory = async (id: string) => {
    try { await accountsMasterApi.toggleCategory(id); loadAll(); }
    catch { showToast('Failed to toggle.', 'error'); }
  };

  const toggleDrawing = async (id: string) => {
    try { await accountsMasterApi.toggleDrawing(id); loadAll(); }
    catch { showToast('Failed to toggle.', 'error'); }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.name.trim()) return;
    
    let targetCategory = editingItem.extra?.category;
    if (editingItem.type === 'drawing' && targetCategory === 'NEW_CATEGORY') {
      if (!editCustomCategory.trim()) {
        showToast('Please specify a category name.', 'error');
        return;
      }
      targetCategory = editCustomCategory.trim().toUpperCase().replace(/\s+/g, '_');
    }

    setUpdatingItem(true);
    try {
      if (editingItem.type === 'purpose') {
        await accountsMasterApi.updatePurpose(editingItem.id, {
          name: editingItem.name.trim(),
          module: editingItem.extra.module,
        });
      } else if (editingItem.type === 'category') {
        await accountsMasterApi.updateCategory(editingItem.id, editingItem.name.trim());
      } else if (editingItem.type === 'drawing') {
        await accountsMasterApi.updateDrawing(editingItem.id, {
          name: editingItem.name.trim(),
          category: targetCategory,
          isRoomBased: editingItem.extra.isRoomBased,
          isWallBased: editingItem.extra.isWallBased,
        });
      }
      showToast('Master updated successfully.', 'success');
      setEditingItem(null);
      setEditCustomCategory('');
      loadAll();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to update.', 'error');
    } finally { setUpdatingItem(false); }
  };

  // --- Filtering & Local Pagination Processing ---
  
  // 1. Purposes
  const trimmedPurposeSearch = purposeSearch.trim().toLowerCase();
  const filteredPurposes = purposes.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(trimmedPurposeSearch);
    const matchesModule = purposeModuleFilter === 'ALL' ||
      (purposeModuleFilter === 'INFLOW' && (p.module === 'INFLOW' || p.module === 'BOTH')) ||
      (purposeModuleFilter === 'OUTFLOW' && (p.module === 'OUTFLOW' || p.module === 'BOTH')) ||
      (purposeModuleFilter === 'BOTH' && p.module === 'BOTH');
    return matchesSearch && matchesModule;
  });
  const totalPurposePages = Math.max(1, Math.ceil(filteredPurposes.length / itemsPerPage));
  const paginatedPurposes = filteredPurposes.slice((purposePage - 1) * itemsPerPage, purposePage * itemsPerPage);

  // 2. Categories
  const trimmedCategorySearch = categorySearch.trim().toLowerCase();
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(trimmedCategorySearch)
  );
  const totalCategoryPages = Math.max(1, Math.ceil(filteredCategories.length / itemsPerPage));
  const paginatedCategories = filteredCategories.slice((categoryPage - 1) * itemsPerPage, categoryPage * itemsPerPage);

  // 3. Drawings
  const trimmedDrawingSearch = drawingSearch.trim().toLowerCase();
  const filteredDrawings = drawings.filter(d => {
    const catLabel = categoriesMap[d.category] ?? d.category;
    const matchesSearch = d.name.toLowerCase().includes(trimmedDrawingSearch) ||
                          catLabel.toLowerCase().includes(trimmedDrawingSearch);
    const matchesCat = drawingCatFilter === 'ALL' || d.category === drawingCatFilter;
    return matchesSearch && matchesCat;
  });
  const totalDrawingPages = Math.max(1, Math.ceil(filteredDrawings.length / itemsPerPage));
  const paginatedDrawings = filteredDrawings.slice((drawingPage - 1) * itemsPerPage, drawingPage * itemsPerPage);

  // Group paginated drawings only so they match page limits properly
  const groupedDrawings = paginatedDrawings.reduce((acc, d) => {
    const cat = d.category ?? 'OTHER';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {} as Record<string, DrawingMaster[]>);

  // --- Defensive Page Boundary Guards ---
  useEffect(() => {
    if (purposePage > totalPurposePages) {
      setPurposePage(1);
    }
  }, [totalPurposePages, purposePage]);

  useEffect(() => {
    if (categoryPage > totalCategoryPages) {
      setCategoryPage(1);
    }
  }, [totalCategoryPages, categoryPage]);

  useEffect(() => {
    if (drawingPage > totalDrawingPages) {
      setDrawingPage(1);
    }
  }, [totalDrawingPages, drawingPage]);

  // Pagination Renderer
  const renderPagination = (currentPage: number, totalPages: number, setPage: (p: number) => void, totalEntries: number) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--bg)]/10 shrink-0 select-none">
        <span className="text-[10px] text-[var(--text-muted)] font-medium">Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalEntries)} of {totalEntries}</span>
        <div className="flex gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            className="px-2.5 py-1 text-[10px] font-semibold rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
          >
            Prev
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
            className="px-2.5 py-1 text-[10px] font-semibold rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-[12px] text-[var(--text-muted)]">Loading…</div>;

  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
      
      {/* Top Tab Bar Switcher */}
      <div className="flex border-b border-[var(--border)] shrink-0 -mb-px select-none">
        <button
          onClick={() => setActiveTab('purposes')}
          className={`px-5 py-3 text-[12px] font-bold border-b-2 transition-all cursor-pointer bg-transparent border-0
            ${activeTab === 'purposes' ? 'border-[#b89047] text-[#b89047]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
        >
          Transaction Purposes
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-3 text-[12px] font-bold border-b-2 transition-all cursor-pointer bg-transparent border-0
            ${activeTab === 'categories' ? 'border-[#b89047] text-[#b89047]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
        >
          Expense Categories
        </button>
        <button
          onClick={() => setActiveTab('drawings')}
          className={`px-5 py-3 text-[12px] font-bold border-b-2 transition-all cursor-pointer bg-transparent border-0
            ${activeTab === 'drawings' ? 'border-[#b89047] text-[#b89047]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
        >
          Drawing Templates
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 flex flex-col min-h-0">
        
        {/* TAB 1: Transaction Purposes */}
        {activeTab === 'purposes' && (
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
              <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Purposes Master List</h3>
              <span className="text-[11px] text-[var(--text-muted)]">{filteredPurposes.length} entries matching</span>
            </div>

            {/* Creation Row */}
            {canManage && (
              <div className="flex gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)]/40 shrink-0">
                <input
                  value={newPurpose.name}
                  onChange={e => setNewPurpose(p => ({ ...p, name: e.target.value }))}
                  placeholder="Create new purpose name…"
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
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] disabled:opacity-60 cursor-pointer border-0"
                >
                  <Plus size={13} /> Add
                </button>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex gap-3 px-5 py-2.5 border-b border-[var(--border)] bg-[var(--bg)]/10 shrink-0 items-center">
              <div className="flex-1 flex items-center gap-2 bg-[var(--card-bg)] px-2.5 py-1.5 rounded-lg border border-[var(--border)]">
                <Search size={12} className="text-[var(--text-muted)]" />
                <input
                  value={purposeSearch}
                  onChange={e => { setPurposeSearch(e.target.value); setPurposePage(1); }}
                  placeholder="Filter by purpose name…"
                  className="flex-1 bg-transparent text-[11px] border-0 outline-none text-[var(--text-primary)]"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--card-bg)] px-2 py-1 rounded-lg border border-[var(--border)]">
                <Filter size={11} className="text-[var(--text-muted)]" />
                <select
                  value={purposeModuleFilter}
                  onChange={e => { setPurposeModuleFilter(e.target.value); setPurposePage(1); }}
                  className="bg-transparent text-[10px] border-0 outline-none text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="ALL">All Modules</option>
                  <option value="INFLOW">Inflow Only</option>
                  <option value="OUTFLOW">Outflow Only</option>
                  <option value="BOTH">Both Only</option>
                </select>
              </div>
            </div>

            {/* Paginated List */}
            <div className="divide-y divide-[var(--border)] overflow-y-auto flex-1 max-h-[350px]">
              {paginatedPurposes.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg)]/5 transition-colors">
                  <div>
                    <span className="text-[11px] font-medium text-[var(--text-primary)]">{p.name}</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[var(--bg)] text-[var(--text-muted)]">{p.module}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {canManage && (
                      <button onClick={() => setEditingItem({ id: p.id, type: 'purpose', name: p.name, extra: { module: p.module } })} className="text-[var(--text-muted)] hover:text-[#b89047] transition-colors cursor-pointer border-0 bg-transparent">
                        <Edit2 size={13} />
                      </button>
                    )}
                    {canManage && (
                      <button onClick={() => togglePurpose(p.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border-0 bg-transparent cursor-pointer">
                        {p.isActive ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredPurposes.length === 0 && (
                <div className="px-5 py-8 text-[11px] text-[var(--text-muted)] text-center">No purpose items found.</div>
              )}
            </div>

            {/* Pagination Controls */}
            {renderPagination(purposePage, totalPurposePages, setPurposePage, filteredPurposes.length)}
          </section>
        )}

        {/* TAB 2: Expense Categories */}
        {activeTab === 'categories' && (
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
              <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Categories Master List</h3>
              <span className="text-[11px] text-[var(--text-muted)]">{filteredCategories.length} entries matching</span>
            </div>

            {/* Creation Row */}
            {canManage && (
              <div className="flex gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)]/40 shrink-0">
                <input
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="Create new category name…"
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  className="flex-1 px-3 py-2 text-[11px] rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[#b89047]/60"
                />
                <button
                  onClick={handleAddCategory}
                  disabled={addingC || !newCategory.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] disabled:opacity-60 cursor-pointer border-0"
                >
                  <Plus size={13} /> Add
                </button>
              </div>
            )}

            {/* Search Bar */}
            <div className="flex gap-3 px-5 py-2.5 border-b border-[var(--border)] bg-[var(--bg)]/10 shrink-0 items-center">
              <div className="flex-1 flex items-center gap-2 bg-[var(--card-bg)] px-2.5 py-1.5 rounded-lg border border-[var(--border)]">
                <Search size={12} className="text-[var(--text-muted)]" />
                <input
                  value={categorySearch}
                  onChange={e => { setCategorySearch(e.target.value); setCategoryPage(1); }}
                  placeholder="Filter by category name…"
                  className="flex-1 bg-transparent text-[11px] border-0 outline-none text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Paginated List */}
            <div className="divide-y divide-[var(--border)] overflow-y-auto flex-1 max-h-[350px]">
              {paginatedCategories.map(c => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg)]/5 transition-colors">
                  <span className="text-[11px] font-medium text-[var(--text-primary)]">{c.name}</span>
                  <div className="flex items-center gap-4">
                    {canManage && (
                      <button onClick={() => setEditingItem({ id: c.id, type: 'category', name: c.name })} className="text-[var(--text-muted)] hover:text-[#b89047] transition-colors cursor-pointer border-0 bg-transparent">
                        <Edit2 size={13} />
                      </button>
                    )}
                    {canManage && (
                      <button onClick={() => toggleCategory(c.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border-0 bg-transparent cursor-pointer">
                        {c.isActive ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredCategories.length === 0 && (
                <div className="px-5 py-8 text-[11px] text-[var(--text-muted)] text-center">No category items found.</div>
              )}
            </div>

            {/* Pagination Controls */}
            {renderPagination(categoryPage, totalCategoryPages, setCategoryPage, filteredCategories.length)}
          </section>
        )}

        {/* TAB 3: Drawing Templates */}
        {activeTab === 'drawings' && (
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
              <h3 className="text-[12px] font-bold text-[var(--text-primary)]">Drawing Templates</h3>
              <span className="text-[11px] text-[var(--text-muted)]">{filteredDrawings.length} templates matching</span>
            </div>

            {/* Creation Panel */}
            {canManage && (
              <div className="flex flex-col gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)]/40 shrink-0">
                <div className="flex flex-wrap gap-4 items-center w-full">
                  <input
                    value={newDrawing.name}
                    onChange={e => setNewDrawing(d => ({ ...d, name: e.target.value }))}
                    placeholder="Create drawing template name…"
                    onKeyDown={e => e.key === 'Enter' && handleAddDrawing()}
                    className="flex-1 min-w-[200px] px-3 py-2 text-[11px] rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[#b89047]/60"
                  />
                  
                  <select
                    value={newDrawing.category}
                    onChange={e => setNewDrawing(d => ({ ...d, category: e.target.value }))}
                    className="px-3 py-2 text-[11px] rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    {Object.entries(categoriesMap).map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                    <option value="NEW_CATEGORY">+ Create New Category (Head)</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newDrawing.isRoomBased}
                      onChange={e => setNewDrawing(d => ({ ...d, isRoomBased: e.target.checked }))}
                      className="rounded border-[var(--border)] text-[#b89047]"
                    />
                    Room Based
                  </label>

                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newDrawing.isWallBased}
                      onChange={e => setNewDrawing(d => ({ ...d, isWallBased: e.target.checked }))}
                      className="rounded border-[var(--border)] text-[#b89047]"
                    />
                    Wall Elevation
                  </label>

                  <button
                    onClick={handleAddDrawing}
                    disabled={addingD || !newDrawing.name.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] disabled:opacity-60 cursor-pointer border-0"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>

                {newDrawing.category === 'NEW_CATEGORY' && (
                  <div className="w-full sm:max-w-md animate-fade-in">
                    <input
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      placeholder="Enter New Category (Head) Name… (e.g. Landscaping)"
                      className="w-full px-3 py-2 text-[11px] rounded-lg bg-[var(--card-bg)] border border-[#b89047] text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3 px-5 py-2.5 border-b border-[var(--border)] bg-[var(--bg)]/10 shrink-0 items-center">
              <div className="flex-1 w-full flex items-center gap-2 bg-[var(--card-bg)] px-2.5 py-1.5 rounded-lg border border-[var(--border)]">
                <Search size={12} className="text-[var(--text-muted)]" />
                <input
                  value={drawingSearch}
                  onChange={e => { setDrawingSearch(e.target.value); setDrawingPage(1); }}
                  placeholder="Filter drawings by name or category…"
                  className="flex-1 bg-transparent text-[11px] border-0 outline-none text-[var(--text-primary)]"
                />
              </div>
              <div className="w-full sm:w-auto flex items-center gap-1.5 bg-[var(--card-bg)] px-2 py-1 rounded-lg border border-[var(--border)]">
                <Filter size={11} className="text-[var(--text-muted)]" />
                <select
                  value={drawingCatFilter}
                  onChange={e => { setDrawingCatFilter(e.target.value); setDrawingPage(1); }}
                  className="bg-transparent text-[10px] border-0 outline-none text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {Object.entries(categoriesMap).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Categorized Paginated Drawing List */}
            <div className="divide-y divide-[var(--border)] overflow-y-auto flex-1 max-h-[400px]">
              {Object.entries(categoriesMap).map(([catCode, catLabel]) => {
                const catDrawings = groupedDrawings[catCode] ?? [];
                if (catDrawings.length === 0 && drawingCatFilter !== 'ALL' && drawingCatFilter === catCode) {
                  return (
                    <div key={catCode} className="p-4 bg-[var(--bg)]/10">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#b89047] mb-2 px-1">{catLabel}</h4>
                      <div className="text-[10px] text-[var(--text-muted)] italic px-2 py-1">No matching templates in this category.</div>
                    </div>
                  );
                }
                if (catDrawings.length === 0) return null; // Hide empty sections on page view to save space

                return (
                  <div key={catCode} className="p-4 bg-[var(--bg)]/10">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-[#b89047] mb-2 px-1">{catLabel}</h4>
                    <div className="divide-y divide-[var(--border)] pl-2">
                      {catDrawings.map(d => (
                        <div key={d.id} className="flex items-center justify-between py-2.5 hover:bg-[var(--bg)]/5 transition-colors">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-medium text-[var(--text-primary)]">{d.name}</span>
                            {(d.isRoomBased || d.isWallBased) && (
                              <span className="w-fit mt-1 px-1 py-0.5 rounded text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30">
                                {d.isWallBased ? 'Wall elevation-based' : 'Room-based'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            {canManage && (
                              <button onClick={() => setEditingItem({ id: d.id, type: 'drawing', name: d.name, extra: { category: d.category, isRoomBased: d.isRoomBased, isWallBased: d.isWallBased } })} className="text-[var(--text-muted)] hover:text-[#b89047] transition-colors cursor-pointer border-0 bg-transparent">
                                <Edit2 size={13} />
                              </button>
                            )}
                            {canManage && (
                              <button onClick={() => toggleDrawing(d.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border-0 bg-transparent cursor-pointer">
                                {d.isActive ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filteredDrawings.length === 0 && (
                <div className="px-5 py-8 text-[11px] text-[var(--text-muted)] text-center">No drawing templates match your query.</div>
              )}
            </div>

            {/* Pagination Controls */}
            {renderPagination(drawingPage, totalDrawingPages, setDrawingPage, filteredDrawings.length)}
          </section>
        )}

      </div>

      {/* Edit Master Overlay Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Edit Master Entry</h3>
              <button onClick={() => setEditingItem(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer text-[11px] border-0 bg-transparent">Cancel</button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Name</label>
                <input
                  value={editingItem.name}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3.5 py-1.5 text-[12px] rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[#b89047]/60"
                />
              </div>

              {editingItem.type === 'purpose' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Module</label>
                  <select
                    value={editingItem.extra.module}
                    onChange={e => setEditingItem(prev => prev ? { ...prev, extra: { ...prev.extra, module: e.target.value } } : null)}
                    className="w-full px-3.5 py-1.5 text-[12px] rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="INFLOW">Inflow</option>
                    <option value="OUTFLOW">Outflow</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
              )}

              {editingItem.type === 'drawing' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Category (Head)</label>
                    <select
                      value={editingItem.extra.category}
                      onChange={e => setEditingItem(prev => prev ? { ...prev, extra: { ...prev.extra, category: e.target.value } } : null)}
                      className="w-full px-3.5 py-1.5 text-[12px] rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                    >
                      {Object.entries(categoriesMap).map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                      <option value="NEW_CATEGORY">+ Create New Category (Head)</option>
                    </select>
                  </div>

                  {editingItem.extra.category === 'NEW_CATEGORY' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">New Category Name</label>
                      <input
                        value={editCustomCategory}
                        onChange={e => setEditCustomCategory(e.target.value)}
                        placeholder="Enter New Category Name…"
                        className="w-full px-3.5 py-1.5 text-[12px] rounded-lg bg-[var(--bg)] border border-[#b89047] text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-2">
                    <label className="flex items-center gap-2 text-[11px] text-[var(--text-primary)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editingItem.extra.isRoomBased}
                        onChange={e => setEditingItem(prev => prev ? { ...prev, extra: { ...prev.extra, isRoomBased: e.target.checked } } : null)}
                        className="rounded border-[var(--border)] text-[#b89047] focus:ring-[#b89047]/30"
                      />
                      Room Based Drawing
                    </label>

                    <label className="flex items-center gap-2 text-[11px] text-[var(--text-primary)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editingItem.extra.isWallBased}
                        onChange={e => setEditingItem(prev => prev ? { ...prev, extra: { ...prev.extra, isWallBased: e.target.checked, isRoomBased: e.target.checked ? true : prev.extra.isRoomBased } } : null)}
                        className="rounded border-[var(--border)] text-[#b89047] focus:ring-[#b89047]/30"
                      />
                      Wall Elevation Based (implies Room Based)
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-3.5 bg-[var(--bg)]/40 border-t border-[var(--border)] flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--card-bg)] border border-[var(--border)] hover:border-[#b89047] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateItem}
                disabled={updatingItem || !editingItem.name.trim()}
                className="px-4 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:shadow-md disabled:opacity-60 transition-all cursor-pointer border-0"
              >
                {updatingItem ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
