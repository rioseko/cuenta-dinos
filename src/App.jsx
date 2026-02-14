import { useEffect, useMemo, useState } from 'react'

const DINOSAURS = [
  'Tyrannosaurus rex',
  'Triceratops',
  'Velociraptor',
  'Spinosaurus',
  'Giganotosaurus',
  'Stegosaurus',
  'Ankylosaurus',
  'Carnotaurus',
  'Allosaurus',
  'Argentinosaurus'
]

const STYLES = [
  { key: 'funny', emoji: '😄', title: 'Divertido y Gracioso', desc: 'Risas y diversión todo el tiempo' },
  { key: 'adventurous', emoji: '🌟', title: 'Aventurero y Emocionante', desc: 'Misiones emocionantes y descubrimientos' },
  { key: 'gentle', emoji: '🌙', title: 'Suave y Relajante', desc: 'Pacífico y calmante' },
  { key: 'magical', emoji: '✨', title: 'Mágico y Encantador', desc: 'Fantasía y maravilla' },
  { key: 'educational', emoji: '📚', title: 'Educativo y Didáctico', desc: 'Datos divertidos y conocimiento' }
]

export default function App() {
  const [formData, setFormData] = useState({ dinosaur: '', style: '', lesson: '' })
  const [currentStep, setCurrentStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedStory, setGeneratedStory] = useState('')
  const [isReading, setIsReading] = useState(false)
  const totalSteps = 5

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
    setIsReading(false)
  }, [generatedStory])

  const handleSelectDino = (name) => {
    setFormData((s) => ({ ...s, dinosaur: name }))
  }

  const handleSelectStyle = (key) => {
    setFormData((s) => ({ ...s, style: key }))
  }

  const handleLesson = (e) => {
    setFormData((s) => ({ ...s, lesson: e.target.value }))
  }

  const goNext = () => {
    if (currentStep < 2) setCurrentStep((s) => s + 1)
  }
  const goBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
  }

  const resetAll = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsReading(false)
    setGeneratedStory('')
    setIsGenerating(false)
    setFormData({ dinosaur: '', style: '', lesson: '' })
    setCurrentStep(0)
  }

  const toggleRead = () => {
    if (!generatedStory) return
    if (!window.speechSynthesis) return
    if (isReading) {
      window.speechSynthesis.cancel()
      setIsReading(false)
      return
    }
    const utter = new SpeechSynthesisUtterance(generatedStory)
    utter.lang = 'es-ES'
    utter.rate = 0.9
    utter.pitch = 1.1
    utter.onend = () => setIsReading(false)
    setIsReading(true)
    window.speechSynthesis.speak(utter)
  }

  const createStory = async () => {
    setIsGenerating(true)
    setCurrentStep(3)
    try {
      const res = await fetch('/.netlify/functions/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dinosaur: formData.dinosaur,
          style: formData.style,
          lesson: formData.lesson
        })
      })
      if (!res.ok) {
        throw new Error('Fail')
      }
      const json = await res.json()
      const story = json?.story
      if (!story) {
        throw new Error('Empty')
      }
      setGeneratedStory(story)
      setCurrentStep(4)
    } catch (e) {
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
                <div className="mt-6 flex justify-end">
                  <button
                    disabled={!canContinueStep0}
                    onClick={goNext}
                    className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-white transition-transform ${
                      canContinueStep0 ? 'bg-emerald-500 hover:bg-emerald-600 hover:scale-[1.02]' : 'bg-emerald-300 cursor-not-allowed'
                    }`}
                  >
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
                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-between">
                  <button
                    onClick={goBack}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-transform"
                  >
                    Atrás
                  </button>
                  <button
                    disabled={!canContinueStep1}
                    onClick={goNext}
                    className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-white transition-transform ${
                      canContinueStep1 ? 'bg-emerald-500 hover:bg-emerald-600 hover:scale-[1.02]' : 'bg-emerald-300 cursor-not-allowed'
                    }`}
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-emerald-800 mb-4">¿Qué lección quieres enseñar?</h1>
                <textarea
                  value={formData.lesson}
                  onChange={handleLesson}
                  placeholder="Ejemplos: Ser amable con los demás, probar cosas nuevas, compartir es importante, ser valiente cuando tenemos miedo..."
                  className="w-full h-40 md:h-36 p-4 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-between">
                  <button
                    onClick={goBack}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-transform"
                  >
                    Atrás
                  </button>
                  <button
                    disabled={!canCreate}
                    onClick={createStory}
                    className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-white transition-transform ${
                      canCreate ? 'bg-emerald-500 hover:bg-emerald-600 hover:scale-[1.02]' : 'bg-emerald-300 cursor-not-allowed'
                    }`}
                  >
                    Crear Cuento
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
                <div className="rounded-2xl p-5 md:p-6 bg-yellow-50 text-emerald-900 leading-relaxed text-base md:text-lg">
                  {generatedStory}
                </div>
                <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
                  <button
                    onClick={toggleRead}
                    className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-white transition-transform ${
                      isReading ? 'bg-rose-500 hover:bg-rose-600' : 'bg-cyan-500 hover:bg-cyan-600'
                    } hover:scale-[1.02]`}
                  >
                    {isReading ? 'Detener Lectura' : 'Leer Cuento en Voz Alta'}
                  </button>
                  <button
                    onClick={resetAll}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 transition-transform hover:scale-[1.02]"
                  >
                    Crear Otro Cuento
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
