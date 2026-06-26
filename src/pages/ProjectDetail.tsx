import React, { useState, useEffect, useCallback } from 'react';
import { projectApi } from '../services/api.js';
import type { User } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useRouter } from '../context/RouterContext.js';
import { ShimmerTable } from '../components/Shimmer.js';
import { ChevronLeft, AlertTriangle, Lock } from 'lucide-react';
import {
  STATUS_BADGE, type TabId, TABS, STATUS_ORDER, TAB_MIN_STATUS,
  TAB_VISIBLE_ROLES, btnSecondary,
} from './project-detail-tabs/shared.js';
import { OverviewTab }      from './project-detail-tabs/OverviewTab.js';
import { SiteTab }          from './project-detail-tabs/SiteTab.js';
import { CdrfMeetingsTab }  from './project-detail-tabs/CdrfMeetingsTab.js';
import { CdrfFormTab }      from './project-detail-tabs/CdrfFormTab.js';
import { DesignTab }        from './project-detail-tabs/DesignTab.js';
import { PipelineTab }      from './project-detail-tabs/PipelineTab.js';
import { TransmittalsTab }   from './project-detail-tabs/TransmittalsTab.js';
import { IssuedDrawingsTab } from './project-detail-tabs/IssuedDrawingsTab.js';
import ConstructionTab        from './construction/ConstructionTab.js';

interface Props { currentUser: User; projectId: string; }

export const ProjectDetail: React.FC<Props> = ({ currentUser, projectId }) => {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getProjectById(projectId);
      setProject(res.data.project);
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to load project.', 'error');
    } finally { setLoading(false); }
  }, [projectId, showToast]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  // Reset to overview if current tab is not visible for this role
  useEffect(() => {
    if (!TAB_VISIBLE_ROLES[activeTab]?.includes(currentUser.role)) {
      setActiveTab('overview');
    }
  }, [activeTab, currentUser.role]);

  if (loading) return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <ShimmerTable rows={1} cols={4} />
      <ShimmerTable rows={7} cols={4} />
    </div>
  );

  if (!project) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
      <AlertTriangle size={28} />
      <p className="text-[12px]">Project not found.</p>
      <button onClick={() => navigate('/projects')} className={btnSecondary}><ChevronLeft size={12} /> Back</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-3 p-4 overflow-y-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/projects')} className={btnSecondary + ' py-1 px-2.5'}>
          <ChevronLeft size={12} /> Projects
        </button>
        <span className="text-[11px] text-[var(--text-muted)]">/</span>
        <span className="text-[12px] font-semibold text-[var(--text-primary)]">{project.prospect?.client?.clientName}</span>
        <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[project.status] ?? 'text-stone-600 bg-stone-50 border-stone-200'}`}>
          {project.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Tabs — filtered by role then by project status */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto shrink-0 -mb-px">
        {(() => {
          const statusIdx = STATUS_ORDER.indexOf(project.status as typeof STATUS_ORDER[number]);
          const visibleTabs = TABS.filter(t => TAB_VISIBLE_ROLES[t.id].includes(currentUser.role));
          return visibleTabs.map(t => {
            const minIdx   = STATUS_ORDER.indexOf(TAB_MIN_STATUS[t.id] as typeof STATUS_ORDER[number]);
            const isLocked = statusIdx < minIdx;
            return (
              <button key={t.id}
                onClick={() => {
                  if (isLocked) { showToast('Complete previous project stages first.', 'error'); return; }
                  setActiveTab(t.id);
                }}
                title={isLocked ? `Unlocks after: ${TAB_MIN_STATUS[t.id].replace(/_/g, ' ')}` : undefined}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold whitespace-nowrap border-b-2 transition-all duration-150 border-0 bg-transparent
                  ${isLocked
                    ? 'border-transparent text-[var(--text-muted)] opacity-35 cursor-not-allowed'
                    : activeTab === t.id
                      ? 'border-[#b89047] text-[#b89047] cursor-pointer'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border)] cursor-pointer'}`}>
                {t.icon}{t.label}
                {isLocked && <Lock size={9} className="ml-0.5 opacity-60" />}
              </button>
            );
          });
        })()}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview'      && <OverviewTab      project={project} currentUser={currentUser} onRefresh={fetchProject} />}
        {activeTab === 'site'          && <SiteTab          project={project} currentUser={currentUser} onRefresh={fetchProject} />}
        {activeTab === 'cdrf-meetings' && <CdrfMeetingsTab  project={project} currentUser={currentUser} />}
        {activeTab === 'cdrf-form'     && <CdrfFormTab      project={project} currentUser={currentUser} />}
        {activeTab === 'design'        && <DesignTab        project={project} currentUser={currentUser} onRefresh={fetchProject} />}
        {activeTab === 'pipeline'      && <PipelineTab      project={project} currentUser={currentUser} onRefresh={fetchProject} />}
        {activeTab === 'transmittals'    && <TransmittalsTab   project={project} currentUser={currentUser} />}
        {activeTab === 'issued-drawings' && <IssuedDrawingsTab project={project} currentUser={currentUser} />}
        {activeTab === 'construction'    && (
          <div className="p-4 md:p-6">
            <ConstructionTab
              projectId={project.id}
              role={currentUser.role}
              userId={currentUser.id}
              assignableUsers={[
                ...(project.assignment?.siteEngineer     ? [{ ...project.assignment.siteEngineer,     role: { name: 'Site Engineer'     } }] : []),
                ...(project.assignment?.constructionHead ? [{ ...project.assignment.constructionHead, role: { name: 'Construction Head' } }] : []),
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
};
