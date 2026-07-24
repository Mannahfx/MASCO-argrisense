import { supabase } from '../lib/supabase'

// --- Local Storage Helpers ---
export function getLocalProfile() {
  const data = localStorage.getItem('fmn_profile');
  return data ? JSON.parse(data) : {
    full_name: '',
    phone: '',
    location: '',
    state: '',
    lga: '',
    farm_size: '',
    crops: '',
    role: 'user',
    updated_at: new Date().toISOString()
  };
}

export function getLocalScans() {
  const data = localStorage.getItem('fmn_scans');
  return data ? JSON.parse(data) : [];
}

export function getLocalReminders() {
  const data = localStorage.getItem('fmn_reminders');
  return data ? JSON.parse(data) : [];
}

// --- Pending Queues Helpers ---
function getPendingQueue(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function addToPendingQueue(key, item) {
  const queue = getPendingQueue(key);
  if (!queue.find(q => q.id === item.id)) {
    queue.push(item);
    localStorage.setItem(key, JSON.stringify(queue));
  }
}

function removeFromPendingQueue(key, id) {
  const queue = getPendingQueue(key);
  const filtered = queue.filter(q => q.id !== id);
  localStorage.setItem(key, JSON.stringify(filtered));
}

// --- Client Actions updating Local State & Queuing Sync ---

export function saveLocalProfile(profile) {
  const updated = { ...profile, updated_at: new Date().toISOString() };
  localStorage.setItem('fmn_profile', JSON.stringify(updated));
  localStorage.setItem('fmn_profile_pending', 'true');
  return updated;
}

export function saveLocalScan(scan) {
  const scans = getLocalScans();
  const scanIndex = scans.findIndex(s => s.id === scan.id);
  const updatedScan = { ...scan, updated_at: new Date().toISOString() };
  
  if (scanIndex > -1) {
    scans[scanIndex] = updatedScan;
  } else {
    scans.unshift(updatedScan);
  }
  
  localStorage.setItem('fmn_scans', JSON.stringify(scans));
  
  const upsertQueue = getPendingQueue('fmn_scans_pending_upsert');
  const existingIdx = upsertQueue.findIndex(u => u.id === scan.id);
  if (existingIdx > -1) {
    upsertQueue[existingIdx] = updatedScan;
  } else {
    upsertQueue.push(updatedScan);
  }
  localStorage.setItem('fmn_scans_pending_upsert', JSON.stringify(upsertQueue));
  removeFromPendingQueue('fmn_scans_pending_delete', scan.id);
  return scans;
}

export function deleteLocalScan(scanId) {
  const scans = getLocalScans();
  const filtered = scans.filter(s => s.id !== scanId);
  localStorage.setItem('fmn_scans', JSON.stringify(filtered));

  const upsertQueue = getPendingQueue('fmn_scans_pending_upsert').filter(u => u.id !== scanId);
  localStorage.setItem('fmn_scans_pending_upsert', JSON.stringify(upsertQueue));
  addToPendingQueue('fmn_scans_pending_delete', { id: scanId });
  
  return filtered;
}

export function saveLocalReminder(reminder) {
  const reminders = getLocalReminders();
  const index = reminders.findIndex(r => r.id === reminder.id);
  const updatedReminder = { ...reminder, updated_at: new Date().toISOString() };

  if (index > -1) {
    reminders[index] = updatedReminder;
  } else {
    reminders.unshift(updatedReminder);
  }

  localStorage.setItem('fmn_reminders', JSON.stringify(reminders));

  const upsertQueue = getPendingQueue('fmn_reminders_pending_upsert');
  const existingIdx = upsertQueue.findIndex(u => u.id === reminder.id);
  if (existingIdx > -1) {
    upsertQueue[existingIdx] = updatedReminder;
  } else {
    upsertQueue.push(updatedReminder);
  }
  localStorage.setItem('fmn_reminders_pending_upsert', JSON.stringify(upsertQueue));
  removeFromPendingQueue('fmn_reminders_pending_delete', reminder.id);
  return reminders;
}

export function deleteLocalReminder(reminderId) {
  const reminders = getLocalReminders();
  const filtered = reminders.filter(r => r.id !== reminderId);
  localStorage.setItem('fmn_reminders', JSON.stringify(filtered));

  const upsertQueue = getPendingQueue('fmn_reminders_pending_upsert').filter(u => u.id !== reminderId);
  localStorage.setItem('fmn_reminders_pending_upsert', JSON.stringify(upsertQueue));
  addToPendingQueue('fmn_reminders_pending_delete', { id: reminderId });

  return filtered;
}

// --- Sync Coordination Logic (Supabase) ---
let isSyncing = false;

export async function triggerSync(onStateUpdated, onSyncStatusChanged) {
  if (isSyncing) return;
  if (!navigator.onLine) {
    onSyncStatusChanged?.('offline');
    return;
  }

  isSyncing = true;
  onSyncStatusChanged?.('syncing');

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      isSyncing = false;
      return;
    }

    const userId = user.id;

    // 1. Process Profile Pending Update
    const profilePending = localStorage.getItem('fmn_profile_pending') === 'true';
    if (profilePending) {
      const profile = getLocalProfile();
      await supabase.from('profiles').upsert({ id: userId, ...profile });
      localStorage.removeItem('fmn_profile_pending');
    }

    // 2. Process Pending Deletions
    const scansDelete = getPendingQueue('fmn_scans_pending_delete');
    if (scansDelete.length > 0) {
      const ids = scansDelete.map(s => s.id);
      await supabase.from('scans').delete().in('id', ids);
      localStorage.removeItem('fmn_scans_pending_delete');
    }

    const remindersDelete = getPendingQueue('fmn_reminders_pending_delete');
    if (remindersDelete.length > 0) {
      const ids = remindersDelete.map(r => r.id);
      await supabase.from('reminders').delete().in('id', ids);
      localStorage.removeItem('fmn_reminders_pending_delete');
    }

    // 3. Process Pending Upserts
    const scansUpsert = getPendingQueue('fmn_scans_pending_upsert');
    if (scansUpsert.length > 0) {
      await supabase.from('scans').upsert(scansUpsert.map(s => ({ ...s, user_id: userId })));
      localStorage.removeItem('fmn_scans_pending_upsert');
    }

    const remindersUpsert = getPendingQueue('fmn_reminders_pending_upsert');
    if (remindersUpsert.length > 0) {
      await supabase.from('reminders').upsert(remindersUpsert.map(r => ({ ...r, user_id: userId })));
      localStorage.removeItem('fmn_reminders_pending_upsert');
    }

    // 4. Fetch Fresh Data from Supabase
    const [profRes, scanRes, remRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('scans').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('reminders').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    ]);

    const profileData = profRes.data || getLocalProfile();
    const scansData = scanRes.data || [];
    const remindersData = remRes.data || [];

    // 5. Save to local storage
    localStorage.setItem('fmn_profile', JSON.stringify(profileData));
    localStorage.setItem('fmn_scans', JSON.stringify(scansData));
    localStorage.setItem('fmn_reminders', JSON.stringify(remindersData));

    // Trigger UI refresh
    onStateUpdated?.({
      profile: profileData,
      scans: scansData,
      reminders: remindersData
    });

    onSyncStatusChanged?.('synced');
  } catch (error) {
    console.warn('Sync failed:', error);
    onSyncStatusChanged?.('error');
  } finally {
    isSyncing = false;
  }
}

export async function fetchFullState(onStateUpdated, onSyncStatusChanged) {
  // Can just reuse triggerSync since it does exactly what we want without any pending data
  return triggerSync(onStateUpdated, onSyncStatusChanged);
}

export function initSyncEngine(onStateUpdated, onSyncStatusChanged) {
  window.addEventListener('online', () => {
    console.log('Device back online, triggering sync...');
    triggerSync(onStateUpdated, onSyncStatusChanged);
  });

  window.addEventListener('offline', () => {
    console.log('Device went offline');
    onSyncStatusChanged?.('offline');
  });

  if (navigator.onLine) {
    triggerSync(onStateUpdated, onSyncStatusChanged);
  } else {
    onSyncStatusChanged?.('offline');
  }
}

// --- Admin Actions ---
export async function fetchAllUsersAndStats() {
  try {
    const { data: users, error: err1 } = await supabase.from('profiles').select('*');
    const { data: scans, error: err2 } = await supabase.from('scans').select('*');
    if (err1 || err2) throw err1 || err2;
    return { users, scans };
  } catch (err) {
    console.error('Failed to fetch admin data', err);
    return { users: [], scans: [] };
  }
}
