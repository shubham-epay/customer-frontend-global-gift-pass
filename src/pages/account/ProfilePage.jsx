import { useState } from 'react';
import { account, auth } from '../../api/store';
import { errorMessage, fieldErrors } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';

function ProfileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', avatarUrl: user?.avatarUrl || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const { data } = await account.updateProfile(form);
      const { addresses, ...u } = data;
      setUser(u);
      toast.success('Profile updated');
    } catch (err) {
      setErrors(fieldErrors(err)); toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <form className="card panel" onSubmit={save}>
      <h3>Personal details</h3>
      <div className="form-grid">
        <label className="field"><span>Full name</span><input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />{errors.name && <small className="error">{errors.name}</small>}</label>
        <label className="field"><span>Email</span><input value={user?.email || ''} disabled /></label>
        <label className="field"><span>Phone</span><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />{errors.phone && <small className="error">{errors.phone}</small>}</label>
        <label className="field"><span>Avatar URL</span><input type="url" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />{errors.avatarUrl && <small className="error">{errors.avatarUrl}</small>}</label>
      </div>
      <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}

function PasswordForm() {
  const { applySession } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const { data } = await auth.changePassword(form);
      applySession(data); // other sessions are revoked; this one gets fresh tokens
      setForm({ currentPassword: '', newPassword: '' });
      toast.success('Password changed');
    } catch (err) {
      setErrors(fieldErrors(err)); toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <form className="card panel" onSubmit={save}>
      <h3>Change password</h3>
      <div className="form-grid">
        <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />{errors.currentPassword && <small className="error">{errors.currentPassword}</small>}</label>
        <label className="field"><span>New password</span><input type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />{errors.newPassword && <small className="error">{errors.newPassword}</small>}</label>
      </div>
      <button type="submit" className="btn btn--outline" disabled={busy || !form.currentPassword || !form.newPassword}>Update password</button>
    </form>
  );
}

export default function ProfilePage() {
  return (
    <div className="stack">
      <h1 className="page__title">My profile</h1>
      <ProfileForm />
      <PasswordForm />
    </div>
  );
}
