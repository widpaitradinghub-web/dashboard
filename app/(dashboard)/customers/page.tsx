'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, Search, ShieldCheck, ShieldAlert, Clock, ShieldX,
  ExternalLink, FileText, CheckCircle2, XCircle, Loader2,
  RefreshCw, MessageSquare, AlertCircle, Eye, UserCheck,
  Download, FileSpreadsheet, ZoomIn, ZoomOut, RotateCw, X,
  Image as ImageIcon, Sparkles, Filter, Copy, FileDown, Phone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Customer {
  id: number
  session_id: string
  whatsapp_number: string
  full_name: string | null
  email: string | null
  country: string | null
  id_type: string | null
  id_number: string | null
  id_document_url: string | null
  selfie_url: string | null
  kyc_status: 'not_started' | 'submitted' | 'verified' | 'rejected'
  rejection_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface DocumentLightbox {
  url: string
  title: string
  subtitle?: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [pdfModalCustomer, setPdfModalCustomer] = useState<Customer | null>(null)

  // Document Lightbox state
  const [lightbox, setLightbox] = useState<DocumentLightbox | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  // Modal editing states
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (search.trim()) params.append('search', search.trim())

      const res = await fetch(`/api/customers?${params.toString()}`)
      const data = await res.json()

      if (res.ok && Array.isArray(data)) {
        setCustomers(data)
      } else {
        console.warn('Customer fetch response:', res.status, data)
        setCustomers([])
      }
    } catch (err) {
      console.error('Failed to load customers:', err)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // ESC key handler for lightbox and modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox) {
          closeLightbox()
        } else if (pdfModalCustomer) {
          setPdfModalCustomer(null)
        } else if (selectedCustomer) {
          setSelectedCustomer(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightbox, selectedCustomer, pdfModalCustomer])

  const notify = (msg: string, success = true) => {
    setNotification({ msg, success })
    setTimeout(() => setNotification(null), 4000)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    notify(`Copied ${label} to clipboard!`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const openLightbox = (url: string, title: string, subtitle?: string) => {
    setLightbox({ url, title, subtitle })
    setZoom(1)
    setRotation(0)
  }

  const closeLightbox = () => {
    setLightbox(null)
    setZoom(1)
    setRotation(0)
  }

  // Force download image file to computer
  const downloadImage = async (url: string, defaultFilename: string) => {
    try {
      notify(`Preparing photo download...`)
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = defaultFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
      notify(`Photo downloaded successfully!`)
    } catch (err) {
      console.error('Download error:', err)
      // Fallback: direct window open with download attribute
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.download = defaultFilename
      link.click()
      notify(`Opened photo link for download`)
    }
  }

  // Export customers list to formatted Excel (.csv file with UTF-8 BOM for Microsoft Excel)
  const exportToExcel = () => {
    if (customers.length === 0) {
      notify('No customer records to export', false)
      return
    }

    const headers = [
      'Session ID',
      'Full Name',
      'WhatsApp / Phone',
      'Email',
      'Country / Nationality',
      'ID Type',
      'ID Number',
      'KYC Status',
      'ID Document Photo URL',
      'Selfie Photo URL',
      'Rejection Reason',
      'Admin Notes',
      'Created At',
      'Updated At'
    ]

    const rows = customers.map(c => [
      c.session_id || '',
      c.full_name || 'Anonymous User',
      c.whatsapp_number || c.session_id,
      c.email || '',
      c.country || '',
      c.id_type || '',
      c.id_number || '',
      c.kyc_status || 'not_started',
      c.id_document_url || '',
      c.selfie_url || '',
      c.rejection_reason || '',
      c.notes || '',
      c.created_at ? new Date(c.created_at).toLocaleString() : '',
      c.updated_at ? new Date(c.updated_at).toLocaleString() : ''
    ])

    const escapeCsv = (val: string) => `"${val.toString().replace(/"/g, '""')}"`
    const csvContent = '\ufeff' + [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    const fileName = `WIDPAI_Customers_${statusFilter.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    notify(`Exported ${customers.length} customers to Excel sheet!`)
  }

  // Generate & Download individual Customer PDF Dossier
  const exportCustomerPDF = (c: Customer) => {
    const printWindow = window.open('', '_blank', 'width=950,height=1050')
    if (!printWindow) {
      notify('Please allow popups to generate PDF dossier', false)
      return
    }

    const customerName = c.full_name || 'Anonymous User'
    const safeFilename = customerName.replace(/[^a-zA-Z0-9_-]/g, '_')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>KYC_Dossier_${safeFilename}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            * { box-sizing: border-box; }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 24px;
              font-size: 13px;
              line-height: 1.5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #4f46e5;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .brand { font-size: 24px; font-weight: 900; color: #4f46e5; letter-spacing: -0.5px; }
            .subtitle { font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; margin-top: 3px; font-weight: 700; }
            .badge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.8px;
            }
            .badge-verified { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
            .badge-submitted { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .badge-rejected { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
            .badge-not_started { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
            
            .section { margin-bottom: 22px; }
            .section-title {
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #4f46e5;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
              margin-bottom: 12px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }
            .field {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 10px 14px;
            }
            .label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 3px; letter-spacing: 0.5px; }
            .value { font-size: 13px; font-weight: 600; color: #0f172a; word-break: break-all; }
            .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

            .doc-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 16px;
              margin-top: 12px;
            }
            .doc-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 14px;
              background: #fafafa;
              text-align: center;
            }
            .doc-card img {
              max-width: 100%;
              max-height: 220px;
              object-fit: contain;
              border-radius: 8px;
              border: 1px solid #cbd5e1;
              margin-top: 10px;
              background: #000;
            }

            .footer {
              margin-top: 36px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #94a3b8;
            }
            .print-btn {
              position: fixed;
              top: 16px;
              right: 16px;
              background: #4f46e5;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 10px;
              font-weight: 700;
              font-size: 12px;
              cursor: pointer;
              box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
              z-index: 9999;
            }
            @media print {
              .print-btn { display: none; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">📥 Save PDF / Print Dossier</button>

          <div class="header">
            <div>
              <div class="brand">WIDPAI HUB</div>
              <div class="subtitle">Customer Identity & KYC Verification Dossier</div>
            </div>
            <div>
              <span class="badge badge-${c.kyc_status}">
                ${c.kyc_status === 'verified' ? '✓ Verified' : c.kyc_status === 'submitted' ? '⏳ Pending Review' : c.kyc_status === 'rejected' ? '✕ Rejected' : 'Unverified'}
              </span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">1. Customer Details</div>
            <div class="grid">
              <div class="field">
                <div class="label">Full Name</div>
                <div class="value">${customerName}</div>
              </div>
              <div class="field">
                <div class="label">WhatsApp / Phone Number</div>
                <div class="value mono">${c.whatsapp_number || c.session_id}</div>
              </div>
              <div class="field">
                <div class="label">Email Address</div>
                <div class="value">${c.email || 'Not provided'}</div>
              </div>
              <div class="field">
                <div class="label">Nationality / Country</div>
                <div class="value">${c.country ? `🌐 ${c.country}` : 'Not specified'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. Identity Document Information</div>
            <div class="grid">
              <div class="field">
                <div class="label">ID Document Type</div>
                <div class="value">${c.id_type ? c.id_type.toUpperCase() : 'Not provided'}</div>
              </div>
              <div class="field">
                <div class="label">ID Document Number</div>
                <div class="value mono">${c.id_number || 'Not provided'}</div>
              </div>
              <div class="field">
                <div class="label">Session ID</div>
                <div class="value mono">${c.session_id}</div>
              </div>
              <div class="field">
                <div class="label">Last Updated Timestamp</div>
                <div class="value">${c.updated_at ? new Date(c.updated_at).toLocaleString() : 'N/A'}</div>
              </div>
            </div>
          </div>

          ${c.rejection_reason || c.notes ? `
          <div class="section">
            <div class="section-title">3. Compliance & Admin Notes</div>
            <div class="grid">
              ${c.rejection_reason ? `
              <div class="field" style="background:#fff1f2; border-color:#fecdd3;">
                <div class="label" style="color:#e11d48;">Rejection Reason</div>
                <div class="value" style="color:#9f1239;">${c.rejection_reason}</div>
              </div>
              ` : ''}
              ${c.notes ? `
              <div class="field">
                <div class="label">Internal Admin Notes</div>
                <div class="value">${c.notes}</div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">4. Document & Photo Verification Assets</div>
            <div class="doc-container">
              <div class="doc-card">
                <div class="label">Government ID Photo</div>
                ${c.id_document_url ? `
                  <img src="${c.id_document_url}" alt="Government ID Photo" />
                  <div style="font-size:10px; margin-top:6px; color:#4f46e5; word-break:break-all;" class="mono">${c.id_document_url}</div>
                ` : '<div style="padding:24px; color:#94a3b8;">No ID photo uploaded</div>'}
              </div>
              <div class="doc-card">
                <div class="label">Selfie Photo</div>
                ${c.selfie_url ? `
                  <img src="${c.selfie_url}" alt="Selfie Photo" />
                  <div style="font-size:10px; margin-top:6px; color:#4f46e5; word-break:break-all;" class="mono">${c.selfie_url}</div>
                ` : '<div style="padding:24px; color:#94a3b8;">No selfie photo uploaded</div>'}
              </div>
            </div>
          </div>

          <div class="footer">
            <div>Official Report generated by WIDPAI Identity & KYC Hub</div>
            <div>Timestamp: ${new Date().toLocaleString()}</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            }
          </script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
    notify(`Generated PDF Dossier for ${customerName}`)
  }

  const handleUpdateStatus = async (newStatus: 'verified' | 'rejected' | 'submitted') => {
    if (!selectedCustomer) return
    setActionLoading(true)

    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(selectedCustomer.session_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kyc_status: newStatus,
          rejection_reason: newStatus === 'rejected' ? rejectionReason : null,
          notes: adminNotes
        })
      })

      if (res.ok) {
        const updated = await res.json()
        setSelectedCustomer(updated)
        notify(`Customer KYC status set to ${newStatus.toUpperCase()}`)
        loadCustomers()
      } else {
        notify('Failed to update status', false)
      }
    } catch {
      notify('An error occurred while updating status', false)
    } finally {
      setActionLoading(false)
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        )
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm animate-pulse">
            <Clock className="h-3.5 w-3.5" />
            Pending Review
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm">
            <ShieldX className="h-3.5 w-3.5" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <ShieldAlert className="h-3.5 w-3.5" />
            Not Started
          </span>
        )
    }
  }

  // Summary counts
  const totalCount = customers.length
  const verifiedCount = customers.filter(c => c.kyc_status === 'verified').length
  const pendingCount = customers.filter(c => c.kyc_status === 'submitted').length
  const rejectedCount = customers.filter(c => c.kyc_status === 'rejected').length

  return (
    <div className="h-full overflow-y-auto w-full relative">
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 md:pb-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border animate-in slide-in-from-top-4 duration-300 ${
          notification.success
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
            : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
        }`}>
          {notification.success ? <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />}
          <span className="text-sm font-semibold">{notification.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass p-6 rounded-3xl border border-border/50 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" /> Identity & Customer Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
            Customer Directory & KYC Hub
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Search customer records, inspect identity photo documents, and download customer data to Excel or PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 z-10">
          {/* Export All to Excel Button */}
          <Button
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-2 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Table to Excel
          </Button>

          <Button
            onClick={loadCustomers}
            variant="outline"
            size="sm"
            className="gap-2 text-xs rounded-xl bg-background/50 border-border/50 hover:bg-accent/40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass p-4 rounded-2xl border border-border/50 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-foreground">{totalCount}</div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Customers</div>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-border/50 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{verifiedCount}</div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Verified</div>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-border/50 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">{pendingCount}</div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pending Review</div>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-border/50 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldX className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400">{rejectedCount}</div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rejected</div>
          </div>
        </div>
      </div>

      {/* Filters & Top Search Bar */}
      <div className="glass p-4 rounded-2xl border border-border/50 shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
          {/* Top Search bar (Name or Phone Number) */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-9 bg-background/60 border-border/50 focus:border-primary rounded-xl text-xs sm:text-sm shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-1"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
              <Filter className="h-3.5 w-3.5" /> Status:
            </span>
            {[
              { id: 'all', label: 'All Customers', count: totalCount },
              { id: 'submitted', label: 'Pending Review', count: pendingCount },
              { id: 'verified', label: 'Verified', count: verifiedCount },
              { id: 'rejected', label: 'Rejected', count: rejectedCount },
              { id: 'not_started', label: 'Not Started', count: totalCount - verifiedCount - pendingCount - rejectedCount }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap active:scale-95 flex items-center gap-1.5 ${
                  statusFilter === st.id
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/70'
                }`}
              >
                <span>{st.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === st.id ? 'bg-white/20 text-white' : 'bg-muted/60 text-muted-foreground'
                }`}>
                  {st.count}
                </span>
              </button>
            ))}

            {/* Quick Export Trigger */}
            <button
              onClick={exportToExcel}
              title="Download Excel Sheet"
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel (.csv)
            </button>
          </div>
        </div>
      </div>

      {/* Customers Row by Row Table */}
      {loading ? (
        <div className="glass rounded-2xl py-20 flex flex-col items-center justify-center text-muted-foreground gap-3 border border-border/50">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm font-medium">Fetching customer records...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center space-y-3 border border-border/50 shadow-lg">
          <UserCheck className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-bold">No customer records found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            {search || statusFilter !== 'all'
              ? 'No customers matched your search term or status filter.'
              : 'New customer profiles will appear here automatically as they interact with the bot.'}
          </p>
        </div>
      ) : (
        <div className="glass rounded-3xl border border-border/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-muted/40 border-b border-border/50 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-4">Customer Details</th>
                  <th className="px-4 py-4">Phone / WhatsApp</th>
                  <th className="px-4 py-4">Country & ID Details</th>
                  <th className="px-4 py-4">ID Photo & Documents</th>
                  <th className="px-4 py-4">KYC Status</th>
                  <th className="px-4 py-4">Updated At</th>
                  <th className="px-5 py-4 text-right">Actions / Export PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {customers.map((c) => {
                  const hasDoc = !!c.id_document_url
                  const hasSelfie = !!c.selfie_url
                  const phoneNum = c.whatsapp_number || c.session_id

                  return (
                    <tr key={c.id || c.session_id} className="hover:bg-accent/20 transition-colors group">
                      {/* Customer Name & Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                            {(c.full_name || c.session_id).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate">{c.full_name || 'Anonymous User'}</div>
                            {c.email ? (
                              <div className="text-[11px] text-muted-foreground truncate">{c.email}</div>
                            ) : (
                              <div className="text-[11px] text-muted-foreground/60 italic">No email provided</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone Number */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-foreground font-semibold">
                          <Phone className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <span>{phoneNum}</span>
                          <button
                            onClick={() => copyToClipboard(phoneNum, 'Phone Number')}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy Phone Number"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>

                      {/* Country & ID Info */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-muted/60 border border-border/40 text-foreground inline-block">
                            {c.country ? `🌐 ${c.country}` : 'Country N/A'}
                          </span>
                          {c.id_number ? (
                            <div className="text-xs font-mono text-muted-foreground">
                              <span className="font-bold text-primary uppercase text-[10px] mr-1">{c.id_type || 'ID'}:</span>
                              <span>{c.id_number}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground/50 italic">No ID details</div>
                          )}
                        </div>
                      </td>

                      {/* Uploaded ID Photo & Selfie Links/Thumbnails */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {/* ID Photo Thumbnail & Links */}
                          {hasDoc ? (
                            <div className="flex items-center gap-1.5 bg-background/50 p-1 rounded-xl border border-primary/30">
                              <button
                                onClick={() => openLightbox(c.id_document_url!, `ID Document: ${c.full_name || c.session_id}`, `Type: ${c.id_type || 'ID'} · Number: ${c.id_number || 'N/A'}`)}
                                className="relative group/thumb h-9 w-12 rounded-lg overflow-hidden border border-primary/40 bg-black shadow-sm hover:scale-105 transition-transform flex-shrink-0"
                                title="Click to view full ID Document photo preview"
                              >
                                <img
                                  src={c.id_document_url!}
                                  alt="ID Doc"
                                  className="w-full h-full object-cover group-hover/thumb:opacity-80 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="h-3 w-3 text-white" />
                                </div>
                              </button>

                              <div className="flex flex-col text-[10px]">
                                <button
                                  onClick={() => openLightbox(c.id_document_url!, `ID Document: ${c.full_name || c.session_id}`, `Type: ${c.id_type || 'ID'}`)}
                                  className="text-primary hover:underline font-bold flex items-center gap-0.5"
                                  title="View ID Photo Preview"
                                >
                                  <ImageIcon className="h-3 w-3" /> Preview ID
                                </button>
                                <button
                                  onClick={() => downloadImage(c.id_document_url!, `ID_Photo_${(c.full_name || c.session_id).replace(/\s+/g, '_')}.jpg`)}
                                  className="text-emerald-400 hover:underline font-semibold flex items-center gap-0.5"
                                  title="Download ID Photo to Computer"
                                >
                                  <Download className="h-3 w-3" /> Download
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50 px-2 py-1 rounded bg-muted/20 border border-dashed border-border/40">
                              No ID Photo
                            </span>
                          )}

                          {/* Selfie Thumbnail & Links */}
                          {hasSelfie && (
                            <div className="flex items-center gap-1.5 bg-background/50 p-1 rounded-xl border border-emerald-500/30">
                              <button
                                onClick={() => openLightbox(c.selfie_url!, `Selfie Verification: ${c.full_name || c.session_id}`, `Session: ${c.session_id}`)}
                                className="relative group/thumb h-9 w-9 rounded-full overflow-hidden border border-emerald-500/40 bg-black shadow-sm hover:scale-105 transition-transform flex-shrink-0"
                                title="Click to view Selfie photo preview"
                              >
                                <img
                                  src={c.selfie_url!}
                                  alt="Selfie"
                                  className="w-full h-full object-cover group-hover/thumb:opacity-80 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="h-3 w-3 text-white" />
                                </div>
                              </button>

                              <div className="flex flex-col text-[10px]">
                                <button
                                  onClick={() => openLightbox(c.selfie_url!, `Selfie Verification: ${c.full_name || c.session_id}`, `Session: ${c.session_id}`)}
                                  className="text-emerald-400 hover:underline font-bold"
                                  title="View Selfie Preview"
                                >
                                  Selfie
                                </button>
                                <button
                                  onClick={() => downloadImage(c.selfie_url!, `Selfie_${(c.full_name || c.session_id).replace(/\s+/g, '_')}.jpg`)}
                                  className="text-emerald-400 hover:underline flex items-center gap-0.5"
                                  title="Download Selfie Photo"
                                >
                                  <Download className="h-2.5 w-2.5" /> Download
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* KYC Status Badge */}
                      <td className="px-4 py-4">
                        {renderStatusBadge(c.kyc_status)}
                      </td>

                      {/* Updated Timestamp */}
                      <td className="px-4 py-4 text-xs text-muted-foreground font-mono">
                        {c.updated_at ? new Date(c.updated_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '—'}
                      </td>

                      {/* Row Action Buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* EXPORT ROW PDF BUTTON */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportCustomerPDF(c)}
                            className="text-xs gap-1.5 rounded-xl border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-semibold shadow-sm active:scale-95 transition-all"
                            title="Export & Download PDF dossier for this customer"
                          >
                            <FileDown className="h-3.5 w-3.5 text-primary" />
                            PDF
                          </Button>

                          {/* REVIEW CUSTOMER MODAL */}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedCustomer(c)
                              setRejectionReason(c.rejection_reason || '')
                              setAdminNotes(c.notes || '')
                            }}
                            className="text-xs gap-1 rounded-xl bg-secondary/80 hover:bg-secondary font-medium"
                            title="Review customer details and set KYC verification status"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Review
                          </Button>

                          {/* CHAT SESSION LINK */}
                          <Link
                            href={`/conversations?phone=${encodeURIComponent(c.session_id)}`}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground font-semibold px-2.5 py-1.5 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Open chat conversation with customer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AESTHETIC DOCUMENT LIGHTBOX VIEWER WITH DIRECT DOWNLOAD */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
          {/* Top Control Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-50 text-white">
            <div className="min-w-0 pr-4">
              <h3 className="text-base font-bold truncate flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                {lightbox.title}
              </h3>
              {lightbox.subtitle && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{lightbox.subtitle}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* DIRECT DOWNLOAD PHOTO BUTTON */}
              <button
                onClick={() => downloadImage(lightbox.url, `Customer_Document_${Date.now()}.jpg`)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg transition-all"
                title="Download Photo to computer"
              >
                <Download className="h-4 w-4" />
                Download Photo
              </button>

              {/* Zoom Out */}
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              {/* Zoom In */}
              <button
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              {/* Rotate */}
              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
                title="Rotate 90°"
              >
                <RotateCw className="h-4 w-4" />
              </button>

              {/* Open in external tab */}
              <a
                href={lightbox.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all flex items-center gap-1 text-xs"
                title="Open image URL in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>

              {/* Close Button */}
              <button
                onClick={closeLightbox}
                className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 backdrop-blur-md transition-all ml-2"
                title="Close viewer (ESC)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Image Canvas */}
          <div className="w-full h-full flex items-center justify-center p-12 overflow-hidden">
            <div
              className="transition-transform duration-200 max-w-full max-h-full flex items-center justify-center"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`
              }}
            >
              <img
                src={lightbox.url}
                alt="Document Preview"
                className="max-w-[85vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
              />
            </div>
          </div>

          {/* Bottom Bar Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 border border-white/10 backdrop-blur-md px-5 py-2 rounded-full text-xs font-mono text-slate-300 flex items-center gap-3">
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <span>·</span>
            <span>Rotation: {rotation}°</span>
            <span>·</span>
            <button
              onClick={() => copyToClipboard(lightbox.url, 'Photo URL')}
              className="text-primary hover:underline font-sans font-semibold flex items-center gap-1"
            >
              <Copy className="h-3 w-3" /> Copy Photo URL
            </button>
          </div>
        </div>
      )}

      {/* KYC DETAIL & REVIEW MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass max-w-2xl w-full rounded-3xl border border-border/50 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/30">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Customer Profile & KYC Review
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Session ID: {selectedCustomer.session_id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportCustomerPDF(selectedCustomer)}
                  className="gap-1.5 text-xs rounded-xl border-primary/40 text-primary hover:bg-primary/10"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomer(null)}
                  className="h-8 w-8 p-0 rounded-full hover:bg-rose-500/20 hover:text-rose-400"
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-card/60 border border-border/40">
                <span className="text-xs font-bold uppercase text-muted-foreground">Current KYC Status</span>
                {renderStatusBadge(selectedCustomer.kyc_status)}
              </div>

              {/* Customer Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-card/40 border border-border/30">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Full Name</div>
                  <div className="text-sm font-bold mt-0.5 text-foreground">{selectedCustomer.full_name || 'Not provided'}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-card/40 border border-border/30">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Phone / WhatsApp</div>
                  <div className="text-sm font-bold mt-0.5 font-mono text-foreground">{selectedCustomer.whatsapp_number || selectedCustomer.session_id}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-card/40 border border-border/30">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Email Address</div>
                  <div className="text-sm font-bold mt-0.5 text-foreground">{selectedCustomer.email || 'Not provided'}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-card/40 border border-border/30">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Nationality / Country</div>
                  <div className="text-sm font-bold mt-0.5 text-foreground">{selectedCustomer.country || 'Not specified'}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-card/40 border border-border/30">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">ID Document Type</div>
                  <div className="text-sm font-bold uppercase mt-0.5 text-primary">{selectedCustomer.id_type || 'Not provided'}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-card/40 border border-border/30">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">ID Document Number</div>
                  <div className="text-sm font-mono font-bold mt-0.5 text-foreground tracking-wider">{selectedCustomer.id_number || 'Not provided'}</div>
                </div>
              </div>

              {/* Photo Documents Inspection */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" /> Identity Verification Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Government ID Document Photo */}
                  <div className="p-4 rounded-2xl bg-card/40 border border-border/30 space-y-2">
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>Government ID Photo</span>
                      {selectedCustomer.id_document_url && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => downloadImage(selectedCustomer.id_document_url!, `ID_Photo_${(selectedCustomer.full_name || selectedCustomer.session_id).replace(/\s+/g, '_')}.jpg`)}
                            className="text-emerald-400 hover:underline text-[11px] flex items-center gap-1 font-semibold"
                            title="Download ID photo"
                          >
                            <Download className="h-3 w-3" /> Download
                          </button>
                          <button
                            onClick={() => openLightbox(selectedCustomer.id_document_url!, `Government ID: ${selectedCustomer.full_name || selectedCustomer.session_id}`, `ID Type: ${selectedCustomer.id_type || 'ID'}`)}
                            className="text-primary hover:underline text-[11px] flex items-center gap-1 font-semibold"
                          >
                            Preview <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {selectedCustomer.id_document_url ? (
                      <div
                        onClick={() => openLightbox(selectedCustomer.id_document_url!, `Government ID: ${selectedCustomer.full_name || selectedCustomer.session_id}`, `ID Type: ${selectedCustomer.id_type || 'ID'}`)}
                        className="aspect-video rounded-xl overflow-hidden border border-border/40 bg-black relative group cursor-pointer"
                      >
                        <img
                          src={selectedCustomer.id_document_url}
                          alt="Government ID"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1.5">
                          <Eye className="h-4 w-4" /> Click to Zoom
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1 bg-muted/10">
                        <FileText className="h-6 w-6 opacity-40" />
                        <span>No ID document uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* Selfie Photo */}
                  <div className="p-4 rounded-2xl bg-card/40 border border-border/30 space-y-2">
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>Selfie Photo</span>
                      {selectedCustomer.selfie_url && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => downloadImage(selectedCustomer.selfie_url!, `Selfie_${(selectedCustomer.full_name || selectedCustomer.session_id).replace(/\s+/g, '_')}.jpg`)}
                            className="text-emerald-400 hover:underline text-[11px] flex items-center gap-1 font-semibold"
                            title="Download selfie photo"
                          >
                            <Download className="h-3 w-3" /> Download
                          </button>
                          <button
                            onClick={() => openLightbox(selectedCustomer.selfie_url!, `Selfie Verification: ${selectedCustomer.full_name || selectedCustomer.session_id}`, `Session: ${selectedCustomer.session_id}`)}
                            className="text-primary hover:underline text-[11px] flex items-center gap-1 font-semibold"
                          >
                            Preview <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {selectedCustomer.selfie_url ? (
                      <div
                        onClick={() => openLightbox(selectedCustomer.selfie_url!, `Selfie Verification: ${selectedCustomer.full_name || selectedCustomer.session_id}`, `Session: ${selectedCustomer.session_id}`)}
                        className="aspect-video rounded-xl overflow-hidden border border-border/40 bg-black relative group cursor-pointer"
                      >
                        <img
                          src={selectedCustomer.selfie_url}
                          alt="Selfie Verification"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1.5">
                          <Eye className="h-4 w-4" /> Click to Zoom
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1 bg-muted/10">
                        <FileText className="h-6 w-6 opacity-40" />
                        <span>No selfie photo uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form fields for rejection and notes */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">
                    Rejection Reason (Required if rejecting):
                  </label>
                  <Input
                    placeholder="e.g. ID photo blurry, Name mismatch with ID document..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="bg-background/50 border-border/50 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">
                    Internal Admin Notes:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add internal notes about this customer..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full rounded-2xl bg-background/50 border border-border/50 p-3 text-xs focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-border/50 bg-muted/30 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={actionLoading || !rejectionReason.trim()}
                  onClick={() => handleUpdateStatus('rejected')}
                  className="gap-1.5 text-xs rounded-xl shadow-md"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Reject KYC
                </Button>
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('verified')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs rounded-xl shadow-md"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve & Verify
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
