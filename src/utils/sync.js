// Client-side synchronization utility for local-first state and backend sync

const API_BASE = 'http://localhost:5000/api';

// --- Local Storage Helpers ---
export function getLocalProfile() {
  const data = localStorage.getItem('fmn_profile');
  return data ? JSON.parse(data) : {
    name: 'Oluwayinka Olayinka Paul',
    phone: '+234 8101773538',
    location: 'Ogun State, FUNAAB',
    state: 'Ogun State',
    lga: 'Abeokuta South',
    farmSize: '3.5 Hectares',
    crops: 'Cassava, Maize, Soybean',
    updatedAt: Date.now()
  };
}

export function getLocalScans() {
  const data = localStorage.getItem('fmn_scans');
  // Return default mock history if nothing in local storage yet
  if (!data) {
    const defaultHistory = [
      { id: 'h1', date: 'Mar 10, 2026', diseaseId: 'cmd', field: 'North Field A', treated: true, createdAt: Date.now() - 5000000, updatedAt: Date.now() - 5000000 },
      { id: 'h2', date: 'Mar 5, 2026', diseaseId: 'healthy', field: 'South Field B', treated: false, createdAt: Date.now() - 10000000, updatedAt: Date.now() - 10000000 },
      { id: 'h3', date: 'Feb 28, 2026', diseaseId: 'cbb', field: 'East Plots', treated: true, createdAt: Date.now() - 15000000, updatedAt: Date.now() - 15000000 }
    ];
    localStorage.setItem('fmn_scans', JSON.stringify(defaultHistory));
    return defaultHistory;
  }
  return JSON.parse(data);
}

export function getLocalReminders() {
  const data = localStorage.getItem('fmn_reminders');
  if (!data) {
    const defaultReminders = [
      { id: '1', title: 'Apply FMN BioGuard Spray', time: '07:00 AM', days: 'Mon, Thu', icon: '💧', enabled: true, nextDue: 'Today', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '2', title: 'Inspect for Whitefly', time: '06:30 AM', days: 'Wed, Sat', icon: '👁️', enabled: true, nextDue: 'Tomorrow', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '3', title: 'Apply FMN NPK Fertilizer', time: '08:00 AM', days: 'Mon', icon: '🌿', enabled: true, nextDue: 'Mon, Mar 18', createdAt: Date.now(), updatedAt: Date.now() }
    ];
    localStorage.setItem('fmn_reminders', JSON.stringify(defaultReminders));
    return defaultReminders;
  }
  return JSON.parse(data);
}

// --- Pending Queues Helpers ---
function getPendingQueue(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function addToPendingQueue(key, item) {
  const queue = getPendingQueue(key);
  // Avoid duplicates
  if (!queue.includes(item)) {
    queue.push(item);
    localStorage.setItem(key, JSON.stringify(queue));
  }
}

function removeFromPendingQueue(key, item) {
  const queue = getPendingQueue(key);
  const filtered = queue.filter(q => q !== item);
  localStorage.setItem(key, JSON.stringify(filtered));
}

// --- Client Actions updating Local State & Queuing Sync ---

export function saveLocalProfile(profile) {
  const updated = { ...profile, updatedAt: Date.now() };
  localStorage.setItem('fmn_profile', JSON.stringify(updated));
  localStorage.setItem('fmn_profile_pending', 'true');
  return updated;
}

export function saveLocalScan(scan) {
  const scans = getLocalScans();
  const scanIndex = scans.findIndex(s => s.id === scan.id);
  const updatedScan = { ...scan, updatedAt: Date.now() };
  
  if (scanIndex > -1) {
    scans[scanIndex] = updatedScan;
  } else {
    scans.unshift(updatedScan); // New scans go to the top
  }
  
  localStorage.setItem('fmn_scans', JSON.stringify(scans));
  
  // Add to pending upsert queue
  const upsertQueue = getPendingQueue('fmn_scans_pending_upsert');
  const existingIdx = upsertQueue.findIndex(u => u.id === scan.id);
  if (existingIdx > -1) {
    upsertQueue[existingIdx] = updatedScan;
  } else {
    upsertQueue.push(updatedScan);
  }
  localStorage.setItem('fmn_scans_pending_upsert', JSON.stringify(upsertQueue));
  
  // Make sure it's not in the pending delete queue anymore
  removeFromPendingQueue('fmn_scans_pending_delete', scan.id);
  return scans;
}

export function deleteLocalScan(scanId) {
  const scans = getLocalScans();
  const filtered = scans.filter(s => s.id !== scanId);
  localStorage.setItem('fmn_scans', JSON.stringify(filtered));

  // Remove from pending upsert, add to pending delete
  const upsertQueue = getPendingQueue('fmn_scans_pending_upsert').filter(u => u.id !== scanId);
  localStorage.setItem('fmn_scans_pending_upsert', JSON.stringify(upsertQueue));
  addToPendingQueue('fmn_scans_pending_delete', scanId);
  
  return filtered;
}

export function saveLocalReminder(reminder) {
  const reminders = getLocalReminders();
  const index = reminders.findIndex(r => r.id === reminder.id);
  const updatedReminder = { ...reminder, updatedAt: Date.now() };

  if (index > -1) {
    reminders[index] = updatedReminder;
  } else {
    reminders.unshift(updatedReminder);
  }

  localStorage.setItem('fmn_reminders', JSON.stringify(reminders));

  // Add to pending upsert queue
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

  // Remove from pending upsert, add to pending delete
  const upsertQueue = getPendingQueue('fmn_reminders_pending_upsert').filter(u => u.id !== reminderId);
  localStorage.setItem('fmn_reminders_pending_upsert', JSON.stringify(upsertQueue));
  addToPendingQueue('fmn_reminders_pending_delete', reminderId);

  return filtered;
}

// --- Sync Coordination Logic ---
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
    // Read current pending queues
    const profilePending = localStorage.getItem('fmn_profile_pending') === 'true';
    const profile = profilePending ? getLocalProfile() : null;

    const scansUpsert = getPendingQueue('fmn_scans_pending_upsert');
    const scansDelete = getPendingQueue('fmn_scans_pending_delete');
    
    const remindersUpsert = getPendingQueue('fmn_reminders_pending_upsert');
    const remindersDelete = getPendingQueue('fmn_reminders_pending_delete');

    // Make the sync API request
    const response = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile,
        scans: { upsert: scansUpsert, delete: scansDelete },
        reminders: { upsert: remindersUpsert, delete: remindersDelete }
      })
    });

    if (!response.ok) throw new Error('Sync endpoint returned error');

    const result = await response.json();

    if (result.success) {
      // Clear pending queues on success
      if (profilePending) localStorage.removeItem('fmn_profile_pending');
      localStorage.removeItem('fmn_scans_pending_upsert');
      localStorage.removeItem('fmn_scans_pending_delete');
      localStorage.removeItem('fmn_reminders_pending_upsert');
      localStorage.removeItem('fmn_reminders_pending_delete');

      // Update local storage with the server's reconciled state
      if (result.profile) localStorage.setItem('fmn_profile', JSON.stringify(result.profile));
      localStorage.setItem('fmn_scans', JSON.stringify(result.scans));
      localStorage.setItem('fmn_reminders', JSON.stringify(result.reminders));

      // Trigger UI callback to refresh states
      onStateUpdated?.({
        profile: result.profile || getLocalProfile(),
        scans: result.scans,
        reminders: result.reminders
      });

      onSyncStatusChanged?.('synced');
    }
  } catch (error) {
    console.warn('Sync failed:', error);
    onSyncStatusChanged?.('error');
  } finally {
    isSyncing = false;
  }
}

// Initial state fetch from backend (to pull existing records when first going online)
export async function fetchFullState(onStateUpdated, onSyncStatusChanged) {
  if (!navigator.onLine) return;
  onSyncStatusChanged?.('syncing');
  try {
    const response = await fetch(`${API_BASE}/state`);
    if (!response.ok) throw new Error('Could not fetch server state');
    const result = await response.json();

    if (result.profile) localStorage.setItem('fmn_profile', JSON.stringify(result.profile));
    localStorage.setItem('fmn_scans', JSON.stringify(result.scans));
    localStorage.setItem('fmn_reminders', JSON.stringify(result.reminders));

    onStateUpdated?.({
      profile: result.profile || getLocalProfile(),
      scans: result.scans,
      reminders: result.reminders
    });
    onSyncStatusChanged?.('synced');
  } catch (err) {
    console.warn('Initial state fetch failed, using local storage:', err);
    onSyncStatusChanged?.('error');
  }
}

// Initialize sync engine triggers
export function initSyncEngine(onStateUpdated, onSyncStatusChanged) {
  // Listen for online events
  window.addEventListener('online', () => {
    console.log('Device back online, triggering sync...');
    triggerSync(onStateUpdated, onSyncStatusChanged);
  });

  window.addEventListener('offline', () => {
    console.log('Device went offline');
    onSyncStatusChanged?.('offline');
  });

  // Perform initial fetch/sync on app load
  if (navigator.onLine) {
    // If we have pending local changes, sync them, else do a clean state fetch
    const hasLocalPending = 
      localStorage.getItem('fmn_profile_pending') === 'true' ||
      getPendingQueue('fmn_scans_pending_upsert').length > 0 ||
      getPendingQueue('fmn_scans_pending_delete').length > 0 ||
      getPendingQueue('fmn_reminders_pending_upsert').length > 0 ||
      getPendingQueue('fmn_reminders_pending_delete').length > 0;

    if (hasLocalPending) {
      triggerSync(onStateUpdated, onSyncStatusChanged);
    } else {
      fetchFullState(onStateUpdated, onSyncStatusChanged);
    }
  } else {
    onSyncStatusChanged?.('offline');
  }
}
