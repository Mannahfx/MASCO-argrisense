import React, { useState, useEffect, createContext } from 'react'
import { getLocalProfile, getLocalScans, initSyncEngine, triggerSync, saveLocalScan } from './utils/sync'
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
import { MobileShell } from './components/mobile-shell'

export const NavContext = createContext({
  navigate: (to) => {}
});

export default function AppNew() {
  const [analyzing, setAnalyzing] = useState(false)
  const [params, setParams] = useState({})
  const [activeScreen, setActiveScreen] = useState('auth')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [scans, setScans] = useState([])
  const [syncStatus, setSyncStatus] = useState('idle')

  const navigate = (path) => {
    if (path === '/') setActiveScreen('home')
    else if (path === '/profile') setActiveScreen('profile')
    else if (path === '/diagnosis') setActiveScreen('scan')
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
    
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) setActiveScreen('home')
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
      triggerSync(() => {
        setProfile(getLocalProfile())
        setScans(getLocalScans())
      }, setSyncStatus)
      
      setParams({ diseaseId, aiConfidence: confidence, allScores, scanId: newScan.id })
      setActiveScreen('diagnosis')
    }, 2500)
  }

  const renderScreen = () => {
    if (!session) return <AuthScreen />
    if (analyzing) return <div className="flex h-screen items-center justify-center text-primary text-xl font-display animate-pulse">Analyzing image...</div>
    
    switch (activeScreen) {
      case 'home': return <IndexScreen profile={profile} scans={scans} />
      case 'scan': return <ScanScreen startAnalyzing={startAnalyzing} />
      case 'diagnosis': return <DiagnosisScreen profile={profile} params={params} />
      case 'chat': return <ChatScreen />
      case 'treatment': return <TreatmentScreen />
      case 'market': return <MarketScreen />
      case 'profile': return <ProfileScreen profile={profile} onLogout={handleLogout} />
      case 'admin': return <AdminScreen />
      case 'auth': return <AuthScreen />
      default: return <IndexScreen profile={profile} scans={scans} />
    }
  }

  return (
    <NavContext.Provider value={{ navigate }}>
      <div className="dark h-[100dvh] w-full bg-background text-foreground overflow-hidden">
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
