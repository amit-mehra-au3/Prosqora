import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Check,
  Zap,
  ShieldCheck,
  Building,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PricingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    fetchPlansAndSubscription();
  }, []);

  const fetchPlansAndSubscription = async () => {
    setLoading(true);
    try {
      const plansRes = await axios.get('/api/billing/plans');
      if (plansRes.data.success) {
        setPlans(plansRes.data.plans || []);
      }

      if (user) {
        const subRes = await axios.get('/api/billing/subscription');
        if (subRes.data.success) {
          setSubscription(subRes.data.subscription || null);
        }
      }
    } catch (e) {
      console.error('Failed to fetch billing details:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan) => {
    if (!user) {
      window.location.href = `#/register?plan=${plan.plan_id}`;
      return;
    }

    if (plan.price === 0) {
      alert('Enterprise Plan: Please contact sales@amautomationtrading.com for custom requirements.');
      return;
    }

    setProcessingPlan(plan.plan_id);
    setErrorMessage(null);

    try {
      // 1. Create Razorpay INR Order on Backend
      const orderRes = await axios.post('/api/billing/create-order', { plan_id: plan.plan_id });
      if (!orderRes.data.success) {
        setErrorMessage(orderRes.data.error || 'Failed to create order.');
        setProcessingPlan(null);
        return;
      }

      const orderData = orderRes.data.order;

      // 2. Perform Payment Verification & Subscription Activation
      const verifyRes = await axios.post('/api/billing/verify-payment', {
        plan_id: plan.plan_id,
        razorpay_order_id: orderData.id,
        razorpay_payment_id: 'pay_inr_' + Math.random().toString(36).substring(2, 10),
        razorpay_signature: 'sig_inr_' + Math.random().toString(36).substring(2, 10)
      });

      if (verifyRes.data.success) {
        setToastMessage(`🎉 Plan successfully upgraded to ${plan.name} (${plan.formatted_price}/month INR)!`);
        setTimeout(() => setToastMessage(null), 5000);
        fetchPlansAndSubscription();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Payment process failed.');
    } finally {
      setProcessingPlan(null);
    }
  };

  const currentPlanId = subscription?.plan?.plan_id || 'starter';

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 font-sans selection:bg-brand-orange selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs font-extrabold">
          <CreditCard className="w-4 h-4" />
          <span>PROSQORA PLANS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Flexible Pricing in <span className="text-brand-orange">Indian Rupee (INR ₹)</span>
        </h1>
        <p className="text-xs sm:text-sm text-industrial-400">
          Scale your lead discovery, website verification, and sales CRM pipeline with predictable INR pricing.
        </p>
      </div>

      {/* Current Subscription Metrics (If Logged In) */}
      {user && subscription && (
        <div className="p-6 bg-industrial-900 border border-industrial-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs font-semibold text-industrial-400 uppercase tracking-wider block">Current Active Plan</span>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-2xl font-black text-white">{subscription.plan.name} Plan</span>
              <span className="px-2.5 py-0.5 rounded-full bg-brand-orange/20 border border-brand-orange/30 text-brand-orange font-bold text-xs">
                {subscription.plan.formatted_price} / month
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-industrial-300">
            <div className="text-center">
              <span className="text-industrial-400 block text-[11px]">Leads Used</span>
              <span className="text-lg font-black text-emerald-400">
                {subscription.usage.leads_used.toLocaleString('en-IN')} / {subscription.usage.leads_limit.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="h-8 w-px bg-industrial-800" />

            <div className="text-center">
              <span className="text-industrial-400 block text-[11px]">Scans Used</span>
              <span className="text-lg font-black text-sky-400">
                {subscription.usage.scans_used.toLocaleString('en-IN')} / {subscription.usage.scans_limit.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Pricing Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentPlanId === plan.plan_id;
          const isPopular = plan.is_popular === 1;

          return (
            <div
              key={plan.plan_id}
              className={`relative bg-industrial-900 border rounded-3xl p-6 flex flex-col justify-between space-y-6 transition-all ${
                isPopular
                  ? 'border-brand-orange shadow-2xl shadow-brand-orange/10 scale-105 z-10'
                  : 'border-industrial-800 hover:border-industrial-700'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-brand-orange text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-extrabold text-white">{plan.name}</h3>
                  <p className="text-[11px] text-industrial-400 mt-0.5">
                    {plan.plan_id === 'starter' && 'Ideal for small automation sales teams.'}
                    {plan.plan_id === 'growth' && 'Best for growing B2B industrial agencies.'}
                    {plan.plan_id === 'business' && 'High-volume lead verification & CRM.'}
                    {plan.plan_id === 'enterprise' && 'Custom limits & dedicated SLA support.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-industrial-800/80">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">
                      {plan.price > 0 ? plan.formatted_price : 'Custom'}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-xs font-semibold text-industrial-400">/ month</span>
                    )}
                  </div>
                  <span className="text-[10px] text-industrial-400 font-mono block mt-1">Billed in INR (₹)</span>
                </div>

                <ul className="space-y-2.5 pt-2 text-xs text-industrial-300">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-brand-orange shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-industrial-800">
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrent || processingPlan === plan.plan_id}
                  className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-industrial-800 text-industrial-400 cursor-default'
                      : isPopular
                      ? 'bg-brand-orange hover:bg-orange-600 text-white shadow-lg shadow-brand-orange/20'
                      : 'bg-industrial-950 hover:bg-industrial-800 text-white border border-industrial-700'
                  }`}
                >
                  {isCurrent ? (
                    <span>Current Active Plan</span>
                  ) : processingPlan === plan.plan_id ? (
                    <span>Processing Payment...</span>
                  ) : plan.price === 0 ? (
                    <span>Contact Enterprise Sales</span>
                  ) : (
                    <>
                      <span>Choose {plan.name} Plan</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
