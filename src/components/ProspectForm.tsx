import React, { useState } from 'react';
import { SearchableSelect } from './SearchableSelect.js';
import { RefreshCw, Check, Copy } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProspectFormData {
  clientName: string;
  mobileNo: string;
  preferredCommunication: string;
  email: string | null;
  pincode: string | null;
  district: string | null;
  state: string | null;
  locality: string;
  serviceType: string;
  status: string;
  // Lead source
  sourceType: string | null;
  sourceCustom: string | null;
  // Prospect-level master
  projectStage: string | null;
  budgetAmount: number | null;
  budgetUnit: string | null;
  expectedCompletion: string | null;
  // Architectural
  plotAreaValue: number | null;
  plotAreaUnit: string | null;
  plotAreaCustomUnit: string | null;
  archFloors: string | null;
  archFloorsCustom: string | null;
  archSanctionedNeed: string | null;
  archGfcDrawingsNeed: string | null;
  archConstructionStart: string | null;
  // Interior Design
  interiorAreaValue: number | null;
  interiorAreaUnit: string | null;
  intHasDesign: string | null;
  intHasReferenceImages: string | null;
  // PMC
  pmcWorkedBefore: string | null;
  mgmtAreaValue: number | null;
  mgmtAreaUnit: string | null;
  pmcArchitectDetails: string | null;
  contractorHired: boolean | null;
  contractorName: string | null;
  constructionTimeline: string | null;
  boqAmount: number | null;
  boqUnit: string | null;
  pmcDprDocumentation: string | null;
  pmcShopDrawingsNeed: string | null;
  // Turnkey
  turnkeyAreaValue: number | null;
  turnkeyAreaUnit: string | null;
  turnkeyHasDrawings: string | null;
  turnkeyHasEstimate: string | null;
  turnkeyEstimateValue: number | null;
  turnkeyEstimateUnit: string | null;
  turnkeyHaltedOrNew: string | null;
  turnkeyHaltedReason: string | null;
  nocAvailable: boolean | null;
  // Interior Execution
  execAreaValue: number | null;
  execAreaUnit: string | null;
  execHasDesign: string | null;
  execHasWorkingDrawings: string | null;
  execSelectionsDone: string | null;
  // Renovation
  renovationAreaValue: number | null;
  renovationAreaUnit: string | null;
  renovationPropertyType: string | null;
  renovationWillReside: string | null;
  // End-to-End Solution
  etoPropertyType: string | null;
  etoAreaValue: number | null;
  etoAreaUnit: string | null;
  etoAreaCustomUnit: string | null;
  etoProjectStart: string | null;
  etoHasDocumentation: string | null;
  etoSpecialRequirements: string | null;
}

export interface ProspectFormProps {
  initialData?: Record<string, any>;
  onSubmit: (data: ProspectFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  serviceBudgets?: Record<string, string[]>;
  mode: 'create' | 'edit';
  /** Admin-only slot rendered inside the services section header */
  adminHeaderSlot?: React.ReactNode;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AREA_UNITS = [
  { value: 'SQ_FT', label: 'Sq. Ft' },
  { value: 'SQ_MTR', label: 'Sq. Mtr' },
  { value: 'ACRE', label: 'Acre' },
  { value: 'GUNTHA', label: 'Guntha' },
  { value: 'OTHER', label: 'Other' },
];

const BUDGET_UNITS = [
  { value: 'LAKH', label: 'Lakh' },
  { value: 'CRORE', label: 'Crore' },
];

const SOURCE_OPTIONS = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'META_FACEBOOK', label: 'Meta / Facebook' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'JUST_DIAL', label: 'Just Dial' },
  { value: 'REFERENCE', label: 'Reference' },
  { value: 'WALK_IN', label: 'Walk-In' },
  { value: 'REPEATED_CLIENT', label: 'Repeated Client' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'OTHER', label: 'Other' },
];

const FLOOR_OPTIONS = [
  { value: 'GROUND_FLOOR', label: 'Ground Floor' },
  { value: 'G_1', label: 'G + 1' },
  { value: 'G_2', label: 'G + 2' },
  { value: 'G_3', label: 'G + 3' },
  { value: 'G_4', label: 'G + 4' },
  { value: 'OTHER', label: 'Other' },
];

const CONSTRUCTION_TIMELINES = [
  { value: '3_6_MONTHS', label: '3 – 6 Months' },
  { value: '6_8_MONTHS', label: '6 – 8 Months' },
  { value: '8_12_MONTHS', label: '8 – 12 Months' },
  { value: 'UP_TO_18_MONTHS', label: 'Up To 18 Months' },
  { value: 'UP_TO_24_MONTHS', label: 'Up To 24 Months' },
  { value: 'MORE_THAN_2_YEARS', label: 'More Than 2 Years' },
];


export const PROJECT_PHASES = [
  { level: 1,  letter: 'A', shortName: 'Mobilisation',   label: 'Phase A: Mobilisation' },
  { level: 2,  letter: 'B', shortName: 'Foundation',      label: 'Phase B: Foundation & Excavation' },
  { level: 3,  letter: 'C', shortName: 'Stilt Floor',     label: 'Phase C: Structure (Stilt Floor)' },
  { level: 4,  letter: 'D', shortName: 'Floor 1',         label: 'Phase D: Structure (Floor 1)' },
  { level: 5,  letter: 'E', shortName: 'Floor 2',         label: 'Phase E: Structure (Floor 2)' },
  { level: 6,  letter: 'F', shortName: 'Floor 3 + Roof',  label: 'Phase F: Structure (Floor 3 + Roof)' },
  { level: 7,  letter: 'G', shortName: 'Terrace',         label: 'Phase G: Terrace & Roof Works' },
  { level: 8,  letter: 'H', shortName: 'MEP Rough-Ins',   label: 'Phase H: MEP Rough-Ins (All Floors)' },
  { level: 9,  letter: 'I', shortName: 'Plastering',      label: 'Phase I: Plastering & Waterproofing' },
  { level: 10, letter: 'J', shortName: 'Flooring',        label: 'Phase J: Flooring & Tiling' },
  { level: 11, letter: 'K', shortName: 'False Ceiling',   label: 'Phase K: False Ceiling' },
  { level: 12, letter: 'L', shortName: 'Carpentry',       label: 'Phase L: Doors, Windows & Carpentry' },
  { level: 13, letter: 'M', shortName: 'MEP Finishing',   label: 'Phase M: MEP Finishing & Fixtures' },
  { level: 14, letter: 'N', shortName: 'Kitchen',         label: 'Phase N: Modular Kitchen & Wardrobes' },
  { level: 15, letter: 'O', shortName: 'Lift',            label: 'Phase O: Lift Installation' },
  { level: 16, letter: 'P', shortName: 'Painting',        label: 'Phase P: Painting & Final Finishing' },
  { level: 17, letter: 'Q', shortName: 'Ext. Facade',     label: 'Phase Q: External Facade' },
  { level: 18, letter: 'R', shortName: 'Landscaping',     label: 'Phase R: Landscaping & External Dev.' },
  { level: 19, letter: 'S', shortName: 'Handover',        label: 'Phase S: Handover & Project Close' },
  // { level: 19, letter: 'S', shortName: 'Handover',       label: 'Phase S: Snag List & Rectification' },
];

export const COMMUNICATION_MODES = [
  { value: 'PHONE_CALL', label: 'Phone Call' },
  { value: 'WHATSAPP', label: 'Whatsapp' },
  { value: 'EMAIL', label: 'Email' },
];

export const SERVICE_LABELS: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Architectural Consultation',
  INTERIOR_DESIGN: 'Interior Design',
  PMC: 'PMC',
  TURNKEY_CONSTRUCTION: 'Turnkey Construction',
  INTERIOR_EXECUTION: 'Interior Execution',
  RENOVATION: 'Renovation',
  END_TO_END: 'End-to-End Solution',
};

// ─── CSS tokens ──────────────────────────────────────────────────────────────

const inputBase = 'w-full bg-white border border-[rgba(184,144,71,0.35)] text-stone-900 text-[13px] rounded-lg px-3 py-2 outline-none transition focus:border-[#b89047] focus:ring-2 focus:ring-[rgba(184,144,71,0.2)] font-[inherit]';
const labelBase = 'text-[11.5px] font-semibold text-stone-600 leading-snug';
export const btnPrimary = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0';
export const btnSecondary = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-stone-750 bg-stone-100 border border-[rgba(184,144,71,0.25)] hover:bg-stone-200 hover:text-stone-900 transition-colors duration-150 cursor-pointer';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateInput(val?: string | null): string {
  if (!val) return '';
  return val.split('T')[0];
}

function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RadioField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={labelBase}>{label}</label>
      <div className="flex gap-5">
        {['Yes', 'No'].map(opt => (
          <label key={opt} className="inline-flex items-center gap-2 text-[13px] text-stone-700 cursor-pointer select-none">
            <input type="radio" checked={value === opt} onChange={() => onChange(opt)} className="accent-[#b89047] w-4 h-4 cursor-pointer shrink-0" />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function AreaInput({
  label,
  value,
  unit,
  customUnit,
  onValueChange,
  onUnitChange,
  onCustomUnitChange,
  onUsePlotArea,
  error,
}: {
  label: string;
  value: string;
  unit: string;
  customUnit: string;
  onValueChange: (v: string) => void;
  onUnitChange: (v: string) => void;
  onCustomUnitChange: (v: string) => void;
  onUsePlotArea?: () => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className={labelBase}>{label}</label>
        {onUsePlotArea && (
          <button type="button" onClick={onUsePlotArea}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b89047] hover:text-[#9e7735] border-0 bg-transparent cursor-pointer underline">
            <Copy size={10} /> Use Plot Area
          </button>
        )}
      </div>
      <div className="flex flex-row gap-2">
        <input
          type="number" min="1" placeholder="e.g. 2000"
          value={value} onChange={e => onValueChange(e.target.value)}
          className={`${inputBase} flex-1 ${error ? 'border-red-300' : ''}`}
        />
        <div className="w-28 shrink-0">
          <SearchableSelect options={AREA_UNITS} value={unit} onChange={onUnitChange} />
        </div>
      </div>
      {unit === 'OTHER' && (
        <input type="text" maxLength={50} placeholder="Specify unit (e.g. Bigha)"
          value={customUnit} onChange={e => onCustomUnitChange(e.target.value)}
          className={inputBase} />
      )}
      {error && <span className="text-[11px] font-semibold text-red-500">{error}</span>}
    </div>
  );
}

function BudgetInput({
  label,
  amount,
  unit,
  onAmountChange,
  onUnitChange,
  error,
}: {
  label: string;
  amount: string;
  unit: string;
  onAmountChange: (v: string) => void;
  onUnitChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelBase}>{label}</label>
      <div className="flex flex-row gap-2">
        <input
          type="number" min="0" step="0.5" placeholder="e.g. 25"
          value={amount} onChange={e => onAmountChange(e.target.value)}
          className={`${inputBase} flex-1 ${error ? 'border-red-300' : ''}`}
        />
        <div className="w-24 shrink-0">
          <SearchableSelect options={BUDGET_UNITS} value={unit} onChange={onUnitChange} />
        </div>
      </div>
      {error && <span className="text-[11px] font-semibold text-red-500">{error}</span>}
    </div>
  );
}

function ProjectStageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const activeIndex = PROJECT_PHASES.findIndex(p => p.label === value);
  const fillPct = activeIndex !== -1 ? Math.round((activeIndex / (PROJECT_PHASES.length - 1)) * 100) : 0;
  const selectedPhase = activeIndex !== -1 ? PROJECT_PHASES[activeIndex] : null;

  return (
    <div className="w-full select-none">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
        <label className={labelBase}>What is the current stage of your project?</label>
        <span className="text-[10px] font-bold text-[#9e7735] bg-[rgba(184,144,71,0.08)] px-1.5 py-0.5 rounded border border-[rgba(184,144,71,0.22)]">
          {fillPct}% complete
        </span>
      </div>
      {selectedPhase ? (
        <div className="flex items-center gap-2 bg-[rgba(184,144,71,0.08)] border border-[rgba(184,144,71,0.25)] rounded-lg px-3 py-1.5 mb-3">
          <span className="w-5 h-5 rounded-full bg-[#b89047] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {selectedPhase.letter}
          </span>
          <span className="text-[12px] font-semibold text-stone-700">{selectedPhase.label}</span>
        </div>
      ) : (
        <p className="text-[11px] text-stone-400 italic mb-3">Click a stage below to select the current project stage</p>
      )}
      <div className="overflow-x-auto p-2">
        <div className="relative min-w-[520px]">
          <div className="flex items-start relative z-10">
            {PROJECT_PHASES.map((phase, idx) => {
              const isSelected = value === phase.label;
              const isPast = activeIndex !== -1 && idx < activeIndex;
              return (
                <button
                  key={phase.letter}
                  type="button"
                  title={phase.label}
                  onClick={() => onChange(phase.label)}
                  className="flex-1 flex flex-col items-center gap-0.5 border-0 bg-transparent cursor-pointer focus:outline-none p-0 pb-1"
                >
                  <span className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8.5px] font-bold leading-none transition-all duration-150 ${
                    isSelected
                      ? 'bg-[#b89047] text-white shadow ring-2 ring-[rgba(184,144,71,0.3)] scale-[1.3]'
                      : isPast
                        ? 'bg-[#b89047] text-white'
                        : 'bg-white border-2 border-stone-300 text-stone-500 hover:border-[#b89047] hover:text-[#9e7735]'
                  }`}>
                    {phase.letter}
                  </span>
                  <span className={`text-[6.5px] leading-tight text-center font-medium ${
                    isSelected ? 'text-[#b89047] font-bold' : isPast ? 'text-[#9e7735]/70' : 'text-stone-400'
                  }`}>
                    {phase.shortName}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="absolute z-0" style={{ top: '9px', left: 'calc(100% / 40)', right: 'calc(100% / 40)', height: '2px' }}>
            <div className="w-full h-full bg-stone-200 rounded-full">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${fillPct}%`, background: 'linear-gradient(to right, #b89047, #9e7735)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export const ProspectForm: React.FC<ProspectFormProps> = ({
  initialData: init = {},
  onSubmit,
  onCancel,
  isSubmitting,
  serviceBudgets = {},
  mode,
  adminHeaderSlot,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // ── Contact state ──────────────────────────────────────────────────────────
  const [clientName, setClientName] = useState(init.clientName ?? '');
  const [mobileNo, setMobileNo] = useState(init.mobileNo ?? '');
  const [preferredCommunication, setPreferredCommunication] = useState(init.preferredCommunication ?? 'PHONE_CALL');
  const [email, setEmail] = useState(init.email ?? '');
  const [pincode, setPincode] = useState(init.pincode ?? '');
  const [district, setDistrict] = useState(init.district ?? '');
  const [stateVal, setStateVal] = useState(init.state ?? '');
  const [locality, setLocality] = useState(init.locality ?? '');
  const [status] = useState(init.status ?? 'ACTIVE');
  const [localitiesList, setLocalitiesList] = useState<string[]>(init.pincode && init.locality ? [init.locality] : []);
  const [localitySelectOther, setLocalitySelectOther] = useState(false);
  const [manualLocality, setManualLocality] = useState('');
  const [fetchingPincode, setFetchingPincode] = useState(false);

  // ── Services ───────────────────────────────────────────────────────────────
  const [serviceType, setServiceType] = useState(init.serviceType ?? '');

  // ── Lead source ────────────────────────────────────────────────────────────
  const [sourceType, setSourceType] = useState(init.sourceType ?? '');
  const [sourceCustom, setSourceCustom] = useState(init.sourceCustom ?? '');

  // ── Prospect-level master fields ───────────────────────────────────────────
  const [projectStage, setProjectStage] = useState(
    init.projectStage ?? init.archCurrentStage ?? init.intCurrentStage ?? init.renovationCurrentStage ?? ''
  );
  const [budgetAmount, setBudgetAmount] = useState(init.budgetAmount ? String(init.budgetAmount) : '');
  const [budgetUnit, setBudgetUnit] = useState(init.budgetUnit ?? 'LAKH');
  const [expectedCompletion, setExpectedCompletion] = useState(
    formatDateInput(init.expectedCompletion ?? init.intExpectedCompletion ?? init.execExpectedCompletion ?? init.renovationExpectedCompletion ?? init.turnkeyExpectedTimeline)
  );

  // ── Architectural ──────────────────────────────────────────────────────────
  const [plotAreaValue, setPlotAreaValue] = useState(
    init.plotAreaValue ? String(init.plotAreaValue) : (init.archPlotSize ? init.archPlotSize.replace(/\D/g, '') : '')
  );
  const [plotAreaUnit, setPlotAreaUnit] = useState(init.plotAreaUnit ?? 'SQ_FT');
  const [plotAreaCustomUnit, setPlotAreaCustomUnit] = useState(init.plotAreaCustomUnit ?? '');
  const [archFloors, setArchFloors] = useState(init.archFloors ?? 'GROUND_FLOOR');
  const [archFloorsCustom, setArchFloorsCustom] = useState(init.archFloorsCustom ?? '');
  const [archSanctionedNeed, setArchSanctionedNeed] = useState(init.archSanctionedNeed ?? 'No');
  const [archGfcDrawingsNeed, setArchGfcDrawingsNeed] = useState(init.archGfcDrawingsNeed ?? 'No');
  const [archConstructionStart, setArchConstructionStart] = useState(formatDateInput(init.archConstructionStart));

  // ── Interior Design ────────────────────────────────────────────────────────
  const [interiorAreaValue, setInteriorAreaValue] = useState(init.interiorAreaValue ? String(init.interiorAreaValue) : '');
  const [interiorAreaUnit, setInteriorAreaUnit] = useState(init.interiorAreaUnit ?? 'SQ_FT');
  const [interiorAreaCustomUnit, setInteriorAreaCustomUnit] = useState('');
  const [intHasDesign, setIntHasDesign] = useState(init.intHasDesign ?? 'No');
  const [intHasReferenceImages, setIntHasReferenceImages] = useState(init.intHasReferenceImages ?? 'No');

  // ── PMC ────────────────────────────────────────────────────────────────────
  const [pmcWorkedBefore, setPmcWorkedBefore] = useState(init.pmcWorkedBefore ?? 'No');
  const [mgmtAreaValue, setMgmtAreaValue] = useState(init.mgmtAreaValue ? String(init.mgmtAreaValue) : '');
  const [mgmtAreaUnit, setMgmtAreaUnit] = useState(init.mgmtAreaUnit ?? 'SQ_FT');
  const [mgmtAreaCustomUnit, setMgmtAreaCustomUnit] = useState('');
  const [pmcHasArchitect, setPmcHasArchitect] = useState(
    init.pmcArchitectDetails && init.pmcArchitectDetails !== 'No' ? 'Yes' : 'No'
  );
  const [pmcArchitectDetails, setPmcArchitectDetails] = useState(
    init.pmcArchitectDetails && init.pmcArchitectDetails !== 'No' ? init.pmcArchitectDetails : ''
  );
  const [contractorHired, setContractorHired] = useState(
    init.contractorHired === true ? 'Yes' : 'No'
  );
  const [contractorName, setContractorName] = useState(init.contractorName ?? '');
  const [constructionTimeline, setConstructionTimeline] = useState(init.constructionTimeline ?? '');
  const [pmcHasBoq, setPmcHasBoq] = useState(init.boqAmount ? 'Yes' : 'No');
  const [boqAmount, setBoqAmount] = useState(init.boqAmount ? String(init.boqAmount) : '');
  const [boqUnit, setBoqUnit] = useState(init.boqUnit ?? 'LAKH');
  const [pmcDprDocumentation, setPmcDprDocumentation] = useState(init.pmcDprDocumentation ?? 'No');
  const [pmcShopDrawingsNeed, setPmcShopDrawingsNeed] = useState(init.pmcShopDrawingsNeed ?? 'No');

  // ── Turnkey ────────────────────────────────────────────────────────────────
  const [turnkeyAreaValue, setTurnkeyAreaValue] = useState(init.turnkeyAreaValue ? String(init.turnkeyAreaValue) : '');
  const [turnkeyAreaUnit, setTurnkeyAreaUnit] = useState(init.turnkeyAreaUnit ?? 'SQ_FT');
  const [turnkeyAreaCustomUnit, setTurnkeyAreaCustomUnit] = useState('');
  const [turnkeyHasDrawings, setTurnkeyHasDrawings] = useState(init.turnkeyHasDrawings ?? 'No');
  const [turnkeyHasEstimate, setTurnkeyHasEstimate] = useState(
    init.turnkeyHasEstimate && init.turnkeyHasEstimate !== 'No' ? 'Yes' : 'No'
  );
  const [turnkeyEstimateValue, setTurnkeyEstimateValue] = useState(init.turnkeyEstimateValue ? String(init.turnkeyEstimateValue) : '');
  const [turnkeyEstimateUnit, setTurnkeyEstimateUnit] = useState(init.turnkeyEstimateUnit ?? 'LAKH');
  const [turnkeyHaltedOrNew, setTurnkeyHaltedOrNew] = useState(init.turnkeyHaltedOrNew ?? 'No');
  const [turnkeyHaltedReason, setTurnkeyHaltedReason] = useState(init.turnkeyHaltedReason ?? '');
  const [nocAvailable, setNocAvailable] = useState(init.nocAvailable === true ? 'Yes' : 'No');

  // ── Interior Execution ─────────────────────────────────────────────────────
  const [execAreaValue, setExecAreaValue] = useState(init.execAreaValue ? String(init.execAreaValue) : '');
  const [execAreaUnit, setExecAreaUnit] = useState(init.execAreaUnit ?? 'SQ_FT');
  const [execAreaCustomUnit, setExecAreaCustomUnit] = useState('');
  const [execHasDesign, setExecHasDesign] = useState(init.execHasDesign ?? 'No');
  const [execHasWorkingDrawings, setExecHasWorkingDrawings] = useState(init.execHasWorkingDrawings ?? 'No');
  const [execSelectionsDone, setExecSelectionsDone] = useState(init.execSelectionsDone ?? 'No');

  // ── Renovation ─────────────────────────────────────────────────────────────
  const [renovationAreaValue, setRenovationAreaValue] = useState(init.renovationAreaValue ? String(init.renovationAreaValue) : '');
  const [renovationAreaUnit, setRenovationAreaUnit] = useState(init.renovationAreaUnit ?? 'SQ_FT');
  const [renovationAreaCustomUnit, setRenovationAreaCustomUnit] = useState('');
  const [renovationPropertyType, setRenovationPropertyType] = useState(init.renovationPropertyType ?? 'Individual Villa');
  const [renovationWillReside, setRenovationWillReside] = useState(init.renovationWillReside ?? 'No');

  // ── End-to-End Solution ────────────────────────────────────────────────────
  const [etoPropertyType, setEtoPropertyType] = useState(init.etoPropertyType ?? '');
  const [etoAreaValue, setEtoAreaValue] = useState(init.etoAreaValue ? String(init.etoAreaValue) : '');
  const [etoAreaUnit, setEtoAreaUnit] = useState(init.etoAreaUnit ?? 'SQ_FT');
  const [etoAreaCustomUnit, setEtoAreaCustomUnit] = useState('');
  const [etoProjectStart, setEtoProjectStart] = useState(init.etoProjectStart ?? '');
  const [etoHasDocumentation, setEtoHasDocumentation] = useState(init.etoHasDocumentation ?? 'No');
  const [etoSpecialRequirements, setEtoSpecialRequirements] = useState(init.etoSpecialRequirements ?? '');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedServices = serviceType ? serviceType.split(',').filter((s: string): s is string => !!s) : [];

  const handleServiceToggle = (key: string) => {
    let arr: string[];
    if (key === 'END_TO_END') {
      // Exclusively select END_TO_END, or deselect if already selected
      arr = selectedServices.includes('END_TO_END') ? [] : ['END_TO_END'];
    } else {
      // Remove END_TO_END if present, then toggle the clicked regular service
      arr = selectedServices.filter((s: string) => s !== 'END_TO_END');
      arr = arr.includes(key) ? arr.filter((s: string) => s !== key) : [...arr, key];
    }
    setServiceType(arr.join(','));
    if (arr.length > 0) setFormErrors(p => ({ ...p, serviceType: '' }));
  };

  // ── Pincode lookup ─────────────────────────────────────────────────────────
  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(pin);
    setFormErrors(p => ({ ...p, pincode: '' }));
    if (pin.length !== 6) {
      setStateVal(''); setDistrict(''); setLocalitiesList([]); setLocalitySelectOther(false);
      return;
    }
    setFetchingPincode(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      const r = data[0];
      if (r?.Status === 'Success' && Array.isArray(r.PostOffice)) {
        setStateVal(r.PostOffice[0].State);
        setDistrict(r.PostOffice[0].District);
        const offices = r.PostOffice.map((po: any) => po.Name);
        setLocalitiesList(offices);
        if (offices.length > 0) { setLocality(offices[0]); setFormErrors(p => ({ ...p, locality: '' })); }
        setLocalitySelectOther(false);
      } else {
        setFormErrors(p => ({ ...p, pincode: 'No location details found for this pincode.' }));
        setLocalitiesList([]); setLocality(''); setDistrict(''); setStateVal('');
      }
    } catch {
      setFormErrors(p => ({ ...p, pincode: 'Failed to fetch pincode details.' }));
    } finally {
      setFetchingPincode(false);
    }
  };

  const handleLocalitySelectChange = (val: string) => {
    if (val === 'OTHER') {
      setLocalitySelectOther(true);
      setLocality(manualLocality);
    } else {
      setLocalitySelectOther(false);
      setLocality(val);
      if (val) setFormErrors(p => ({ ...p, locality: '' }));
    }
  };

  // ── "Use Plot Area" helpers ────────────────────────────────────────────────
  const applyPlotAreaToInterior = () => { setInteriorAreaValue(plotAreaValue); setInteriorAreaUnit(plotAreaUnit); setInteriorAreaCustomUnit(plotAreaCustomUnit); };
  const applyPlotAreaToMgmt = () => { setMgmtAreaValue(plotAreaValue); setMgmtAreaUnit(plotAreaUnit); setMgmtAreaCustomUnit(plotAreaCustomUnit); };
  const applyPlotAreaToTurnkey = () => { setTurnkeyAreaValue(plotAreaValue); setTurnkeyAreaUnit(plotAreaUnit); setTurnkeyAreaCustomUnit(plotAreaCustomUnit); };
  const applyPlotAreaToExec = () => { setExecAreaValue(plotAreaValue); setExecAreaUnit(plotAreaUnit); setExecAreaCustomUnit(plotAreaCustomUnit); };
  const applyPlotAreaToRenovation = () => { setRenovationAreaValue(plotAreaValue); setRenovationAreaUnit(plotAreaUnit); setRenovationAreaCustomUnit(plotAreaCustomUnit); };
  const hasArchService = selectedServices.includes('ARCHITECTURAL_CONSULTATION');

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // ── Contact (always required) ──────────────────────────────────────────
    if (!clientName.trim()) errors.clientName = 'Client name is required.';
    else if (clientName.trim().length < 2) errors.clientName = 'Client name must be at least 2 characters.';
    else if (clientName.trim().length > 20) errors.clientName = 'Client name cannot exceed 20 characters.';

    if (!mobileNo.trim()) errors.mobileNo = 'Mobile number is required.';
    else if (!/^[6-9]\d{9}$/.test(mobileNo.trim())) errors.mobileNo = 'Enter a valid 10-digit mobile number starting with 6-9.';

    if (!email.trim()) errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address.';

    if (pincode.trim() && !/^[1-9]\d{5}$/.test(pincode.trim())) errors.pincode = 'Enter a valid 6-digit pincode.';

    if (!locality.trim()) errors.locality = 'Project locality is required.';

    // ── Service & source ────────────────────────────────────────────────────
    if (!serviceType || selectedServices.length === 0) errors.serviceType = 'Select at least one service.';

    if (!sourceType) errors.sourceType = 'Lead source is required.';
    else if (sourceType === 'OTHER' && !sourceCustom.trim()) errors.sourceCustom = 'Please specify the lead source.';

    // ── Master dates ────────────────────────────────────────────────────────
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (expectedCompletion) {
      const d = parseLocalDate(expectedCompletion);
      if (d && d < today) errors.expectedCompletion = 'Completion date cannot be in the past.';
    }

    // ── Service-specific required fields ────────────────────────────────────
    if (selectedServices.includes('ARCHITECTURAL_CONSULTATION')) {
      if (!plotAreaValue || !String(plotAreaValue).trim()) errors.plotAreaValue = 'Plot area is required.';
      if (plotAreaUnit === 'OTHER' && !plotAreaCustomUnit.trim()) errors.plotAreaCustomUnit = 'Specify the custom area unit.';
      if (archFloors === 'OTHER' && !archFloorsCustom.trim()) errors.archFloorsCustom = 'Specify the number of floors.';
      if (archConstructionStart) {
        const d = parseLocalDate(archConstructionStart);
        if (d && d < today) errors.archConstructionStart = 'Construction start date cannot be in the past.';
      }
    }

    if (selectedServices.includes('INTERIOR_DESIGN')) {
      if (!interiorAreaValue || !String(interiorAreaValue).trim()) errors.interiorAreaValue = 'Interior area is required.';
      if (interiorAreaUnit === 'OTHER' && !interiorAreaCustomUnit.trim()) errors.interiorAreaCustomUnit = 'Specify the custom area unit.';
    }

    if (selectedServices.includes('PMC')) {
      if (!mgmtAreaValue || !String(mgmtAreaValue).trim()) errors.mgmtAreaValue = 'Management area is required.';
      if (mgmtAreaUnit === 'OTHER' && !mgmtAreaCustomUnit.trim()) errors.mgmtAreaCustomUnit = 'Specify the custom area unit.';
      if (!constructionTimeline) errors.constructionTimeline = 'Construction timeline is required.';
      if (contractorHired === 'Yes' && !contractorName.trim()) errors.contractorName = 'Contractor name is required.';
    }

    if (selectedServices.includes('TURNKEY_CONSTRUCTION')) {
      if (!turnkeyAreaValue || !String(turnkeyAreaValue).trim()) errors.turnkeyAreaValue = 'Built-up area is required.';
    }

    if (selectedServices.includes('INTERIOR_EXECUTION')) {
      if (!execAreaValue || !String(execAreaValue).trim()) errors.execAreaValue = 'Execution area is required.';
    }

    if (selectedServices.includes('RENOVATION')) {
      if (!renovationAreaValue || !String(renovationAreaValue).trim()) errors.renovationAreaValue = 'Renovation area is required.';
      if (!renovationPropertyType) errors.renovationPropertyType = 'Property type is required.';
    }

    if (selectedServices.includes('END_TO_END')) {
      if (!etoPropertyType) errors.etoPropertyType = 'Property type is required.';
      if (!etoAreaValue || !String(etoAreaValue).trim()) errors.etoAreaValue = 'Project area is required.';
      if (!etoProjectStart) errors.etoProjectStart = 'Project start timeline is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) {
      setTimeout(() => {
        const first = document.querySelector('.border-red-300');
        if (first) (first as HTMLElement).focus();
      }, 50);
      return;
    }

    const payload: ProspectFormData = {
      clientName: clientName.trim(),
      mobileNo: mobileNo.trim(),
      preferredCommunication,
      email: email.trim() || null,
      pincode: pincode.trim() || null,
      district: district.trim() || null,
      state: stateVal.trim() || null,
      locality: locality.trim(),
      serviceType,
      status,
      sourceType: sourceType || null,
      sourceCustom: sourceType === 'OTHER' ? (sourceCustom.trim() || null) : null,
      projectStage: projectStage || null,
      budgetAmount: budgetAmount ? parseFloat(budgetAmount) : null,
      budgetUnit: budgetAmount ? budgetUnit : null,
      expectedCompletion: expectedCompletion || null,
      // Architectural
      plotAreaValue: selectedServices.includes('ARCHITECTURAL_CONSULTATION') && plotAreaValue ? parseInt(plotAreaValue) : null,
      plotAreaUnit: selectedServices.includes('ARCHITECTURAL_CONSULTATION') && plotAreaValue ? plotAreaUnit : null,
      plotAreaCustomUnit: plotAreaUnit === 'OTHER' ? (plotAreaCustomUnit.trim() || null) : null,
      archFloors: selectedServices.includes('ARCHITECTURAL_CONSULTATION') ? archFloors : null,
      archFloorsCustom: archFloors === 'OTHER' ? (archFloorsCustom.trim() || null) : null,
      archSanctionedNeed: selectedServices.includes('ARCHITECTURAL_CONSULTATION') ? archSanctionedNeed : null,
      archGfcDrawingsNeed: selectedServices.includes('ARCHITECTURAL_CONSULTATION') ? archGfcDrawingsNeed : null,
      archConstructionStart: selectedServices.includes('ARCHITECTURAL_CONSULTATION') ? (archConstructionStart || null) : null,
      // Interior Design
      interiorAreaValue: selectedServices.includes('INTERIOR_DESIGN') && interiorAreaValue ? parseInt(interiorAreaValue) : null,
      interiorAreaUnit: selectedServices.includes('INTERIOR_DESIGN') && interiorAreaValue ? interiorAreaUnit : null,
      intHasDesign: selectedServices.includes('INTERIOR_DESIGN') ? intHasDesign : null,
      intHasReferenceImages: selectedServices.includes('INTERIOR_DESIGN') ? intHasReferenceImages : null,
      // PMC
      pmcWorkedBefore: selectedServices.includes('PMC') ? pmcWorkedBefore : null,
      mgmtAreaValue: selectedServices.includes('PMC') && mgmtAreaValue ? parseInt(mgmtAreaValue) : null,
      mgmtAreaUnit: selectedServices.includes('PMC') && mgmtAreaValue ? mgmtAreaUnit : null,
      pmcArchitectDetails: selectedServices.includes('PMC') ? (pmcHasArchitect === 'Yes' ? pmcArchitectDetails : 'No') : null,
      contractorHired: selectedServices.includes('PMC') ? contractorHired === 'Yes' : null,
      contractorName: selectedServices.includes('PMC') && contractorHired === 'Yes' ? (contractorName.trim() || null) : null,
      constructionTimeline: selectedServices.includes('PMC') ? (constructionTimeline || null) : null,
      boqAmount: selectedServices.includes('PMC') && pmcHasBoq === 'Yes' && boqAmount ? parseFloat(boqAmount) : null,
      boqUnit: selectedServices.includes('PMC') && pmcHasBoq === 'Yes' && boqAmount ? boqUnit : null,
      pmcDprDocumentation: selectedServices.includes('PMC') ? pmcDprDocumentation : null,
      pmcShopDrawingsNeed: selectedServices.includes('PMC') ? pmcShopDrawingsNeed : null,
      // Turnkey
      turnkeyAreaValue: selectedServices.includes('TURNKEY_CONSTRUCTION') && turnkeyAreaValue ? parseInt(turnkeyAreaValue) : null,
      turnkeyAreaUnit: selectedServices.includes('TURNKEY_CONSTRUCTION') && turnkeyAreaValue ? turnkeyAreaUnit : null,
      turnkeyHasDrawings: selectedServices.includes('TURNKEY_CONSTRUCTION') ? turnkeyHasDrawings : null,
      turnkeyHasEstimate: selectedServices.includes('TURNKEY_CONSTRUCTION') ? turnkeyHasEstimate : null,
      turnkeyEstimateValue: selectedServices.includes('TURNKEY_CONSTRUCTION') && turnkeyHasEstimate === 'Yes' && turnkeyEstimateValue ? parseFloat(turnkeyEstimateValue) : null,
      turnkeyEstimateUnit: selectedServices.includes('TURNKEY_CONSTRUCTION') && turnkeyHasEstimate === 'Yes' && turnkeyEstimateValue ? turnkeyEstimateUnit : null,
      turnkeyHaltedOrNew: selectedServices.includes('TURNKEY_CONSTRUCTION') ? turnkeyHaltedOrNew : null,
      turnkeyHaltedReason: selectedServices.includes('TURNKEY_CONSTRUCTION') && turnkeyHaltedOrNew === 'Yes' ? (turnkeyHaltedReason || null) : null,
      nocAvailable: selectedServices.includes('TURNKEY_CONSTRUCTION') && turnkeyHaltedOrNew === 'Yes' ? nocAvailable === 'Yes' : null,
      // Interior Execution
      execAreaValue: selectedServices.includes('INTERIOR_EXECUTION') && execAreaValue ? parseInt(execAreaValue) : null,
      execAreaUnit: selectedServices.includes('INTERIOR_EXECUTION') && execAreaValue ? execAreaUnit : null,
      execHasDesign: selectedServices.includes('INTERIOR_EXECUTION') ? execHasDesign : null,
      execHasWorkingDrawings: selectedServices.includes('INTERIOR_EXECUTION') ? execHasWorkingDrawings : null,
      execSelectionsDone: selectedServices.includes('INTERIOR_EXECUTION') ? execSelectionsDone : null,
      // Renovation
      renovationAreaValue: selectedServices.includes('RENOVATION') && renovationAreaValue ? parseInt(renovationAreaValue) : null,
      renovationAreaUnit: selectedServices.includes('RENOVATION') && renovationAreaValue ? renovationAreaUnit : null,
      renovationPropertyType: selectedServices.includes('RENOVATION') ? renovationPropertyType : null,
      renovationWillReside: selectedServices.includes('RENOVATION') ? renovationWillReside : null,
      // End-to-End Solution
      etoPropertyType: selectedServices.includes('END_TO_END') ? (etoPropertyType || null) : null,
      etoAreaValue: selectedServices.includes('END_TO_END') && etoAreaValue ? parseInt(etoAreaValue) : null,
      etoAreaUnit: selectedServices.includes('END_TO_END') && etoAreaValue ? etoAreaUnit : null,
      etoAreaCustomUnit: selectedServices.includes('END_TO_END') && etoAreaUnit === 'OTHER' ? (etoAreaCustomUnit.trim() || null) : null,
      etoProjectStart: selectedServices.includes('END_TO_END') ? (etoProjectStart || null) : null,
      etoHasDocumentation: selectedServices.includes('END_TO_END') ? etoHasDocumentation : null,
      etoSpecialRequirements: selectedServices.includes('END_TO_END') ? (etoSpecialRequirements.trim() || null) : null,
    };

    await onSubmit(payload);
  };

  // ── Service questionnaires ─────────────────────────────────────────────────
  const renderQuestionnaires = () => (
    <div className="flex flex-col gap-6">
      {selectedServices.includes('ARCHITECTURAL_CONSULTATION') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-[rgba(184,144,71,0.2)] pt-3 mt-2 bg-stone-50/20 p-3 sm:p-4 rounded-xl">
          <div className="col-span-2">
            <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">Architectural Consultation</h4>
          </div>
          <div className="sm:col-span-2">
            <AreaInput
              label="What is the plot size? *"
              value={plotAreaValue} unit={plotAreaUnit} customUnit={plotAreaCustomUnit}
              onValueChange={v => { setPlotAreaValue(v); if (v) setFormErrors(p => ({ ...p, plotAreaValue: '' })); }}
              onUnitChange={setPlotAreaUnit} onCustomUnitChange={setPlotAreaCustomUnit}
              error={formErrors.plotAreaValue || formErrors.plotAreaCustomUnit}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelBase}>How many floors are you looking forward to build?</label>
            <SearchableSelect options={FLOOR_OPTIONS} value={archFloors} onChange={setArchFloors} />
          </div>
          {archFloors === 'OTHER' && (
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Please Specify *</label>
              <input type="text" maxLength={200} placeholder="e.g. G + 5" value={archFloorsCustom}
                onChange={e => setArchFloorsCustom(e.target.value)}
                className={`${inputBase} ${formErrors.archFloorsCustom ? 'border-red-300' : ''}`} />
              {formErrors.archFloorsCustom && <span className="text-[11px] font-semibold text-red-500">{formErrors.archFloorsCustom}</span>}
            </div>
          )}
          <RadioField label="Do we need sanctioned plan from authority?" value={archSanctionedNeed} onChange={setArchSanctionedNeed} />
          <RadioField label="Do you want set of Good for Construction (GFC) Drawings?" value={archGfcDrawingsNeed} onChange={setArchGfcDrawingsNeed} />
          <div className="flex flex-col gap-1.5">
            <label className={labelBase}>When do you expect your construction to start?</label>
            <input type="date" min={todayStr} value={archConstructionStart} onChange={e => setArchConstructionStart(e.target.value)}
              className={`${inputBase} ${formErrors.archConstructionStart ? 'border-red-300' : ''}`} />
            {formErrors.archConstructionStart && <span className="text-[11px] font-semibold text-red-500">{formErrors.archConstructionStart}</span>}
          </div>
        </div>
      )}

      {selectedServices.includes('INTERIOR_DESIGN') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-[rgba(184,144,71,0.2)] pt-3 mt-2 bg-stone-50/20 p-3 sm:p-4 rounded-xl">
          <div className="col-span-2">
            <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">Interior Design</h4>
          </div>
          <div className="sm:col-span-2">
            <AreaInput
              label="What is the estimated area for interior designing? *"
              value={interiorAreaValue} unit={interiorAreaUnit} customUnit={interiorAreaCustomUnit}
              onValueChange={v => { setInteriorAreaValue(v); if (v) setFormErrors(p => ({ ...p, interiorAreaValue: '' })); }}
              onUnitChange={setInteriorAreaUnit} onCustomUnitChange={setInteriorAreaCustomUnit}
              onUsePlotArea={hasArchService ? applyPlotAreaToInterior : undefined}
              error={formErrors.interiorAreaValue || formErrors.interiorAreaCustomUnit}
            />
          </div>
          <RadioField label="Do you already have the design?" value={intHasDesign} onChange={setIntHasDesign} />
          <RadioField label="Do you have reference images on Pinterest or any other platform?" value={intHasReferenceImages} onChange={setIntHasReferenceImages} />
        </div>
      )}

      {selectedServices.includes('PMC') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-[rgba(184,144,71,0.2)] pt-3 mt-2 bg-stone-50/20 p-3 sm:p-4 rounded-xl">
          <div className="col-span-2">
            <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">PMC</h4>
          </div>
          <RadioField label="Have you ever worked with a PMC company before?" value={pmcWorkedBefore} onChange={setPmcWorkedBefore} />
          <div className="sm:col-span-2">
            <AreaInput
              label="What is the estimated area for management? *"
              value={mgmtAreaValue} unit={mgmtAreaUnit} customUnit={mgmtAreaCustomUnit}
              onValueChange={v => { setMgmtAreaValue(v); if (v) setFormErrors(p => ({ ...p, mgmtAreaValue: '' })); }}
              onUnitChange={setMgmtAreaUnit} onCustomUnitChange={setMgmtAreaCustomUnit}
              onUsePlotArea={hasArchService ? applyPlotAreaToMgmt : undefined}
              error={formErrors.mgmtAreaValue || formErrors.mgmtAreaCustomUnit}
            />
          </div>
          <RadioField label="Please provide details of the hired architect (Do you have one)?" value={pmcHasArchitect} onChange={setPmcHasArchitect} />
          {pmcHasArchitect === 'Yes' && (
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Architect Name / Firm</label>
              <input type="text" maxLength={200} placeholder="Architect name/firm" value={pmcArchitectDetails}
                onChange={e => setPmcArchitectDetails(e.target.value)} className={inputBase} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className={labelBase}>Have you hired a contractor?</label>
            <div className="flex gap-4">
              {['Yes', 'No'].map(opt => (
                <label key={opt} className="inline-flex items-center gap-1.5 text-[12.5px] text-stone-800 cursor-pointer">
                  <input type="radio" checked={contractorHired === opt} onChange={() => setContractorHired(opt)} className="accent-[#b89047] w-4 h-4 cursor-pointer" />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          {contractorHired === 'Yes' && (
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Contractor Name *</label>
              <input type="text" maxLength={200} placeholder="Contractor name" value={contractorName}
                onChange={e => setContractorName(e.target.value)}
                className={`${inputBase} ${formErrors.contractorName ? 'border-red-300' : ''}`} />
              {formErrors.contractorName && <span className="text-[11px] font-semibold text-red-500">{formErrors.contractorName}</span>}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className={labelBase}>Construction timeline</label>
            <SearchableSelect
              options={[{ value: '', label: '— Select Timeline —' }, ...CONSTRUCTION_TIMELINES]}
              value={constructionTimeline} onChange={v => { setConstructionTimeline(v); if (v) setFormErrors(p => ({ ...p, constructionTimeline: '' })); }}
            />
            {formErrors.constructionTimeline && <span className="text-[11px] font-semibold text-red-500">{formErrors.constructionTimeline}</span>}
          </div>
          <RadioField label="Have you been provided with any specific BOQ / Budget for construction?" value={pmcHasBoq} onChange={setPmcHasBoq} />
          {pmcHasBoq === 'Yes' && (
            <BudgetInput label="BOQ / Budget Amount" amount={boqAmount} unit={boqUnit} onAmountChange={setBoqAmount} onUnitChange={setBoqUnit} />
          )}
          <RadioField label="Do you have DPR / construction documentation?" value={pmcDprDocumentation} onChange={setPmcDprDocumentation} />
          <RadioField label="Do you need shop drawings as well?" value={pmcShopDrawingsNeed} onChange={setPmcShopDrawingsNeed} />
        </div>
      )}

      {selectedServices.includes('TURNKEY_CONSTRUCTION') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-[rgba(184,144,71,0.2)] pt-3 mt-2 bg-stone-50/20 p-3 sm:p-4 rounded-xl">
          <div className="col-span-2">
            <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">Turnkey Construction</h4>
          </div>
          <div className="sm:col-span-2">
            <AreaInput
              label="What is the total area to be constructed? *"
              value={turnkeyAreaValue} unit={turnkeyAreaUnit} customUnit={turnkeyAreaCustomUnit}
              onValueChange={v => { setTurnkeyAreaValue(v); if (v) setFormErrors(p => ({ ...p, turnkeyAreaValue: '' })); }}
              onUnitChange={setTurnkeyAreaUnit} onCustomUnitChange={setTurnkeyAreaCustomUnit}
              onUsePlotArea={hasArchService ? applyPlotAreaToTurnkey : undefined}
              error={formErrors.turnkeyAreaValue}
            />
          </div>
          <RadioField label="Do you have construction drawings for the project?" value={turnkeyHasDrawings} onChange={setTurnkeyHasDrawings} />
          <RadioField label="Do you have any existing estimate for the construction?" value={turnkeyHasEstimate} onChange={setTurnkeyHasEstimate} />
          {turnkeyHasEstimate === 'Yes' && (
            <BudgetInput
              label="Existing Estimate Amount"
              amount={turnkeyEstimateValue}
              unit={turnkeyEstimateUnit}
              onAmountChange={setTurnkeyEstimateValue}
              onUnitChange={setTurnkeyEstimateUnit}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <label className={labelBase}>Is it a halted construction or new construction?</label>
            <SearchableSelect
              options={[{ value: 'No', label: 'Completely New Construction' }, { value: 'Yes', label: 'Halted Construction' }]}
              value={turnkeyHaltedOrNew} onChange={setTurnkeyHaltedOrNew}
            />
          </div>
          {turnkeyHaltedOrNew === 'Yes' && (
            <>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className={labelBase}>What was the reason for stopping the construction?</label>
                <SearchableSelect
                  options={[
                    { value: '', label: '— Select Reason —' },
                    { value: 'Budget / Fund Shortage', label: 'Budget / Fund Shortage' },
                    { value: 'Regulatory / Authority Issues', label: 'Regulatory / Authority Issues' },
                    { value: 'Contractor Dispute', label: 'Contractor Dispute' },
                    { value: 'Architect / Design Changes', label: 'Architect / Design Changes' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  value={turnkeyHaltedReason} onChange={setTurnkeyHaltedReason}
                />
              </div>
              <RadioField label="Can you provide NOC from involved stakeholders if needed?" value={nocAvailable} onChange={setNocAvailable} />
            </>
          )}
        </div>
      )}

      {selectedServices.includes('INTERIOR_EXECUTION') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-[rgba(184,144,71,0.2)] pt-3 mt-2 bg-stone-50/20 p-3 sm:p-4 rounded-xl">
          <div className="col-span-2">
            <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">Interior Execution</h4>
          </div>
          <div className="sm:col-span-2">
            <AreaInput
              label="What is the estimated area for interior execution? *"
              value={execAreaValue} unit={execAreaUnit} customUnit={execAreaCustomUnit}
              onValueChange={v => { setExecAreaValue(v); if (v) setFormErrors(p => ({ ...p, execAreaValue: '' })); }}
              onUnitChange={setExecAreaUnit} onCustomUnitChange={setExecAreaCustomUnit}
              onUsePlotArea={hasArchService ? applyPlotAreaToExec : undefined}
              error={formErrors.execAreaValue}
            />
          </div>
          <RadioField label="Do you have a prepared design for the space?" value={execHasDesign} onChange={setExecHasDesign} />
          <RadioField label="Do you have the set of working drawings required for execution?" value={execHasWorkingDrawings} onChange={setExecHasWorkingDrawings} />
          <div className="sm:col-span-2">
            <RadioField label="Have you done the selections for sanitary fittings, electrical switches, fabrics, flooring, and other interior fixtures?" value={execSelectionsDone} onChange={setExecSelectionsDone} />
          </div>
        </div>
      )}

      {selectedServices.includes('RENOVATION') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-[rgba(184,144,71,0.2)] pt-3 mt-2 bg-stone-50/20 p-3 sm:p-4 rounded-xl">
          <div className="col-span-2">
            <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">Renovation</h4>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelBase}>What is the kind of property? *</label>
            <SearchableSelect
              options={[
                { value: 'Individual Villa', label: 'Individual Villa' },
                { value: 'Builder Floor', label: 'Builder Floor' },
                { value: 'Institutional Space', label: 'Institutional Space' },
                { value: 'Office Space', label: 'Office Space' },
                { value: 'Retail / Showroom Space', label: 'Retail / Showroom Space' },
                { value: 'High Rise Apartment', label: 'High Rise Apartment' },
              ]}
              value={renovationPropertyType} onChange={v => { setRenovationPropertyType(v); if (v) setFormErrors(p => ({ ...p, renovationPropertyType: '' })); }}
            />
            {formErrors.renovationPropertyType && <span className="text-[11px] font-semibold text-red-500">{formErrors.renovationPropertyType}</span>}
          </div>
          <div className="sm:col-span-2">
            <AreaInput
              label="What is the estimated area for renovation? *"
              value={renovationAreaValue} unit={renovationAreaUnit} customUnit={renovationAreaCustomUnit}
              onValueChange={v => { setRenovationAreaValue(v); if (v) setFormErrors(p => ({ ...p, renovationAreaValue: '' })); }}
              onUnitChange={setRenovationAreaUnit} onCustomUnitChange={setRenovationAreaCustomUnit}
              onUsePlotArea={hasArchService ? applyPlotAreaToRenovation : undefined}
              error={formErrors.renovationAreaValue}
            />
          </div>
          <RadioField label="Will you be residing at the property during renovation?" value={renovationWillReside} onChange={setRenovationWillReside} />
        </div>
      )}

      {selectedServices.includes('END_TO_END') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-[rgba(184,144,71,0.2)] pt-3 mt-2 bg-stone-50/20 p-3 sm:p-4 rounded-xl">
          <div className="col-span-2">
            <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">End-to-End Solution</h4>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelBase}>What is the type of property? *</label>
            <SearchableSelect
              options={[
                { value: 'Residential Villa', label: 'Residential Villa' },
                { value: 'Builder Floor', label: 'Builder Floor' },
                { value: 'Apartment', label: 'Apartment' },
                { value: 'Farmhouse', label: 'Farmhouse' },
                { value: 'Office', label: 'Office' },
                { value: 'Retail / Showroom', label: 'Retail / Showroom' },
                { value: 'Institutional', label: 'Institutional' },
                { value: 'Other', label: 'Other' },
              ]}
              value={etoPropertyType} onChange={v => { setEtoPropertyType(v); if (v) setFormErrors(p => ({ ...p, etoPropertyType: '' })); }}
            />
            {formErrors.etoPropertyType && <span className="text-[11px] font-semibold text-red-500">{formErrors.etoPropertyType}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelBase}>When are you planning to start the project? *</label>
            <SearchableSelect
              options={[
                { value: 'Immediately', label: 'Immediately' },
                { value: 'Within 1 Month', label: 'Within 1 Month' },
                { value: '1–3 Months', label: '1–3 Months' },
                { value: '3–6 Months', label: '3–6 Months' },
                { value: '6+ Months', label: '6+ Months' },
              ]}
              value={etoProjectStart} onChange={v => { setEtoProjectStart(v); if (v) setFormErrors(p => ({ ...p, etoProjectStart: '' })); }}
            />
            {formErrors.etoProjectStart && <span className="text-[11px] font-semibold text-red-500">{formErrors.etoProjectStart}</span>}
          </div>

          <div className="sm:col-span-2">
            <AreaInput
              label="What is the approximate area of the project? *"
              value={etoAreaValue} unit={etoAreaUnit} customUnit={etoAreaCustomUnit}
              onValueChange={v => { setEtoAreaValue(v); if (v) setFormErrors(p => ({ ...p, etoAreaValue: '' })); }}
              onUnitChange={setEtoAreaUnit} onCustomUnitChange={setEtoAreaCustomUnit}
              error={formErrors.etoAreaValue}
            />
          </div>

          <div className="sm:col-span-2">
            <RadioField label="Do you already have any drawings, designs, or project documentation available?" value={etoHasDocumentation} onChange={setEtoHasDocumentation} />
          </div>

          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className={labelBase}>Is there any specific requirement or expectation you would like us to know about? (Optional)</label>
            <textarea
              rows={3}
              placeholder="E.g. preferred materials, special architectural requirements, timeline constraints..."
              value={etoSpecialRequirements}
              onChange={e => setEtoSpecialRequirements(e.target.value)}
              className={`${inputBase} resize-none`}
            />
          </div>
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex-1 flex flex-col min-h-0 overflow-hidden"
      onKeyDown={e => {
        if (e.key === 'Enter') {
          const tag = (e.target as HTMLElement).tagName;
          if (tag !== 'TEXTAREA' && tag !== 'BUTTON' && tag !== 'SELECT') e.preventDefault();
        }
      }}
    >
      <div className="shrink-0 border-b border-stone-100 px-3 sm:px-5 md:px-6 py-3 bg-stone-50/30">
        <ProjectStageField value={projectStage} onChange={setProjectStage} />
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 flex flex-col gap-4 sm:gap-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-start">

          {/* ── Left column: Client Profile ── */}
          <div className="md:col-span-1 bg-stone-50/40 border border-stone-200/80 p-3 sm:p-4 rounded-xl space-y-3 md:sticky md:top-0">
            <h4 className="text-[12px] font-bold text-[#9e7735] uppercase tracking-wide border-b border-stone-200/50 pb-1.5 mb-2">Client Profile</h4>

            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Client Name *</label>
              <input type="text" maxLength={20} placeholder="John Doe" value={clientName}
                onChange={e => { setClientName(e.target.value); if (e.target.value) setFormErrors(p => ({ ...p, clientName: '' })); }}
                className={`${inputBase} ${formErrors.clientName ? 'border-red-300' : ''}`} />
              {formErrors.clientName && <span className="text-[11px] font-semibold text-red-500">{formErrors.clientName}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Mobile No. *</label>
              <input type="text" maxLength={10} placeholder="10-digit mobile" value={mobileNo}
                onChange={e => { const d = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10); setMobileNo(d); if (d.length === 10) setFormErrors(p => ({ ...p, mobileNo: '' })); }}
                className={`${inputBase} ${formErrors.mobileNo ? 'border-red-300' : ''}`} />
              {formErrors.mobileNo && <span className="text-[11px] font-semibold text-red-500">{formErrors.mobileNo}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Preferred Communication Mode</label>
              <SearchableSelect options={COMMUNICATION_MODES} value={preferredCommunication} onChange={setPreferredCommunication} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Email Address *</label>
              <input type="email" required placeholder="client@example.com" value={email}
                onChange={e => { setEmail(e.target.value); if (e.target.value) setFormErrors(p => ({ ...p, email: '' })); }}
                className={`${inputBase} ${formErrors.email ? 'border-red-300' : ''}`} />
              {formErrors.email && <span className="text-[11px] font-semibold text-red-500">{formErrors.email}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className={labelBase}>Pincode</label>
                {fetchingPincode && <span className="text-[10px] text-[#b89047] font-semibold animate-pulse">Fetching...</span>}
              </div>
              <input type="text" maxLength={6} placeholder="e.g. 110001" value={pincode}
                onChange={handlePincodeChange}
                className={`${inputBase} ${formErrors.pincode ? 'border-red-300' : ''}`} />
              {formErrors.pincode && <span className="text-[11px] font-semibold text-red-500">{formErrors.pincode}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>State</label>
              <input type="text" value={stateVal} readOnly placeholder="Auto-filled"
                className="w-full bg-stone-100/50 border border-[rgba(184,144,71,0.22)] text-stone-600 text-[13px] rounded-lg px-3.5 py-1.5 outline-none cursor-not-allowed compact-input" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>District / City</label>
              <input type="text" value={district} readOnly placeholder="Auto-filled"
                className="w-full bg-stone-100/50 border border-[rgba(184,144,71,0.22)] text-stone-600 text-[13px] rounded-lg px-3.5 py-1.5 outline-none cursor-not-allowed compact-input" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Locality / Area *</label>
              {localitiesList.length > 0 ? (
                <SearchableSelect
                  options={[{ value: '', label: '— Select Area —' }, ...localitiesList.map(l => ({ value: l, label: l })), { value: 'OTHER', label: 'Other (Type Manually)' }]}
                  value={localitySelectOther ? 'OTHER' : locality}
                  onChange={handleLocalitySelectChange}
                />
              ) : (
                <input type="text" maxLength={100} placeholder="e.g. DLF Phase 3" value={locality}
                  onChange={e => { setLocality(e.target.value); if (e.target.value) setFormErrors(p => ({ ...p, locality: '' })); }}
                  className={`${inputBase} ${formErrors.locality ? 'border-red-300' : ''}`} />
              )}
              {formErrors.locality && <span className="text-[11px] font-semibold text-red-500">{formErrors.locality}</span>}
            </div>

            {localitySelectOther && (
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Type Locality Manually *</label>
                <input type="text" maxLength={100} placeholder="Type locality..." value={manualLocality}
                  onChange={e => { setManualLocality(e.target.value); setLocality(e.target.value); if (e.target.value) setFormErrors(p => ({ ...p, locality: '' })); }}
                  className={`${inputBase} ${formErrors.locality ? 'border-red-300' : ''}`} />
              </div>
            )}

            {/* Lead source */}
            <div className="pt-2 border-t border-stone-100 space-y-3">
              <h4 className="text-[12px] font-bold text-[#9e7735] uppercase tracking-wide">Lead Source</h4>
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>How did you hear about us? *</label>
                <SearchableSelect
                  options={[{ value: '', label: '— Select Source —' }, ...SOURCE_OPTIONS]}
                  value={sourceType}
                  onChange={v => { setSourceType(v); if (v) setFormErrors(p => ({ ...p, sourceType: '' })); }}
                />
                {formErrors.sourceType && <span className="text-[11px] font-semibold text-red-500">{formErrors.sourceType}</span>}
              </div>
              {sourceType === 'OTHER' && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelBase}>Other Source Specification *</label>
                  <input type="text" maxLength={200} placeholder="Specify source…" value={sourceCustom}
                    onChange={e => { setSourceCustom(e.target.value); if (e.target.value) setFormErrors(p => ({ ...p, sourceCustom: '' })); }}
                    className={`${inputBase} ${formErrors.sourceCustom ? 'border-red-300' : ''}`} />
                  {formErrors.sourceCustom && <span className="text-[11px] font-semibold text-red-500">{formErrors.sourceCustom}</span>}
                </div>
              )}
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="md:col-span-2 space-y-4">

            {/* Master project info — asked once */}
            <div className="bg-stone-50/40 border border-stone-200/80 p-3 sm:p-4 rounded-xl space-y-3">
              <h4 className="text-[12px] font-bold text-[#9e7735] uppercase tracking-wide border-b border-stone-200/50 pb-1.5">Project Overview</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <BudgetInput
                  label="What is the budget range you are looking to invest?"
                  amount={budgetAmount} unit={budgetUnit}
                  onAmountChange={setBudgetAmount} onUnitChange={setBudgetUnit}
                  error={formErrors.budgetAmount}
                />
                <div className="flex flex-col gap-1.5">
                  <label className={labelBase}>When do you expect your work to be completed?</label>
                  <input type="date" min={todayStr} value={expectedCompletion}
                    onChange={e => setExpectedCompletion(e.target.value)}
                    className={`${inputBase} ${formErrors.expectedCompletion ? 'border-red-300' : ''}`} />
                  {formErrors.expectedCompletion && <span className="text-[11px] font-semibold text-red-500">{formErrors.expectedCompletion}</span>}
                </div>
              </div>
            </div>

            {/* Service selection */}
            <div className="flex flex-col gap-3 bg-stone-50/40 p-5 rounded-2xl border border-stone-200/80">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200/50">
                <label className={labelBase}>What services are you looking for? (Select all that apply) *</label>
                {adminHeaderSlot}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                {/* Regular services — disabled when END_TO_END is selected */}
                {Object.entries(SERVICE_LABELS).filter(([val]) => val !== 'END_TO_END').map(([val, label]) => {
                  const isSelected = selectedServices.includes(val);
                  const isDisabled = selectedServices.includes('END_TO_END');
                  return (
                    <button key={val} type="button"
                      onClick={() => !isDisabled && handleServiceToggle(val)}
                      disabled={isDisabled}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-lg border text-left transition-all ${
                        isDisabled
                          ? 'border-stone-100 bg-stone-50 opacity-40 cursor-not-allowed'
                          : isSelected
                            ? 'border-[#b89047] bg-[rgba(184,144,71,0.08)] ring-1 ring-[#b89047] cursor-pointer'
                            : 'border-stone-200 bg-white hover:bg-stone-50 cursor-pointer'
                      }`}>
                      <input type="checkbox" checked={isSelected} onChange={() => {}} disabled={isDisabled} className="accent-[#b89047] w-4 h-4 cursor-pointer" />
                      <span className={`text-[12.5px] font-semibold ${isSelected && !isDisabled ? 'text-stone-900' : 'text-stone-700'}`}>{label}</span>
                    </button>
                  );
                })}

                {/* Divider */}
                <div className="col-span-1 sm:col-span-2 flex items-center gap-3 my-0.5">
                  <div className="flex-1 h-px bg-stone-200" />
                  <span className="text-[9.5px] font-bold text-stone-400 uppercase tracking-wider whitespace-nowrap">or choose a complete solution</span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>

                {/* END_TO_END — full width, mutually exclusive */}
                {(() => {
                  const isSelected = selectedServices.includes('END_TO_END');
                  return (
                    <button type="button" onClick={() => handleServiceToggle('END_TO_END')}
                      className={`col-span-1 sm:col-span-2 flex items-center gap-3 px-3.5 py-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#b89047] bg-[rgba(184,144,71,0.08)] ring-1 ring-[#b89047]'
                          : 'border-dashed border-[rgba(184,144,71,0.4)] bg-[rgba(184,144,71,0.02)] hover:bg-[rgba(184,144,71,0.06)]'
                      }`}>
                      <input type="checkbox" checked={isSelected} onChange={() => {}} className="accent-[#b89047] w-4 h-4 shrink-0 cursor-pointer" />
                      <div>
                        <span className={`text-[12.5px] font-semibold block ${isSelected ? 'text-stone-900' : 'text-stone-700'}`}>
                          End-to-End Solution
                        </span>
                        <span className="text-[10px] text-stone-400 leading-tight">Complete project support — from design to handover. Selecting this disables individual services.</span>
                      </div>
                    </button>
                  );
                })()}
              </div>
              {formErrors.serviceType && <span className="text-[11px] font-semibold text-red-500">{formErrors.serviceType}</span>}
            </div>

            {renderQuestionnaires()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 p-5 md:p-6 border-t border-stone-100 bg-white shrink-0">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
        <button type="submit" disabled={isSubmitting} className={`${btnPrimary} flex-1 justify-center`}>
          {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
          {isSubmitting ? (mode === 'create' ? 'Capturing…' : 'Updating…') : (mode === 'create' ? 'Capture Brief' : 'Update Brief')}
        </button>
      </div>
    </form>
  );
};
