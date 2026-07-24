import { useState, useEffect } from 'react'
import { DISEASES, PRODUCTS, DEALERS, REMINDERS, HISTORY } from './data'
import { 
  getLocalProfile, 
  getLocalScans, 
  getLocalReminders, 
  saveLocalProfile, 
  saveLocalScan, 
  deleteLocalScan, 
  saveLocalReminder, 
  deleteLocalReminder, 
  triggerSync, 
  initSyncEngine,
  fetchAllUsersAndStats 
} from './utils/sync'
import { supabase } from './lib/supabase'

// ── AI MODEL ─────────────────────────────────────────────────────────────────
const CLASS_MAP = { 0:'cbb', 1:'cbsd', 2:'cgm', 3:'cmd', 4:'healthy' }
let _model = null

async function loadModel() {
  if (_model) return _model
  
  const tf = window.tf
  if (tf) {
    try {
      class HardSilu extends tf.serialization.Serializable {
        static get className() { return 'hardSilu' }
        apply(x) {
          return tf.tidy(() => x.mul(tf.clipByValue(x.add(3), 0, 6)).div(6))
        }
        getConfig() { return {} }
      }
      tf.serialization.registerClass(HardSilu)
    } catch (e) {
      console.log('hardSilu registration skipped/already registered:', e)
    }

    try {
      class PatchedGlobalAveragePooling2D extends tf.layers.Layer {
        static get className() { return 'GlobalAveragePooling2D' }
        constructor(config) {
          super(config || {})
          this.keepdims = config.keepdims === true
          this.dataFormat = config.data_format || 'channels_last'
        }
        computeOutputShape(inputShape) {
          if (this.keepdims) {
            return [inputShape[0], 1, 1, inputShape[3]]
          }
          return [inputShape[0], inputShape[3]]
        }
        call(inputs, kwargs) {
          return tf.tidy(() => {
            const input = Array.isArray(inputs) ? inputs[0] : inputs
            const axes = this.dataFormat === 'channels_last' ? [1, 2] : [2, 3]
            return input.mean(axes, this.keepdims)
          })
        }
        getConfig() {
          const config = super.getConfig()
          config.keepdims = this.keepdims
          config.data_format = this.dataFormat
          return config
        }
      }
      tf.serialization.registerClass(PatchedGlobalAveragePooling2D)
      console.log('Registered keepdims-aware GlobalAveragePooling2D')
    } catch (e) {
      console.log('GlobalAveragePooling2D registration skipped/error:', e)
    }

    try {
      class HardSigmoidLayer extends tf.layers.Layer {
        static get className() { return 'HardSigmoidLayer' }
        constructor(config) {
          super(config || {})
        }
        computeOutputShape(inputShape) {
          return inputShape
        }
        call(inputs, kwargs) {
          return tf.tidy(() => {
            const x = Array.isArray(inputs) ? inputs[0] : inputs
            return tf.clipByValue(tf.div(tf.add(x, 3), 6), 0, 1)
          })
        }
        getConfig() {
          return super.getConfig()
        }
      }
      tf.serialization.registerClass(HardSigmoidLayer)
      console.log('Registered custom HardSigmoidLayer')
    } catch (e) {
      console.log('HardSigmoidLayer registration skipped/error:', e)
    }

    try {
      class Rescaling extends tf.layers.Layer {
        static get className() { return 'Rescaling' }
        constructor(config) {
          super(config || {})
          this.scale = config.scale || 1
          this.offset = config.offset || 0
        }
        computeOutputShape(inputShape) { return inputShape }
        call(inputs, kwargs) {
          return tf.tidy(() => {
            const x = Array.isArray(inputs) ? inputs[0] : inputs
            return x.mul(this.scale).add(this.offset)
          })
        }
        getConfig() {
          const config = super.getConfig()
          config.scale = this.scale
          config.offset = this.offset
          return config
        }
      }
      tf.serialization.registerClass(Rescaling)
      console.log('Registered Rescaling layer')
    } catch (e) {
      console.log('Rescaling registration skipped/error:', e)
    }
  }

  _model = await window.tf.loadLayersModel('/cassava_tfjs_model/model.json', { strict: false })
  return _model
}

async function runAI(file) {
  const tf = window.tf
  const model = await loadModel()
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 224; canvas.height = 224
        canvas.getContext('2d').drawImage(img, 0, 0, 224, 224)
        const tensor = tf.browser.fromPixels(canvas).toFloat().expandDims(0)
        const out = model.predict(tensor)
        const scores = Array.from(out.dataSync())
        tensor.dispose()
        out.dispose()
        URL.revokeObjectURL(img.src)
        const top = scores.indexOf(Math.max(...scores))
        resolve({
          diseaseId: CLASS_MAP[top] || 'healthy',
          confidence: Math.round(scores[top] * 100),
          scores,
          allScores: Object.fromEntries(Object.entries(CLASS_MAP).map(([i,id])=>[id, Math.round(scores[i]*100)]))
        })
      } catch(e) { reject(e) }
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// ── ICONS ────────────────────────────────────────────────────────────────────
const PATHS = {
  home:     "M3 12L12 4l9 8M5 10v10h5v-6h4v6h5V10",
  scan:     "M4 6V4h4M16 4h4v2M4 18v2h4M16 20h4v-2",
  bell:     "M15 17h5l-1.4-1.4A6 6 0 0015 10V7a3 3 0 00-6 0v3a6 6 0 00-3.6 5.6L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9",
  clock:    "M12 3a9 9 0 100 18A9 9 0 0012 3zM12 7v5l3 3",
  user:     "M12 4a4 4 0 100 8 4 4 0 000-8zM4 20c0-4 3.6-7 8-7s8 3 8 7",
  back:     "M19 12H5m7-7l-7 7 7 7",
  leaf:     "M17 8C8 10 5.9 16.17 3.82 19.15A10 10 0 1017 8z",
  medkit:   "M4 8h16v13H4zM8 8V6a2 2 0 012-2h4a2 2 0 012 2v2M12 12v4M10 14h4",
  flask:    "M9 3h6M8 3l-4 13a2 2 0 001.8 2.8h10.4A2 2 0 0018 16L14 3M6 14h12",
  location: "M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7zM12 6a3 3 0 100 6 3 3 0 000-6",
  check:    "M20 6L9 17l-5-5",
  camera:   "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 9a4 4 0 100 8 4 4 0 000-8",
  plus:     "M12 5v14M5 12h14",
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  chevron:  "M9 18l6-6-6-6",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  edit:     "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  phone:    "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.1 5.18 2 2 0 015.09 3h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.91 10.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 18v-.08z",
  navigate: "M3 11l19-9-9 19-2-8-8-2z",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  sun:      "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 100 10 5 5 0 000-10",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
}
function Ic({ n, s=20, c='currentColor' }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d={PATHS[n]} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

// ── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ go, profile, scans, reminders }) {
  return (
    <div className="screen fade-in">
      <div style={{
        background: 'var(--header-grad)',
        padding: '24px 20px 24px',
        borderBottom: '1px solid var(--card-border)'
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{color:'var(--text-secondary)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.2}}>Good morning 👋</div>
            <div style={{color:'var(--text-primary)',fontSize:24,fontWeight:800,fontFamily:'var(--font-display)',marginTop:4,letterSpacing:-0.5}}>{profile.name}</div>
            <div style={{color:'var(--text-muted)',fontSize:12,marginTop:4,fontWeight:500}}>{profile.location}  •  {profile.farmSize}</div>
          </div>
          <button onClick={()=>go('profile')} style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:'50%',width:42,height:42,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background-color 0.2s'}}>
            <Ic n="bell" s={20} c="var(--text-primary)"/>
          </button>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:14,padding:12,marginTop:16,display:'flex',alignItems:'center',gap:10}}>
          <Ic n="sun" s={18} c="#FDD835"/>
          <span style={{color:'var(--text-secondary)',fontSize:12,fontWeight:600}}>32°C  •  {profile.state || 'Ogun State'}  •  Low disease risk today</span>
        </div>
      </div>

      <div className="content" style={{padding:'20px'}}>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
          {[
            ['94%', 'AI Accuracy', 'var(--text-highlight)'],
            ['5', 'Diseases', 'var(--accent)'],
            [scans.length, 'Scans', '#10b981']
          ].map(([v,l,c])=>(
            <div key={l} className="card" style={{textAlign:'center',padding:'14px 6px'}}>
              <div style={{fontSize:20,fontWeight:800,color:c,fontFamily:'var(--font-display)'}}>{v}</div>
              <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,marginTop:4,textTransform:'uppercase',letterSpacing:0.8}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Scan CTA */}
        <button onClick={()=>go('scan')} className="btn" style={{
          width:'100%',
          background:'linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%)',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:20,
          padding:'20px 18px',
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          cursor:'pointer',
          marginBottom:20,
          boxShadow:'0 12px 30px rgba(40,96,211,0.25)',
          textAlign:'left'
        }}>
          <div>
            <div style={{color:'white',fontSize:20,fontWeight:900,fontFamily:'var(--font-display)',letterSpacing:-0.3}}>Scan Your Plant</div>
            <div style={{color:'rgba(255,255,255,0.8)',fontSize:12,marginTop:6,lineHeight:1.5,fontWeight:500}}>Upload a photo for instant AI<br/>disease detection & advice</div>
            <div style={{background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'4px 12px',display:'inline-block',marginTop:12,color:'white',fontSize:11,fontWeight:600}}>🤖 Real AI — Trained Model</div>
          </div>
          <Ic n="scan" s={54} c="rgba(255,255,255,0.9)"/>
        </button>

        {/* Quick Actions */}
        <div style={{fontSize:16,fontWeight:800,color:'var(--text-primary)',fontFamily:'var(--font-display)',marginBottom:12}}>Quick Actions</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
          {[
            ['flask','Products','var(--text-highlight)','products'],
            ['location','Dealer','var(--accent)','dealers'],
            ['bell','Reminders','#a855f7','reminders'],
            ['clock','History','#10b981','history']
          ].map(([ic,lb,col,sc])=>(
            <button key={lb} onClick={()=>go(sc)} className="card card-interactive" style={{
              borderRadius:16,
              padding:'14px 4px',
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              gap:8,
              cursor:'pointer'
            }}>
              <div style={{width:42,height:42,borderRadius:12,background:col+'1a',display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n={ic} s={20} c={col}/></div>
              <span style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textAlign:'center'}}>{lb}</span>
            </button>
          ))}
        </div>

        {/* Upcoming */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:800,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>Upcoming Tasks</div>
          <button onClick={()=>go('reminders')} style={{background:'none',border:'none',color:'var(--text-highlight)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)'}}>See all</button>
        </div>
        {reminders.filter(r=>r.enabled&&(r.nextDue==='Today'||r.nextDue==='Tomorrow')).map(r=>(
          <div key={r.id} className="card card-interactive" style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:r.nextDue==='Today'?'var(--text-highlight)':'var(--accent)',flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:'var(--text-primary)'}}>{r.title}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{r.nextDue}  •  {r.time}</div>
            </div>
            <span style={{
              background:r.nextDue==='Today'?'rgba(77,138,255,0.15)':'rgba(234,60,26,0.15)',
              color:r.nextDue==='Today'?'var(--text-highlight)':'var(--accent)',
              fontSize:11,
              fontWeight:800,
              padding:'4px 10px',
              borderRadius:20
            }}>{r.nextDue}</span>
          </div>
        ))}

        {/* Recent */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:800,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>Recent Diagnoses</div>
          <button onClick={()=>go('history')} style={{background:'none',border:'none',color:'var(--text-highlight)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)'}}>See all</button>
        </div>
        {scans.slice(0,3).map(item=>{
          const d=DISEASES.find(x=>x.id===item.diseaseId)||DISEASES[4]
          return (
            <button key={item.id} onClick={()=>go('diagnosis',{diseaseId:item.diseaseId})} className="card card-interactive" style={{
              width:'100%',
              display:'flex',
              alignItems:'center',
              gap:14,
              marginBottom:10,
              cursor:'pointer',
              textAlign:'left'
            }}>
              <div style={{width:48,height:48,borderRadius:14,background:d.color+'1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{d.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:'var(--text-primary)'}}>{d.name}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{item.fieldName || item.field || 'Field A'}  •  {item.date}</div>
              </div>
              <span style={{
                background:d.severity==='None'?'rgba(16,185,129,0.15)':d.sevBg,
                color:d.severity==='None'?'#10b981':d.sevColor,
                fontSize:11,
                fontWeight:800,
                padding:'4px 10px',
                borderRadius:20
              }}>{d.severity==='None'?'Healthy':d.severity}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── SCAN ─────────────────────────────────────────────────────────────────────
const SAMPLES=[{label:'Mosaic',emoji:'🍃',id:'cmd'},{label:'Brown Streak',emoji:'🌿',id:'cbsd'},{label:'Blight',emoji:'🍂',id:'cbb'},{label:'Green Mottle',emoji:'🌱',id:'cgm'},{label:'Healthy',emoji:'✅',id:'healthy'}]

function ScanScreen({ go, startAnalyzing }) {
  const [preview,  setPreview]  = useState(null)
  const [status,   setStatus]   = useState('idle') // idle|loading|ready|error
  const [msg,      setMsg]      = useState('')

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))

    if (!window.tf) {
      setStatus('error')
      setMsg('TF.js not loaded — try refreshing')
      return
    }
    try {
      setStatus('loading'); setMsg('Loading AI model...')
      await loadModel()
      setMsg('Analyzing your photo...')
      const result = await runAI(file)
      console.log('AI scores:', result.scores.map((s,i)=>`${CLASS_MAP[i]}:${Math.round(s*100)}%`).join(' | '))
      setStatus('ready'); setMsg('')
      startAnalyzing(result.diseaseId, result.confidence, result.allScores)
    } catch(err) {
      console.error('AI Error:', err)
      setStatus('error')
      setMsg('AI error: ' + (err.message||'Unknown error'))
      setTimeout(()=>setMsg(''), 5000)
    }
  }

  const statusLabel = status==='ready' ? '🟢 AI Model Ready' : status==='loading' ? '🟡 ' + (msg||'Analyzing...') : status==='error' ? '🔴 AI Error' : '📷 Position cassava leaf within frame'

  return (
    <div className="screen fade-in">
      <div className="hdr" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{color:'var(--text-primary)',fontSize:20,fontWeight:800,fontFamily:'var(--font-display)'}}>Scan Plant</div>
        <div style={{color:'var(--text-secondary)',fontSize:12,marginTop:4,fontWeight:500}}>{statusLabel}</div>
      </div>
      <div className="content" style={{padding:'20px'}}>
        {/* Viewfinder */}
        <div style={{
          background: preview ? 'black' : 'rgba(255, 255, 255, 0.02)',
          borderRadius: 24,
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1.5px ${preview ? 'solid' : 'dashed'} var(--card-border)`,
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)'
        }}>
          {preview
            ? <img src={preview} alt="preview" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : <>
                {['top-left','top-right','bottom-left','bottom-right'].map(pos=>{
                  const [v,h]=pos.split('-')
                  return <div key={pos} style={{
                    position:'absolute',
                    [v]:16,
                    [h]:16,
                    width:28,
                    height:28,
                    [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]:'3px solid var(--text-highlight)',
                    [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]:'3px solid var(--text-highlight)',
                    borderRadius: v==='top'?(h==='left'?'4px 0 0 0':'0 4px 0 0'):(h==='left'?'0 0 0 4px':'0 0 4px 0')
                  }}/>
                })}
                <div style={{textAlign:'center', padding:20}}>
                  <div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <img src="/cassava_leaf_guide.png" alt="Cassava Leaf Guide" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.8 }}/>
                  </div>
                  <div style={{color:'var(--text-secondary)',fontSize:14,fontWeight:600,fontFamily:'var(--font-display)'}}>Position Cassava Leaf</div>
                  <div style={{color:'var(--text-muted)',fontSize:11,marginTop:6,lineHeight:1.5}}>Ensure leaf details are clearly visible<br/>within the scanning brackets</div>
                </div>
              </>
          }
          {msg&&<div style={{
            position:'absolute',
            inset:0,
            background:'rgba(10, 17, 40, 0.95)',
            display:'flex',
            flexDirection:'column',
            alignItems:'center',
            justifyContent:'center',
            gap:14
          }}>
            <div style={{width:42,height:42,borderRadius:'50%',border:'3px solid var(--text-highlight)',borderTopColor:'transparent',animation:'spin 1s linear infinite'}}/>
            <div style={{color:'var(--text-primary)',fontSize:14,fontWeight:700}}>{msg}</div>
          </div>}
        </div>

        {/* Upload */}
        <label style={{display:'block',marginBottom:16}}>
          <input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handleFile}/>
          <div className="btn btn-accent" style={{width:'100%',justifyContent:'center',fontSize:15,borderRadius:16,padding:'16px'}}>
            <Ic n="camera" s={18} c="white"/>
            {preview?'Scan a Different Photo':'Upload or Take Photo'}
          </div>
        </label>

        {/* AI badge */}
        <div className="card" style={{
          background:'rgba(77, 138, 255, 0.05)',
          padding:'12px 14px',
          display:'flex',
          alignItems:'center',
          gap:10,
          marginBottom:16,
          borderColor:'rgba(77, 138, 255, 0.15)'
        }}>
          <span style={{fontSize:20}}>🤖</span>
          <span style={{fontSize:12,color:'var(--text-secondary)',fontWeight:600,lineHeight:1.4}}>Powered by real AI — trained on 21,367 cassava crop images</span>
        </div>

        {/* Tips */}
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:14,color:'var(--text-primary)',fontFamily:'var(--font-display)',marginBottom:10}}>📸 Photo Tips for Best Results</div>
          {[
            'Use good natural lighting — avoid harsh shadows',
            'Fill the frame with 1–2 leaves clearly',
            'Keep camera steady — avoid blurry shots',
            'Include stem if symptoms are visible there'
          ].map((t,i)=>(
            <div key={i} style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'var(--text-highlight)',marginTop:6,flexShrink:0}}/>
              <span style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.5}}>{t}</span>
            </div>
          ))}
        </div>

        {/* Samples */}
        <div style={{fontSize:14,fontWeight:800,color:'var(--text-primary)',fontFamily:'var(--font-display)',marginBottom:6}}>Try a Sample (Demo)</div>
        <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:10}}>These use preset results — upload a real photo for actual AI detection</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {SAMPLES.map(s=>(
            <button key={s.id} onClick={()=>startAnalyzing(s.id,null)} className="card card-interactive" style={{
              padding:'12px 10px',
              cursor:'pointer',
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              gap:6,
              flex: 1,
              minWidth:60
            }}>
              <span style={{fontSize:24}}>{s.emoji}</span>
              <span style={{fontSize:11,fontWeight:800,color:'var(--text-secondary)'}}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── ANALYZING ────────────────────────────────────────────────────────────────
function AnalyzingScreen() {
  return (
    <div style={{
      flex: 1,
      background: 'var(--bg-screen)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 32
    }}>
      <div style={{position:'relative',width:120,height:120,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'3px solid rgba(77, 138, 255, 0.15)',animation:'pulse 1.4s ease-in-out infinite'}}/>
        <div style={{position:'absolute',inset:16,borderRadius:'50%',border:'3px solid rgba(77, 138, 255, 0.3)',animation:'pulse 1.4s ease-in-out 0.2s infinite'}}/>
        <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(77, 138, 255, 0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30}}>🔬</div>
      </div>
      <div style={{color:'var(--text-primary)',fontSize:22,fontWeight:800,fontFamily:'var(--font-display)',letterSpacing:-0.3}}>Analyzing Leaf...</div>
      <div style={{color:'var(--text-secondary)',fontSize:13,textAlign:'center',lineHeight:1.5,marginBottom:8}}>AI model parsing textures and matching patterns</div>
      <div style={{display:'flex',gap:8,marginBottom:16}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:'var(--text-highlight)',animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}</div>
      
      <div style={{alignSelf:'stretch', display:'flex', flexDirection:'column', gap:10}}>
        {['Scanning leaf texture...', 'Detecting disease patterns...', 'Matching disease database...'].map((s,i)=>(
          <div key={i} className="card" style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'rgba(255,255,255,0.02)'}}>
            <div style={{width:16,height:16,borderRadius:'50%',border:'2px solid var(--text-highlight)',borderTopColor:'transparent',animation:`spin 1s linear ${i*0.3}s infinite`}}/>
            <span style={{color:'var(--text-secondary)',fontSize:13,fontWeight:600}}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DIAGNOSIS ────────────────────────────────────────────────────────────────
function DiagnosisScreen({ go, diseaseId, aiConfidence, allScores }) {
  const d = DISEASES.find(x=>x.id===diseaseId) || DISEASES[4]
  const conf = aiConfidence != null ? aiConfidence : d.confidence
  const isReal = aiConfidence != null
  return (
    <div className="screen fade-in">
      <div style={{
        background: 'var(--header-grad)',
        padding: '16px 20px 24px',
        borderBottom: '1px solid var(--card-border)'
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <button onClick={()=>go('home')} style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:'50%',width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="back" s={18} c="var(--text-primary)"/></button>
          <span style={{color:'var(--text-primary)',fontWeight:800,fontFamily:'var(--font-display)',fontSize:16}}>Diagnosis Result</span>
          <div style={{width:38}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:120,fontSize:72,filter:'drop-shadow(0 8px 16px rgba(0,0,0,0.3))'}}>{d.icon}</div>
        <div style={{padding:'0 4px'}}>
          <div style={{display:'flex',gap:6,marginBottom:12}}>
            <span style={{background:d.severity==='None'?'rgba(16,185,129,0.15)':d.sevBg,color:d.severity==='None'?'#10b981':d.sevColor,fontSize:11,fontWeight:800,padding:'4px 12px',borderRadius:20,display:'inline-block'}}>{d.severity==='None'?'✅ Healthy':`⚠️ ${d.severity}`}</span>
            {isReal&&<span style={{background:'rgba(77,138,255,0.15)',color:'var(--text-highlight)',fontSize:11,fontWeight:800,padding:'4px 12px',borderRadius:20,display:'inline-block'}}>🤖 Real AI Result</span>}
          </div>
          <div style={{color:'var(--text-primary)',fontSize:22,fontWeight:900,fontFamily:'var(--font-display)',lineHeight:1.2}}>{d.name}</div>
          <div style={{color:'var(--text-secondary)',fontSize:13,marginTop:6,lineHeight:1.4}}>{d.short}</div>
          <div style={{marginTop:16}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{color:'var(--text-muted)',fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>AI Confidence</span>
              <span style={{color:'var(--text-highlight)',fontSize:13,fontWeight:800}}>{conf}%</span>
            </div>
            <div style={{height:6,background:'rgba(255,255,255,0.08)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${conf}%`,background:'linear-gradient(90deg,var(--primary-light) 0%,var(--text-highlight) 100%)',borderRadius:3}}/>
            </div>
          </div>
        </div>
      </div>
      <div className="content" style={{padding:'20px'}}>
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontWeight:800,marginBottom:8,fontSize:14,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>About this Condition</div>
          <div style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.7}}>{d.desc}</div>
        </div>
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:14,color:'var(--text-primary)',fontFamily:'var(--font-display)',marginBottom:10}}>Symptoms Detected</div>
          {d.symptoms.map((s,i)=>(
            <div key={i} style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:d.color,marginTop:5,flexShrink:0}}/>
              <span style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.5}}>{s}</span>
            </div>
          ))}
        </div>
        {allScores && (
          <div className="card" style={{marginBottom:12}}>
            <div style={{fontWeight:800,fontSize:14,color:'var(--text-primary)',fontFamily:'var(--font-display)',marginBottom:12}}>🤖 AI Confidence Breakdown</div>
            {Object.entries(allScores).sort(([,a],[,b])=>b-a).map(([id,pct])=>{
              const d2=DISEASES.find(x=>x.id===id)||{name:id,color:'#888',icon:'🌿'}
              return (
                <div key={id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <span style={{fontSize:18,width:24,textAlign:'center'}}>{d2.icon}</span>
                  <span style={{fontSize:12,color:'var(--text-secondary)',width:130,flexShrink:0,fontWeight:600}}>{d2.name}</span>
                  <div style={{flex:1,height:8,background:'rgba(255,255,255,0.06)',borderRadius:4,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:d2.color,borderRadius:4}}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:800,color:d2.color,width:34,textAlign:'right'}}>{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <button onClick={()=>go('treatment',{diseaseId})} className="btn btn-primary" style={{borderRadius:14,padding:'12px'}}><Ic n="medkit" s={16} c="white"/>Treatment</button>
          <button onClick={()=>go('products',{diseaseId})} className="btn btn-outline" style={{borderRadius:14,padding:'12px'}}><Ic n="flask" s={16} c="var(--text-primary)"/>Products</button>
        </div>
        <button onClick={()=>go('dealers')} className="btn" style={{width:'100%',background:'rgba(234,60,26,0.08)',color:'var(--accent)',border:'1px solid rgba(234,60,26,0.2)',borderRadius:14,padding:'14px',marginBottom:10}}><Ic n="location" s={16} c="var(--accent)"/>Find Nearest FMN Dealer</button>
        <button onClick={()=>go('scan')} className="btn" style={{width:'100%',background:'transparent',color:'var(--text-muted)',fontSize:13}}><Ic n="scan" s={15} c="var(--text-muted)"/>Scan another plant</button>
      </div>
    </div>
  )
}

// ── TREATMENT ────────────────────────────────────────────────────────────────
function TreatmentScreen({ go, diseaseId }) {
  const d = DISEASES.find(x=>x.id===diseaseId)||DISEASES[4]
  const [checked, setChecked] = useState({})
  const [tab, setTab] = useState('treatment')
  const done = Object.values(checked).filter(Boolean).length
  const pct  = d.treatment.length ? Math.round((done/d.treatment.length)*100) : 0
  return (
    <div className="screen fade-in" style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div className="hdr" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <button onClick={()=>go('diagnosis',{diseaseId})} style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:'50%',width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="back" s={18} c="var(--text-primary)"/></button>
          <div style={{textAlign:'center'}}>
            <div style={{color:'var(--text-primary)',fontWeight:800,fontFamily:'var(--font-display)',fontSize:16}}>Treatment Plan</div>
            <div style={{color:'var(--text-secondary)',fontSize:12,fontWeight:500,marginTop:2}}>{d.short}</div>
          </div>
          <div style={{width:38}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span style={{color:'var(--text-muted)',fontSize:12,fontWeight:600}}>{done}/{d.treatment.length} steps completed</span>
          <span style={{color:'var(--text-highlight)',fontSize:12,fontWeight:800}}>{pct}%</span>
        </div>
        <div style={{height:6,background:'rgba(255,255,255,0.08)',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,var(--primary-light) 0%,var(--text-highlight) 100%)',borderRadius:3,transition:'width 0.4s'}}/>
        </div>
      </div>
      <div style={{
        display:'flex',
        background:'rgba(13, 22, 49, 0.9)',
        borderBottom:'1px solid rgba(255, 255, 255, 0.05)',
        padding:'6px 14px 0',
        flexShrink:0
      }}>
        {['treatment','prevention','schedule'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'10px 16px',
            border:'none',
            background:'none',
            cursor:'pointer',
            fontFamily:'var(--font-display)',
            fontSize:13,
            fontWeight:700,
            color:tab===t?'var(--text-primary)':'var(--text-muted)',
            borderBottom:`3px solid ${tab===t?'var(--text-highlight)':'transparent'}`,
            textTransform:'capitalize',
            transition:'color 0.2s'
          }}>{t}</button>
        ))}
      </div>
      <div className="content" style={{overflowY:'auto', padding:'20px'}}>
        {tab==='treatment'&&<>
          <div style={{fontSize:12,color:'var(--text-muted)',fontWeight:500,marginBottom:12}}>Tap each step below to check it off.</div>
          {d.treatment.map((step,i)=>(
            <button key={i} onClick={()=>setChecked(p=>({...p,[i]:!p[i]}))} className="card card-interactive" style={{
              width:'100%',
              background:checked[i]?'rgba(16,185,129,0.06)':'var(--card)',
              borderColor:checked[i]?'rgba(16,185,129,0.25)':'var(--card-border)',
              borderRadius:16,
              padding:14,
              display:'flex',
              alignItems:'flex-start',
              gap:12,
              marginBottom:10,
              cursor:'pointer',
              textAlign:'left'
            }}>
              <div style={{
                width:24,
                height:24,
                borderRadius:'50%',
                background:checked[i]?'#10b981':'rgba(255,255,255,0.06)',
                border:checked[i]?'none':'1px solid var(--card-border)',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                flexShrink:0
              }}>
                {checked[i]?<Ic n="check" s={13} c="white"/>:<span style={{color:'var(--text-secondary)',fontSize:11,fontWeight:800}}>{i+1}</span>}
              </div>
              <span style={{
                fontSize:13,
                color:checked[i]?'var(--text-muted)':'var(--text-primary)',
                lineHeight:1.6,
                fontWeight:500,
                textDecoration:checked[i]?'line-through':'none',
                flex:1
              }}>{step}</span>
            </button>
          ))}
          <button onClick={()=>go('products',{diseaseId})} className="btn btn-accent" style={{width:'100%',marginTop:8,borderRadius:14}}><Ic n="flask" s={15} c="white"/>View FMN Products →</button>
        </>}
        {tab==='prevention'&&<>
          <div className="card" style={{marginBottom:14, background:'rgba(77, 138, 255, 0.03)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><Ic n="shield" s={20} c="var(--text-highlight)"/><span style={{fontWeight:800,fontSize:14,fontFamily:'var(--font-display)'}}>Prevention Strategy</span></div>
            <p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.7,fontWeight:500}}>{d.prevention}</p>
          </div>
          {[
            'Use certified disease-free planting materials every season',
            'Conduct soil tests before planting',
            'Apply FMN preventive spray from day one',
            'Keep detailed farm records of all treatments',
            'Attend FMN farmer training workshops'
          ].map((t,i)=>(
            <div key={i} className="card" style={{display:'flex',gap:12,marginBottom:10,alignItems:'flex-start'}}>
              <div style={{marginTop:3}}><Ic n="check" s={16} c="#10b981"/></div>
              <span style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.5,fontWeight:500}}>{t}</span>
            </div>
          ))}
        </>}
        {tab==='schedule'&&[['Day 1',['Remove infected plants','First fungicide treatment']],['Day 3',['Inspect neighbours','Disinfect tools']],['Day 7',['Second spray','Check for new symptoms']],['Day 14',['Repeat treatment','Document recovery']]].map(([day,tasks],i,arr)=>(
          <div key={day} style={{display:'flex',gap:12,marginBottom:4}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:56}}>
              <div style={{
                background:i===0?'var(--text-highlight)':'var(--surface)',
                border:'1px solid var(--card-border)',
                borderRadius:10,
                padding:'6px 8px',
                width:'100%',
                textAlign:'center'
              }}>
                <span style={{fontSize:11,fontWeight:800,color:i===0?'white':'var(--text-secondary)',fontFamily:'var(--font-display)'}}>{day}</span>
              </div>
              {i<arr.length-1&&<div style={{width:2,flex:1,background:'var(--card-border)',margin:'6px 0'}}/>}
            </div>
            <div className="card" style={{flex:1,marginBottom:10}}>
              {tasks.map((t,j)=>(
                <div key={j} style={{
                  display:'flex',
                  gap:10,
                  alignItems:'center',
                  paddingBottom:j<tasks.length-1?8:0,
                  marginBottom:j<tasks.length-1?8:0,
                  borderBottom:j<tasks.length-1?'1px solid rgba(255,255,255,0.05)':'none'
                }}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'var(--text-highlight)',flexShrink:0}}/>
                  <span style={{fontSize:13,color:'var(--text-primary)',fontWeight:500}}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PRODUCTS ─────────────────────────────────────────────────────────────────
function ProductsScreen({ go, diseaseId }) {
  const [filter, setFilter] = useState('All')
  const d = DISEASES.find(x=>x.id===diseaseId)
  const recIds = d?.fmnProducts||[]
  const cats = ['All','Fertilizer','Fungicide','Insecticide','Foliar','Root Stimulant']
  const filtered = filter==='All' ? PRODUCTS : PRODUCTS.filter(p=>p.cat===filter)
  return (
    <div className="screen fade-in" style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div className="hdr" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>go('home')} style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:'50%',width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="back" s={18} c="var(--text-primary)"/></button>
          <div>
            <div style={{color:'var(--text-primary)',fontSize:18,fontWeight:800,fontFamily:'var(--font-display)'}}>FMN Products</div>
            <div style={{color:'var(--text-secondary)',fontSize:12,fontWeight:500,marginTop:2}}>Agrochemicals & Fertilizers</div>
          </div>
        </div>
      </div>
      <div style={{
        background:'rgba(13, 22, 49, 0.9)',
        borderBottom:'1px solid rgba(255, 255, 255, 0.05)',
        padding:'10px 14px',
        display:'flex',
        gap:8,
        overflowX:'auto',
        flexShrink:0,
        scrollbarWidth:'none'
      }}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilter(c)} style={{
            padding:'6px 14px',
            borderRadius:20,
            border:`1px solid ${filter===c?'var(--text-highlight)':'var(--card-border)'}`,
            background:filter===c?'var(--text-highlight)':'var(--surface)',
            color:filter===c?'white':'var(--text-secondary)',
            fontFamily:'var(--font-display)',
            fontSize:12,
            fontWeight:700,
            cursor:'pointer',
            whiteSpace:'nowrap',
            transition:'background-color 0.2s'
          }}>{c}</button>
        ))}
      </div>
      <div className="content" style={{overflowY:'auto', padding:'20px'}}>
        {recIds.length>0&&filter==='All'&& (
          <div className="card" style={{
            background:'rgba(77, 138, 255, 0.06)',
            padding:'10px 14px',
            marginBottom:14,
            display:'flex',
            alignItems:'center',
            gap:10,
            borderColor:'rgba(77, 138, 255, 0.2)'
          }}>
            <Ic n="star" s={16} c="var(--accent)"/>
            <span style={{fontSize:12,fontWeight:700,color:'var(--text-highlight)',fontFamily:'var(--font-display)'}}>⭐ Recommended for {d?.short}</span>
          </div>
        )}
        {filtered.map(p=>{
          const isRec=recIds.includes(p.id)
          return (
            <div key={p.id} className="card" style={{
              marginBottom:12,
              borderColor:isRec?'rgba(77, 138, 255, 0.25)':'var(--card-border)',
              background:isRec?'rgba(13, 22, 49, 0.85)':'var(--card)'
            }}>
              {isRec&&<span style={{
                background:'rgba(77, 138, 255, 0.15)',
                color:'var(--text-highlight)',
                fontSize:11,
                fontWeight:800,
                padding:'3px 10px',
                borderRadius:20,
                display:'inline-block',
                marginBottom:10
              }}>⭐ Recommended</span>}
              <div style={{display:'flex',gap:14,marginBottom:12}}>
                <div style={{width:58,height:58,borderRadius:16,background:p.color+'1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,flexShrink:0}}>{p.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:15,color:'var(--text-primary)'}}>{p.name}</div>
                  <span style={{fontSize:11,fontWeight:800,color:p.color,background:p.color+'15',padding:'2px 8px',borderRadius:20,display:'inline-block',marginTop:4}}>{p.cat}</span>
                  <div style={{fontSize:16,fontWeight:800,color:'var(--text-primary)',fontFamily:'var(--font-display)',marginTop:6}}>{p.price}</div>
                </div>
              </div>
              <div style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.6,marginBottom:10,fontWeight:500}}>{p.desc}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14,fontWeight:600}}>💊 {p.dosage}</div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>go('dealers')} className="btn btn-primary" style={{flex:1,fontSize:13,padding:'11px',borderRadius:12}}><Ic n="location" s={15} c="white"/>Find Store</button>
                <button className="btn btn-outline" style={{flex:1,fontSize:13,padding:'11px',borderRadius:12}}><Ic n="phone" s={15} c="var(--text-primary)"/>Order</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── REMINDERS ────────────────────────────────────────────────────────────────
function RemindersScreen({ go, reminders, onSaveReminder, onDeleteReminder }) {
  const [showAdd,setShowAdd] = useState(false)
  const [newTitle,setNewTitle] = useState('')
  const active = reminders.filter(r=>r.enabled).length
  return (
    <div className="screen fade-in" style={{position:'relative'}}>
      <div className="hdr" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{color:'var(--text-primary)',fontSize:20,fontWeight:800,fontFamily:'var(--font-display)'}}>Reminders</div>
            <div style={{color:'var(--text-secondary)',fontSize:12,marginTop:4,fontWeight:500}}>{active} active tasks</div>
          </div>
          <button onClick={()=>setShowAdd(true)} style={{width:40,height:40,borderRadius:'50%',background:'var(--surface)',border:'1px solid var(--card-border)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="plus" s={22} c="var(--text-primary)"/></button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:16}}>
          {[
            ['Active',active,'var(--text-highlight)'],
            ['Paused',reminders.length-active,'var(--text-secondary)'],
            ['Due Today',reminders.filter(r=>r.nextDue==='Today'&&r.enabled).length,'#fbbf24']
          ].map(([l,v,c])=>(
            <div key={l} style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:12,padding:'10px 8px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:'var(--font-display)'}}>{v}</div>
              <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:600,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="content" style={{padding:'20px'}}>
        {reminders.map(r=>(
          <div key={r.id} className="card" style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:12,opacity:r.enabled?1:0.5}}>
            <div style={{width:46,height:46,borderRadius:14,background:'var(--surface)',border:'1px solid var(--card-border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{r.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{r.title}</div>
              <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:4,fontWeight:500}}>{r.time}  •  {r.days}</div>
              {r.nextDue&&<span style={{
                background:r.nextDue==='Today'?'rgba(77,138,255,0.15)':'rgba(255,255,255,0.06)',
                color:r.nextDue==='Today'?'var(--text-highlight)':'var(--text-secondary)',
                fontSize:11,
                fontWeight:850,
                padding:'3px 10px',
                borderRadius:20,
                display:'inline-block',
                marginTop:8
              }}>Next: {r.nextDue}</span>}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,alignItems:'center',justifyContent:'center'}}>
              <button onClick={()=>onSaveReminder({...r, enabled:!r.enabled, updatedAt:Date.now()})} style={{width:44,height:24,borderRadius:12,background:r.enabled?'var(--text-highlight)':'rgba(255,255,255,0.1)',border:'none',cursor:'pointer',position:'relative', transition:'background-color 0.2s'}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,left:r.enabled?23:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
              </button>
              <button onClick={()=>onDeleteReminder(r.id)} style={{background:'none',border:'none',cursor:'pointer',opacity:0.6}}><Ic n="trash" s={16} c="var(--accent)"/></button>
            </div>
          </div>
        ))}
      </div>
      {showAdd&&(
        <div onClick={()=>setShowAdd(false)} style={{position:'absolute',inset:0,background:'rgba(3,8,22,0.7)',backdropFilter:'blur(6px)',display:'flex',alignItems:'flex-end',zIndex:100}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-screen)',borderTop:'1px solid var(--card-border)',borderRadius:'24px 24px 0 0',padding:24,width:'100%'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <span style={{fontSize:18,fontWeight:800,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>Add Reminder</span>
              <button onClick={()=>setShowAdd(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--text-muted)'}}>✕</button>
            </div>
            <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="e.g. Apply FMN BioGuard Spray" style={{
              width:'100%',
              padding:'12px 14px',
              borderRadius:12,
              border:'1px solid var(--card-border)',
              background:'var(--surface)',
              color:'white',
              fontFamily:'var(--font-sans)',
              fontSize:14,
              outline:'none',
              marginBottom:18
            }}/>
            <button onClick={()=>{if(newTitle.trim()){onSaveReminder({id:Date.now().toString(),title:newTitle,time:'07:00 AM',days:'Mon',icon:'💧',enabled:true,nextDue:'Mon',createdAt:Date.now(),updatedAt:Date.now()});setNewTitle('');setShowAdd(false)}}} className="btn btn-primary" style={{width:'100%',borderRadius:12}}>Save Reminder</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── HISTORY ──────────────────────────────────────────────────────────────────
function HistoryScreen({ go, scans }) {
  const [filter,setFilter] = useState('All')
  const filtered = scans.filter(h=>{
    if(filter==='All')return true
    if(filter==='Disease')return ['cmd','cbsd','cbb','cgm'].includes(h.diseaseId)
    if(filter==='Healthy')return h.diseaseId==='healthy'
    if(filter==='Treated')return h.treated
    return true
  })
  return (
    <div className="screen fade-in" style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div className="hdr" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <div style={{color:'var(--text-primary)',fontSize:20,fontWeight:800,fontFamily:'var(--font-display)'}}>Scan History</div>
            <div style={{color:'var(--text-secondary)',fontSize:12,marginTop:4,fontWeight:500}}>{scans.length} total diagnoses</div>
          </div>
          <button style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:'50%',width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="download" s={18} c="var(--text-primary)"/></button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
          {[
            ['Total',scans.length,'var(--text-highlight)'],
            ['Diseases',scans.filter(h=>['cmd','cbsd','cbb','cgm'].includes(h.diseaseId)).length,'#fbbf24'],
            ['Healthy',scans.filter(h=>h.diseaseId==='healthy').length,'#10b981'],
            ['Treated',scans.filter(h=>h.treated).length,'#a855f7']
          ].map(([l,v,c])=>(
            <div key={l} style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:12,padding:'8px 4px',textAlign:'center'}}>
              <div style={{fontSize:16,fontWeight:800,color:c,fontFamily:'var(--font-display)'}}>{v}</div>
              <div style={{fontSize:9,color:'var(--text-muted)',fontWeight:600,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{
        background:'rgba(13, 22, 49, 0.9)',
        borderBottom:'1px solid rgba(255, 255, 255, 0.05)',
        padding:'10px 14px',
        display:'flex',
        gap:8,
        overflowX:'auto',
        flexShrink:0,
        scrollbarWidth:'none'
      }}>
        {['All','Disease','Healthy','Treated'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:'6px 14px',
            borderRadius:20,
            border:`1px solid ${filter===f?'var(--text-highlight)':'var(--card-border)'}`,
            background:filter===f?'var(--text-highlight)':'var(--surface)',
            color:filter===f?'white':'var(--text-secondary)',
            fontFamily:'var(--font-display)',
            fontSize:12,
            fontWeight:700,
            cursor:'pointer',
            whiteSpace:'nowrap',
            transition:'background-color 0.2s'
          }}>{f}</button>
        ))}
      </div>
      <div className="content" style={{overflowY:'auto', padding:'20px'}}>
        {filtered.map(item=>{
          const d=DISEASES.find(x=>x.id===item.diseaseId)||DISEASES[4]
          return (
            <button key={item.id} onClick={()=>go('diagnosis',{diseaseId:item.diseaseId})} className="card card-interactive" style={{
              width:'100%',
              display:'flex',
              alignItems:'center',
              gap:14,
              marginBottom:10,
              cursor:'pointer',
              textAlign:'left'
            }}>
              <div style={{width:50,height:50,borderRadius:14,background:d.color+'1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>{d.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{d.name}</div>
                <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:4}}>📍 {item.fieldName || item.field || 'Field A'}  •  {item.date}</div>
                <div style={{display:'flex',gap:6,marginTop:8}}>
                  <span style={{
                    background:d.severity==='None'?'rgba(16,185,129,0.15)':d.sevBg,
                    color:d.severity==='None'?'#10b981':d.sevColor,
                    fontSize:10,
                    fontWeight:800,
                    padding:'2px 8px',
                    borderRadius:20
                  }}>{d.severity==='None'?'Healthy':d.severity}</span>
                  {item.treated&&<span style={{background:'rgba(77,138,255,0.15)',color:'var(--text-highlight)',fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:20}}>✓ Treated</span>}
                </div>
              </div>
              <Ic n="chevron" s={16} c="var(--text-muted)"/>
            </button>
          )
        })}
        <button onClick={()=>go('scan')} className="btn btn-outline" style={{width:'100%',marginTop:6,borderRadius:12}}><Ic n="scan" s={15} c="var(--text-primary)"/>Perform New Scan</button>
      </div>
    </div>
  )
}

// ── DEALERS ──────────────────────────────────────────────────────────────────
function DealersScreen({ go }) {
  const [sel,setSel]=useState(null)
  return (
    <div className="screen fade-in" style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div className="hdr" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>go('home')} style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:'50%',width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="back" s={18} c="var(--text-primary)"/></button>
          <div>
            <div style={{color:'var(--text-primary)',fontSize:18,fontWeight:800,fontFamily:'var(--font-display)'}}>Find FMN Dealer</div>
            <div style={{color:'var(--text-secondary)',fontSize:12,fontWeight:500,marginTop:2}}>{DEALERS.length} dealers near you</div>
          </div>
        </div>
      </div>
      <div style={{
        background:'#0c1535',
        borderBottom:'1px solid rgba(255,255,255,0.05)',
        height:160,
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        position:'relative',
        overflow:'hidden',
        flexShrink:0
      }}>
        <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 30px,rgba(255,255,255,0.02) 30px,rgba(255,255,255,0.02) 31px),repeating-linear-gradient(90deg,transparent,transparent 30px,rgba(255,255,255,0.02) 30px,rgba(255,255,255,0.02) 31px)'}}/>
        {DEALERS.map((d,i)=>(
          <button key={d.id} onClick={()=>setSel(sel===d.id?null:d.id)} style={{
            position:'absolute',
            top:`${15+i*15}%`,
            left:`${10+i*18}%`,
            width:34,
            height:34,
            borderRadius:'50%',
            background:sel===d.id?'var(--accent)':(d.inStock?'var(--text-highlight)':'var(--text-muted)'),
            border:'2.5px solid #0a1128',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            cursor:'pointer',
            boxShadow:'0 4px 12px rgba(0,0,0,0.3)',
            transition:'all 0.2s'
          }}>
            <Ic n="location" s={15} c="white"/>
          </button>
        ))}
        <div className="card" style={{background:'rgba(10,17,40,0.85)',backdropFilter:'blur(10px)',borderRadius:12,padding:'8px 14px',textAlign:'center',boxShadow: 'var(--shadow-sm)'}}>
          <div style={{fontSize:13,fontWeight:800,color:'var(--text-highlight)',fontFamily:'var(--font-display)'}}>📍 Your Location</div>
          <div style={{fontSize:11,color:'var(--text-secondary)',fontWeight:500,marginTop:2}}>Ogun State, FUNAAB</div>
        </div>
      </div>
      <div className="content" style={{overflowY:'auto', padding:'20px'}}>
        {DEALERS.map(d=>(
          <div key={d.id} className="card" style={{
            marginBottom:12,
            borderColor:sel===d.id?'var(--text-highlight)':'var(--card-border)',
            background:sel===d.id?'rgba(13, 22, 49, 0.85)':'var(--card)'
          }}>
            <button onClick={()=>setSel(sel===d.id?null:d.id)} style={{width:'100%',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left',padding:0}}>
              <div style={{width:50,height:50,borderRadius:14,background:d.inStock?'rgba(77,138,255,0.08)':'rgba(255,255,255,0.03)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🏪</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14,color:'var(--text-primary)'}}>{d.name}</div>
                <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:4,fontWeight:500}}>{d.address}</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--text-highlight)'}}>📍 {d.distance}</span>
                  <span style={{
                    background:d.inStock?'rgba(16,185,129,0.15)':'rgba(255,255,255,0.06)',
                    color:d.inStock?'#10b981':'var(--text-muted)',
                    fontSize:10,
                    fontWeight:800,
                    padding:'2px 8px',
                    borderRadius:20
                  }}>{d.inStock?'● In Stock':'○ Call First'}</span>
                </div>
              </div>
              <Ic n="chevron" s={16} c="var(--text-muted)"/>
            </button>
            {sel===d.id&&(
              <div style={{marginTop:14,display:'flex',gap:10}}>
                <button className="btn btn-outline" style={{flex:1,fontSize:12,padding:'10px',borderRadius:10}}><Ic n="phone" s={14} c="var(--text-primary)"/>{d.phone}</button>
                <button className="btn btn-primary" style={{flex:1,fontSize:12,padding:'10px',borderRadius:10}}><Ic n="navigate" s={14} c="white"/>Directions</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PROFILE ──────────────────────────────────────────────────────────────────
function ProfileScreen({ go, profile, scans, onSaveProfile, syncStatus, onTriggerSync }) {
  const [notif,setNotif] = useState(true)
  const [offline,setOffline] = useState(false)
  const [loc,setLoc] = useState(true)
  const [modal,setModal] = useState(null)
  const [rating,setRating] = useState(0)
  const [ratingDone,setRatingDone] = useState(false)
  const [copied,setCopied] = useState(false)
  const [form,setForm] = useState({...profile})

  useEffect(() => {
    setForm({...profile});
  }, [profile]);

  const Toggle=({val,set})=>(
    <button onClick={()=>set(!val)} style={{
      width:44,
      height:24,
      borderRadius:12,
      background:val?'var(--text-highlight)':'rgba(255,255,255,0.1)',
      border:'none',
      cursor:'pointer',
      position:'relative',
      flexShrink:0,
      transition:'background-color 0.2s'
    }}>
      <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,left:val?23:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
    </button>
  )
  const Modal=({children,title,onClose})=>(
    <div onClick={onClose} style={{
      position:'absolute',
      inset:0,
      background:'rgba(3,8,22,0.7)',
      backdropFilter:'blur(6px)',
      display:'flex',
      alignItems:'flex-end',
      zIndex:200
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'var(--bg-screen)',
        borderTop:'1px solid var(--card-border)',
        borderRadius:'24px 24px 0 0',
        width:'100%',
        maxHeight:'85%',
        overflowY:'auto',
        padding:24
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <span style={{fontSize:18,fontWeight:800,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>{title}</span>
          <button onClick={onClose} style={{background:'var(--surface)',border:'1px solid var(--card-border)',color:'var(--text-secondary)',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
  const Field=({label,field,placeholder})=>(
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:0.8}}>{label}</div>
      <input value={form[field] || ''} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))} placeholder={placeholder} style={{
        width:'100%',
        padding:'12px 14px',
        borderRadius:12,
        border:'1px solid var(--card-border)',
        background:'var(--surface)',
        color:'white',
        fontFamily:'var(--font-sans)',
        fontSize:14,
        outline:'none'
      }}/>
    </div>
  )

  return (
    <div className="screen fade-in" style={{position:'relative'}}>
      <div style={{
        background: 'var(--header-grad)',
        padding: '28px 20px 24px',
        textAlign: 'center',
        borderBottom: '1px solid var(--card-border)'
      }}>
        <div style={{
          width:86,
          height:86,
          borderRadius:'50%',
          background:'var(--surface)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          margin:'0 auto 12px',
          fontSize:44,
          border:'2.5px solid var(--text-highlight)',
          boxShadow:'0 0 20px rgba(77,138,255,0.2)'
        }}>👨🏾‍🌾</div>
        <div style={{color:'var(--text-primary)',fontSize:22,fontWeight:800,fontFamily:'var(--font-display)',letterSpacing:-0.3}}>{profile.name}</div>
        <div style={{color:'var(--text-secondary)',fontSize:13,marginTop:4,fontWeight:500}}>{profile.phone}</div>
        <div style={{color:'var(--text-muted)',fontSize:13,marginTop:3,fontWeight:500}}>📍 {profile.location}</div>
        <div style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:20,padding:'6px 14px',display:'inline-flex',alignItems:'center',gap:6,marginTop:12}}>
          <Ic n="star" s={14} c="#fbbf24"/><span style={{color:'var(--text-secondary)',fontSize:11,fontWeight:750,letterSpacing:0.3}}>FMN Farmer  •  Since Jan 2025</span>
        </div>
      </div>
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(3,1fr)',
        gap:10,
        background:'rgba(10, 17, 40, 0.4)',
        padding:'0 20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        {[
          [scans.length,'Scans','var(--text-highlight)'],
          [scans.filter(h=>h.treated).length,'Treated','#a855f7'],
          [profile.farmSize.replace(' Hectares','ha'),'Farm','#fbbf24']
        ].map(([v,l,c])=>(
          <div key={l} className="card" style={{textAlign:'center',padding:'12px 6px'}}>
            <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:'var(--font-display)'}}>{v}</div>
            <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,marginTop:4,textTransform:'uppercase',letterSpacing:0.5}}>{l}</div>
          </div>
        ))}
      </div>
      <div className="content" style={{padding:'20px'}}>
        <div className="card" style={{marginBottom:14}}>
          <div style={{display:'flex',justifyContent: 'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><Ic n="leaf" s={18} c="var(--text-highlight)"/><span style={{fontWeight:800,fontSize:15,fontFamily:'var(--font-display)',color:'var(--text-primary)'}}>Farm Details</span></div>
            <button onClick={()=>{setForm({...profile});setModal('edit')}} className="btn btn-outline" style={{padding:'6px 14px',fontSize:12,borderRadius:20,fontWeight:700,fontFamily:'var(--font-display)'}}>
              <Ic n="edit" s={13} c="var(--text-primary)"/>Edit
            </button>
          </div>
          {[
            ['Name',profile.name],
            ['Phone',profile.phone],
            ['State',profile.state],
            ['LGA',profile.lga],
            ['Farm Size',profile.farmSize],
            ['Crops',profile.crops]
          ].map(([l,v])=>(
            <div key={l} style={{display:'flex',alignItems:'center',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <span style={{flex:1,fontSize:13,color:'var(--text-secondary)',fontWeight:500}}>{l}</span>
              <span style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{v}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><Ic n="settings" s={18} c="var(--text-highlight)"/><span style={{fontWeight:800,fontSize:15,fontFamily:'var(--font-display)',color:'var(--text-primary)'}}>App Settings</span></div>
          {[
            ['Push Notifications','Reminders & alerts',notif,setNotif],
            ['Offline Mode','Use AI without internet',offline,setOffline],
            ['Location Services','For dealer search',loc,setLoc]
          ].map(([l,s,v,set])=>(
            <div key={l} style={{display:'flex',alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{l}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{s}</div>
              </div>
              <Toggle val={v} set={set}/>
            </div>
          ))}
          {/* Cloud Sync Manual Trigger */}
          <div style={{display:'flex',alignItems:'center',padding:'12px 0',gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>FMN Cloud Sync</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Status: <span style={{fontWeight:750,color:syncStatus==='synced'?'#10b981':'var(--text-highlight)',textTransform:'capitalize'}}>{syncStatus}</span></div>
            </div>
            <button onClick={onTriggerSync} disabled={syncStatus === 'syncing'} className="btn btn-primary" style={{padding:'8px 14px',fontSize:12,borderRadius:10,width:'auto'}}>
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now 🔄'}
            </button>
          </div>
        </div>
        <div className="card">
          {[['About FMN AgriSense','ℹ️','about'],['Privacy Policy','🔒','privacy'],['Contact FMN Support','🎧','support'],['Rate the App','⭐','rate'],['Share with Farmers','📤','share']].map(([l,e,key],i,arr)=>(
            <button key={l} onClick={()=>setModal(key)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'13px 0',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontFamily:'var(--font)',borderBottom:i<arr.length-1?'1px solid var(--bdcolor)':'none'}}>
              <span style={{fontSize:22}}>{e}</span>
              <span style={{flex:1,fontSize:14,color:'var(--text-primary)',fontWeight:500}}>{l}</span>
              <Ic n="chevron" s={16} c="var(--text-muted)"/>
            </button>
          ))}
        </div>
        <div style={{textAlign:'center',fontSize:11,color:'var(--text-muted)',marginTop:20,lineHeight:1.8,fontWeight:500}}>
          FMN AgriSense  •  Version 1.0.0<br/>
          Built for FMN Innovation 5.0  •  March 2026
        </div>
      </div>

      {modal==='edit'&&<Modal title="✏️ Edit Profile" onClose={()=>setModal(null)}>
        <Field label="Full Name" field="name" placeholder="Your full name"/>
        <Field label="Phone" field="phone" placeholder="+234 ..."/>
        <Field label="Location" field="location" placeholder="e.g. Ogun State, FUNAAB"/>
        <Field label="State" field="state" placeholder="e.g. Ogun State"/>
        <Field label="LGA" field="lga" placeholder="e.g. Abeokuta South"/>
        <Field label="Farm Size" field="farmSize" placeholder="e.g. 3.5 Hectares"/>
        <Field label="Crops" field="crops" placeholder="e.g. Cassava, Maize"/>
        <button onClick={()=>{onSaveProfile(form);setModal(null)}} className="btn btn-primary" style={{width:'100%',marginTop:4,borderRadius:12}}>Save Changes</button>
      </Modal>}

      {modal==='about'&&<Modal title="ℹ️ About FMN AgriSense" onClose={()=>setModal(null)}>
        <div style={{textAlign:'center',marginBottom:20}}>
          <div style={{fontSize:56, filter:'drop-shadow(0 4px 10px rgba(0,0,0,0.3))'}}>🌿</div>
          <div style={{fontSize:20,fontWeight:800,color:'var(--text-primary)',fontFamily:'var(--font-display)',marginTop:10}}>FMN AgriSense</div>
          <div style={{fontSize:13,color:'var(--text-secondary)',fontWeight:500,marginTop:4}}>Version 1.0.0  •  FMN Innovation 5.0</div>
        </div>
        {[
          ['🤖 Real AI','Powered by EfficientNet trained on 21,367 cassava images from the Kaggle Cassava Disease dataset.'],
          ['🎯 Mission','Empowering Nigerian cassava farmers with instant AI disease detection, treatment plans, and FMN product recommendations.'],
          ['🏆 Competition','Built for FMN Innovation 5.0 to showcase how technology can protect Nigerian farms and increase yields.']
        ].map(([t,d])=>(
          <div key={t} className="card" style={{marginBottom:12, background:'var(--surface)'}}>
            <div style={{fontWeight:800,fontSize:14,color:'var(--text-primary)',fontFamily:'var(--font-display)',marginBottom:6}}>{t}</div>
            <div style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.6,fontWeight:500}}>{d}</div>
          </div>
        ))}
      </Modal>}

      {modal==='privacy'&&<Modal title="🔒 Privacy Policy" onClose={()=>setModal(null)}>
        {[
          ['Data We Collect','Farm location, crop photos, and usage data to improve disease detection. No financial data collected.'],
          ['How We Use It','Plant images are processed by AI for diagnosis. Images may be used anonymously to improve the model.'],
          ['Your Rights','You can request data deletion at any time by contacting FMN support.']
        ].map(([t,d])=>(
          <div key={t} style={{marginBottom:16,paddingBottom:16,borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:6,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>{t}</div>
            <div style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.6,fontWeight:500}}>{d}</div>
          </div>
        ))}
      </Modal>}

      {modal==='support'&&<Modal title="🎧 Contact FMN Support" onClose={()=>setModal(null)}>
        <div style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:18,padding:20,textAlign:'center',marginBottom:20}}>
          <div style={{fontSize:44,marginBottom:6}}>👨🏾‍💼</div>
          <div style={{fontWeight:800,fontSize:16,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>FMN AgriSense Support</div>
          <div style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,marginTop:4}}>Available Mon–Fri, 8am–5pm</div>
        </div>
        {[
          ['📞','0800-FMN-FARM','Toll-free hotline'],
          ['📧','agrisense@fmnplc.com','Response within 24 hours'],
          ['💬','+234 803 FMN HELP','WhatsApp agronomist'],
          ['🏢','1 Golden Penny Place, Lagos','FMN Head Office']
        ].map(([ic,c,s])=>(
          <div key={c} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{width:44,height:44,borderRadius:12,background:'var(--surface)',border:'1px solid var(--card-border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{ic}</div>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{c}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2,fontWeight:500}}>{s}</div>
            </div>
          </div>
        ))}
      </Modal>}

      {modal==='rate'&&<Modal title="⭐ Rate FMN AgriSense" onClose={()=>setModal(null)}>
        <div style={{textAlign:'center',padding:'10px 0 10px'}}>
          <div style={{fontSize:56,marginBottom:12}}>🌿</div>
          <div style={{fontSize:16,fontWeight:800,marginBottom:20,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>How would you rate this app?</div>
          <div style={{display:'flex',justifyContent:'center',gap:12,marginBottom:20}}>
            {[1,2,3,4,5].map(s=>(
              <button key={s} onClick={()=>setRating(s)} style={{fontSize:40,background:'none',border:'none',cursor:'pointer',opacity:s<=rating?1:0.25,transform:s<=rating?'scale(1.15)':'scale(1)',transition:'all 0.15s'}}>⭐</button>
            ))}
          </div>
          {rating>0&&<div style={{fontSize:14,color:'var(--text-highlight)',fontWeight:800,marginBottom:20,fontFamily:'var(--font-display)'}}>{['','Needs improvement 😐','Could be better 🙂','Pretty good! 😊','Love it! 😃','Amazing! 🤩'][rating]}</div>}
          {!ratingDone
            ?<button onClick={()=>{if(rating>0)setRatingDone(true)}} className="btn btn-primary" style={{width:'100%',borderRadius:12,opacity:rating>0?1:0.5,cursor:rating>0?'pointer':'default'}}>Submit Rating</button>
            :<div className="card" style={{background:'rgba(16,185,129,0.06)',borderColor:'rgba(16,185,129,0.25)',padding:20,borderRadius:16}}>
                <div style={{fontSize:32,marginBottom:8}}>🎉</div>
                <div style={{fontWeight:800,fontSize:15,color:'var(--text-primary)'}}>Thank you!</div>
                <div style={{fontSize:13,color:'var(--text-secondary)',marginTop:4,fontWeight:500}}>Your rating helps us serve Nigerian farmers better.</div>
              </div>
          }
        </div>
      </Modal>}

      {modal==='share'&&<Modal title="📤 Share with Farmers" onClose={()=>setModal(null)}>
        <div className="card" style={{padding:20,textAlign:'center',marginBottom:16,background:'var(--surface)'}}>
          <div style={{fontSize:40,marginBottom:6}}>🌿</div>
          <div style={{fontWeight:800,fontSize:16,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>FMN AgriSense</div>
          <div style={{fontSize:13,color:'var(--text-secondary)',marginTop:6,lineHeight:1.6,fontWeight:500}}>AI-powered cassava disease detection for Nigerian farmers. Free to use!</div>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <span style={{flex:1,fontSize:13,color:'var(--text-secondary)',fontFamily:'monospace'}}>fmn-agrisense.vercel.app</span>
          <button onClick={()=>{navigator.clipboard?.writeText('fmn-agrisense.vercel.app');setCopied(true);setTimeout(()=>setCopied(false),2000)}} style={{
            background:copied?'#10b981':'var(--text-highlight)',
            color:'white',
            border:'none',
            borderRadius:8,
            padding:'6px 14px',
            cursor:'pointer',
            fontFamily:'var(--font-display)',
            fontWeight:700,
            fontSize:12,
            transition:'background-color 0.2s'
          }}>{copied?'✓ Copied!':'Copy'}</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
          {[
            ['💬 WhatsApp','#25D366'],
            ['📱 SMS','var(--text-highlight)'],
            ['📘 Facebook','#1877F2'],
            ['✉️ Email','var(--accent)']
          ].map(([l,bg])=>(
            <button key={l} style={{padding:'12px',background:bg,color:'white',border:'none',borderRadius:12,fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:'0 4px 10px rgba(0,0,0,0.15)'}}>{l}</button>
          ))}
        </div>
      </Modal>}
    </div>
  )
}

function AdminDashboard({ users, scans, onLogout }) {
  const totalUsers = users?.length || 0;
  const totalScans = scans?.length || 0;
  const treatedScans = scans?.filter(s => s.treated)?.length || 0;
  const aiAccuracy = "94.2%"; // Mock AI metric

  return (
    <div className="screen fade-in" style={{background:'var(--bg-app)', padding:20, overflowY:'auto'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
        <div>
          <div style={{fontSize:24, fontWeight:900, fontFamily:'var(--font-display)', color:'var(--text-primary)'}}>IT Admin Panel</div>
          <div style={{color:'var(--text-muted)', fontSize:13}}>System Monitoring & Client Activities</div>
        </div>
        <button onClick={onLogout} style={{background:'var(--surface)', border:'1px solid var(--card-border)', borderRadius:8, padding:'8px 12px', cursor:'pointer', color:'var(--text-primary)', fontWeight:600}}>
          Sign Out
        </button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24}}>
        <div className="card" style={{padding:20, textAlign:'center'}}>
          <div style={{fontSize:32, fontWeight:900, color:'var(--primary)'}}>{totalUsers}</div>
          <div style={{fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase'}}>Registered Farmers</div>
        </div>
        <div className="card" style={{padding:20, textAlign:'center'}}>
          <div style={{fontSize:32, fontWeight:900, color:'var(--primary)'}}>{totalScans}</div>
          <div style={{fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase'}}>Total Scans Processed</div>
        </div>
        <div className="card" style={{padding:20, textAlign:'center'}}>
          <div style={{fontSize:32, fontWeight:900, color:'var(--primary)'}}>{treatedScans}</div>
          <div style={{fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase'}}>Diseases Treated</div>
        </div>
        <div className="card" style={{padding:20, textAlign:'center'}}>
          <div style={{fontSize:32, fontWeight:900, color:'var(--primary)'}}>{aiAccuracy}</div>
          <div style={{fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase'}}>AI Accuracy (7d)</div>
        </div>
      </div>

      <div style={{fontSize:16, fontWeight:800, fontFamily:'var(--font-display)', marginBottom:12, color:'var(--text-primary)'}}>Recent Client Activities</div>
      <div className="card" style={{overflow:'hidden'}}>
        {scans?.slice(0, 5).map((scan, i) => {
          const user = users?.find(u => u.id === scan.user_id)
          return (
            <div key={scan.id} style={{padding:16, borderBottom: i < 4 ? '1px solid var(--card-border)' : 'none', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700, fontSize:14, color:'var(--text-primary)'}}>{user?.full_name || 'Unknown Farmer'}</div>
                <div style={{fontSize:12, color:'var(--text-muted)'}}>Scanned {scan.field} • {scan.disease_id === 'healthy' ? 'Healthy' : 'Infected'}</div>
              </div>
              <div style={{fontSize:12, color:'var(--text-secondary)'}}>{new Date(scan.created_at).toLocaleDateString()}</div>
            </div>
          )
        })}
        {scans?.length === 0 && <div style={{padding:24, textAlign:'center', color:'var(--text-muted)'}}>No client activities yet.</div>}
      </div>
    </div>
  )
}

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        if (!fullName.trim()) throw new Error("Full name is required")
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: fullName, admin_code: adminCode } }
        })
        if (error) throw error
        
        // If email confirmation is required by Supabase, session will be null
        if (!data.session) {
          setError("Registration successful! Please check your email inbox to confirm your account.")
          return
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen fade-in" style={{display:'flex',flexDirection:'column',justifyContent:'center',padding:20,background:'var(--bg-app)'}}>
      <div style={{textAlign:'center',marginBottom:40}}>
        <div style={{fontSize:48,marginBottom:10}}>🌿</div>
        <div style={{fontSize:28,fontWeight:900,fontFamily:'var(--font-display)',color:'var(--text-primary)',letterSpacing:-0.5}}>Cassava Doctor</div>
        <div style={{color:'var(--text-secondary)',fontSize:14,marginTop:8}}>Your AI crop protection assistant</div>
      </div>
      
      <div className="card" style={{padding:24}}>
        <div style={{fontSize:20,fontWeight:800,fontFamily:'var(--font-display)',color:'var(--text-primary)',marginBottom:20}}>
          {isLogin ? 'Welcome back' : 'Create account'}
        </div>

        {error && <div style={{background:'rgba(239,68,68,0.1)', color:'#ef4444', padding:12, borderRadius:8, fontSize:13, marginBottom:16}}>{error}</div>}
        
        {!isLogin && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Full Name</div>
            <input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="e.g. John Doe" style={{width:'100%',padding:'14px',background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:12,color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:15}}/>
          </div>
        )}
        
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Email Address</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="john@example.com" style={{width:'100%',padding:'14px',background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:12,color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:15}}/>
        </div>
        
        <div style={{marginBottom:!isLogin ? 16 : 24}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Password</div>
          <div style={{position: 'relative'}}>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{width:'100%',padding:'14px',paddingRight:40,background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:12,color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:15}}/>
            <button onClick={() => setShowPassword(!showPassword)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex',alignItems:'center'}}>
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </div>

        {!isLogin && (
          <div style={{marginBottom:24}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Admin Code (Optional)</div>
            <input type="text" value={adminCode} onChange={e=>setAdminCode(e.target.value)} placeholder="Leave blank if farmer" style={{width:'100%',padding:'14px',background:'var(--surface)',border:'1px solid var(--card-border)',borderRadius:12,color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:15}}/>
          </div>
        )}
        
        <button onClick={handleSubmit} disabled={loading} className="btn btn-primary" style={{width:'100%',padding:'16px',fontSize:16,borderRadius:12,opacity:loading?0.7:1}}>
          {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
        </button>
        
        <div style={{textAlign:'center',marginTop:20,fontSize:14,color:'var(--text-secondary)'}}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={()=>{setIsLogin(!isLogin);setError(null)}} style={{color:'var(--primary-light)',fontWeight:700,cursor:'pointer'}}>{isLogin ? 'Sign up' : 'Log in'}</span>
        </div>
      </div>
    </div>
  )
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('cassava_auth') === 'true')
  const [screen,  setScreen]  = useState('home')
  const [params,  setParams]  = useState({})
  const [analyzing, setAnalyzing] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('cassava_theme') || 'dark')

  useEffect(() => {
    localStorage.setItem('cassava_theme', theme)
  }, [theme])

  function handleLogin() {
    localStorage.setItem('cassava_auth', 'true')
    setIsAuthenticated(true)
  }

  function handleLogout() {
    localStorage.removeItem('cassava_auth')
    setIsAuthenticated(false)
  }

  // Local-first synchronized states
  const [profile, setProfile] = useState(() => getLocalProfile())
  const [scans, setScans] = useState(() => getLocalScans())
  const [reminders, setReminders] = useState(() => getLocalReminders())
  const [syncStatus, setSyncStatus] = useState('offline') // syncing | synced | offline | error

  // Bind sync state updates to client React states
  const onStateUpdated = (newState) => {
    if (newState.profile) setProfile(newState.profile);
    if (newState.scans) setScans(newState.scans);
    if (newState.reminders) setReminders(newState.reminders);
  };

  useEffect(() => {
    initSyncEngine(onStateUpdated, setSyncStatus);
  }, []);

  function handleSaveProfile(newProfile) {
    const updated = saveLocalProfile(newProfile);
    setProfile(updated);
    triggerSync(onStateUpdated, setSyncStatus);
  }

  function handleSaveScan(newScan) {
    const updated = saveLocalScan(newScan);
    setScans(updated);
    triggerSync(onStateUpdated, setSyncStatus);
  }

  function handleDeleteScan(scanId) {
    const updated = deleteLocalScan(scanId);
    setScans(updated);
    triggerSync(onStateUpdated, setSyncStatus);
  }

  function handleSaveReminder(reminder) {
    const updated = saveLocalReminder(reminder);
    setReminders(updated);
    triggerSync(onStateUpdated, setSyncStatus);
  }

  function handleDeleteReminder(reminderId) {
    const updated = deleteLocalReminder(reminderId);
    setReminders(updated);
    triggerSync(onStateUpdated, setSyncStatus);
  }

  function handleTriggerSync() {
    triggerSync(onStateUpdated, setSyncStatus);
  }

  function go(s, p={}) { setScreen(s); setParams(p) }

  function startAnalyzing(diseaseId, confidence=null, allScores=null) {
    setAnalyzing(true)
    setTimeout(() => {
      setAnalyzing(false)
      // Save scan to local history and trigger sync
      const newScan = {
        id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        diseaseId,
        fieldName: 'North Field A',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        confidence: confidence !== null ? confidence : Math.round(80 + Math.random() * 19),
        treated: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      handleSaveScan(newScan);
      go('diagnosis', { diseaseId, aiConfidence: confidence, allScores })
    }, 2500)
  }

  const NAV=[{id:'home',label:'Home',icon:'home'},{id:'scan',label:'Scan',icon:'scan'},{id:'reminders',label:'Tasks',icon:'bell'},{id:'history',label:'History',icon:'clock'},{id:'profile',label:'Profile',icon:'user'}]
  const time = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
  const activeNav = NAV.find(n=>n.id===screen)?.id || 'home'

  const p = { go, ...params }
  const renderScreen = () => {
    if (analyzing) return <AnalyzingScreen/>
    switch(screen) {
      case 'home':      return <HomeScreen {...p} profile={profile} scans={scans} reminders={reminders}/>
      case 'scan':      return <ScanScreen {...p} startAnalyzing={startAnalyzing}/>
      case 'diagnosis': return <DiagnosisScreen {...p} diseaseId={params.diseaseId} aiConfidence={params.aiConfidence} allScores={params.allScores}/>
      case 'treatment': return <TreatmentScreen {...p} diseaseId={params.diseaseId}/>
      case 'products':  return <ProductsScreen  {...p} diseaseId={params.diseaseId}/>
      case 'reminders': return <RemindersScreen {...p} reminders={reminders} onSaveReminder={handleSaveReminder} onDeleteReminder={handleDeleteReminder}/>
      case 'history':   return <HistoryScreen   {...p} scans={scans}/>
      case 'dealers':   return <DealersScreen   {...p}/>
      case 'profile':   return <ProfileScreen   {...p} profile={profile} scans={scans} onSaveProfile={handleSaveProfile} syncStatus={syncStatus} onTriggerSync={handleTriggerSync}/>
      default:          return <HomeScreen {...p} profile={profile} scans={scans} reminders={reminders}/>
    }
  }
  if (!isAuthenticated) {
    return (
      <div className="app-shell" data-theme={theme}>
        <div className="phone">
          <div style={{position:'absolute',top:20,right:20,zIndex:10}}>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{
              background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: '50%',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s'
            }}>
              <span style={{fontSize: 14}}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>
          </div>
          <AuthScreen onLogin={handleLogin} />
        </div>
      </div>
    )
  }

  if (isAdmin) {
    return (
      <div className="app-shell" data-theme={theme}>
        <div className="phone" style={{width: '100%', maxWidth: 'none', height: '100vh', borderRadius: 0}}>
          <AdminDashboard users={adminUsers} scans={adminScans} onLogout={handleLogout} />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <div className="phone">
        {/* Top app bar */}
        <div style={{
          background: 'var(--bg-app)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid var(--card-border)',
          flexShrink: 0
        }}>
          <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '0.2px' }}>🌿 Cassava Doctor</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {syncStatus === 'syncing' && <span style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>🔄 Syncing</span>}
            {syncStatus === 'synced' && <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>☁️ Synced</span>}
            
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{
              background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: '50%',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s'
            }}>
              <span style={{fontSize: 14}}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>
          </span>
        </div>

        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          {renderScreen()}
        </div>
        {!analyzing&&(
          <nav className="bottom-nav">
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>go(n.id)} className={`nav-item${activeNav===n.id?' active':''}`}>
                <div style={{ background: activeNav===n.id ? 'var(--primary-light)' : 'transparent', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', marginBottom: 2 }}>
                  <Ic n={n.icon} s={20} c={activeNav===n.id?'white':'var(--text-muted)'}/>
                </div>
                {n.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
