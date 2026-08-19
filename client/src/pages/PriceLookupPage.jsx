import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Upload,
  FileText,
  Tag,
  CheckCircle,
  AlertCircle,
  Copy,
  DollarSign,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Building2,
  FileCheck
} from 'lucide-react';

export default function PriceLookupPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catalogues, setCatalogues] = useState([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const [brandName, setBrandName] = useState('Mitsubishi Electric');
  const [listTitle, setListTitle] = useState('Factory Automation Systems Price List FY 2026-27');

  useEffect(() => {
    fetchPriceItems(searchQuery);
    fetchCatalogues();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPriceItems(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPriceItems = async (query = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/price-lists/search?q=${encodeURIComponent(query)}`);
      if (res.data.success) {
        setItems(res.data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch price list items:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogues = async () => {
    try {
      const res = await axios.get('/api/price-lists');
      if (res.data.success) {
        setCatalogues(res.data.lists || []);
      }
    } catch (err) {}
  };

  const handlePdfFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a valid PDF (.pdf) or CSV (.csv) price list document.');
      return;
    }

    setUploadingPdf(true);
    setUploadMsg('Extracting models, descriptions & prices from document...');

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('brandName', brandName);
    formData.append('listTitle', listTitle);

    try {
      const endpoint = file.name.toLowerCase().endsWith('.pdf')
        ? '/api/price-lists/upload-pdf'
        : '/api/price-lists/upload-pdf';

      const res = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setUploadMsg(`✅ ${res.data.message}`);
        await fetchCatalogues();
        await fetchPriceItems(searchQuery);
        setTimeout(() => setUploadMsg(''), 4000);
      }
    } catch (err) {
      setUploadMsg(`❌ Upload failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSeedDemo = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/price-lists/seed-demo');
      if (res.data.success) {
        setUploadMsg(`✅ Loaded Mitsubishi Electric FY 2026-27 FX3S PLC Price List (${res.data.items.length} items)!`);
        await fetchCatalogues();
        await fetchPriceItems(searchQuery);
        setTimeout(() => setUploadMsg(''), 4000);
      }
    } catch (err) {
      alert('Failed to load Mitsubishi demo price list.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyItem = (item) => {
    const text = `Model: ${item.model_number}\nDescription: ${item.description}\nList Price: ₹ ${item.list_price.toLocaleString('en-IN')}\nStatus: ${item.stock_status}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <Tag className="w-7 h-7 text-brand-orange" />
            <span>PDF Price List & Model Lookup</span>
          </h1>
          <p className="text-xs text-industrial-400 mt-1">
            Upload OEM price lists (PDF up to 500MB, Scanned Image PDF via OCR Engine, or CSV) and search any model number for instant list prices & stock availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDemo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs border border-industrial-700 transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4 text-brand-orange" />
            <span>Load Mitsubishi FY 2026-27 Catalogue</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs shadow-lg shadow-brand-orange/20 cursor-pointer transition-all shrink-0">
            <Upload className="w-4 h-4" />
            <span>Upload PDF Price List</span>
            <input
              type="file"
              accept=".pdf,.csv"
              onChange={handlePdfFileUpload}
              className="hidden"
              disabled={uploadingPdf}
            />
          </label>
        </div>
      </div>

      {uploadMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${uploadMsg.includes('❌') ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{uploadMsg}</span>
        </div>
      )}

      {/* Main Search Input */}
      <div className="industrial-card p-6 space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-industrial-400" />
          <input
            type="text"
            placeholder="Search Model Number (e.g. FX3S-10MR/DS, FX3S-14MT/ES, Compact PLC, 16000)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="industrial-input w-full pl-12 pr-4 py-3.5 text-sm font-mono font-medium text-white shadow-inner focus:border-brand-orange"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-industrial-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-industrial-400 pt-1">
          <div className="flex items-center gap-2">
            <span>Quick Filters:</span>
            {['FX3S-10MR', 'FX3S-14MT', 'FX3S-20MR', 'Compact PLC', 'Stock'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSearchQuery(filter)}
                className="px-2.5 py-1 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-industrial-300 border border-industrial-700 text-[11px] font-semibold transition-colors"
              >
                {filter}
              </button>
            ))}
          </div>
          <div>
            Showing <strong className="text-white">{items.length}</strong> matching models
          </div>
        </div>
      </div>

      {/* Price Items Results Grid / Table */}
      <div className="industrial-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-industrial-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-orange" />
            <span>Searching price list database...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Tag className="w-10 h-10 text-industrial-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No Models Found Matching "{searchQuery}"</h3>
            <p className="text-xs text-industrial-400 max-w-md mx-auto">
              Upload a new PDF price list or click "Load Mitsubishi FY 2026-27 Catalogue" to pre-populate baseline models.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-industrial-950 border-b border-industrial-800 text-industrial-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Model Number</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">List Price</th>
                  <th className="py-3.5 px-4 text-center">Stock Availability</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800/60 font-mono">
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-industrial-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-center text-industrial-500 font-mono text-[11px]">
                      {item.s_no || idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm font-mono bg-industrial-900 px-2.5 py-1 rounded-lg border border-industrial-700 text-brand-orange">
                          {item.model_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-industrial-800 text-industrial-300 border border-industrial-700 font-sans">
                          {item.brand_name || 'Mitsubishi Electric'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-industrial-200 text-xs max-w-md leading-relaxed">
                      {item.description}
                    </td>
                    <td className="py-3.5 px-4 text-industrial-400 text-xs font-sans">
                      {item.category || 'Compact PLC'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-black text-emerald-400 text-sm font-mono bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                        ₹ {item.list_price ? item.list_price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.stock_status === 'Stock' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 font-sans">
                          <CheckCircle className="w-3 h-3" />
                          <span>Stock</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-industrial-800 text-industrial-400 text-[11px] font-bold border border-industrial-700 font-sans">
                          <span>Non Stock</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleCopyItem(item)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-white font-semibold text-xs border border-industrial-700 transition-colors ml-auto font-sans"
                      >
                        <Copy className="w-3.5 h-3.5 text-brand-orange" />
                        <span>{copiedId === item.id ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
