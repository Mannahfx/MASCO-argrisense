import { useState, useContext } from 'react';
import { Camera, ChevronLeft, Info, AlertTriangle } from 'lucide-react';
import { loadModel, runAI } from '../lib/ai';
import { NavContext } from '../AppNew';

const CLASS_MAP = { 0:'cbb', 1:'cbsd', 2:'cgm', 3:'cmd', 4:'healthy' };

export default function ScanScreen({ startAnalyzing }) {
  const { navigate } = useContext(NavContext);
  const [preview,  setPreview]  = useState(null)
  const [status,   setStatus]   = useState('idle') 
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
    <div className="h-full w-full bg-background p-5 text-foreground overflow-y-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/')} className="glass flex size-10 items-center justify-center rounded-full">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-xl font-display font-semibold">Scan Plant</h1>
        <div className="size-10" />
      </div>

      <p className="text-center text-sm text-muted-foreground mb-6">{statusLabel}</p>

      <div className={`relative mx-auto w-full max-w-sm aspect-square rounded-[2rem] border-2 flex items-center justify-center overflow-hidden transition-all ${preview ? 'border-primary' : 'border-dashed border-card-border bg-black/10'}`}>
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <Camera className="size-12 text-muted-foreground opacity-50" />
        )}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          onChange={handleFile} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="mt-6 text-center text-xs text-muted-foreground font-medium">
        Tap the frame to open camera or select a photo.
      </div>

      <section className="mt-10 px-2 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <Info className="size-4" /> How to take a good scan
          </h3>
          <ul className="text-xs text-muted-foreground space-y-2.5 list-disc pl-5 marker:text-primary">
            <li>Ensure the leaf is well-lit, preferably with natural sunlight.</li>
            <li>Focus the camera directly on the diseased spots or mottling.</li>
            <li>Keep the phone steady to avoid blurry images.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-warning mb-3 flex items-center gap-2">
            <AlertTriangle className="size-4" /> Precautions
          </h3>
          <ul className="text-xs text-muted-foreground space-y-2.5 list-disc pl-5 marker:text-warning">
            <li>Do not scan dead or completely dried up leaves; use freshly infected ones.</li>
            <li>Avoid heavy shadows or harsh reflections on the leaf surface.</li>
            <li>Only scan one leaf per photo for maximum AI accuracy.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
