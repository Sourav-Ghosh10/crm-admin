import React, { useState, useEffect } from 'react';
import { TrendingUp, Calculator, RefreshCw } from 'lucide-react';
import { clientService } from '../../services/clientService';
import { reportService } from '../../services/reportService';
import type { ProfitSummary } from '../../types/client.types';


const ProfitWidget: React.FC = () => {
    const [exchangeRate, setExchangeRate] = useState(83.25);
    const [summary, setSummary] = useState<ProfitSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [displayCurrency, setDisplayCurrency] = useState<'INR' | 'USD'>('INR');

    const [lastSync, setLastSync] = useState<Date | null>(null);

    const fetchExchangeRate = async () => {
        try {
            const rate = await reportService.getExchangeRate();
            setExchangeRate(rate);
            setLastSync(new Date());
        } catch (error) {
            console.error("Failed to fetch exchange rate", error);
        }
    };

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const data = await clientService.getProfitSummary();
                setSummary(data);
            } catch (error) {
                console.error("Failed to fetch profit summary", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
        fetchExchangeRate();
    }, []);

    // Derived logic
    const revenueUSD = summary?.byCurrency?.['USD']?.totalBillingRate || 0;
    const internalExpensesINR = summary?.totalInternalExpenseINR || 0;

    const revenueINR = revenueUSD * exchangeRate;
    const profitINR = revenueINR - internalExpensesINR;

    // Avoid division by zero
    const profitPercentage = revenueINR > 0 ? (profitINR / revenueINR) * 100 : 0;

    const handleExportReport = async () => {
        try {
            setIsExporting(true);
            await reportService.generateReport({
                type: 'financial',
                format: 'pdf',
                exchangeRate: exchangeRate,
                currency: displayCurrency
            });
        } catch (error) {
            console.error("Failed to export report", error);
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-surface p-6 rounded-[2rem] border border-primary/20 shadow-xl shadow-primary/5 flex items-center justify-center min-h-[300px]">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-surface p-6 rounded-[2rem] border border-primary/20 shadow-xl shadow-primary/5 relative overflow-hidden group">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />

            <div className="flex items-start justify-between relative z-10 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Strategic Profit Matrix ({summary?.totalClients || 0} Clients)</h3>
                    </div>
                    <h2 className="text-2xl font-black text-foreground tracking-tighter">Financial Overview</h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-muted/30 p-1 rounded-xl border border-border">
                        <button
                            onClick={() => setDisplayCurrency('INR')}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${displayCurrency === 'INR' ? 'bg-foreground text-surface shadow-sm' : 'text-foreground-tertiary hover:text-foreground'}`}
                        >
                            INR
                        </button>
                        <button
                            onClick={() => setDisplayCurrency('USD')}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${displayCurrency === 'USD' ? 'bg-foreground text-surface shadow-sm' : 'text-foreground-tertiary hover:text-foreground'}`}
                        >
                            USD
                        </button>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 hover:scale-105 transition-transform duration-300">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-6">
                    <div>
                        <p className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest mb-1">Total Expected Revenue (USD)</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-foreground tracking-tighter">${revenueUSD.toLocaleString()}</span>
                            {revenueUSD > 0 && (
                                <span className="text-xs font-bold text-success flex items-center gap-0.5" title="Gross Revenue in INR">
                                    ≈ ₹{revenueINR.toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest mb-1">Exchange Rate (USD/INR)</p>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 group">
                                <input
                                    type="number"
                                    value={exchangeRate}
                                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                                    step="0.01"
                                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2 pl-9 pr-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                />
                                <Calculator className="absolute left-3 top-2.5 w-4 h-4 text-foreground-tertiary group-focus-within:text-primary transition-colors" />
                                <button
                                    onClick={fetchExchangeRate}
                                    className="absolute right-3 top-2.5 p-0.5 hover:bg-primary/10 rounded-md transition-colors text-foreground-tertiary hover:text-primary"
                                    title="Fetch live rate"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-foreground-tertiary uppercase bg-muted/30 px-2 py-0.5 rounded-md">Live</span>
                                {lastSync && (
                                    <span className="text-[8px] text-foreground-tertiary mt-1 font-bold">
                                        {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-primary/5 rounded-[1.5rem] p-6 border border-primary/10 flex flex-col justify-between hover:bg-primary/10 transition-colors duration-500">
                    <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Estimated Net Profit ({displayCurrency})</p>
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-foreground tracking-tighter tabular-nums">
                                    {displayCurrency === 'INR' ? '₹' : '$'}{Math.floor(displayCurrency === 'INR' ? profitINR : profitINR / exchangeRate).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-xs font-bold text-foreground-tertiary italic">
                                Approx. {profitPercentage.toFixed(1)}% of Gross Revenue
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-primary/10">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest">Internal Expenses</span>
                            <span className="text-sm font-black text-foreground tracking-tight tabular-nums">
                                {displayCurrency === 'INR' ? '₹' : '$'}{(displayCurrency === 'INR' ? internalExpensesINR : internalExpensesINR / exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-primary/10 rounded-full mt-2 overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, (internalExpensesINR / (revenueINR || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex items-center justify-between relative z-10 px-1 border-t border-border pt-4">
                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-foreground-tertiary uppercase tracking-wider">Status</span>
                        <span className="text-[10px] font-bold text-success uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                            Optimized
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-foreground-tertiary uppercase tracking-wider">DataSource</span>
                        <span className="text-[10px] font-bold text-foreground uppercase">Live CRM Sync</span>
                    </div>
                </div>
                <button
                    onClick={handleExportReport}
                    disabled={isExporting}
                    className="px-5 py-2.5 bg-foreground text-surface rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all duration-300 shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExporting ? 'Generating...' : 'Export Report'}
                </button>
            </div>
        </div>
    );
};

export default ProfitWidget;
