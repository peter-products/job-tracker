import { useState, useEffect, useCallback } from 'react'

const API = 'http://localhost:3457/api'

const STAGES = ['Saved', 'Applied', 'Recruiter Screen', 'Interview', 'Final Round', 'Offer', 'Rejected', 'Pass']
const STAGE_COLORS = {
  'Saved': 'bg-gray-100 text-gray-700',
  'Applied': 'bg-blue-100 text-blue-700',
  'Recruiter Screen': 'bg-yellow-100 text-yellow-700',
  'Interview': 'bg-purple-100 text-purple-700',
  'Final Round': 'bg-indigo-100 text-indigo-700',
  'Offer': 'bg-green-100 text-green-700',
  'Rejected': 'bg-red-100 text-red-600',
  'Pass': 'bg-orange-100 text-orange-700',
}

const EMPTY_FORM = {
  title: '', company: '', url: '', date_posted: '', salary_range: '',
  role_category: '', company_stage: '', company_size: '', location: '',
  remote_type: '', fit_notes: '', recruiter_contact: '',
  connections_first: '', connections_second: 0,
  interview_stage: 'Saved', applied: false
}

function Badge({ stage }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[stage] || 'bg-gray-100 text-gray-600'}`}>
      {stage}
    </span>
  )
}

function Modal({ job, onClose, onSave, categories }) {
  const [form, setForm] = useState(job || EMPTY_FORM)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.title || !form.company) return alert('Title and Company are required.')
    onSave(form)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{job?.id ? 'Edit Job' : 'Add Job'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <Field label="Job Title *" value={form.title} onChange={v => set('title', v)} className="col-span-2" />
          <Field label="Company *" value={form.company} onChange={v => set('company', v)} />
          <Field label="URL" value={form.url} onChange={v => set('url', v)} placeholder="https://..." />
          <Field label="Date Posted" value={form.date_posted} onChange={v => set('date_posted', v)} placeholder="e.g. Apr 1, 2026" />
          <Field label="Salary Range" value={form.salary_range} onChange={v => set('salary_range', v)} placeholder="e.g. $200K–$240K" />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role Category</label>
            <input
              list="categories"
              value={form.role_category}
              onChange={e => set('role_category', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Data PM"
            />
            <datalist id="categories">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Interview Stage</label>
            <select value={form.interview_stage} onChange={e => set('interview_stage', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <Field label="Company Stage" value={form.company_stage} onChange={v => set('company_stage', v)} placeholder="e.g. Series B, Public" />
          <Field label="Company Size" value={form.company_size} onChange={v => set('company_size', v)} placeholder="e.g. 200–500" />
          <Field label="Location" value={form.location} onChange={v => set('location', v)} placeholder="e.g. Seattle, WA" />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Remote Type</label>
            <select value={form.remote_type} onChange={e => set('remote_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">—</option>
              <option>Remote</option>
              <option>Hybrid</option>
              <option>On-site</option>
            </select>
          </div>

          <Field label="Recruiter Contact" value={form.recruiter_contact} onChange={v => set('recruiter_contact', v)} placeholder="Name / email / LinkedIn" className="col-span-2" />
          <Field label="1st Degree Connections" value={form.connections_first} onChange={v => set('connections_first', v)} placeholder="e.g. Jane Smith (Sr. PM)" className="col-span-2" />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">2nd Degree Count</label>
            <input type="number" min="0" value={form.connections_second} onChange={e => set('connections_second', parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="applied" checked={!!form.applied} onChange={e => set('applied', e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="applied" className="text-sm text-gray-700">Applied</label>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Fit Notes</label>
            <textarea value={form.fit_notes} onChange={e => set('fit_notes', e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Why this role fits, concerns, talking points..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">Save</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ''}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}

export default function App() {
  const [jobs, setJobs] = useState([])
  const [modal, setModal] = useState(null) // null | 'add' | job object
  const [filterStage, setFilterStage] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterApplied, setFilterApplied] = useState('All')
  const [filterConnections, setFilterConnections] = useState('All')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const load = useCallback(() => {
    fetch(`${API}/jobs`).then(r => r.json()).then(setJobs).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const categories = [...new Set(jobs.map(j => j.role_category).filter(Boolean))]

  const save = async (form) => {
    if (form.id) {
      await fetch(`${API}/jobs/${form.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    } else {
      await fetch(`${API}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    setModal(null)
    load()
  }

  const toggleApplied = async (job) => {
    await fetch(`${API}/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applied: job.applied ? 0 : 1 })
    })
    load()
  }

  const deleteJob = async (id) => {
    await fetch(`${API}/jobs/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    load()
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = jobs
    .filter(j => filterStage === 'All' || j.interview_stage === filterStage)
    .filter(j => filterCategory === 'All' || j.role_category === filterCategory)
    .filter(j => filterApplied === 'All' || (filterApplied === 'Applied' ? j.applied : !j.applied))
    .filter(j => filterConnections === 'All' || (filterConnections === '1st' ? j.connections_first : j.connections_second > 0))
    .filter(j => !search || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let va = a[sortKey] ?? '', vb = b[sortKey] ?? ''
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })

  const SortTh = ({ label, k }) => (
    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
      onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  const stats = {
    total: jobs.length,
    applied: jobs.filter(j => j.applied).length,
    withConnections: jobs.filter(j => j.connections_first).length,
    inProgress: jobs.filter(j => !['Saved', 'Rejected', 'Pass'].includes(j.interview_stage)).length,
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans" style={{ all: 'revert' }}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="w-full flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Job Tracker</h1>
              <p className="text-sm text-gray-500">Peter Overman · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
            <button onClick={() => setModal('add')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              + Add Job
            </button>
          </div>
        </div>

        <div className="w-full px-4 py-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Roles', value: stats.total },
              { label: 'Applied', value: stats.applied },
              { label: 'Active Pipeline', value: stats.inProgress },
              { label: 'With Connections', value: stats.withConnections },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-4 flex flex-wrap gap-3 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, company, location..."
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500" />

            <FilterSelect label="Stage" value={filterStage} onChange={setFilterStage} options={['All', ...STAGES]} />
            <FilterSelect label="Category" value={filterCategory} onChange={setFilterCategory} options={['All', ...categories]} />
            <FilterSelect label="Applied" value={filterApplied} onChange={setFilterApplied} options={['All', 'Applied', 'Not Applied']} />
            <FilterSelect label="Connections" value={filterConnections} onChange={setFilterConnections} options={['All', '1st', '2nd+']} />

            <span className="ml-auto text-sm text-gray-400">{filtered.length} of {jobs.length} roles</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="px-2 py-2 w-8"></th>
                  <SortTh label="Title" k="title" />
                  <SortTh label="Company" k="company" />
                  <SortTh label="Stage" k="interview_stage" />
                  <SortTh label="Category" k="role_category" />
                  <SortTh label="Remote" k="remote_type" />
                  <SortTh label="Salary" k="salary_range" />
                  <SortTh label="Co. Stage" k="company_stage" />
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Connections</th>
                  <SortTh label="Posted" k="date_posted" />
                  <SortTh label="Added" k="created_at" />
                  <th className="px-2 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-12 text-gray-400">No roles yet. Click + Add Job to get started.</td></tr>
                )}
                {filtered.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50 group">
                    <td className="px-2 py-2">
                      <input type="checkbox" checked={!!job.applied} onChange={() => toggleApplied(job)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer" title="Mark as applied" />
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 max-w-[200px]">
                      {job.url
                        ? <a href={job.url} target="_blank" rel="noreferrer" className="hover:text-blue-600 hover:underline">{job.title}</a>
                        : job.title}
                    </td>
                    <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{job.company}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <select value={job.interview_stage || 'Saved'}
                        onChange={async e => {
                          await fetch(`${API}/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interview_stage: e.target.value }) })
                          load()
                        }}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${STAGE_COLORS[job.interview_stage] || 'bg-gray-100 text-gray-600'}`}>
                        {STAGES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{job.role_category || '—'}</td>
                    <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{job.remote_type || '—'}</td>
                    <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{job.salary_range || '—'}</td>
                    <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{job.company_stage || '—'}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {job.connections_first
                        ? <span className="text-green-700 font-medium">1st: {job.connections_first}</span>
                        : job.connections_second > 0
                          ? <span className="text-yellow-700">{job.connections_second} 2nd</span>
                          : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{job.date_posted || '—'}</td>
                    <td className="px-2 py-2 text-gray-400 whitespace-nowrap">{job.created_at ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal(job)} className="text-gray-400 hover:text-blue-600 text-xs" title="Edit">✏️</button>
                        <button onClick={() => setDeleteConfirm(job.id)} className="text-gray-400 hover:text-red-500 text-xs" title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {modal && (
          <Modal
            job={modal === 'add' ? null : modal}
            onClose={() => setModal(null)}
            onSave={save}
            categories={categories}
          />
        )}

        {/* Delete Confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
              <p className="text-gray-800 font-medium mb-4">Remove this role from your tracker?</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button onClick={() => deleteJob(deleteConfirm)} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500">{label}:</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}
