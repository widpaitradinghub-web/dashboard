'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, CheckCircle2, XCircle, Clock, Image as ImageIcon, MessageSquare, Download, Filter, X } from 'lucide-react'
import Link from 'next/link'

type Transaction = {
  id: number
  whatsapp_number: string
  receipt_url: string
  status: 'PENDING' | 'COMPLETED' | 'DISPUTED'
  amount_detected: string | null
  created_at: string
  full_name?: string | null
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  
  // Approval Modal States
  const [approveModalTxId, setApproveModalTxId] = useState<number | null>(null)
  const [payoutReceiptFile, setPayoutReceiptFile] = useState<File | null>(null)
  const [payoutReceiptPreview, setPayoutReceiptPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  // Filtering States
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchTransactions()
    const interval = setInterval(fetchTransactions, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [])

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions')
      const data = await res.json()
      if (data.transactions) {
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Failed to fetch transactions', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: number, status: 'COMPLETED' | 'DISPUTED', payoutUrl?: string) => {
    try {
      setUpdatingId(id)
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, payout_receipt_url: payoutUrl })
      })
      if (res.ok) {
        setTransactions(prev =>
          prev.map(t => (t.id === id ? { ...t, status } : t))
        )
        setApproveModalTxId(null)
        setPayoutReceiptFile(null)
        setPayoutReceiptPreview(null)
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || 'Failed to update transaction. Please try again.')
      }
    } catch (error) {
      console.error('Failed to update transaction status', error)
      alert('Network error while updating the transaction. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  const submitApproval = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (approveModalTxId === null) return;
    
    let uploadedUrl = '';
    
    if (payoutReceiptFile) {
      setIsUploading(true);
      try {
        const formData = new FormData()
        formData.append('file', payoutReceiptFile)
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'x-api-key': 'widpai_upload_secret_key' },
          body: formData
        })
        
        if (!uploadRes.ok) {
          throw new Error('Upload failed with status ' + uploadRes.status);
        }
        
        const uploadData = await uploadRes.json()
        if (uploadData.url) {
          uploadedUrl = uploadData.url;
        } else {
          throw new Error('Upload returned no URL');
        }
      } catch (err) {
        console.error('Upload failed', err);
        alert('Failed to upload the receipt image. Please check your connection or try a smaller image.');
        setIsUploading(false);
        return; // Abort approval if upload fails
      }
      setIsUploading(false);
    }
    
    await handleUpdateStatus(approveModalTxId, 'COMPLETED', uploadedUrl || undefined);
  }

  // Derived state for filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      let matches = true;
      
      // Status Filter
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) {
        matches = false;
      }

      // Date Filters
      const txDate = new Date(tx.created_at).getTime()
      
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        if (txDate < start.getTime()) matches = false;
      }
      
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        if (txDate > end.getTime()) matches = false;
      }

      return matches;
    })
  }, [transactions, startDate, endDate, statusFilter])

  const handleExportCSV = () => {
    const headers = [
      'Transaction ID', 
      'Date (Local)', 
      'Time (Local)', 
      'WhatsApp Number', 
      'Amount Detected', 
      'Status', 
      'Receipt URL',
      'UTC Timestamp'
    ];
    
    const rows = filteredTransactions.map(tx => {
      const d = new Date(tx.created_at);
      return [
        tx.id,
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        tx.whatsapp_number,
        tx.amount_detected || 'Not Detected',
        tx.status,
        tx.receipt_url || 'N/A',
        d.toISOString()
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `Widpai_Transactions_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setStatusFilter('ALL')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
    <div className="h-full overflow-y-auto w-full relative">
      <div className="space-y-6 animate-fade-in px-4 md:px-8 py-6 max-w-[1600px] mx-auto pb-[80px] md:pb-6">
      {/* Header Area */}
      <div className="flex flex-col gap-4 bg-card/40 border border-border/40 p-5 rounded-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Transactions
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Review, approve, and audit your payment pipeline.
            </p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              variant="outline"
              className="flex-1 md:flex-none md:hidden"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Date Filters
            </Button>
            <Button 
              onClick={handleExportCSV}
              className="flex-1 md:flex-none bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
              disabled={filteredTransactions.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Status Filter Tabs (Always visible) */}
        <div className="flex bg-muted/50 p-1 rounded-xl gap-1 overflow-x-auto scrollbar-none w-full md:w-fit mt-2">
          {['ALL', 'PENDING', 'COMPLETED', 'DISPUTED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex-1 md:flex-none whitespace-nowrap ${
                statusFilter === status 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`
        ${showFilters ? 'flex' : 'hidden md:flex'} 
        flex-col md:flex-row items-end gap-4 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-sm transition-all
      `}>
        <div className="flex items-center gap-2 w-full md:w-auto text-sm font-semibold text-foreground/80 mb-1 md:mb-0">
          <Filter className="w-4 h-4 text-primary" /> Audit Filters:
        </div>
        
        <div className="flex flex-col w-full md:w-auto">
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Start Date</label>
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 bg-background border-border/50 focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="flex flex-col w-full md:w-auto">
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">End Date</label>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 bg-background border-border/50 focus:border-primary/50 transition-colors"
          />
        </div>

        {(startDate || endDate || statusFilter !== 'ALL') && (
          <Button variant="ghost" onClick={clearFilters} className="h-10 w-full md:w-auto text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            Clear Filters
          </Button>
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden lg:block bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Date / Time</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Customer Info</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="h-8 w-8 text-muted-foreground/30" />
                      <p>{transactions.length === 0 ? "No transactions found in database." : "No transactions match your current filters."}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-accent/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">
                        {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold">{tx.full_name || tx.whatsapp_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase border ${
                        tx.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                        tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}>
                        {tx.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                        {tx.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {tx.status === 'DISPUTED' && <XCircle className="w-3.5 h-3.5" />}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs font-semibold rounded-lg hover:bg-accent/50"
                        onClick={() => setLightboxUrl(tx.receipt_url)}
                        disabled={!tx.receipt_url}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Receipt
                      </Button>
                      
                      <Link href={`/conversations?phone=${encodeURIComponent(tx.whatsapp_number)}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 rounded-lg"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Chat
                        </Button>
                      </Link>

                      {tx.status === 'PENDING' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-lg"
                            disabled={updatingId === tx.id}
                            onClick={() => handleUpdateStatus(tx.id, 'DISPUTED')}
                          >
                            Dispute
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                            disabled={updatingId === tx.id}
                            onClick={() => setApproveModalTxId(tx.id)}
                          >
                            {updatingId === tx.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Approve'}
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE / TABLET CARD VIEW */}
      <div className="lg:hidden grid gap-4 grid-cols-1 md:grid-cols-2">
        {filteredTransactions.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground bg-card/40 border border-border/40 rounded-2xl">
            <Filter className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p>No transactions found.</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div key={tx.id} className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-bold text-foreground text-lg">{tx.full_name || tx.whatsapp_number}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-0.5">
                    {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                  tx.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                  tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                  'bg-rose-500/10 text-rose-600 border-rose-500/20'
                }`}>
                  {tx.status}
                </span>
              </div>

              <div className="mt-auto pt-4 grid grid-cols-2 gap-2 border-t border-border/30">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs font-semibold rounded-lg"
                  onClick={() => setLightboxUrl(tx.receipt_url)}
                  disabled={!tx.receipt_url}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Receipt
                </Button>
                
                <Link href={`/conversations?phone=${encodeURIComponent(tx.whatsapp_number)}`} className="w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs font-semibold text-blue-600 border-blue-200 rounded-lg"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat
                  </Button>
                </Link>

                {tx.status === 'PENDING' && (
                  <div className="col-span-2 grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs font-semibold text-rose-600 border-rose-200 rounded-lg"
                      disabled={updatingId === tx.id}
                      onClick={() => handleUpdateStatus(tx.id, 'DISPUTED')}
                    >
                      Dispute
                    </Button>
                    <Button
                      size="sm"
                      className="w-full gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                      disabled={updatingId === tx.id}
                      onClick={() => setApproveModalTxId(tx.id)}
                    >
                      {updatingId === tx.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Approve'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      </div>
    </div>

      {/* Lightbox for Receipt */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
        >
          <button 
            className="absolute top-4 md:top-6 right-4 md:right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all shadow-lg backdrop-blur-md z-50"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={lightboxUrl} 
            alt="Transaction Receipt" 
            className="max-w-full max-h-[85vh] md:max-h-[90vh] rounded-xl shadow-2xl object-contain animate-in zoom-in-95 duration-200 ring-1 ring-white/20"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Approve Modal */}
      {approveModalTxId !== null && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          style={{ zIndex: 999999 }}
        >
          <div className="bg-card border border-border/50 shadow-2xl rounded-2xl w-full max-w-md p-6 relative">
            <button 
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
              onClick={() => { setApproveModalTxId(null); setPayoutReceiptFile(null); setPayoutReceiptPreview(null); }}
              disabled={isUploading || updatingId === approveModalTxId}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-2">Approve Transaction</h2>
            <p className="text-sm text-muted-foreground mb-6">Upload the payout transfer receipt to instantly notify the client via WhatsApp.</p>
            
            <div className="mb-6">
              {payoutReceiptPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border/50 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={payoutReceiptPreview} alt="Preview" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-all">
                    <Button variant="outline" className="text-white border-white hover:bg-white/20 shadow-xl backdrop-blur-md font-semibold" onClick={() => { setPayoutReceiptFile(null); setPayoutReceiptPreview(null); }}>
                      <X className="w-4 h-4 mr-2" /> Remove & Reselect
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:bg-accent/30 hover:border-primary/50 transition-all bg-card/30">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">Click to upload receipt</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setPayoutReceiptFile(file)
                      setPayoutReceiptPreview(URL.createObjectURL(file))
                    }
                  }} />
                </label>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => { setApproveModalTxId(null); setPayoutReceiptFile(null); setPayoutReceiptPreview(null); }}
                disabled={isUploading || updatingId === approveModalTxId}
              >
                Cancel
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                onClick={submitApproval}
                disabled={isUploading || updatingId === approveModalTxId || !payoutReceiptFile}
              >
                {(isUploading || updatingId === approveModalTxId) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                {isUploading ? 'Uploading...' : 'Approve & Send'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

