import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Filter,
  X,
  Plus,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Building2,
  MapPin,
  Tag,
  Phone,
  Mail,
  MessageSquare,
  UserCheck,
  Trash2,
  Layers
} from 'lucide-react';

export const CITY_OPTIONS = [
  'Gurgaon', 'Delhi', 'Noida', 'Faridabad', 'Ghaziabad', 'Panipat', 'Karnal', 'Hisar',
  'Chandigarh', 'Ludhiana', 'Jaipur', 'Bhiwadi', 'Neemrana', 'Ahmedabad', 'Vadodara', 'Rajkot',
  'Mumbai', 'Pune', 'Nashik', 'Aurangabad', 'Bengaluru', 'Chennai', 'Hyderabad', 'Coimbatore',
  'Surat', 'Indore', 'Kolkata', 'Other'
];

export const STATE_OPTIONS = [
  'Haryana', 'Delhi', 'Uttar Pradesh', 'Punjab', 'Rajasthan', 'Maharashtra', 'Gujarat',
  'Karnataka', 'Tamil Nadu', 'Telangana', 'West Bengal', 'Other / Unknown'
];

export const CATEGORY_GROUPS = [
  {
    group: 'MACHINE & OEM',
    items: [
      'OEM Manufacturers', 'Industrial OEM', 'CNC Machine Manufacturers', 'CNC Machine Builders',
      'Machine Tool Manufacturers', 'Industrial Machinery Manufacturers', 'SPM Manufacturers',
      'Machine Builders', 'Custom Machine Manufacturers'
    ]
  },
  {
    group: 'PACKAGING',
    items: [
      'Packaging Machine Manufacturers', 'Filling Machines', 'Packing Machines', 'Cartoning Machines',
      'Labeling Machines', 'Pouch Packing Machines', 'Bottling Machines', 'Food Packaging Machinery'
    ]
  },
  {
    group: 'PLASTIC',
    items: [
      'Injection Molding Machines', 'Plastic Machinery', 'Extrusion Machinery', 'Blow Molding Machines', 'Plastic Processing Machinery'
    ]
  },
  {
    group: 'FOOD & BEVERAGE',
    items: [
      'Food Processing Machinery', 'Dairy Machinery', 'Beverage Machinery', 'Bakery Machinery'
    ]
  },
  {
    group: 'PHARMA & CHEMICAL',
    items: [
      'Pharmaceutical Machinery', 'Chemical Processing Equipment', 'Process Machinery', 'Pharmaceutical Packaging Machinery'
    ]
  },
  {
    group: 'TEXTILE',
    items: [
      'Textile Machinery', 'Spinning Machinery', 'Weaving Machinery', 'Fabric Processing Machinery', 'Garment Machinery'
    ]
  },
  {
    group: 'AUTOMATION',
    items: [
      'Factory Automation', 'Industrial Automation', 'PLC Automation', 'PLC System Integrators',
      'HMI / SCADA Integrators', 'Control System Integrators', 'Process Automation', 'Robotics & Automation', 'Machine Automation'
    ]
  },
  {
    group: 'ELECTRICAL',
    items: [
      'Electrical Panel Manufacturers', 'Control Panel Manufacturers', 'MCC Panel Manufacturers',
      'PCC Panel Manufacturers', 'Automation Panel Manufacturers', 'Electrical Control Systems'
    ]
  },
  {
    group: 'MATERIAL HANDLING',
    items: [
      'Conveyor Manufacturers', 'Material Handling Equipment', 'Hoist & Crane Automation', 'Warehouse Automation'
    ]
  },
  {
    group: 'ROBOTICS',
    items: [
      'Robotic System Integrators', 'Industrial Robotics', 'Robot Cell Integrators', 'Pick & Place Automation',
      'Welding Automation', 'Assembly Automation'
    ]
  },
  {
    group: 'AUTOMOTIVE',
    items: [
      'Automotive Machinery', 'Auto Component Machinery', 'Automotive Automation', 'Assembly Machines', 'Testing Machines'
    ]
  },
  {
    group: 'PRINTING & PAPER',
    items: [
      'Printing Machinery', 'Packaging Printing Machinery', 'Paper Machinery', 'Pulp Machinery'
    ]
  },
  {
    group: 'TESTING & INSPECTION',
    items: [
      'Testing Machine Manufacturers', 'Inspection Machines', 'Vision Inspection', 'Quality Inspection Systems', 'Measurement Systems'
    ]
  },
  {
    group: 'MOTION & DRIVE APPLICATIONS',
    items: [
      'Servo Applications', 'Motion Control', 'VFD Applications', 'Motor Control Systems', 'Drive System Integrators'
    ]
  },
  {
    group: 'EMERGING INDUSTRIES',
    items: [
      'EV Machinery', 'Battery Manufacturing Equipment', 'Solar Manufacturing Equipment', 'Renewable Energy Equipment'
    ]
  },
  {
    group: 'OTHER INDUSTRIAL',
    items: [
      'Hydraulic Machinery', 'Pneumatic Machinery', 'Industrial Equipment', 'Process Equipment', 'Manufacturing Equipment', 'Engineering Companies', 'Needs Review'
    ]
  }
];

export const AUTOMATION_OPPORTUNITY_OPTIONS = [
  'PLC', 'HMI', 'SCADA', 'VFD', 'Servo', 'Control Panel', 'Robotics', 'Sensors',
  'Motion Control', 'Machine Automation', 'Industrial Networking', 'Electrical Automation', 'Other'
];

export default function CrmFilterBar({ filters, setFilters, totalCount, filteredCount }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customCityInput, setCustomCityInput] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [savedFiltersList, setSavedFiltersList] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');

  useEffect(() => {
    fetchSavedFilters();
  }, []);

  const fetchSavedFilters = async () => {
    try {
      const res = await axios.get('/api/saved-filters');
      if (res.data.success) {
        setSavedFiltersList(res.data.filters || []);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSaveFilterSubmit = async (e) => {
    e.preventDefault();
    if (!newFilterName.trim()) return;

    try {
      const res = await axios.post('/api/saved-filters', {
        name: newFilterName.trim(),
        filter_config: filters
      });
      if (res.data.success) {
        setNewFilterName('');
        setShowSaveModal(false);
        fetchSavedFilters();
      }
    } catch (err) {
      alert('Failed to save filter preset');
    }
  };

  const handleDeleteSavedFilter = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/saved-filters/${id}`);
      setSavedFiltersList((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {}
  };

  const handleApplyPreset = (presetConfig) => {
    setFilters((prev) => ({
      ...prev,
      ...presetConfig
    }));
  };

  const handleCityToggle = (city) => {
    const current = filters.cities || [];
    if (current.includes(city)) {
      setFilters({ ...filters, cities: current.filter((c) => c !== city) });
    } else {
      setFilters({ ...filters, cities: [...current, city] });
    }
  };

  const handleAddCustomCity = () => {
    if (!customCityInput.trim()) return;
    const city = customCityInput.trim();
    if (!(filters.cities || []).includes(city)) {
      setFilters({ ...filters, cities: [...(filters.cities || []), city] });
    }
    setCustomCityInput('');
  };

  const handleStateToggle = (state) => {
    const current = filters.states || [];
    if (current.includes(state)) {
      setFilters({ ...filters, states: current.filter((s) => s !== state) });
    } else {
      setFilters({ ...filters, states: [...current, state] });
    }
  };

  const handleCategoryToggle = (cat) => {
    const current = filters.categories || [];
    if (current.includes(cat)) {
      setFilters({ ...filters, categories: current.filter((c) => c !== cat) });
    } else {
      setFilters({ ...filters, categories: [...current, cat] });
    }
  };

  const handleOppToggle = (opp) => {
    const current = filters.opportunities || [];
    if (current.includes(opp)) {
      setFilters({ ...filters, opportunities: current.filter((o) => o !== opp) });
    } else {
      setFilters({ ...filters, opportunities: [...current, opp] });
    }
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      cities: [],
      states: [],
      categories: [],
      categoryMatchMode: 'ANY', // 'ANY' or 'ALL'
      leadStatus: 'All',
      websiteStatus: 'All',
      hasPhone: false,
      hasEmail: false,
      hasWhatsApp: false,
      hasContactPerson: false,
      opportunities: []
    });
  };

  // Preset Buttons Configurations
  const presets = [
    { label: 'Gurgaon OEMs', config: { cities: ['Gurgaon'], categories: ['OEM Manufacturers', 'Industrial OEM', 'CNC Machine Manufacturers'] } },
    { label: 'Delhi NCR Automation', config: { cities: ['Gurgaon', 'Delhi', 'Noida', 'Faridabad'], categories: ['Industrial Automation', 'PLC Automation', 'HMI / SCADA Integrators'] } },
    { label: 'CNC Manufacturers', config: { categories: ['CNC Machine Manufacturers', 'CNC Machine Builders'] } },
    { label: 'Packaging Machines', config: { categories: ['Packaging Machine Manufacturers', 'Food Packaging Machinery'] } },
    { label: 'SPM Manufacturers', config: { categories: ['SPM Manufacturers', 'Custom Machine Manufacturers'] } },
    { label: 'PLC / Automation', config: { categories: ['PLC Automation', 'PLC System Integrators', 'Control System Integrators'] } },
    { label: 'Robotics', config: { categories: ['Robotic System Integrators', 'Robotics & Automation', 'Robot Cell Integrators'] } },
    { label: 'High Priority Leads', config: { leadStatus: 'Interested' } },
  ];

  const hasActiveFilters =
    filters.search ||
    (filters.cities && filters.cities.length > 0) ||
    (filters.states && filters.states.length > 0) ||
    (filters.categories && filters.categories.length > 0) ||
    (filters.opportunities && filters.opportunities.length > 0) ||
    filters.leadStatus !== 'All' ||
    filters.websiteStatus !== 'All' ||
    filters.hasPhone ||
    filters.hasEmail ||
    filters.hasWhatsApp ||
    filters.hasContactPerson;

  return (
    <div className="space-y-4">
      
      {/* Quick Presets Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-industrial-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-brand-orange" />
          <span>Presets:</span>
        </span>

        {presets.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleApplyPreset(p.config)}
            className="text-xs px-2.5 py-1 rounded-lg bg-industrial-900 border border-industrial-800 text-industrial-300 hover:text-white hover:border-brand-orange/40 shrink-0 transition-colors"
          >
            {p.label}
          </button>
        ))}

        {savedFiltersList.map((sf) => {
          let configObj = {};
          try {
            configObj = JSON.parse(sf.filter_config);
          } catch (e) {}

          return (
            <div key={sf.id} className="flex items-center rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs px-2.5 py-1 shrink-0 gap-1.5">
              <button onClick={() => handleApplyPreset(configObj)} className="font-semibold hover:underline">
                🔖 {sf.name}
              </button>
              <button onClick={(e) => handleDeleteSavedFilter(sf.id, e)} className="hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Main Filter Bar Card */}
      <div className="industrial-card p-4 space-y-4">
        
        {/* Top Row: Search Input + Category Selector + Primary Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Field */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-industrial-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company, website, phone, email, address, products..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="industrial-input w-full text-xs pl-9"
            />
          </div>

          {/* Lead Status Filter */}
          <div className="md:col-span-3">
            <select
              value={filters.leadStatus || 'All'}
              onChange={(e) => setFilters({ ...filters, leadStatus: e.target.value })}
              className="industrial-input w-full text-xs"
            >
              <option value="All">Status: All Lead Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Interested">Interested</option>
              <option value="Meeting">Meeting</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Converted">Converted</option>
              <option value="Not Interested">Not Interested</option>
              <option value="No Response">No Response</option>
            </select>
          </div>

          {/* Toggle Advanced Filters Button */}
          <div className="md:col-span-4 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                showAdvanced || hasActiveFilters
                  ? 'bg-brand-orange/20 border-brand-orange text-brand-orange'
                  : 'bg-industrial-800 border-industrial-700 text-industrial-300 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Advanced Filters</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowSaveModal(true)}
              className="p-2 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-industrial-300 hover:text-white border border-industrial-700"
              title="Save Current Filter Configuration"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Collapsible Advanced Filters Panel */}
        {showAdvanced && (
          <div className="pt-4 border-t border-industrial-800 space-y-6 text-xs animate-in fade-in duration-150">
            
            {/* 1. Cities & States Multi-Select */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* City Multi-Select */}
              <div className="space-y-2">
                <label className="font-semibold text-industrial-300 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                  <span>City Filter (Search & Multi-Select)</span>
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom city..."
                    value={customCityInput}
                    onChange={(e) => setCustomCityInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCity()}
                    className="industrial-input text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCity}
                    className="px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-white font-semibold text-xs"
                  >
                    Add
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto p-2 bg-industrial-950/80 rounded-xl border border-industrial-800 grid grid-cols-2 gap-1.5">
                  {CITY_OPTIONS.map((c) => {
                    const isSelected = (filters.cities || []).includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCityToggle(c)}
                        className={`text-left px-2 py-1 rounded text-[11px] truncate flex items-center justify-between ${
                          isSelected ? 'bg-brand-orange text-white font-bold' : 'text-industrial-300 hover:bg-industrial-800'
                        }`}
                      >
                        <span className="truncate">{c}</span>
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* State Multi-Select */}
              <div className="space-y-2">
                <label className="font-semibold text-industrial-300 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-brand-orange" />
                  <span>State Filter</span>
                </label>

                <div className="max-h-48 overflow-y-auto p-2 bg-industrial-950/80 rounded-xl border border-industrial-800 grid grid-cols-2 gap-1.5">
                  {STATE_OPTIONS.map((s) => {
                    const isSelected = (filters.states || []).includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStateToggle(s)}
                        className={`text-left px-2 py-1 rounded text-[11px] truncate flex items-center justify-between ${
                          isSelected ? 'bg-brand-blue text-white font-bold' : 'text-industrial-300 hover:bg-industrial-800'
                        }`}
                      >
                        <span className="truncate">{s}</span>
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* 2. Industry / Category Filter with Match Any / Match All */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-industrial-300 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <Tag className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Automation Industry / Business Categories</span>
                </label>

                {/* Match Any / Match All Toggle */}
                <div className="flex items-center gap-2 bg-industrial-950 px-2 py-1 rounded-lg border border-industrial-800">
                  <span className="text-[10px] text-industrial-400 font-semibold">Category Logic:</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="matchMode"
                      value="ANY"
                      checked={filters.categoryMatchMode === 'ANY'}
                      onChange={() => setFilters({ ...filters, categoryMatchMode: 'ANY' })}
                      className="text-brand-orange focus:ring-0"
                    />
                    <span className="text-[11px] text-industrial-200">Match Any</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="matchMode"
                      value="ALL"
                      checked={filters.categoryMatchMode === 'ALL'}
                      onChange={() => setFilters({ ...filters, categoryMatchMode: 'ALL' })}
                      className="text-brand-orange focus:ring-0"
                    />
                    <span className="text-[11px] text-industrial-200">Match All</span>
                  </label>
                </div>
              </div>

              {/* Category Search */}
              <input
                type="text"
                placeholder="Filter categories (e.g. CNC, Packaging, SPM, Robotics)..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="industrial-input text-xs w-full"
              />

              {/* Grouped Category Options Grid */}
              <div className="max-h-60 overflow-y-auto p-3 bg-industrial-950/90 rounded-xl border border-industrial-800 space-y-4">
                {CATEGORY_GROUPS.map((group, idx) => {
                  const filteredItems = group.items.filter((item) =>
                    item.toLowerCase().includes(categorySearch.toLowerCase())
                  );
                  if (filteredItems.length === 0) return null;

                  return (
                    <div key={idx} className="space-y-1.5">
                      <span className="text-[10px] font-extrabold text-brand-orange uppercase tracking-wider block border-b border-industrial-800 pb-1">
                        {group.group}
                      </span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                        {filteredItems.map((cat) => {
                          const isSelected = (filters.categories || []).includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleCategoryToggle(cat)}
                              className={`text-left px-2 py-1.5 rounded text-[11px] truncate flex items-center justify-between border transition-all ${
                                isSelected
                                  ? 'bg-brand-orange/20 border-brand-orange text-brand-orange font-bold'
                                  : 'bg-industrial-900 border-industrial-800/80 text-industrial-300 hover:border-industrial-700'
                              }`}
                            >
                              <span className="truncate">{cat}</span>
                              {isSelected && <Check className="w-3 h-3 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Contact Availability & Website Status & Automation Opportunities */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Contact Availability Checkboxes */}
              <div className="space-y-2 p-3 bg-industrial-950/60 rounded-xl border border-industrial-800">
                <span className="font-semibold text-industrial-300 block text-[11px] uppercase tracking-wider">
                  Contact Availability
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-industrial-200">
                    <input
                      type="checkbox"
                      checked={!!filters.hasPhone}
                      onChange={(e) => setFilters({ ...filters, hasPhone: e.target.checked })}
                      className="rounded border-industrial-700 bg-industrial-900 text-brand-orange"
                    />
                    <span>Has Phone Number</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-industrial-200">
                    <input
                      type="checkbox"
                      checked={!!filters.hasEmail}
                      onChange={(e) => setFilters({ ...filters, hasEmail: e.target.checked })}
                      className="rounded border-industrial-700 bg-industrial-900 text-brand-orange"
                    />
                    <span>Has Email Address</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-industrial-200">
                    <input
                      type="checkbox"
                      checked={!!filters.hasWhatsApp}
                      onChange={(e) => setFilters({ ...filters, hasWhatsApp: e.target.checked })}
                      className="rounded border-industrial-700 bg-industrial-900 text-brand-orange"
                    />
                    <span>Has WhatsApp Number</span>
                  </label>
                </div>
              </div>

              {/* Website Status */}
              <div className="space-y-2 p-3 bg-industrial-950/60 rounded-xl border border-industrial-800">
                <span className="font-semibold text-industrial-300 block text-[11px] uppercase tracking-wider">
                  Website Status
                </span>
                <select
                  value={filters.websiteStatus || 'All'}
                  onChange={(e) => setFilters({ ...filters, websiteStatus: e.target.value })}
                  className="industrial-input w-full text-xs"
                >
                  <option value="All">Status: All</option>
                  <option value="Working">🟢 Working</option>
                  <option value="Redirected">🟡 Redirected</option>
                  <option value="Not Working">🔴 Not Working</option>
                  <option value="Not Accessible">⚪ Not Accessible</option>
                </select>
              </div>

              {/* Automation Opportunity Filter */}
              <div className="space-y-2 p-3 bg-industrial-950/60 rounded-xl border border-industrial-800">
                <span className="font-semibold text-industrial-300 block text-[11px] uppercase tracking-wider">
                  Automation Opportunity
                </span>
                <div className="max-h-24 overflow-y-auto grid grid-cols-2 gap-1">
                  {AUTOMATION_OPPORTUNITY_OPTIONS.map((opp) => {
                    const isSelected = (filters.opportunities || []).includes(opp);
                    return (
                      <button
                        key={opp}
                        type="button"
                        onClick={() => handleOppToggle(opp)}
                        className={`text-left px-2 py-0.5 rounded text-[10px] ${
                          isSelected ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-industrial-400 hover:text-white'
                        }`}
                      >
                        {opp}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Filter Chips Bar & Filter Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-industrial-900 border border-industrial-800 rounded-xl text-xs">
        
        {/* Active Chips Container */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-industrial-400 mr-1">
            Active Filters:
          </span>

          {!hasActiveFilters && (
            <span className="text-industrial-500 italic text-[11px]">None</span>
          )}

          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-industrial-800 text-white border border-industrial-700 text-[11px]">
              Search: "{filters.search}"
              <button onClick={() => setFilters({ ...filters, search: '' })}>
                <X className="w-3 h-3 hover:text-red-400" />
              </button>
            </span>
          )}

          {(filters.cities || []).map((c) => (
            <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-orange/20 text-brand-orange border border-brand-orange/40 text-[11px]">
              City: {c}
              <button onClick={() => handleCityToggle(c)}>
                <X className="w-3 h-3 hover:text-red-400" />
              </button>
            </span>
          ))}

          {(filters.states || []).map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-blue/20 text-brand-blue border border-brand-blue/40 text-[11px]">
              State: {s}
              <button onClick={() => handleStateToggle(s)}>
                <X className="w-3 h-3 hover:text-red-400" />
              </button>
            </span>
          ))}

          {(filters.categories || []).map((cat) => (
            <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px]">
              Category: {cat}
              <button onClick={() => handleCategoryToggle(cat)}>
                <X className="w-3 h-3 hover:text-red-400" />
              </button>
            </span>
          ))}

          {filters.hasPhone && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px]">
              Has Phone
              <button onClick={() => setFilters({ ...filters, hasPhone: false })}>
                <X className="w-3 h-3 hover:text-red-400" />
              </button>
            </span>
          )}

          {filters.hasEmail && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px]">
              Has Email
              <button onClick={() => setFilters({ ...filters, hasEmail: false })}>
                <X className="w-3 h-3 hover:text-red-400" />
              </button>
            </span>
          )}

          {filters.hasWhatsApp && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px]">
              Has WhatsApp
              <button onClick={() => setFilters({ ...filters, hasWhatsApp: false })}>
                <X className="w-3 h-3 hover:text-red-400" />
              </button>
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-red-400 hover:underline font-semibold ml-2"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Instant Filter Count */}
        <div className="font-mono text-industrial-300 text-xs font-semibold">
          Showing <strong className="text-white font-bold">{filteredCount}</strong> of {totalCount} Leads
        </div>

      </div>

      {/* Save Filter Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveFilterSubmit} className="bg-industrial-900 border border-industrial-700 rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-white text-base">Save Filter Configuration</h3>
            <p className="text-xs text-industrial-400">
              Save your current filter selection as a quick preset for future use.
            </p>

            <div className="space-y-1">
              <label className="text-xs text-industrial-300 block font-semibold">Preset Name</label>
              <input
                type="text"
                placeholder="e.g. Gurgaon CNC Prospects"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                className="industrial-input w-full text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-lg bg-industrial-800 text-industrial-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-brand-orange text-white font-bold text-xs"
              >
                Save Preset
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
