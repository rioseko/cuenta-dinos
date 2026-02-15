import { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, Sparkles } from 'lucide-react'
import headerImg from './public/header.png'

const DINOSAURS = [
  'Allosaurus',
  'Ankylosaurus',
  'Argentinosaurus',
  'Carnotaurus',
  'Giganotosaurus',
  'Spinosaurus',
  'Stegosaurus',
  'Triceratops',
  'Tyrannosaurus rex',
  'Velociraptor',
]

const STYLES = [
  { key: 'funny', emoji: '😄', title: 'Divertido y Gracioso', desc: 'Risas y diversión todo el tiempo' },
  { key: 'adventurous', emoji: '🌟', title: 'Aventurero y Emocionante', desc: 'Misiones emocionantes y descubrimientos' },
  { key: 'gentle', emoji: '🌙', title: 'Suave y Relajante', desc: 'Pacífico y calmante' },
  { key: 'magical', emoji: '✨', title: 'Mágico y Encantador', desc: 'Fantasía y maravilla' },
  { key: 'educational', emoji: '📚', title: 'Educativo y Didáctico', desc: 'Datos divertidos y conocimiento' }
]

const LESSONS = [
  { emoji: '😊', text: 'Ser amable con los demás' },
  { emoji: '🤝', text: 'Compartir es importante' },
  { emoji: '💪', text: 'Ser valiente cuando tengo miedo' },
  { emoji: '🎨', text: 'Probar cosas nuevas' },
  { emoji: '❤️', text: 'Decir la verdad' },
  { emoji: '🧠', text: 'Escuchar con atención' },
  { emoji: '🧹', text: 'Ordenar mis juguetes' },
  { emoji: '🌈', text: 'Respetar a todos' },
  { emoji: '🦕', text: 'Pedir ayuda cuando la necesito' },
  { emoji: '⭐', text: 'No rendirme aunque sea difícil' }
]

export default function App() {
  const [formData, setFormData] = useState({ dinosaur: '', style: '', lesson: '' })
  const [currentStep, setCurrentStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedStory, setGeneratedStory] = useState('')
  const [isReading, setIsReading] = useState(false)
  const [isTtsLoading, setIsTtsLoading] = useState(false)
  const [showAudioControls, setShowAudioControls] = useState(false)
  const [audioLogs, setAudioLogs] = useState([])
  const totalSteps = 5

  const API_BASE = (import.meta.env?.VITE_BACKEND_BASE_URL || '/.netlify/functions').replace(/\/$/, '')
  const TTS_BASE = (import.meta.env?.VITE_TTS_BASE_URL || API_BASE).replace(/\/$/, '')
  const USING_NETLIFY_FUNCS_TTS = TTS_BASE.endsWith('/.netlify/functions')
  const STORY_ENDPOINT = '/.netlify/functions/generate-story'
  const TTS_ENDPOINT = USING_NETLIFY_FUNCS_TTS ? `${TTS_BASE}/generate-audio` : `${TTS_BASE}/tts`
  const TTS_BIN_ENDPOINT = `${TTS_ENDPOINT}?format=binary`

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
    const ac = new AbortController()
    const id = setTimeout(() => ac.abort(), timeoutMs)
    try {
      return await fetch(url, { ...options, signal: ac.signal })
    } finally {
      clearTimeout(id)
    }
  }

  const canContinueStep0 = formData.dinosaur !== ''
  const canContinueStep1 = formData.style !== ''
  const canCreate = formData.lesson.trim() !== ''

  const progressInfo = useMemo(() => {
    if (currentStep <= 0) return { label: 'Paso 1 de 3', value: 33 }
    if (currentStep === 1) return { label: 'Paso 2 de 3', value: 67 }
    return { label: 'Paso 3 de 3', value: 100 }
  }, [currentStep])

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (audioRef.current?.audio) {
      try {
        audioRef.current.audio.pause()
        audioRef.current.audio.currentTime = 0
      } catch {}
      audioRef.current.audio = null
    }
    if (audioRef.current?.url) {
      try {
        URL.revokeObjectURL(audioRef.current.url)
      } catch {}
      audioRef.current.url = null
    }
    setIsReading(false)
  }, [generatedStory])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const ua = navigator.userAgent || ''
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      setShowAudioControls(params.has('audioDebug') || isIOS)
    }
  }, [])

  const step0CtaRef = useRef(null)
  const step1CtaRef = useRef(null)
  const step2CtaRef = useRef(null)
  const audioElRef = useRef(null)
  const audioCtxRef = useRef(null)
  const audioSrcRef = useRef(null)

  const addAudioLog = (msg) => {
    setAudioLogs((l) => [...l, `${new Date().toLocaleTimeString()} ${msg}`].slice(-60))
  }

  const reportError = (title, err) => {
    const msg = typeof err === 'string' ? err : err?.message || ''
    addAudioLog(`ERR ${title}: ${msg}`)
    if (showAudioControls && typeof window !== 'undefined') {
      try {
        alert(`${title}${msg ? `\n${msg}` : ''}`)
      } catch {}
    }
  }

  useEffect(() => {
    const el = audioElRef.current
    if (!el) return
    const onLm = () => addAudioLog('loadedmetadata')
    const onCp = () => addAudioLog('canplay')
    const onCpt = () => addAudioLog('canplaythrough')
    const onPl = () => addAudioLog('play')
    const onPa = () => addAudioLog('pause')
    const onEn = () => addAudioLog('ended')
    const onEr = () => {
      addAudioLog('error')
      const code = el?.error?.code ? ` code ${el.error.code}` : ''
      reportError('Elemento <audio> error' + code)
    }
    el.addEventListener('loadedmetadata', onLm)
    el.addEventListener('canplay', onCp)
    el.addEventListener('canplaythrough', onCpt)
    el.addEventListener('play', onPl)
    el.addEventListener('pause', onPa)
    el.addEventListener('ended', onEn)
    el.addEventListener('error', onEr)
    return () => {
      el.removeEventListener('loadedmetadata', onLm)
      el.removeEventListener('canplay', onCp)
      el.removeEventListener('canplaythrough', onCpt)
      el.removeEventListener('play', onPl)
      el.removeEventListener('pause', onPa)
      el.removeEventListener('ended', onEn)
      el.removeEventListener('error', onEr)
    }
  }, [currentStep, showAudioControls])

  const handleSelectDino = (name) => {
    setFormData((s) => ({ ...s, dinosaur: name }))
    if (step0CtaRef.current) {
      step0CtaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSelectStyle = (key) => {
    setFormData((s) => ({ ...s, style: key }))
    if (step1CtaRef.current) {
      step1CtaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleLesson = (e) => {
    setFormData((s) => ({ ...s, lesson: e.target.value }))
  }

  const handleSelectLesson = (text) => {
    setFormData((s) => ({ ...s, lesson: text }))
    if (step2CtaRef.current) {
      step2CtaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const goNext = () => {
    if (currentStep < 2) setCurrentStep((s) => s + 1)
  }
  const goBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
  }

  const resetAll = () => {
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
    if (audioRef.current?.audio) {
      try {
        audioRef.current.audio.pause()
        audioRef.current.audio.currentTime = 0
      } catch {}
      audioRef.current.audio = null
    }
    if (audioRef.current?.url) {
      try {
        URL.revokeObjectURL(audioRef.current.url)
      } catch {}
      audioRef.current.url = null
    }
    if (audioSrcRef.current) {
      try {
        audioSrcRef.current.stop(0)
      } catch {}
      audioSrcRef.current = null
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.suspend()
      } catch {}
    }
    setIsReading(false)
    setIsTtsLoading(false)
    setGeneratedStory('')
    setIsGenerating(false)
    setFormData({ dinosaur: '', style: '', lesson: '' })
    setCurrentStep(0)
  }

  const toggleRead = () => {
    if (!generatedStory) return
    if (!audioRef.current) audioRef.current = { audio: null, url: null }
    if (isReading) {
      if (audioRef.current.audio) {
        try {
          audioRef.current.audio.pause()
          audioRef.current.audio.currentTime = 0
        } catch {}
      }
      if (audioRef.current.url) {
        try {
          URL.revokeObjectURL(audioRef.current.url)
        } catch {}
        audioRef.current.url = null
      }
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel()
        } catch {}
      }
      setIsReading(false)
      return
    }
    ;(async () => {
      try {
        setIsTtsLoading(true)
        const playChunksWebAudio = async () => {
          try {
            const parts = generatedStory
              .split(/(?<=\.)\s+/)
              .map((s) => s.trim())
              .filter(Boolean)
            const Ctx = window.AudioContext || window.webkitAudioContext
            const ctx = audioCtxRef.current || new Ctx()
            audioCtxRef.current = ctx
            await ctx.resume()
            let firstStarted = false
            for (let i = 0; i < parts.length; i++) {
              if (!isReading && i > 0) break
              const rBin = await fetchWithTimeout(TTS_BIN_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: parts[i] })
              })
              if (!rBin.ok) {
                let t = ''
                try {
                  t = await rBin.text()
                } catch {}
                reportError('Chunk TTS HTTP error', `status ${rBin.status} ${rBin.statusText}\n${t?.slice(0, 400)}`)
                throw new Error('chunk-fail')
              }
              const arr = await rBin.arrayBuffer()
              const buf = await new Promise((res, rej) => ctx.decodeAudioData(arr, res, rej))
              const srcNode = ctx.createBufferSource()
              srcNode.buffer = buf
              srcNode.connect(ctx.destination)
              await new Promise((resolve) => {
                srcNode.onended = resolve
                audioSrcRef.current = srcNode
                if (!firstStarted) {
                  setIsTtsLoading(false)
                  firstStarted = true
                }
                srcNode.start(0)
              })
            }
            setIsReading(false)
            setIsTtsLoading(false)
            return true
          } catch (e) {
            reportError('Reproducción por párrafos falló', e)
            return false
          }
        }
        const res = await fetchWithTimeout(TTS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: generatedStory })
        })
        if (!res.ok) {
          let bodySnippet = ''
          try {
            bodySnippet = await res.text()
          } catch {}
          reportError('TTS HTTP error', `status ${res.status} ${res.statusText}\n${bodySnippet?.slice(0, 400)}`)
          setIsReading(true)
          const ok = await playChunksWebAudio()
          if (ok) return
          throw new Error('tts-fail')
        }
        const json = await res.json()
        let src = null
        let blobUrl = null
        if (json?.audioBase64) {
          const b64 = json.audioBase64
          const mimeType = json?.mime || 'audio/mpeg'
          const byteString = atob(b64)
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
          const blob = new Blob([ia], { type: mimeType })
          blobUrl = URL.createObjectURL(blob)
          src = blobUrl
        } else if (json?.audioUrl) {
          src = json.audioUrl
        }
        if (!src) {
          setIsReading(true)
          const ok = await playChunksWebAudio()
          if (ok) return
          throw new Error('no-audio')
        }
        const el = audioElRef.current || new Audio()
        el.setAttribute('playsinline', 'true')
        el.src = src
        el.load()
        el.onended = () => setIsReading(false)
        audioRef.current.audio = el
        if (audioRef.current.url) {
          try {
            URL.revokeObjectURL(audioRef.current.url)
          } catch {}
        }
        audioRef.current.url = blobUrl
        setIsTtsLoading(false)
        setIsReading(true)
        try {
          await el.play()
        } catch {
          reportError('Audio element play() rechazado, intento reproducción por párrafos')
          setIsReading(true)
          const ok = await playChunksWebAudio()
          if (ok) return
          setIsReading(false)
          throw new Error('play-rejected')
        }
      } catch (e) {
        setIsTtsLoading(false)
        reportError('Fallo general TTS, uso SpeechSynthesis', e)
        if (!window.speechSynthesis) return
        const utter = new SpeechSynthesisUtterance(generatedStory)
        utter.lang = 'es-ES'
        utter.rate = 0.9
        utter.pitch = 1.1
        utter.onend = () => setIsReading(false)
        setIsReading(true)
        window.speechSynthesis.speak(utter)
      }
    })()
  }

  const audioRef = useRef(null)

  const paragraphs = useMemo(() => {
    if (!generatedStory) return []
    return generatedStory
      .split(/(?<=\.)\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }, [generatedStory])

  const createStory = async () => {
    setIsGenerating(true)
    setCurrentStep(3)
    try {
      const res = await fetchWithTimeout(STORY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dinosaur: formData.dinosaur,
          style: formData.style,
          lesson: formData.lesson
        })
      })
      if (!res.ok) {
        let detail = ''
        try {
          const errJson = await res.json()
          const part = errJson?.detail || errJson?.error || ''
          detail = part ? `: ${part}` : ''
        } catch (_) {}
        throw new Error(`Función falló${detail}`)
      }
      const json = await res.json()
      const story = json?.story
      if (!story) {
        throw new Error('Respuesta vacía')
      }
      setGeneratedStory(story)
      setCurrentStep(4)
    } catch (e) {
      // Diagnóstico en consola para entorno local
      console.error('Error al generar el cuento:', e)
      const demo = `Había una vez un ${formData.dinosaur} que aprendió: ${formData.lesson}.`
      setGeneratedStory(demo)
      setCurrentStep(4)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 flex items-start md:items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-lg md:max-w-3xl">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-5 md:p-8">
            <div className="mb-4 md:mb-6 flex justify-center">
              <img
                src={headerImg}
                alt="Lucas abrazando un dinosaurio de peluche"
                className="h-56 md:h-64 object-contain"
              />
            </div>
            {currentStep <= 2 && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-emerald-700 font-medium">
                  <span>{progressInfo.label}</span>
                  <span>{progressInfo.value}%</span>
                </div>
                <div className="h-2 mt-2 w-full bg-emerald-100 rounded-full">
                  <div
                    className="h-2 bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${progressInfo.value}%` }}
                  />
                </div>
              </div>
            )}

            {currentStep === 0 && (
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-emerald-800 mb-4">Selecciona tu Dinosaurio</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {DINOSAURS.map((d) => {
                    const selected = formData.dinosaur === d
                    return (
                      <button
                        key={d}
                        onClick={() => handleSelectDino(d)}
                        className={`p-4 rounded-2xl border transition-all text-left ${
                          selected ? 'border-emerald-500 bg-green-50' : 'border-emerald-100 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">✨</span>
                          <span className="font-semibold text-emerald-800">{d}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-6 flex justify-end" ref={step0CtaRef}>
                  <button
                    disabled={!canContinueStep0}
                    onClick={goNext}
                    className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-white font-semibold transition-transform flex items-center justify-center gap-2 shadow-md ${
                      canContinueStep0
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg hover:scale-[1.02]'
                        : 'bg-emerald-300 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-emerald-800 mb-4">Elige el Estilo del Cuento</h1>
                <div className="space-y-3">
                  {STYLES.map((s) => {
                    const selected = formData.style === s.key
                    return (
                      <button
                        key={s.key}
                        onClick={() => handleSelectStyle(s.key)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                          selected ? 'border-emerald-500 bg-green-50' : 'border-emerald-100 hover:border-emerald-300'
                        }`}
                      >
                        <span className="text-xl">{s.emoji}</span>
                        <div className="text-left">
                          <div className="font-semibold text-emerald-800">{s.title}</div>
                          <div className="text-emerald-700 text-sm">{s.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-between" ref={step1CtaRef}>
                  <button
                    disabled={!canContinueStep1}
                    onClick={goNext}
                    className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-white font-semibold transition-transform flex items-center justify-center gap-2 shadow-md ${
                      canContinueStep1
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg hover:scale-[1.02]'
                        : 'bg-emerald-300 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                    Continuar
                  </button>
                  <button
                    onClick={goBack}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl text-emerald-800 font-semibold transition-transform bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border border-emerald-200 shadow-sm"
                  >
                    Atrás
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-emerald-800 mb-4">¿Qué lección quieres enseñar?</h1>
                <div className="space-y-3">
                  {LESSONS.map((l) => {
                    const selected = formData.lesson === l.text
                    return (
                      <button
                        key={l.text}
                        onClick={() => handleSelectLesson(l.text)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                          selected ? 'border-emerald-500 bg-green-50' : 'border-emerald-100 hover:border-emerald-300'
                        }`}
                      >
                        <span className="text-xl">{l.emoji}</span>
                        <div className="text-left">
                          <div className="font-semibold text-emerald-800">{l.text}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-between" ref={step2CtaRef}>
                  <button
                    disabled={!canCreate}
                    onClick={createStory}
                    className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-white font-semibold transition-transform flex items-center justify-center gap-2 shadow-md ${
                      canCreate
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg hover:scale-[1.02]'
                        : 'bg-emerald-300 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                    Crear Cuento
                  </button>
                  <button
                    onClick={goBack}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl text-emerald-800 font-semibold transition-transform bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border border-emerald-200 shadow-sm"
                  >
                    Atrás
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="text-3xl">🌙</div>
                <div className="text-emerald-800 text-xl font-semibold">Creando tu cuento mágico...</div>
                <div className="text-emerald-700">Nuestra magia narrativa está funcionando...</div>
                <div className="mt-4 h-8 w-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <div className="rounded-2xl p-5 md:p-6 bg-gradient-to-r from-emerald-200 via-green-200 to-teal-200 text-emerald-900 font-bold text-lg md:text-xl mb-4">
                  Tu cuento está listo
                </div>
                <div className="mb-4 flex justify-center">
                  <button
                    onClick={toggleRead}
                    className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-white font-semibold transition-transform flex items-center justify-center gap-2 shadow-md ${
                      isReading
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 hover:shadow-lg'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg'
                    } hover:scale-[1.02]`}
                  >
                    <Volume2 className="w-5 h-5" />
                    {isReading ? 'Detener lectura' : 'Leer cuento en voz alta'}
                  </button>
                </div>
                <audio ref={audioElRef} playsInline className={showAudioControls ? 'w-full mt-2' : 'hidden'} controls={showAudioControls} />
                {showAudioControls && (
                  <div className="mt-2 p-3 bg-emerald-50 rounded-xl text-emerald-800 text-xs">
                    <div className="font-semibold mb-1">Eventos de audio</div>
                    <pre className="whitespace-pre-wrap max-h-40 overflow-auto">{audioLogs.join('\n')}</pre>
                  </div>
                )}
                <div className="rounded-2xl p-5 md:p-6 bg-yellow-50 text-gray-800 leading-8 md:leading-8 text-base md:text-lg font-serif border-l-4 border-orange-300">
                  {paragraphs.length > 0
                    ? paragraphs.map((p, i) => (
                        <p key={i} className="mb-4 tracking-normal">
                          {p}
                        </p>
                      ))
                    : generatedStory}
                </div>
                <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
                  <button
                    onClick={resetAll}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl text-white font-semibold transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-md bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg"
                  >
                    <Sparkles className="w-5 h-5" />
                    Crear Otro Cuento
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {isTtsLoading && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-sm text-center">
            <div className="text-3xl mb-2">🔊</div>
            <div className="text-emerald-800 font-semibold text-lg mb-1">Preparando la lectura</div>
            <div className="text-emerald-700">Espera mientras afinamos la voz</div>
            <div className="mx-auto mt-4 h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
          </div>
        </div>
      )}
    </div>
  )
}
