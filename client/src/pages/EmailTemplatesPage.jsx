import React, { useState, useEffect } from 'react';
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
  Star
} from 'lucide-react';

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [businessCardImage, setBusinessCardImage] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const [loading, setLoading] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

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
    setBody(tpl.body || '');
    setBusinessCardImage(tpl.business_card_image || '');
    setIsDefault(!!tpl.is_default);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setName('New B2B Outreach Template');
    setSubject('Industrial Automation Products & Solutions – AM Automation Trading');
    setBody(`Dear {{contact_name}},

Greetings from {{business_name}}.

We deal in Industrial Automation Products & Components...

Best Regards,
{{sender_name}}
{{business_name}}
Phone: {{phone}}
Email: {{email}}`);
    setBusinessCardImage('');
    setIsDefault(false);
  };

  const handleSaveTemplate = async () => {
    if (!name || !subject || !body) {
      alert('Template name, subject, and body are required.');
      return;
    }

    setLoading(true);
    setSavedMsg('');

    try {
      if (selectedTemplate && selectedTemplate.id) {
        await axios.put(`/api/email-templates/${selectedTemplate.id}`, {
          name,
          subject,
          body,
          is_default: isDefault,
          business_card_image: businessCardImage
        });
        setSavedMsg('Template updated successfully!');
      } else {
        await axios.post('/api/email-templates', {
          name,
          subject,
          body,
          is_default: isDefault,
          business_card_image: businessCardImage
        });
        setSavedMsg('New template created successfully!');
      }

      fetchTemplates();
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      alert('Failed to save template.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await axios.delete(`/api/email-templates/${id}`);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (e) {
      alert('Default templates cannot be deleted.');
    }
  };

  const insertVariable = (varTag) => {
    setBody((prev) => prev + ` ${varTag} `);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setBusinessCardImage(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Preview substitutions
  const previewBody = body
    .replace(/\{\{\s*contact_name\s*\}\}/gi, 'Rahul Sharma')
    .replace(/\{\{\s*company_name\s*\}\}/gi, 'ABC Robotics & Automation Ltd')
    .replace(/\{\{\s*business_name\s*\}\}/gi, 'AM Automation Trading')
    .replace(/\{\{\s*sender_name\s*\}\}/gi, 'Amit Mehra')
    .replace(/\{\{\s*phone\s*\}\}/gi, '+91 86072 85969')
    .replace(/\{\{\s*email\s*\}\}/gi, 'amautomationtrading@gmail.com');

  const previewSubject = subject.replace(/\{\{\s*company_name\s*\}\}/gi, 'ABC Robotics & Automation Ltd');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">B2B Email Template Manager</h1>
          <p className="text-xs text-industrial-400 mt-1">
            Create, customize, and manage B2B outreach templates for AM Automation Trading.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {savedMsg && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Main Grid: Template List (Left 4 cols) & Editor / Preview (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Template Sidebar List (Col 4) */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-industrial-400">Saved Templates</h2>
          
          <div className="space-y-2">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => loadTemplateIntoForm(tpl)}
                className={`industrial-card p-4 cursor-pointer transition-all border ${
                  selectedTemplate?.id === tpl.id
                    ? 'border-brand-orange bg-industrial-900 shadow-md'
                    : 'border-industrial-800 hover:border-industrial-700 bg-industrial-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs truncate max-w-[200px]">{tpl.name}</span>
                  {tpl.is_default ? (
                    <span className="px-2 py-0.5 rounded bg-brand-orange/20 text-brand-orange font-bold text-[10px] flex items-center gap-1 border border-brand-orange/30">
                      <Star className="w-3 h-3 fill-brand-orange" />
                      <span>Default</span>
                    </span>
                  ) : null}
                </div>

                <p className="text-[11px] text-industrial-400 mt-1 line-clamp-1">{tpl.subject}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Editor & Live Gmail Preview (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="industrial-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
              <h2 className="font-bold text-white text-base">
                {selectedTemplate ? `Edit: ${selectedTemplate.name}` : 'Create New Template'}
              </h2>

              <div className="flex items-center gap-2">
                {selectedTemplate && !selectedTemplate.is_default && (
                  <button
                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                    className="p-2 rounded-lg bg-industrial-800 text-red-400 hover:bg-red-500/20 text-xs"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={handleSaveTemplate}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Template</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8 space-y-1">
                <label className="text-xs font-semibold text-industrial-300">Template Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="industrial-input w-full text-xs font-medium"
                />
              </div>

              <div className="md:col-span-4 space-y-1 flex items-end">
                <label className="flex items-center gap-2 p-2.5 bg-industrial-950 rounded-xl border border-industrial-800 w-full cursor-pointer text-xs font-semibold text-industrial-200">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-industrial-700 text-brand-orange focus:ring-0"
                  />
                  <span>Set as Default B2B Template</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-industrial-300">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="industrial-input w-full text-xs font-medium"
              />
            </div>

            {/* Variable Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-industrial-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                <span>Personalization Variables</span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {['{{contact_name}}', '{{company_name}}', '{{business_name}}', '{{sender_name}}', '{{phone}}', '{{email}}'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    className="px-2.5 py-1 rounded-lg bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-[11px] font-mono text-brand-orange font-semibold"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-industrial-300">Email Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="industrial-input w-full text-xs font-mono p-3 leading-relaxed"
              />
            </div>

            {/* Business Card Upload */}
            <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 space-y-3">
              <span className="font-bold text-white text-xs block">Business Card Signature Image</span>
              
              {businessCardImage ? (
                <div className="flex items-center gap-4">
                  <img src={businessCardImage} alt="Card" className="w-32 h-18 object-cover rounded border border-industrial-700" />
                  <button
                    type="button"
                    onClick={() => setBusinessCardImage('')}
                    className="px-3 py-1 rounded bg-red-500/20 text-red-400 font-bold text-xs"
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-3 bg-industrial-900 rounded-lg border border-dashed border-industrial-700 cursor-pointer text-xs font-semibold text-industrial-300">
                  <Upload className="w-4 h-4 text-brand-orange" />
                  <span>Upload Business Card Image (PNG, JPG)</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>

          </div>

          {/* Real-time Gmail Preview Card */}
          <div className="industrial-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Eye className="w-4 h-4 text-brand-orange" />
              <span>Real-Time Gmail Preview</span>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 text-slate-800 font-sans text-xs space-y-4">
              <div className="border-b border-slate-200 pb-2 space-y-1">
                <p className="font-bold text-slate-900">Subject: {previewSubject}</p>
                <p className="text-slate-500 text-[11px]">From: AM Automation Trading &lt;amautomationtrading@gmail.com&gt;</p>
              </div>

              <div className="whitespace-pre-wrap leading-relaxed text-slate-800">
                {previewBody}
              </div>

              {businessCardImage && (
                <div className="pt-3 border-t border-slate-200">
                  <img src={businessCardImage} alt="Signature" className="max-w-[400px] w-full rounded border border-slate-300" />
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
