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
    role: 'client',
    updated_at: new Date().toISOString(),
    cart: []
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

    // 0. Ensure user profile exists to prevent Foreign Key errors when saving scans
    const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', userId).single();
    if (!existingProfile) {
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: user.user_metadata?.full_name || user.email,
        role: user.user_metadata?.role || 'client'
      });
    }

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
      const { error } = await supabase.from('scans').upsert(scansUpsert.map(s => ({
        id: s.id,
        user_id: userId,
        disease_id: s.diseaseId,
        field: s.fieldName || s.field,
        date: s.date,
        treated: s.treated,
        confidence: s.confidence,
        all_scores: s.allScores || {},
        created_at: new Date(s.createdAt).toISOString(),
        updated_at: new Date(s.updatedAt).toISOString()
      })));
      if (error) console.error('Failed to upsert scans:', error);
      else localStorage.removeItem('fmn_scans_pending_upsert');
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

    let profileData = profRes.data;
    if (!profileData) {
      profileData = { 
        ...getLocalProfile(), 
        full_name: user.user_metadata?.full_name || '',
        role: user.user_metadata?.role || 'client'
      };
    } else {
      if (!profileData.cart) profileData.cart = getLocalProfile().cart || [];
    }
    let scansData = (scanRes.data || []).map(s => ({
      id: s.id,
      diseaseId: s.disease_id,
      fieldName: s.field,
      date: s.date,
      treated: s.treated,
      confidence: s.confidence,
      allScores: s.all_scores,
      createdAt: new Date(s.created_at).getTime(),
      updatedAt: new Date(s.updated_at).getTime()
    }));
    
    // Prevent UI data loss: if there are pending local scans that failed to upload, merge them in
    const pendingScans = getPendingQueue('fmn_scans_pending_upsert');
    if (pendingScans.length > 0) {
      const pendingMap = new Map(pendingScans.map(s => [s.id, s]));
      const serverOnlyScans = scansData.filter(s => !pendingMap.has(s.id));
      scansData = [...pendingScans, ...serverOnlyScans];
      // sort by createdAt desc
      scansData.sort((a, b) => b.createdAt - a.createdAt);
    }
    let remindersData = remRes.data || [];
    const pendingReminders = getPendingQueue('fmn_reminders_pending_upsert');
    if (pendingReminders.length > 0) {
      const pendingMap = new Map(pendingReminders.map(r => [r.id, r]));
      const serverOnlyReminders = remindersData.filter(r => !pendingMap.has(r.id));
      remindersData = [...pendingReminders, ...serverOnlyReminders];
      remindersData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

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
  const debug = [];
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      debug.push('No authenticated user found');
      return { users: [], scans: [], debug };
    }
    debug.push('Logged in as: ' + (user.email || user.id));
    debug.push('Role in metadata: ' + (user.user_metadata?.role || 'none'));

    // Ensure the current admin has a profile row (in case trigger never fired)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      const metaRole = user.user_metadata?.role || 'admin';
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email,
        role: metaRole
      });
      debug.push('Created missing admin profile row');
    }

    const { data: users, error: err1 } = await supabase.from('profiles').select('*');
    const { data: rawScans, error: err2 } = await supabase.from('scans').select('*');
    const scans = (rawScans || []).map(s => ({
      id: s.id,
      diseaseId: s.disease_id,
      fieldName: s.field,
      date: s.date,
      treated: s.treated,
      createdAt: new Date(s.created_at).getTime(),
      updatedAt: new Date(s.updated_at).getTime(),
      user_id: s.user_id
    }));

    if (err1) {
      debug.push('❌ PROFILES ERROR: ' + err1.message + ' (code: ' + err1.code + ')');
    } else {
      debug.push('✅ Profiles loaded: ' + (users?.length || 0) + ' rows');
    }

    if (err2) {
      debug.push('❌ SCANS ERROR: ' + err2.message + ' (code: ' + err2.code + ')');
    } else {
      debug.push('✅ Scans loaded: ' + (scans?.length || 0) + ' rows');
    }

    return { users: users || [], scans: scans || [], debug };
  } catch (err) {
    debug.push('❌ FATAL: ' + err.message);
    return { users: [], scans: [], debug };
  }
}
