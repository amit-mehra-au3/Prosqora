import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FileText,
  Plus,
  Save,
  Trash2,
  Copy,
  CheckCircle,
  Sparkles,
  Eye,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Star,
  Code,
  Layout,
  Send,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Layers,
  Smartphone,
  Monitor,
  AlertTriangle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  ExternalLink,
  Info
} from 'lucide-react';

import {
  getDefaultAmAutomationBlocks,
  generateEmailHtml,
  parseHtmlToBlocks,
  validateAndSanitizeEmailHtml,
  PERSONALIZATION_VARIABLES,
  AM_BRAND
} from '../utils/emailHtmlGenerator';

import SendTestEmailModal from '../components/SendTestEmailModal';

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Template Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [businessCardImage, setBusinessCardImage] = useState('');

  // Builder Mode: 'visual' | 'html'
  const [editorMode, setEditorMode] = useState('visual');
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  // Visual Blocks & HTML Code State
  const [blocks, setBlocks] = useState(getDefaultAmAutomationBlocks());
  const [htmlCode, setHtmlCode] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('blk_header_1');

  // UI & Loading States
  const [loading, setLoading] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [validationWarning, setValidationWarning] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);

  // Active cursor element tracking for variable insertion
  const [activeInputRef, setActiveInputRef] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Update HTML code whenever blocks change (when in visual mode)
  useEffect(() => {
    if (editorMode === 'visual') {
      const generated = generateEmailHtml(blocks, { businessCardImage });
      setHtmlCode(generated);
      const val = validateAndSanitizeEmailHtml(generated);
      setValidationWarning(val.warnings.join(' '));
    }
  }, [blocks, businessCardImage, editorMode]);

  // Update blocks whenever HTML code is directly edited (when in html mode)
  const handleHtmlCodeChange = (newHtml) => {
    setHtmlCode(newHtml);
    const val = validateAndSanitizeEmailHtml(newHtml);
    setValidationWarning(val.warnings.join(' '));
  };

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/api/email-templates');
      if (res.data.success) {
        setTemplates(res.data.templates);
        if (res.data.templates.length > 0 && !selectedTemplate) {
          loadTemplateIntoForm(res.data.templates[0]);
        }
      }
    } catch (err) {}
  };

  const loadTemplateIntoForm = (tpl) => {
    setSelectedTemplate(tpl);
    setName(tpl.name || '');
    setSubject(tpl.subject || '');
    setIsDefault(!!tpl.is_default);
    setBusinessCardImage(tpl.business_card_image || '');

    const tplBody = tpl.body || '';
    setHtmlCode(tplBody);
    const parsedBlocks = parseHtmlToBlocks(tplBody);
    setBlocks(parsedBlocks);
    if (parsedBlocks.length > 0) {
      setSelectedBlockId(parsedBlocks[0].id);
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setName('New Industrial B2B Template');
    setSubject('Industrial Automation Requirement – {{company_name}}');
    setIsDefault(false);
    setBusinessCardImage('');
    const defBlocks = getDefaultAmAutomationBlocks();
    setBlocks(defBlocks);
    setSelectedBlockId(defBlocks[0].id);
    setEditorMode('visual');
  };

  const handleLoadAmDefault = () => {
    setSelectedTemplate(null);
    setName('AM Automation Trading Official B2B Template');
    setSubject('Industrial Automation Products & Solutions – AM Automation Trading');
    setIsDefault(true);
    const defBlocks = getDefaultAmAutomationBlocks();
    setBlocks(defBlocks);
    setSelectedBlockId(defBlocks[0].id);
    setEditorMode('visual');
  };

  const handleSaveTemplate = async () => {
    if (!name.trim() || !subject.trim()) {
      alert('Template name and subject line are required.');
      return;
    }

    setLoading(true);
    setSavedMsg('');

    // Ensure synchronized final HTML
    const finalHtml = editorMode === 'visual'
      ? generateEmailHtml(blocks, { businessCardImage })
      : htmlCode;

    try {
      if (selectedTemplate && selectedTemplate.id) {
        await axios.put(`/api/email-templates/${selectedTemplate.id}`, {
          name: name.trim(),
          subject: subject.trim(),
          body: finalHtml,
          is_default: isDefault,
          business_card_image: businessCardImage
        });
        setSavedMsg('Template updated successfully!');
      } else {
        const res = await axios.post('/api/email-templates', {
          name: name.trim(),
          subject: subject.trim(),
          body: finalHtml,
          is_default: isDefault,
          business_card_image: businessCardImage
        });
        if (res.data.template) {
          setSelectedTemplate(res.data.template);
        }
        setSavedMsg('New template created successfully!');
      }

      fetchTemplates();
      setTimeout(() => setSavedMsg(''), 3500);
    } catch (err) {
      alert('Failed to save email template.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsNew = async () => {
    const newName = prompt('Enter name for the new template copy:', `${name} (Copy)`);
    if (!newName) return;

    setLoading(true);
    const finalHtml = editorMode === 'visual'
      ? generateEmailHtml(blocks, { businessCardImage })
      : htmlCode;

    try {
      const res = await axios.post('/api/email-templates', {
        name: newName.trim(),
        subject: subject.trim(),
        body: finalHtml,
        is_default: false,
        business_card_image: businessCardImage
      });
      if (res.data.template) {
        setSelectedTemplate(res.data.template);
      }
      setSavedMsg('Saved as new template successfully!');
      fetchTemplates();
      setTimeout(() => setSavedMsg(''), 3500);
    } catch (e) {
      alert('Failed to save as new template.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this email template?')) return;
    try {
      await axios.delete(`/api/email-templates/${id}`);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (e) {
      alert('Default templates cannot be deleted.');
    }
  };

  // Personalization variable insertion handler
  const insertVariableTag = (tag) => {
    if (editorMode === 'html') {
      setHtmlCode(prev => prev + ` ${tag} `);
      return;
    }

    // Insert into active block property if available
    if (selectedBlockId) {
      setBlocks(prev => prev.map(b => {
        if (b.id === selectedBlockId) {
          const content = { ...b.content };
          if (content.text !== undefined) content.text += ` ${tag} `;
          else if (content.title !== undefined) content.title += ` ${tag} `;
          else if (content.instruction !== undefined) content.instruction += ` ${tag} `;
          return { ...b, content };
        }
        return b;
      }));
    } else {
      setSubject(prev => prev + ` ${tag} `);
    }
  };

  // Block Manipulation Methods
  const addBlock = (type) => {
    const newId = `blk_${type}_${Date.now()}`;
    let newBlock = { id: newId, type, content: {}, styles: {} };

    switch (type) {
      case 'heading':
        newBlock = {
          id: newId, type: 'heading',
          content: { text: 'New Heading', level: 'h2' },
          styles: { color: '#0f172a', fontSize: '18px', fontWeight: 'bold', align: 'left', margin: '16px 0 8px 0' }
        };
        break;
      case 'text':
        newBlock = {
          id: newId, type: 'text',
          content: { text: 'Add your custom B2B outreach text here...' },
          styles: { color: '#334155', fontSize: '14px', lineHeight: '1.6', align: 'left', margin: '0 0 12px 0' }
        };
        break;
      case 'image':
        newBlock = {
          id: newId, type: 'image',
          content: { url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80', alt: 'Industrial Equipment', width: '100%', linkUrl: '' },
          styles: { borderRadius: '8px', align: 'center', margin: '16px 0' }
        };
        break;
      case 'button':
        newBlock = {
          id: newId, type: 'button',
          content: { label: 'REQUEST QUOTE', url: 'mailto:amautomationtrading@gmail.com' },
          styles: { bgColor: '#f97316', textColor: '#ffffff', fontSize: '15px', fontWeight: 'bold', borderRadius: '8px', padding: '14px 28px', align: 'center', margin: '20px 0' }
        };
        break;
      case 'product_grid':
        newBlock = {
          id: newId, type: 'product_grid',
          content: {
            title: 'FEATURED AUTOMATION PRODUCTS',
            categories: [
              { name: 'PLC & Modules', desc: 'Siemens, Mitsubishi, Delta' },
              { name: 'AC Drives / VFDs', desc: '0.75kW to 315kW Inverters' }
            ]
          },
          styles: { bgColor: '#f8fafc', borderColor: '#e2e8f0', titleColor: '#f97316', itemBg: '#ffffff', itemTextColor: '#0f172a', margin: '16px 0' }
        };
        break;
      case 'divider':
        newBlock = {
          id: newId, type: 'divider',
          content: {},
          styles: { height: '1px', style: 'solid', color: '#e2e8f0' }
        };
        break;
      case 'spacer':
        newBlock = {
          id: newId, type: 'spacer',
          content: {},
          styles: { height: '24px' }
        };
        break;
      case 'custom_html':
        newBlock = {
          id: newId, type: 'custom_html',
          content: { html: '<div style="padding: 10px; background: #f1f5f9; border-radius: 6px; text-align: center;">Custom HTML Block</div>' },
          styles: {}
        };
        break;
      default:
        break;
    }

    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newId);
  };

  const moveBlock = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setBlocks(updated);
  };

  const duplicateBlock = (block) => {
    const copyId = `blk_${block.type}_${Date.now()}`;
    const copyBlock = JSON.parse(JSON.stringify(block));
    copyBlock.id = copyId;
    const index = blocks.findIndex(b => b.id === block.id);
    const updated = [...blocks];
    updated.splice(index + 1, 0, copyBlock);
    setBlocks(updated);
    setSelectedBlockId(copyId);
  };

  const deleteBlock = (id) => {
    if (blocks.length <= 1) {
      alert('Template must contain at least one block.');
      return;
    }
    const updated = blocks.filter(b => b.id !== id);
    setBlocks(updated);
    if (selectedBlockId === id) {
      setSelectedBlockId(updated[0]?.id || null);
    }
  };

  const updateBlockContent = (id, key, val) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, content: { ...b.content, [key]: val } };
      }
      return b;
    }));
  };

  const updateBlockStyle = (id, key, val) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, styles: { ...b.styles, [key]: val } };
      }
      return b;
    }));
  };

  // Image Upload Handler for Business Card & Blocks
  const handleBusinessCardUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setBusinessCardImage(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  // HTML Code Editor Actions
  const formatHtmlCode = () => {
    try {
      let formatted = htmlCode
        .replace(/></g, '>\n<')
        .replace(/(<[^\/][^>]*>)/g, '$1')
        .replace(/(<\/[^>]+>)/g, '$1');
      setHtmlCode(formatted);
      setSavedMsg('HTML Formatted cleanly!');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) {}
  };

  const copyHtmlCode = () => {
    navigator.clipboard.writeText(htmlCode);
    setSavedMsg('HTML code copied to clipboard!');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  // Live Interpolated HTML for Gmail Preview
  const currentFinalHtml = editorMode === 'visual'
    ? generateEmailHtml(blocks, { businessCardImage })
    : htmlCode;

  const interpolatedPreviewHtml = currentFinalHtml
    .replace(/\{\{\s*contact_name\s*\}\}/gi, 'Rahul Sharma')
    .replace(/\{\{\s*company_name\s*\}\}/gi, 'ABC Robotics & Automation Ltd')
    .replace(/\{\{\s*business_name\s*\}\}/gi, 'AM Automation Trading')
    .replace(/\{\{\s*sender_name\s*\}\}/gi, 'Amit Mehra')
    .replace(/\{\{\s*phone\s*\}\}/gi, '+91 86072 85969')
    .replace(/\{\{\s*email\s*\}\}/gi, 'amautomationtrading@gmail.com');

  const previewSubject = subject.replace(/\{\{\s*company_name\s*\}\}/gi, 'ABC Robotics & Automation Ltd');

  const activeBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-24">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <Layout className="w-7 h-7 text-brand-orange" />
            <span>B2B HTML Email Template Builder</span>
          </h1>
          <p className="text-xs text-industrial-400 mt-1">
            Create email-client safe, production-ready HTML templates for AM Automation Trading B2B outreach.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLoadAmDefault}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs border border-industrial-700 transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4 text-brand-orange" />
            <span>Load AM Automation Default</span>
          </button>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Saved Templates Sidebar (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-industrial-400">Saved Templates</h2>
            <span className="text-[11px] font-mono text-industrial-500">{templates.length} Total</span>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => loadTemplateIntoForm(tpl)}
                className={`industrial-card p-4 cursor-pointer transition-all border ${
                  selectedTemplate?.id === tpl.id
                    ? 'border-brand-orange bg-industrial-900 shadow-md ring-1 ring-brand-orange/50'
                    : 'border-industrial-800 hover:border-industrial-700 bg-industrial-950'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-xs truncate max-w-[180px]">{tpl.name}</span>
                  {tpl.is_default ? (
                    <span className="px-2 py-0.5 rounded bg-brand-orange/20 text-brand-orange font-bold text-[10px] flex items-center gap-1 border border-brand-orange/30 shrink-0">
                      <Star className="w-3 h-3 fill-brand-orange" />
                      <span>Default</span>
                    </span>
                  ) : null}
                </div>

                <p className="text-[11px] font-mono text-industrial-400 mt-1 line-clamp-1">{tpl.subject}</p>
                <div className="text-[10px] text-industrial-500 mt-2 font-mono flex items-center justify-between">
                  <span>ID: #{tpl.id}</span>
                  <span>{new Date(tpl.created_at || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Builder & Canvas Area (9 Cols) */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Top Control Bar Card */}
          <div className="industrial-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-industrial-800 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="font-extrabold text-white text-base">
                  {selectedTemplate ? `Edit: ${selectedTemplate.name}` : 'Create New Email Template'}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-200 font-bold text-xs border border-industrial-700 transition-all"
                  title="Send Test Email via Gmail API"
                >
                  <Send className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Test Email</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAsNew}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-200 font-bold text-xs border border-industrial-700 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Save As New</span>
                </button>

                {selectedTemplate && !selectedTemplate.is_default && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                    className="p-2 rounded-xl bg-industrial-800 text-red-400 hover:bg-red-500/20 border border-industrial-700 text-xs transition-all"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Template</span>
                </button>
              </div>
            </div>

            {/* Template Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8 space-y-1">
                <label className="text-xs font-bold text-industrial-300">Template Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AM Automation B2B Cold Outreach Template"
                  className="industrial-input w-full text-xs font-semibold"
                />
              </div>

              <div className="md:col-span-4 space-y-1 flex items-end">
                <label className="flex items-center gap-2.5 p-2.5 bg-industrial-950 rounded-xl border border-industrial-800 w-full cursor-pointer text-xs font-bold text-industrial-200">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-industrial-700 text-brand-orange focus:ring-0 w-4 h-4"
                  />
                  <span>Set as Default B2B Template</span>
                </label>
              </div>
            </div>

            {/* Subject Line Input with Character Guidance */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-industrial-300">Subject Line</label>
                <span className={`text-[11px] font-mono ${subject.length > 60 ? 'text-amber-400 font-bold' : 'text-industrial-400'}`}>
                  {subject.length} / 60 chars {subject.length <= 60 ? '(Optimal)' : '(May truncate on mobile)'}
                </span>
              </div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Industrial Automation Components Requirement – {{company_name}}"
                className="industrial-input w-full text-xs font-mono font-medium text-white"
              />
            </div>

            {/* Personalization Variable Chips */}
            <div className="space-y-2 pt-2 border-t border-industrial-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-industrial-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Personalization Variables (Click to insert)</span>
                </label>
                <span className="text-[11px] text-industrial-500">Auto-replaced during campaign execution</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {PERSONALIZATION_VARIABLES.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => insertVariableTag(v.tag)}
                    title={v.description}
                    className="group relative px-3 py-1.5 rounded-lg bg-industrial-900 hover:bg-industrial-800 border border-industrial-700 hover:border-brand-orange text-xs font-mono text-brand-orange font-bold transition-all"
                  >
                    <span>+ {v.tag}</span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-industrial-950 text-white text-[10px] px-2.5 py-1 rounded shadow-lg border border-industrial-700 whitespace-nowrap z-30 font-sans">
                      {v.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Switcher Toggle: Visual Editor | HTML Editor */}
            <div className="flex items-center justify-between pt-2 border-t border-industrial-800/80">
              <div className="flex items-center gap-1 bg-industrial-950 p-1 rounded-xl border border-industrial-800">
                <button
                  type="button"
                  onClick={() => setEditorMode('visual')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    editorMode === 'visual'
                      ? 'bg-brand-orange text-white shadow-md'
                      : 'text-industrial-400 hover:text-white'
                  }`}
                >
                  <Layout className="w-4 h-4" />
                  <span>Visual Builder</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorMode('html')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    editorMode === 'html'
                      ? 'bg-brand-orange text-white shadow-md'
                      : 'text-industrial-400 hover:text-white'
                  }`}
                >
                  <Code className="w-4 h-4" />
                  <span>HTML Code Editor</span>
                </button>
              </div>

              {/* Device Preview Toggle */}
              <div className="flex items-center gap-1 bg-industrial-950 p-1 rounded-xl border border-industrial-800">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === 'desktop' ? 'bg-industrial-800 text-white' : 'text-industrial-500 hover:text-industrial-300'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop (650px)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === 'mobile' ? 'bg-industrial-800 text-white' : 'text-industrial-500 hover:text-industrial-300'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile (375px)</span>
                </button>
              </div>
            </div>

          </div>

          {/* MODE 1: VISUAL EMAIL BUILDER */}
          {editorMode === 'visual' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Block Palette (Left 3 cols) */}
              <div className="xl:col-span-3 space-y-3">
                <div className="industrial-card p-4 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-industrial-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-brand-orange" />
                    <span>Add Blocks</span>
                  </h3>

                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { type: 'heading', label: 'Heading', icon: 'H' },
                      { type: 'text', label: 'Paragraph / Text', icon: '¶' },
                      { type: 'image', label: 'Image', icon: '🖼️' },
                      { type: 'button', label: 'CTA Button', icon: '🔘' },
                      { type: 'product_grid', label: 'Product Range', icon: '📦' },
                      { type: 'value_prop', label: 'Why Choose Us', icon: '⭐' },
                      { type: 'divider', label: 'Divider Line', icon: '➖' },
                      { type: 'spacer', label: 'Spacer Gap', icon: '↕️' },
                      { type: 'custom_html', label: 'Custom HTML', icon: '</>' }
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => addBlock(item.type)}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-industrial-950 hover:bg-industrial-900 border border-industrial-800 text-xs font-semibold text-industrial-200 transition-all text-left group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-brand-orange text-sm font-bold w-5">{item.icon}</span>
                          <span>{item.label}</span>
                        </span>
                        <span className="text-brand-orange opacity-0 group-hover:opacity-100 font-bold">+</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Business Card Manager */}
                <div className="industrial-card p-4 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-industrial-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-brand-orange" />
                    <span>Business Card Signature</span>
                  </h3>

                  {businessCardImage ? (
                    <div className="space-y-2">
                      <img src={businessCardImage} alt="Card" className="w-full h-24 object-cover rounded-lg border border-industrial-700" />
                      <button
                        type="button"
                        onClick={() => setBusinessCardImage('')}
                        className="w-full py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs border border-red-500/40"
                      >
                        Remove Card Image
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 bg-industrial-950 rounded-xl border border-dashed border-industrial-700 hover:border-brand-orange cursor-pointer text-xs font-bold text-industrial-400 hover:text-white transition-all text-center space-y-1">
                      <Upload className="w-5 h-5 text-brand-orange" />
                      <span>Upload Card Image</span>
                      <span className="text-[10px] text-industrial-500 font-mono">PNG, JPG format</span>
                      <input type="file" accept="image/*" onChange={handleBusinessCardUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Visual Canvas & Block Properties (Right 9 cols) */}
              <div className="xl:col-span-9 space-y-6">
                
                {/* Canvas Blocks List */}
                <div className="industrial-card p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-industrial-300">
                      Visual Block Canvas ({blocks.length} Blocks)
                    </h3>
                    <span className="text-[11px] text-industrial-500">Click any block to edit its properties</span>
                  </div>

                  <div className="space-y-3">
                    {blocks.map((block, idx) => {
                      const isSelected = selectedBlockId === block.id;
                      return (
                        <div
                          key={block.id}
                          onClick={() => setSelectedBlockId(block.id)}
                          className={`relative rounded-xl border p-4 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-brand-orange bg-industrial-900/90 shadow-lg ring-1 ring-brand-orange'
                              : 'border-industrial-800 hover:border-industrial-700 bg-industrial-950'
                          }`}
                        >
                          {/* Block Controls Toolbar */}
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-industrial-800/60">
                            <span className="text-[11px] font-mono font-bold text-brand-orange uppercase flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded bg-brand-orange/20 text-brand-orange text-[10px] flex items-center justify-center font-bold">{idx + 1}</span>
                              <span>{block.type.replace('_', ' ')}</span>
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'up'); }}
                                disabled={idx === 0}
                                className="p-1 rounded hover:bg-industrial-800 text-industrial-400 hover:text-white disabled:opacity-30"
                                title="Move Up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'down'); }}
                                disabled={idx === blocks.length - 1}
                                className="p-1 rounded hover:bg-industrial-800 text-industrial-400 hover:text-white disabled:opacity-30"
                                title="Move Down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); duplicateBlock(block); }}
                                className="p-1 rounded hover:bg-industrial-800 text-industrial-400 hover:text-white"
                                title="Duplicate Block"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                title="Delete Block"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Block Summary / Content */}
                          <div className="text-xs font-mono text-industrial-200 line-clamp-2">
                            {block.content?.text || block.content?.title || block.content?.label || block.content?.html || `${block.type} Content`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Block Property Editor Drawer */}
                {activeBlock && (
                  <div className="industrial-card p-6 space-y-4 border border-brand-orange/40">
                    <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-orange flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        <span>Edit Block Properties: {activeBlock.type.replace('_', ' ')}</span>
                      </h3>
                      <span className="text-[11px] font-mono text-industrial-500">ID: {activeBlock.id}</span>
                    </div>

                    {/* Block Property Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs font-semibold">
                      
                      {/* Text / Title Content */}
                      {(activeBlock.content.text !== undefined || activeBlock.content.title !== undefined) && (
                        <div className="md:col-span-12 space-y-1">
                          <label className="text-industrial-300">Content Text / Title</label>
                          <textarea
                            value={activeBlock.content.text !== undefined ? activeBlock.content.text : activeBlock.content.title}
                            onChange={(e) => updateBlockContent(activeBlock.id, activeBlock.content.text !== undefined ? 'text' : 'title', e.target.value)}
                            rows={3}
                            className="industrial-input w-full font-mono text-xs p-3 leading-relaxed"
                          />
                        </div>
                      )}

                      {/* Button Label & URL */}
                      {activeBlock.type === 'button' && (
                        <>
                          <div className="md:col-span-6 space-y-1">
                            <label className="text-industrial-300">Button Label</label>
                            <input
                              type="text"
                              value={activeBlock.content.label || ''}
                              onChange={(e) => updateBlockContent(activeBlock.id, 'label', e.target.value)}
                              className="industrial-input w-full text-xs font-semibold"
                            />
                          </div>

                          <div className="md:col-span-6 space-y-1">
                            <label className="text-industrial-300">Button Target URL</label>
                            <input
                              type="text"
                              value={activeBlock.content.url || ''}
                              onChange={(e) => updateBlockContent(activeBlock.id, 'url', e.target.value)}
                              className="industrial-input w-full text-xs font-mono"
                            />
                          </div>
                        </>
                      )}

                      {/* Image URL & Alt Text */}
                      {activeBlock.type === 'image' && (
                        <>
                          <div className="md:col-span-8 space-y-1">
                            <label className="text-industrial-300">Image Source URL</label>
                            <input
                              type="text"
                              value={activeBlock.content.url || ''}
                              onChange={(e) => updateBlockContent(activeBlock.id, 'url', e.target.value)}
                              className="industrial-input w-full text-xs font-mono"
                            />
                          </div>

                          <div className="md:col-span-4 space-y-1">
                            <label className="text-industrial-300">Alt Text</label>
                            <input
                              type="text"
                              value={activeBlock.content.alt || ''}
                              onChange={(e) => updateBlockContent(activeBlock.id, 'alt', e.target.value)}
                              className="industrial-input w-full text-xs"
                            />
                          </div>
                        </>
                      )}

                      {/* Custom HTML Code */}
                      {activeBlock.type === 'custom_html' && (
                        <div className="md:col-span-12 space-y-1">
                          <label className="text-industrial-300">Raw HTML Code Block</label>
                          <textarea
                            value={activeBlock.content.html || ''}
                            onChange={(e) => updateBlockContent(activeBlock.id, 'html', e.target.value)}
                            rows={5}
                            className="industrial-input w-full font-mono text-xs p-3"
                          />
                        </div>
                      )}

                      {/* Styles: Colors & Alignment */}
                      <div className="md:col-span-6 space-y-1">
                        <label className="text-industrial-300">Text Alignment</label>
                        <div className="flex items-center gap-2">
                          {['left', 'center', 'right'].map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => updateBlockStyle(activeBlock.id, 'align', align)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase transition-all ${
                                (activeBlock.styles?.align || 'left') === align
                                  ? 'bg-brand-orange text-white border-brand-orange'
                                  : 'bg-industrial-950 text-industrial-400 border-industrial-800'
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-6 space-y-1">
                        <label className="text-industrial-300">Font Size / Margin</label>
                        <input
                          type="text"
                          value={activeBlock.styles?.fontSize || activeBlock.styles?.margin || '14px'}
                          onChange={(e) => updateBlockStyle(activeBlock.id, activeBlock.styles?.fontSize ? 'fontSize' : 'margin', e.target.value)}
                          className="industrial-input w-full text-xs font-mono"
                        />
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* MODE 2: HTML CODE EDITOR */}
          {editorMode === 'html' && (
            <div className="industrial-card p-6 space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-industrial-800 pb-3">
                <div className="flex items-center gap-2 text-brand-orange font-bold text-sm">
                  <Code className="w-4 h-4" />
                  <span>Production Email HTML Code Editor</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={formatHtmlCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-industrial-200 text-xs font-bold border border-industrial-700"
                  >
                    <span>Format HTML</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyHtmlCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-industrial-200 text-xs font-bold border border-industrial-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy HTML</span>
                  </button>
                </div>
              </div>

              {validationWarning && (
                <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{validationWarning}</span>
                </div>
              )}

              <textarea
                value={htmlCode}
                onChange={(e) => handleHtmlCodeChange(e.target.value)}
                rows={18}
                className="industrial-input w-full font-mono text-xs p-4 leading-relaxed bg-industrial-950 text-emerald-400 border-industrial-800 focus:border-brand-orange"
                spellCheck={false}
              />
            </div>
          )}

          {/* REAL-TIME EMAIL PREVIEW PANEL (Desktop 650px / Mobile 375px) */}
          <div className="industrial-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Eye className="w-4 h-4 text-brand-orange" />
                <span>Real-Time Email Render Preview</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-industrial-400">
                <span>View Mode:</span>
                <span className="text-brand-orange font-bold uppercase">{previewDevice}</span>
              </div>
            </div>

            {/* Email Subject Line Header */}
            <div className="bg-slate-100 rounded-t-xl p-4 border border-slate-300 font-sans text-xs space-y-1">
              <div className="font-bold text-slate-900 text-sm">Subject: {previewSubject}</div>
              <div className="text-slate-500 text-[11px]">From: AM Automation Trading &lt;amautomationtrading@gmail.com&gt;</div>
            </div>

            {/* Email Body Iframe Render Container */}
            <div className="flex items-center justify-center bg-industrial-950 p-6 rounded-b-xl border border-industrial-800 overflow-hidden">
              <div
                className="transition-all duration-300 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300"
                style={{
                  width: previewDevice === 'mobile' ? '375px' : '650px',
                  maxWidth: '100%'
                }}
              >
                <iframe
                  title="Live Real-time Email Render"
                  srcDoc={interpolatedPreviewHtml}
                  className="w-full min-h-[500px] border-0"
                />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <SendTestEmailModal
          subject={subject}
          htmlBody={currentFinalHtml}
          businessCardImage={businessCardImage}
          onClose={() => setShowTestModal(false)}
        />
      )}

    </div>
  );
}
