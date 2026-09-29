import { useState } from 'react';
import { account } from '../../api/store';
import { errorMessage, fieldErrors } from '../../api/client';
import useAsync from '../../utils/useAsync';
import { useToast } from '../../components/Toast';
import { EmptyState, ErrorState, PageLoader } from '../../components/States';

const EMPTY = { label: '', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', country: 'United Arab Emirates', postalCode: '', isDefault: false };
const FIELDS = [
  ['label', 'Label (e.g. Home)'], ['fullName', 'Full name *'], ['phone', 'Phone'], ['line1', 'Address line 1 *'],
  ['line2', 'Address line 2'], ['city', 'City *'], ['state', 'Emirate / State'], ['country', 'Country *'], ['postalCode', 'Postal code'],
];

/** Add / edit form. Calls onSaved with the full address list returned by the API. */
export function AddressForm({ initial, onSaved, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    const body = Object.fromEntries(Object.entries(form).filter(([k]) => k in EMPTY));
    try {
      const { data } = initial?._id ? await account.updateAddress(initial._id, body) : await account.addAddress(body);
      toast.success('Address saved');
      onSaved(data);
    } catch (err) {
      setErrors(fieldErrors(err)); toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <form className="address-form" onSubmit={save}>
      <div className="form-grid">
        {FIELDS.map(([k, l]) => (
          <label key={k} className="field"><span>{l}</span>
            <input value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            {errors[k] && <small className="error">{errors[k]}</small>}
          </label>
        ))}
      </div>
      <label className="check"><input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />Set as default</label>
      <div className="row-actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
        {onCancel && <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

export default function AddressesPage() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(() => account.addresses(), []);
  const [editing, setEditing] = useState(null); // null | 'new' | address

  const remove = async (id) => {
    try { setData((await account.removeAddress(id)).data); toast.success('Address removed'); } catch (err) { toast.error(errorMessage(err)); }
  };
  const saved = (list) => { setData(list); setEditing(null); };

  return (
    <div className="stack">
      <div className="panel__head">
        <h1 className="page__title">Addresses</h1>
        {!editing && <button type="button" className="btn btn--outline btn--sm" onClick={() => setEditing('new')}>+ Add address</button>}
      </div>
      {editing && <div className="card panel"><AddressForm initial={editing === 'new' ? undefined : editing} onSaved={saved} onCancel={() => setEditing(null)} /></div>}
      {loading && !data && <PageLoader />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.length === 0 && !editing && <EmptyState title="No saved addresses" text="Add one to speed up checkout." />}
      <div className="grid grid--addresses">
        {data?.map((a) => (
          <div key={a._id} className="card panel address">
            <div className="panel__head"><strong>{a.label || a.fullName}</strong>{a.isDefault && <span className="pill">Default</span>}</div>
            <p className="small">{a.fullName}{a.phone ? ` · ${a.phone}` : ''}</p>
            <p className="small muted">{[a.line1, a.line2, a.city, a.state, a.country, a.postalCode].filter(Boolean).join(', ')}</p>
            <div className="row-actions">
              <button type="button" className="link-btn" onClick={() => setEditing(a)}>Edit</button>
              <button type="button" className="link-btn danger" onClick={() => remove(a._id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
