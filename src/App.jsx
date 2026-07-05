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
  initSyncEngine 
} from './utils/sync'

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
      <div style={{background:'linear-gradient(160deg,#001F5B 0%,#003087 100%)',padding:'18px 16px 22px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{color:'#A8C4E8',fontSize:12,fontWeight:600}}>Good morning 👋</div>
            <div style={{color:'white',fontSize:20,fontWeight:800,marginTop:3}}>{profile.name}</div>
            <div style={{color:'#90B8E0',fontSize:12,marginTop:3}}>{profile.location}  •  {profile.farmSize}</div>
          </div>
          <button onClick={()=>go('profile')} style={{background:'rgba(255,255,255,0.12)',border:'none',borderRadius:'50%',width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <Ic n="bell" s={20} c="white"/>
          </button>
        </div>
        <div style={{background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'8px 12px',marginTop:12,display:'flex',alignItems:'center',gap:8}}>
          <Ic n="sun" s={16} c="#FDD835"/>
          <span style={{color:'white',fontSize:12}}>32°C  •  {profile.state || 'Ogun State'}  •  Low disease risk today</span>
        </div>
      </div>

      <div className="content">
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
          {[['94%','AI Accuracy','#0044B3'],['5','Diseases','#E8381A'],[scans.length,'Scans','#6A1B9A']].map(([v,l,c])=>(
            <div key={l} className="card" style={{textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Scan CTA */}
        <button onClick={()=>go('scan')} style={{width:'100%',background:'linear-gradient(135deg,#003087 0%,#001F5B 100%)',border:'none',borderRadius:18,padding:'18px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',marginBottom:16,boxShadow:'0 8px 24px rgba(0,48,135,0.35)'}}>
          <div style={{textAlign:'left'}}>
            <div style={{color:'white',fontSize:18,fontWeight:800}}>Scan Your Plant</div>
            <div style={{color:'rgba(255,255,255,0.75)',fontSize:12,marginTop:5,lineHeight:1.5}}>Upload a photo for instant AI<br/>disease detection & advice</div>
            <div style={{background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'4px 12px',display:'inline-block',marginTop:9,color:'white',fontSize:11,fontWeight:600}}>🤖 Real AI — Trained Model</div>
          </div>
          <Ic n="scan" s={52} c="rgba(255,255,255,0.85)"/>
        </button>

        {/* Quick Actions */}
        <div style={{fontSize:15,fontWeight:800,marginBottom:10}}>Quick Actions</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16}}>
          {[['flask','Products','#0044B3','products'],['location','Dealer','#E8381A','dealers'],['bell','Reminders','#6A1B9A','reminders'],['clock','History','#1565C0','history']].map(([ic,lb,col,sc])=>(
            <button key={lb} onClick={()=>go(sc)} style={{background:'white',border:'none',borderRadius:12,padding:'10px 6px',display:'flex',flexDirection:'column',alignItems:'center',gap:5,cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
              <div style={{width:40,height:40,borderRadius:12,background:col+'18',display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n={ic} s={20} c={col}/></div>
              <span style={{fontSize:10,fontWeight:700,color:'var(--text2)',textAlign:'center'}}>{lb}</span>
            </button>
          ))}
        </div>

        {/* Upcoming */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div style={{fontSize:15,fontWeight:800}}>Upcoming Tasks</div>
          <button onClick={()=>go('reminders')} style={{background:'none',border:'none',color:'var(--lblue)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)'}}>See all</button>
        </div>
        {reminders.filter(r=>r.enabled&&(r.nextDue==='Today'||r.nextDue==='Tomorrow')).map(r=>(
          <div key={r.id} className="card" style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:r.nextDue==='Today'?'var(--lblue)':'var(--accent)',flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700}}>{r.title}</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{r.nextDue}  •  {r.time}</div>
            </div>
            <span style={{background:r.nextDue==='Today'?'var(--pale)':'var(--accentl)',color:r.nextDue==='Today'?'var(--lblue)':'var(--accent)',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{r.nextDue}</span>
          </div>
        ))}

        {/* Recent */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8,marginBottom:10}}>
          <div style={{fontSize:15,fontWeight:800}}>Recent Diagnoses</div>
          <button onClick={()=>go('history')} style={{background:'none',border:'none',color:'var(--lblue)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)'}}>See all</button>
        </div>
        {scans.slice(0,3).map(item=>{
          const d=DISEASES.find(x=>x.id===item.diseaseId)||DISEASES[4]
          return (
            <button key={item.id} onClick={()=>go('diagnosis',{diseaseId:item.diseaseId})} style={{width:'100%',background:'white',border:'none',borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,marginBottom:8,cursor:'pointer',textAlign:'left',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
              <div style={{width:46,height:46,borderRadius:14,background:d.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{d.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700}}>{d.name}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{item.fieldName || item.field || 'Field A'}  •  {item.date}</div>
              </div>
              <span style={{background:d.sevBg,color:d.sevColor,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{d.severity==='None'?'Healthy':d.severity}</span>
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

  const statusLabel = status==='ready' ? '🟢 AI Model Ready' : status==='loading' ? '🟡 ' + (msg||'Analyzing...') : status==='error' ? '🔴 AI Error — check console' : '📷 Upload a cassava leaf photo'

  return (
    <div className="screen fade-in">
      <div className="hdr">
        <div style={{color:'white',fontSize:20,fontWeight:800}}>Scan Plant</div>
        <div style={{color:'#A8C4E8',fontSize:12,marginTop:2}}>{statusLabel}</div>
      </div>
      <div className="content">
        {/* Viewfinder */}
        <div style={{background:preview?'black':'rgba(0,31,91,0.05)',borderRadius:18,aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',border:`2px ${preview?'solid':'dashed'} var(--border)`,marginBottom:14,position:'relative',overflow:'hidden'}}>
          {preview
            ? <img src={preview} alt="preview" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : <>
                {['top-left','top-right','bottom-left','bottom-right'].map(pos=>{
                  const [v,h]=pos.split('-')
                  return <div key={pos} style={{position:'absolute',[v]:12,[h]:12,width:28,height:28,[`border${v.charAt(0).toUpperCase()+v.slice(1)}`]:'3px solid var(--llight)',[`border${h.charAt(0).toUpperCase()+h.slice(1)}`]:'3px solid var(--llight)',borderRadius:v==='top'?(h==='left'?'4px 0 0 0':'0 4px 0 0'):(h==='left'?'0 0 0 4px':'0 0 4px 0')}}/>
                })}
                <div style={{textAlign:'center'}}>
                  <Ic n="leaf" s={56} c="var(--border)"/>
                  <div style={{color:'var(--text3)',fontSize:13,marginTop:10}}>Position cassava leaf<br/>within the frame</div>
                </div>
              </>
          }
          {msg&&<div style={{position:'absolute',inset:0,background:'rgba(0,31,91,0.88)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
            <div style={{width:40,height:40,borderRadius:'50%',border:'3px solid var(--llight)',borderTopColor:'transparent',animation:'spin 1s linear infinite'}}/>
            <div style={{color:'white',fontSize:13,fontWeight:700}}>{msg}</div>
          </div>}
        </div>

        {/* Upload */}
        <label style={{display:'block',marginBottom:10}}>
          <input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handleFile}/>
          <div className="btn btn-accent" style={{width:'100%',justifyContent:'center',fontSize:15}}>
            <Ic n="camera" s={18} c="white"/>
            {preview?'Scan a Different Photo':'Upload or Take Photo'}
          </div>
        </label>

        {/* AI badge */}
        <div style={{background:'var(--pale)',borderRadius:10,padding:'8px 12px',display:'flex',alignItems:'center',gap:8,marginBottom:14,border:'1px solid var(--border)'}}>
          <span style={{fontSize:18}}>🤖</span>
          <span style={{fontSize:12,color:'var(--blue)',fontWeight:700}}>Powered by real AI — trained on 21,367 cassava images</span>
        </div>

        {/* Tips */}
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>📸 Photo Tips for Best Results</div>
          {['Use good natural lighting — avoid shadows','Fill the frame with 1–2 leaves clearly','Keep camera steady — avoid blurry shots','Include stem if symptoms are visible there'].map((t,i)=>(
            <div key={i} style={{display:'flex',gap:8,marginBottom:6}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'var(--lblue)',marginTop:5,flexShrink:0}}/>
              <span style={{fontSize:12,color:'var(--text2)',lineHeight:1.5}}>{t}</span>
            </div>
          ))}
        </div>

        {/* Samples */}
        <div style={{fontSize:14,fontWeight:800,marginBottom:4}}>Try a Sample (Demo)</div>
        <div style={{fontSize:11,color:'var(--text3)',marginBottom:8}}>These use preset results — upload a real photo for actual AI detection</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {SAMPLES.map(s=>(
            <button key={s.id} onClick={()=>startAnalyzing(s.id,null)} style={{background:'white',border:'1.5px solid var(--bdcolor)',borderRadius:12,padding:'10px 12px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:64}}>
              <span style={{fontSize:26}}>{s.emoji}</span>
              <span style={{fontSize:10,fontWeight:700,color:'var(--text2)'}}>{s.label}</span>
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
    <div style={{flex:1,background:'#001F5B',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:32}}>
      <div style={{position:'relative',width:110,height:110,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'3px solid rgba(30,111,217,0.3)',animation:'pulse 1.4s ease-in-out infinite'}}/>
        <div style={{position:'absolute',inset:14,borderRadius:'50%',border:'3px solid rgba(30,111,217,0.5)',animation:'pulse 1.4s ease-in-out 0.2s infinite'}}/>
        <div style={{width:60,height:60,borderRadius:'50%',background:'rgba(30,111,217,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>🔬</div>
      </div>
      <div style={{color:'white',fontSize:22,fontWeight:800}}>Analyzing Plant...</div>
      <div style={{color:'#A8C4E8',fontSize:13}}>AI model processing your image</div>
      <div style={{display:'flex',gap:8}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:'#1E6FD9',animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}</div>
      {['Scanning leaf texture...','Detecting disease patterns...','Matching disease database...'].map((s,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:8,alignSelf:'stretch'}}>
          <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid #1E6FD9',borderTopColor:'transparent',animation:`spin 1s linear ${i*0.3}s infinite`}}/>
          <span style={{color:'rgba(255,255,255,0.65)',fontSize:13}}>{s}</span>
        </div>
      ))}
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
      <div style={{background:'#001F5B'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px 0'}}>
          <button onClick={()=>go('home')} style={{background:'rgba(255,255,255,0.12)',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="back" s={18} c="white"/></button>
          <span style={{color:'white',fontWeight:700}}>Diagnosis Result</span>
          <div style={{width:36}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:130,fontSize:72}}>{d.icon}</div>
        <div style={{padding:'0 16px 20px'}}>
          <span style={{background:d.sevBg,color:d.sevColor,fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20,display:'inline-block',marginBottom:10}}>{d.severity==='None'?'✅ Healthy':`⚠️ ${d.severity}`}</span>
          {isReal&&<span style={{background:'rgba(30,111,217,0.2)',color:'#A8C4E8',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20,display:'inline-block',marginBottom:10,marginLeft:6}}>🤖 Real AI Result</span>}
          <div style={{color:'white',fontSize:22,fontWeight:900,lineHeight:1.2}}>{d.name}</div>
          <div style={{color:'#A8C4E8',fontSize:12,marginTop:4}}>{d.short}</div>
          <div style={{marginTop:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
              <span style={{color:'rgba(255,255,255,0.65)',fontSize:12}}>AI Confidence</span>
              <span style={{color:'#1E6FD9',fontSize:12,fontWeight:700}}>{conf}%</span>
            </div>
            <div style={{height:6,background:'rgba(255,255,255,0.15)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${conf}%`,background:'#1E6FD9',borderRadius:3}}/>
            </div>
          </div>
        </div>
      </div>
      <div className="content">
        <div className="card" style={{marginBottom:10}}>
          <div style={{fontWeight:700,marginBottom:6,fontSize:14}}>About this Condition</div>
          <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.7}}>{d.desc}</div>
        </div>
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>Symptoms Detected</div>
          {d.symptoms.map((s,i)=>(
            <div key={i} style={{display:'flex',gap:8,marginBottom:7}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:d.color,marginTop:5,flexShrink:0}}/>
              <span style={{fontSize:13,color:'var(--text2)',lineHeight:1.5}}>{s}</span>
            </div>
          ))}
        </div>
        {allScores && (
          <div className="card" style={{marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>🤖 AI Confidence Breakdown</div>
            {Object.entries(allScores).sort(([,a],[,b])=>b-a).map(([id,pct])=>{
              const d2=DISEASES.find(x=>x.id===id)||{name:id,color:'#888',icon:'🌿'}
              return (
                <div key={id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
                  <span style={{fontSize:16,width:24}}>{d2.icon}</span>
                  <span style={{fontSize:12,color:'var(--text2)',width:160,flexShrink:0}}>{d2.name}</span>
                  <div style={{flex:1,height:8,background:'#F0F0F0',borderRadius:4,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:d2.color,borderRadius:4,transition:'width 0.5s'}}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:d2.color,width:34,textAlign:'right'}}>{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
          <button onClick={()=>go('treatment',{diseaseId})} className="btn btn-primary"><Ic n="medkit" s={15} c="white"/>Treatment</button>
          <button onClick={()=>go('products',{diseaseId})} className="btn btn-outline"><Ic n="flask" s={15} c="var(--blue)"/>Products</button>
        </div>
        <button onClick={()=>go('dealers')} className="btn" style={{width:'100%',background:'white',color:'var(--accent)',border:'1.5px solid #FFD0C8',marginBottom:8}}><Ic n="location" s={15} c="var(--accent)"/>Find Nearest FMN Dealer</button>
        <button onClick={()=>go('scan')} className="btn" style={{width:'100%',background:'transparent',color:'var(--text3)'}}><Ic n="scan" s={15} c="var(--text3)"/>Scan another plant</button>
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
      <div className="hdr">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <button onClick={()=>go('diagnosis',{diseaseId})} style={{background:'rgba(255,255,255,0.12)',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="back" s={18} c="white"/></button>
          <div style={{textAlign:'center'}}><div style={{color:'white',fontWeight:800}}>Treatment Plan</div><div style={{color:'#A8C4E8',fontSize:12}}>{d.short}</div></div>
          <div style={{width:36}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
          <span style={{color:'rgba(255,255,255,0.65)',fontSize:12}}>{done}/{d.treatment.length} steps</span>
          <span style={{color:'#1E6FD9',fontSize:12,fontWeight:700}}>{pct}%</span>
        </div>
        <div style={{height:6,background:'rgba(255,255,255,0.15)',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:'#1E6FD9',borderRadius:3,transition:'width 0.4s'}}/>
        </div>
      </div>
      <div style={{display:'flex',background:'var(--bg)',borderBottom:'1px solid var(--bdcolor)',padding:'4px 14px 0'}}>
        {['treatment','prevention','schedule'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'8px 12px',border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font)',fontSize:13,fontWeight:700,color:tab===t?'var(--blue)':'var(--text3)',borderBottom:`2.5px solid ${tab===t?'var(--blue)':'transparent'}`,textTransform:'capitalize'}}>{t}</button>
        ))}
      </div>
      <div className="content" style={{overflowY:'auto'}}>
        {tab==='treatment'&&<>
          <div style={{fontSize:12,color:'var(--text3)',marginBottom:12}}>Tap each step to mark as completed.</div>
          {d.treatment.map((step,i)=>(
            <button key={i} onClick={()=>setChecked(p=>({...p,[i]:!p[i]}))} style={{width:'100%',background:checked[i]?'var(--pale)':'white',border:`1.5px solid ${checked[i]?'var(--border)':'transparent'}`,borderRadius:12,padding:12,display:'flex',alignItems:'flex-start',gap:10,marginBottom:8,cursor:'pointer',textAlign:'left',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
              <div style={{width:26,height:26,borderRadius:'50%',background:checked[i]?'var(--llight)':'var(--blue)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {checked[i]?<Ic n="check" s={13} c="white"/>:<span style={{color:'white',fontSize:12,fontWeight:700}}>{i+1}</span>}
              </div>
              <span style={{fontSize:13,color:checked[i]?'var(--text3)':'var(--text)',lineHeight:1.6,textDecoration:checked[i]?'line-through':'none'}}>{step}</span>
            </button>
          ))}
          <button onClick={()=>go('products',{diseaseId})} className="btn btn-accent" style={{width:'100%',marginTop:8}}><Ic n="flask" s={15} c="white"/>View FMN Products →</button>
        </>}
        {tab==='prevention'&&<>
          <div className="card" style={{marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><Ic n="shield" s={20} c="var(--blue)"/><span style={{fontWeight:700,fontSize:14}}>Prevention Strategy</span></div>
            <p style={{fontSize:13,color:'var(--text2)',lineHeight:1.7}}>{d.prevention}</p>
          </div>
          {['Use certified disease-free planting materials every season','Conduct soil tests before planting','Apply FMN preventive spray from day one','Keep detailed farm records of all treatments','Attend FMN farmer training workshops'].map((t,i)=>(
            <div key={i} className="card" style={{display:'flex',gap:10,marginBottom:8}}><Ic n="check" s={17} c="var(--blue)"/><span style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>{t}</span></div>
          ))}
        </>}
        {tab==='schedule'&&[['Day 1',['Remove infected plants','First fungicide treatment']],['Day 3',['Inspect neighbours','Disinfect tools']],['Day 7',['Second spray','Check for new symptoms']],['Day 14',['Repeat treatment','Document recovery']]].map(([day,tasks],i,arr)=>(
          <div key={day} style={{display:'flex',gap:12,marginBottom:4}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:52}}>
              <div style={{background:i===0?'var(--blue)':'var(--pale)',borderRadius:8,padding:'6px 8px',width:'100%',textAlign:'center'}}>
                <span style={{fontSize:11,fontWeight:800,color:i===0?'white':'var(--blue)'}}>{day}</span>
              </div>
              {i<arr.length-1&&<div style={{width:2,flex:1,background:'var(--border)',margin:'4px 0'}}/>}
            </div>
            <div className="card" style={{flex:1,marginBottom:8}}>
              {tasks.map((t,j)=>(
                <div key={j} style={{display:'flex',gap:8,alignItems:'center',paddingBottom:j<tasks.length-1?7:0,marginBottom:j<tasks.length-1?7:0,borderBottom:j<tasks.length-1?'1px solid #F0F0F0':'none'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'var(--blue)',flexShrink:0}}/><span style={{fontSize:13}}>{t}</span>
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
      <div className="hdr">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>go('home')} style={{background:'rgba(255,255,255,0.12)',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="back" s={18} c="white"/></button>
          <div><div style={{color:'white',fontSize:18,fontWeight:800}}>FMN Products</div><div style={{color:'#A8C4E8',fontSize:12}}>Agrochemicals & Fertilizers</div></div>
        </div>
      </div>
      <div style={{background:'white',borderBottom:'1px solid var(--bdcolor)',padding:'8px 14px',display:'flex',gap:6,overflowX:'auto',flexShrink:0}}>
        {cats.map(c=><button key={c} onClick={()=>setFilter(c)} style={{padding:'5px 12px',borderRadius:20,border:`1.5px solid ${filter===c?'var(--blue)':'var(--bdcolor)'}`,background:filter===c?'var(--blue)':'var(--bg)',color:filter===c?'white':'var(--text2)',fontFamily:'var(--font)',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{c}</button>)}
      </div>
      <div className="content" style={{overflowY:'auto'}}>
        {recIds.length>0&&filter==='All'&&<div style={{background:'var(--pale)',borderRadius:12,padding:'8px 12px',marginBottom:12,display:'flex',alignItems:'center',gap:8,border:'1px solid var(--border)'}}><Ic n="star" s={15} c="var(--accent)"/><span style={{fontSize:12,fontWeight:700,color:'var(--blue)'}}>⭐ Starred: recommended for {d?.short}</span></div>}
        {filtered.map(p=>{
          const isRec=recIds.includes(p.id)
          return (
            <div key={p.id} className="card" style={{marginBottom:10,border:isRec?`2px solid var(--border)`:'1.5px solid transparent'}}>
              {isRec&&<span style={{background:'var(--pale)',color:'var(--blue)',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,display:'inline-block',marginBottom:8}}>⭐ Recommended</span>}
              <div style={{display:'flex',gap:12,marginBottom:8}}>
                <div style={{width:54,height:54,borderRadius:14,background:p.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>{p.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14}}>{p.name}</div>
                  <span style={{fontSize:11,fontWeight:700,color:p.color,background:p.color+'15',padding:'2px 8px',borderRadius:20,display:'inline-block',marginTop:2}}>{p.cat}</span>
                  <div style={{fontSize:15,fontWeight:800,color:'var(--blue)',marginTop:3}}>{p.price}</div>
                </div>
              </div>
              <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.6,marginBottom:6}}>{p.desc}</div>
              <div style={{fontSize:11,color:'var(--text3)',marginBottom:10}}>💊 {p.dosage}</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>go('dealers')} className="btn btn-primary" style={{flex:1,fontSize:12,padding:'9px 10px'}}><Ic n="location" s={14} c="white"/>Find Store</button>
                <button className="btn btn-outline" style={{flex:1,fontSize:12,padding:'9px 10px'}}><Ic n="phone" s={14} c="var(--blue)"/>Order</button>
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
      <div className="hdr">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{color:'white',fontSize:20,fontWeight:800}}>Reminders</div><div style={{color:'#A8C4E8',fontSize:12,marginTop:2}}>{active} active tasks</div></div>
          <button onClick={()=>setShowAdd(true)} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.15)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="plus" s={22} c="white"/></button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:12}}>
          {[['Active',active,'#1E6FD9'],['Paused',reminders.length-active,'#A8C4E8'],['Due Today',reminders.filter(r=>r.nextDue==='Today'&&r.enabled).length,'#FFD54F']].map(([l,v,c])=>(
            <div key={l} style={{background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="content">
        {reminders.map(r=>(
          <div key={r.id} className="card" style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10,opacity:r.enabled?1:0.55}}>
            <div style={{width:44,height:44,borderRadius:12,background:'var(--pale)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{r.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13}}>{r.title}</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{r.time}  •  {r.days}</div>
              {r.nextDue&&<span style={{background:r.nextDue==='Today'?'var(--pale)':'var(--accentl)',color:r.nextDue==='Today'?'var(--blue)':'var(--accent)',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,display:'inline-block',marginTop:5}}>Next: {r.nextDue}</span>}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'center'}}>
              <button onClick={()=>onSaveReminder({...r, enabled:!r.enabled, updatedAt:Date.now()})} style={{width:42,height:24,borderRadius:12,background:r.enabled?'var(--llight)':'#E0E0E0',border:'none',cursor:'pointer',position:'relative'}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,left:r.enabled?21:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
              </button>
              <button onClick={()=>onDeleteReminder(r.id)} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="trash" s={15} c="var(--text4)"/></button>
            </div>
          </div>
        ))}
      </div>
      {showAdd&&(
        <div onClick={()=>setShowAdd(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'flex-end',zIndex:100}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'20px 20px 0 0',padding:24,width:'100%'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <span style={{fontSize:18,fontWeight:800}}>Add Reminder</span>
              <button onClick={()=>setShowAdd(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--text3)'}}>✕</button>
            </div>
            <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="e.g. Apply FMN BioGuard Spray" style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid var(--bdcolor)',fontFamily:'var(--font)',fontSize:14,outline:'none',marginBottom:16}}/>
            <button onClick={()=>{if(newTitle.trim()){onSaveReminder({id:Date.now().toString(),title:newTitle,time:'07:00 AM',days:'Mon',icon:'💧',enabled:true,nextDue:'Mon',createdAt:Date.now(),updatedAt:Date.now()});setNewTitle('');setShowAdd(false)}}} className="btn btn-primary" style={{width:'100%'}}>Save Reminder</button>
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
      <div className="hdr">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div><div style={{color:'white',fontSize:20,fontWeight:800}}>Scan History</div><div style={{color:'#A8C4E8',fontSize:12,marginTop:2}}>{scans.length} total diagnoses</div></div>
          <button style={{background:'rgba(255,255,255,0.12)',border:'none',borderRadius:'50%',width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="download" s={18} c="white"/></button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
          {[['Total',scans.length,'#1E6FD9'],['Diseases',scans.filter(h=>['cmd','cbsd','cbb','cgm'].includes(h.diseaseId)).length,'#FFD54F'],['Healthy',scans.filter(h=>h.diseaseId==='healthy').length,'#A8C4E8'],['Treated',scans.filter(h=>h.treated).length,'#CE93D8']].map(([l,v,c])=>(
            <div key={l} style={{background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'8px 4px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.6)'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'white',borderBottom:'1px solid var(--bdcolor)',padding:'8px 14px',display:'flex',gap:6,overflowX:'auto',flexShrink:0}}>
        {['All','Disease','Healthy','Treated'].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:'5px 12px',borderRadius:20,border:`1.5px solid ${filter===f?'var(--blue)':'var(--bdcolor)'}`,background:filter===f?'var(--blue)':'var(--bg)',color:filter===f?'white':'var(--text2)',fontFamily:'var(--font)',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{f}</button>)}
      </div>
      <div className="content" style={{overflowY:'auto'}}>
        {filtered.map(item=>{
          const d=DISEASES.find(x=>x.id===item.diseaseId)||DISEASES[4]
          return (
            <button key={item.id} onClick={()=>go('diagnosis',{diseaseId:item.diseaseId})} style={{width:'100%',background:'white',border:'none',borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,marginBottom:8,cursor:'pointer',textAlign:'left',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
              <div style={{width:50,height:50,borderRadius:14,background:d.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>{d.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{d.name}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>📍 {item.fieldName || item.field || 'Field A'}  •  {item.date}</div>
                <div style={{display:'flex',gap:5,marginTop:4}}>
                  <span style={{background:d.sevBg,color:d.sevColor,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{d.severity==='None'?'Healthy':d.severity}</span>
                  {item.treated&&<span style={{background:'var(--pale)',color:'var(--blue)',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>✓ Treated</span>}
                </div>
              </div>
              <Ic n="chevron" s={16} c="var(--text4)"/>
            </button>
          )
        })}
        <button onClick={()=>go('scan')} className="btn btn-outline" style={{width:'100%',marginTop:6}}><Ic n="scan" s={15} c="var(--blue)"/>Perform New Scan</button>
      </div>
    </div>
  )
}

// ── DEALERS ──────────────────────────────────────────────────────────────────
function DealersScreen({ go }) {
  const [sel,setSel]=useState(null)
  return (
    <div className="screen fade-in" style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div className="hdr">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>go('home')} style={{background:'rgba(255,255,255,0.12)',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ic n="back" s={18} c="white"/></button>
          <div><div style={{color:'white',fontSize:18,fontWeight:800}}>Find FMN Dealer</div><div style={{color:'#A8C4E8',fontSize:12}}>{DEALERS.length} dealers near you</div></div>
        </div>
      </div>
      <div style={{background:'#D4E4F7',height:160,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',flexShrink:0}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 30px,rgba(0,48,135,0.06) 30px,rgba(0,48,135,0.06) 31px),repeating-linear-gradient(90deg,transparent,transparent 30px,rgba(0,48,135,0.06) 30px,rgba(0,48,135,0.06) 31px)'}}/>
        {DEALERS.map((d,i)=>(
          <button key={d.id} onClick={()=>setSel(sel===d.id?null:d.id)} style={{position:'absolute',top:`${15+i*15}%`,left:`${10+i*18}%`,width:34,height:34,borderRadius:'50%',background:sel===d.id?'var(--accent)':(d.inStock?'var(--blue)':'#888'),border:'2.5px solid white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 3px 10px rgba(0,0,0,0.2)'}}>
            <Ic n="location" s={15} c="white"/>
          </button>
        ))}
        <div style={{background:'rgba(255,255,255,0.92)',borderRadius:10,padding:'8px 14px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--blue)'}}>📍 Your Location</div>
          <div style={{fontSize:11,color:'var(--text3)'}}>Ogun State, FUNAAB</div>
        </div>
      </div>
      <div className="content" style={{overflowY:'auto'}}>
        {DEALERS.map(d=>(
          <div key={d.id} className="card" style={{marginBottom:10,border:sel===d.id?'2px solid var(--border)':'1.5px solid transparent'}}>
            <button onClick={()=>setSel(sel===d.id?null:d.id)} style={{width:'100%',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left',padding:0}}>
              <div style={{width:50,height:50,borderRadius:14,background:d.inStock?'var(--pale)':'#F5F5F5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🏪</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:13}}>{d.name}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{d.address}</div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--blue)'}}>📍 {d.distance}</span>
                  <span style={{background:d.inStock?'var(--pale)':'#F5F5F5',color:d.inStock?'var(--blue)':'#888',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{d.inStock?'● In Stock':'○ Call First'}</span>
                </div>
              </div>
              <Ic n="chevron" s={16} c="var(--text4)"/>
            </button>
            {sel===d.id&&(
              <div style={{marginTop:12,display:'flex',gap:8}}>
                <button className="btn btn-outline" style={{flex:1,fontSize:12,padding:'9px 8px'}}><Ic n="phone" s={14} c="var(--blue)"/>{d.phone}</button>
                <button className="btn btn-primary" style={{flex:1,fontSize:12,padding:'9px 8px'}}><Ic n="navigate" s={14} c="white"/>Directions</button>
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
    <button onClick={()=>set(!val)} style={{width:44,height:24,borderRadius:12,background:val?'var(--llight)':'#E0E0E0',border:'none',cursor:'pointer',position:'relative',flexShrink:0}}>
      <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,left:val?23:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
    </button>
  )
  const Modal=({children,title,onClose})=>(
    <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',zIndex:200}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'85%',overflowY:'auto',padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <span style={{fontSize:17,fontWeight:800}}>{title}</span>
          <button onClick={onClose} style={{background:'#F0F0F0',border:'none',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:16}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
  const Field=({label,field,placeholder})=>(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,color:'var(--text3)',marginBottom:5,textTransform:'uppercase'}}>{label}</div>
      <input value={form[field] || ''} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))} placeholder={placeholder} style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid var(--bdcolor)',fontFamily:'var(--font)',fontSize:14,outline:'none'}}/>
    </div>
  )

  return (
    <div className="screen fade-in" style={{position:'relative'}}>
      <div style={{background:'linear-gradient(160deg,#001F5B 0%,#003087 100%)',padding:'20px 16px 24px',textAlign:'center'}}>
        <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',fontSize:44,border:'3px solid #1E6FD9'}}>👨🏾‍🌾</div>
        <div style={{color:'white',fontSize:20,fontWeight:800}}>{profile.name}</div>
        <div style={{color:'#A8C4E8',fontSize:13,marginTop:4}}>{profile.phone}</div>
        <div style={{color:'#A8C4E8',fontSize:13,marginTop:3}}>📍 {profile.location}</div>
        <div style={{background:'rgba(255,255,255,0.1)',borderRadius:20,padding:'5px 14px',display:'inline-flex',alignItems:'center',gap:6,marginTop:10}}>
          <Ic n="star" s={14} c="#FFD54F"/><span style={{color:'white',fontSize:12,fontWeight:600}}>FMN Farmer  •  Since Jan 2025</span>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,background:'#001F5B',padding:'0 14px 16px'}}>
        {[[scans.length,'Scans','#1E6FD9'],[scans.filter(h=>h.treated).length,'Treated','#CE93D8'],[profile.farmSize.replace(' Hectares','ha'),'Farm','#FFD54F']].map(([v,l,c])=>(
          <div key={l} className="card" style={{textAlign:'center',padding:10}}>
            <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:10,color:'var(--text3)'}}>{l}</div>
          </div>
        ))}
      </div>
      <div className="content">
        <div className="card" style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><Ic n="leaf" s={18} c="var(--blue)"/><span style={{fontWeight:800,fontSize:14}}>Farm Details</span></div>
            <button onClick={()=>{setForm({...profile});setModal('edit')}} style={{display:'flex',alignItems:'center',gap:4,background:'var(--pale)',border:'1.5px solid var(--border)',borderRadius:20,padding:'4px 12px',cursor:'pointer',color:'var(--blue)',fontWeight:700,fontSize:12,fontFamily:'var(--font)'}}>
              <Ic n="edit" s={13} c="var(--blue)"/>Edit
            </button>
          </div>
          {[['Name',profile.name],['Phone',profile.phone],['State',profile.state],['LGA',profile.lga],['Farm Size',profile.farmSize],['Crops',profile.crops]].map(([l,v])=>(
            <div key={l} style={{display:'flex',alignItems:'center',padding:'9px 0',borderBottom:'1px solid var(--bdcolor)'}}>
              <span style={{flex:1,fontSize:13,color:'var(--text2)'}}>{l}</span>
              <span style={{fontSize:13,fontWeight:700}}>{v}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><Ic n="settings" s={18} c="var(--blue)"/><span style={{fontWeight:800,fontSize:14}}>App Settings</span></div>
          {[['Push Notifications','Reminders & alerts',notif,setNotif],['Offline Mode','Use AI without internet',offline,setOffline],['Location Services','For dealer search',loc,setLoc]].map(([l,s,v,set])=>(
            <div key={l} style={{display:'flex',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--bdcolor)',gap:10}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{l}</div><div style={{fontSize:11,color:'var(--text3)'}}>{s}</div></div>
              <Toggle val={v} set={set}/>
            </div>
          ))}
          {/* Cloud Sync Manual Trigger */}
          <div style={{display:'flex',alignItems:'center',padding:'10px 0',gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700}}>FMN Cloud Sync</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>Status: <span style={{fontWeight:700,textTransform:'capitalize'}}>{syncStatus}</span></div>
            </div>
            <button onClick={onTriggerSync} disabled={syncStatus === 'syncing'} className="btn" style={{padding:'6px 12px',fontSize:12,width:'auto',background:syncStatus === 'syncing' ? '#E0E0E0' : 'var(--blue)',color:'white'}}>
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now 🔄'}
            </button>
          </div>
        </div>
        <div className="card">
          {[['About FMN AgriSense','ℹ️','about'],['Privacy Policy','🔒','privacy'],['Contact FMN Support','🎧','support'],['Rate the App','⭐','rate'],['Share with Farmers','📤','share']].map(([l,e,key],i,arr)=>(
            <button key={l} onClick={()=>setModal(key)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'13px 0',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontFamily:'var(--font)',borderBottom:i<arr.length-1?'1px solid var(--bdcolor)':'none'}}>
              <span style={{fontSize:22}}>{e}</span><span style={{flex:1,fontSize:14,color:'var(--text)'}}>{l}</span><Ic n="chevron" s={16} c="var(--text4)"/>
            </button>
          ))}
        </div>
        <div style={{textAlign:'center',fontSize:11,color:'var(--text4)',marginTop:16,lineHeight:1.8}}>FMN AgriSense  •  Version 1.0.0<br/>Built for FMN Innovation 5.0  •  March 2026</div>
      </div>

      {modal==='edit'&&<Modal title="✏️ Edit Profile" onClose={()=>setModal(null)}>
        <Field label="Full Name" field="name" placeholder="Your full name"/>
        <Field label="Phone" field="phone" placeholder="+234 ..."/>
        <Field label="Location" field="location" placeholder="e.g. Ogun State, FUNAAB"/>
        <Field label="State" field="state" placeholder="e.g. Ogun State"/>
        <Field label="LGA" field="lga" placeholder="e.g. Abeokuta South"/>
        <Field label="Farm Size" field="farmSize" placeholder="e.g. 3.5 Hectares"/>
        <Field label="Crops" field="crops" placeholder="e.g. Cassava, Maize"/>
        <button onClick={()=>{onSaveProfile(form);setModal(null)}} className="btn btn-primary" style={{width:'100%',marginTop:4}}>Save Changes</button>
      </Modal>}

      {modal==='about'&&<Modal title="ℹ️ About FMN AgriSense" onClose={()=>setModal(null)}>
        <div style={{textAlign:'center',marginBottom:16}}><div style={{fontSize:56}}>🌿</div><div style={{fontSize:18,fontWeight:800,color:'var(--navy)',marginTop:8}}>FMN AgriSense</div><div style={{fontSize:13,color:'var(--text3)',marginTop:4}}>Version 1.0.0  •  FMN Innovation 5.0</div></div>
        {[['🤖 Real AI','Powered by EfficientNet trained on 21,367 cassava images from the Kaggle Cassava Disease dataset.'],['🎯 Mission','Empowering Nigerian cassava farmers with instant AI disease detection, treatment plans, and FMN product recommendations.'],['🏆 Competition','Built for FMN Innovation 5.0 to showcase how technology can protect Nigerian farms and increase yields.']].map(([t,d])=>(
          <div key={t} style={{background:'var(--pale)',borderRadius:12,padding:14,marginBottom:10}}><div style={{fontWeight:800,fontSize:13,marginBottom:5}}>{t}</div><div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>{d}</div></div>
        ))}
      </Modal>}

      {modal==='privacy'&&<Modal title="🔒 Privacy Policy" onClose={()=>setModal(null)}>
        {[['Data We Collect','Farm location, crop photos, and usage data to improve disease detection. No financial data collected.'],['How We Use It','Plant images are processed by AI for diagnosis. Images may be used anonymously to improve the model.'],['Your Rights','You can request data deletion at any time by contacting FMN support.']].map(([t,d])=>(
          <div key={t} style={{marginBottom:14,paddingBottom:14,borderBottom:'1px solid var(--bdcolor)'}}><div style={{fontWeight:800,fontSize:13,marginBottom:5,color:'var(--navy)'}}>{t}</div><div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>{d}</div></div>
        ))}
      </Modal>}

      {modal==='support'&&<Modal title="🎧 Contact FMN Support" onClose={()=>setModal(null)}>
        <div style={{background:'var(--pale)',borderRadius:14,padding:16,textAlign:'center',marginBottom:16}}><div style={{fontSize:40}}>👨🏾‍💼</div><div style={{fontWeight:800,fontSize:15,marginTop:8}}>FMN AgriSense Support</div><div style={{fontSize:13,color:'var(--text3)',marginTop:4}}>Available Mon–Fri, 8am–5pm</div></div>
        {[['📞','0800-FMN-FARM','Toll-free hotline'],['📧','agrisense@fmnplc.com','Response within 24 hours'],['💬','+234 803 FMN HELP','WhatsApp agronomist'],['🏢','1 Golden Penny Place, Lagos','FMN Head Office']].map(([ic,c,s])=>(
          <div key={c} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 0',borderBottom:'1px solid var(--bdcolor)'}}>
            <div style={{width:44,height:44,borderRadius:12,background:'var(--pale)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{ic}</div>
            <div><div style={{fontWeight:700,fontSize:14}}>{c}</div><div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{s}</div></div>
          </div>
        ))}
      </Modal>}

      {modal==='rate'&&<Modal title="⭐ Rate FMN AgriSense" onClose={()=>setModal(null)}>
        <div style={{textAlign:'center',padding:'10px 0 20px'}}>
          <div style={{fontSize:56,marginBottom:12}}>🌿</div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:20}}>How would you rate this app?</div>
          <div style={{display:'flex',justifyContent:'center',gap:10,marginBottom:16}}>
            {[1,2,3,4,5].map(s=>(
              <button key={s} onClick={()=>setRating(s)} style={{fontSize:40,background:'none',border:'none',cursor:'pointer',opacity:s<=rating?1:0.3,transform:s<=rating?'scale(1.15)':'scale(1)',transition:'all 0.15s'}}>⭐</button>
            ))}
          </div>
          {rating>0&&<div style={{fontSize:14,color:'var(--blue)',fontWeight:700,marginBottom:16}}>{['','Needs improvement 😐','Could be better 🙂','Pretty good! 😊','Love it! 😃','Amazing! 🤩'][rating]}</div>}
          {!ratingDone
            ?<button onClick={()=>{if(rating>0)setRatingDone(true)}} className="btn" style={{width:'100%',background:rating>0?'var(--blue)':'var(--bdcolor)',color:rating>0?'white':'var(--text3)',cursor:rating>0?'pointer':'default'}}>Submit Rating</button>
            :<div style={{background:'var(--pale)',borderRadius:12,padding:16}}><div style={{fontSize:32,marginBottom:8}}>🎉</div><div style={{fontWeight:800,fontSize:15}}>Thank you!</div><div style={{fontSize:13,color:'var(--text3)',marginTop:4}}>Your rating helps us serve Nigerian farmers better.</div></div>
          }
        </div>
      </Modal>}

      {modal==='share'&&<Modal title="📤 Share with Farmers" onClose={()=>setModal(null)}>
        <div style={{background:'var(--pale)',borderRadius:14,padding:16,textAlign:'center',marginBottom:16}}>
          <div style={{fontSize:40}}>🌿</div>
          <div style={{fontWeight:800,fontSize:15,marginTop:8}}>FMN AgriSense</div>
          <div style={{fontSize:13,color:'var(--text2)',marginTop:6,lineHeight:1.5}}>AI-powered cassava disease detection for Nigerian farmers. Free to use!</div>
        </div>
        <div style={{background:'#F5F5F5',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <span style={{flex:1,fontSize:12,color:'var(--text3)',fontFamily:'monospace'}}>fmn-agrisense.vercel.app</span>
          <button onClick={()=>{navigator.clipboard?.writeText('fmn-agrisense.vercel.app');setCopied(true);setTimeout(()=>setCopied(false),2000)}} style={{background:copied?'var(--blue)':'var(--pale)',border:'1.5px solid var(--border)',color:copied?'white':'var(--blue)',borderRadius:8,padding:'5px 12px',cursor:'pointer',fontFamily:'var(--font)',fontWeight:700,fontSize:12}}>{copied?'✓ Copied!':'Copy'}</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
          {[['💬 WhatsApp','#25D366'],['📱 SMS','var(--blue)'],['📘 Facebook','#1877F2'],['✉️ Email','var(--accent)']].map(([l,bg])=>(
            <button key={l} style={{padding:'12px 10px',background:bg,color:'white',border:'none',borderRadius:12,fontFamily:'var(--font)',fontWeight:700,fontSize:13,cursor:'pointer'}}>{l}</button>
          ))}
        </div>
      </Modal>}
    </div>
  )
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,  setScreen]  = useState('home')
  const [params,  setParams]  = useState({})
  const [analyzing, setAnalyzing] = useState(false)

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

  return (
    <div className="app-shell">
      <div className="phone">
        <div className="status-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{time}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>FMN AgriSense</span>
            {syncStatus === 'syncing' && <span title="Syncing..." style={{ color: '#FFD54F', fontSize: 11 }}>🔄</span>}
            {syncStatus === 'synced' && <span title="Synced to FMN Cloud" style={{ color: '#4CAF50', fontSize: 11 }}>☁️</span>}
            {syncStatus === 'offline' && <span title="Offline mode" style={{ color: '#FF9800', fontSize: 11 }}>📶</span>}
            {syncStatus === 'error' && <span title="Sync Error" style={{ color: '#F44336', fontSize: 11 }}>⚠️</span>}
          </span>
          <span>●●●</span>
        </div>
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          {renderScreen()}
        </div>
        {!analyzing&&(
          <nav className="bottom-nav">
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>go(n.id)} className={`nav-item${activeNav===n.id?' active':''}`}>
                <Ic n={n.icon} s={22} c={activeNav===n.id?'var(--blue)':'var(--text3)'}/>
                {n.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
