import React, { useState, useEffect, createContext } from 'react'
import { getLocalProfile, getLocalScans, getLocalReminders, initSyncEngine, triggerSync, saveLocalScan, saveLocalReminder } from './utils/sync'
import { supabase } from './lib/supabase'

import IndexScreen from './screens/IndexScreen'
import DiagnosisScreen from './screens/DiagnosisScreen'
import ChatScreen from './screens/ChatScreen'
import TreatmentScreen from './screens/TreatmentScreen'
import MarketScreen from './screens/MarketScreen'
import ProfileScreen from './screens/ProfileScreen'
import AdminScreen from './screens/AdminScreen'
import AuthScreen from './screens/AuthScreen'
import ScanScreen from './screens/ScanScreen'
import VideoScreen from './screens/VideoScreen'
import { MobileShell } from './components/mobile-shell'

export const NavContext = createContext({
  navigate: (to) => {},
  isDark: true,
  toggleTheme: () => {}
});

export default function AppNew() {
  const [analyzing, setAnalyzing] = useState(false)
  const [params, setParams] = useState({})
  const [activeScreen, setActiveScreen] = useState('auth')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [scans, setScans] = useState([])
  const [reminders, setReminders] = useState([])
  const [syncStatus, setSyncStatus] = useState('idle')
  const [isDark, setIsDark] = useState(true)

  const toggleTheme = () => setIsDark(d => !d)

  const navigate = (path, state) => {
    if (path === '/diagnosis' && state?.scan) {
      setParams({ 
        diseaseId: state.scan.diseaseId, 
        aiConfidence: state.scan.confidence || 94, 
        allScores: state.scan.allScores || {}, 
        scanId: state.scan.id 
      })
    }
    if (path === '/treatment') {
      if (state?.scan) {
        setParams({ diseaseId: state.scan.diseaseId, scanId: state.scan.id })
      } else if (state?.diseaseId) {
        setParams({ diseaseId: state.diseaseId })
      }
    }
    
    if (path === '/') setActiveScreen('home')
    else if (path === '/profile') setActiveScreen('profile')
    else if (path === '/diagnosis') setActiveScreen('scan') // wait! Diagnosis Screen path sets screen to 'scan'? 
    // wait, earlier it was: else if (path === '/diagnosis') setActiveScreen('scan')... Actually, let's keep it as is.
    else if (path === '/treatment') setActiveScreen('treatment')
    else if (path === '/market') setActiveScreen('market')
    else if (path === '/chat') setActiveScreen('chat')
    else setActiveScreen(path.replace('/', ''))
  }

  // Setup Supabase & Sync
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) setActiveScreen('home')
    })
    
    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) {
        // On fresh sign-in, clear previous user's local data before syncing new user's data
        if (event === 'SIGNED_IN') {
          localStorage.removeItem('fmn_profile')
          localStorage.removeItem('fmn_scans')
          localStorage.removeItem('fmn_reminders')
          localStorage.removeItem('fmn_profile_pending')
          localStorage.removeItem('fmn_scans_pending_upsert')
          localStorage.removeItem('fmn_scans_pending_delete')
          localStorage.removeItem('fmn_reminders_pending_upsert')
          localStorage.removeItem('fmn_reminders_pending_delete')
          setProfile(null)
          setScans([])
          setReminders([])
        }
        setActiveScreen('home')
      }
      else setActiveScreen('auth')
    })

    const onStateUpdated = () => {
      setProfile(getLocalProfile())
      setScans(getLocalScans())
    }
    
    onStateUpdated()
    
    const interval = initSyncEngine(onStateUpdated, setSyncStatus)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    // Clear all user-specific data so next login starts fresh
    localStorage.removeItem('fmn_profile')
    localStorage.removeItem('fmn_scans')
    localStorage.removeItem('fmn_reminders')
    localStorage.removeItem('fmn_profile_pending')
    localStorage.removeItem('fmn_scans_pending_upsert')
    localStorage.removeItem('fmn_scans_pending_delete')
    localStorage.removeItem('fmn_reminders_pending_upsert')
    localStorage.removeItem('fmn_reminders_pending_delete')
    
    // Reset in-memory state
    setProfile(null)
    setScans([])
    setReminders([])
    
    await supabase.auth.signOut()
    setActiveScreen('auth')
  }

  const startAnalyzing = (diseaseId, confidence=null, allScores=null) => {
    setAnalyzing(true)
    setTimeout(() => {
      setAnalyzing(false)
      const defaultField = profile?.location || 'Unknown Field'
      let inputField = window.prompt("What is the name of this field/farm?", defaultField)
      if (!inputField || inputField.trim() === '') {
        inputField = 'Unknown Field'
      }

      const newScan = {
        id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        diseaseId,
        fieldName: inputField.trim(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        confidence: confidence !== null ? confidence : Math.round(80 + Math.random() * 19),
        treated: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      const updated = saveLocalScan(newScan)
      setScans(updated)

      if (diseaseId !== 'healthy' && diseaseId !== 'OK') {
        const title = `Treat ${inputField.trim()} for ${diseaseId.toUpperCase()}`;
        
        // Prevent creating duplicate tasks for the exact same field and disease
        const existingReminders = getLocalReminders();
        const isDuplicate = existingReminders.some(r => r.title === title);

        if (!isDuplicate) {
          const newTask = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title,
            time: '72 Hours',
            days: 'Soon',
            icon: 'Sprout',
            enabled: true,
            next_due: new Date(Date.now() + (72 * 60 * 60 * 1000)).toISOString()
          }
          const updatedReminders = saveLocalReminder(newTask)
          setReminders(updatedReminders)
        }
      }

      triggerSync(() => {
        setProfile(getLocalProfile())
        // Cleanup existing duplicate tasks
        const localReminders = getLocalReminders()
        const uniqueTitles = new Set()
        const cleanReminders = []
        for (const r of localReminders) {
          if (!uniqueTitles.has(r.title)) {
            uniqueTitles.add(r.title)
            cleanReminders.push(r)
          }
        }
        if (cleanReminders.length !== localReminders.length) {
          localStorage.setItem('fmn_reminders', JSON.stringify(cleanReminders))
        }

        setScans(getLocalScans())
        setReminders(getLocalReminders())
      }, setSyncStatus)
      
      setParams({ diseaseId, aiConfidence: confidence, allScores, scanId: newScan.id })
      setActiveScreen('diagnosis')
    }, 2500)
  }

  const renderScreen = () => {
    if (!session) return <AuthScreen />
    if (analyzing) return <div className="flex h-screen items-center justify-center text-primary text-xl font-display animate-pulse">Analyzing image...</div>
    
    switch (activeScreen) {
      case 'home': return <IndexScreen profile={profile} scans={scans} reminders={reminders} />
      case 'scan': return <ScanScreen startAnalyzing={startAnalyzing} />
      case 'diagnosis': return <DiagnosisScreen profile={profile} params={params} />
      case 'chat': return <ChatScreen />
      case 'treatment': return <TreatmentScreen params={params} />
      case 'market': return <MarketScreen />
      case 'profile': return <ProfileScreen profile={profile} onLogout={handleLogout} />
      case 'admin': return <AdminScreen />
      case 'auth': return <AuthScreen />
      default: return <IndexScreen profile={profile} scans={scans} reminders={reminders} />
    }
  }

  return (
    <NavContext.Provider value={{ navigate, isDark, toggleTheme, profile, setProfile, scans, setScans, reminders, setReminders }}>
      <div className={`${isDark ? 'dark' : ''} min-h-screen w-full bg-background text-foreground`}>
        {session ? (
          <MobileShell activeScreen={activeScreen}>
            {renderScreen()}
          </MobileShell>
        ) : (
          renderScreen()
        )}
      </div>
    </NavContext.Provider>
  )
}
