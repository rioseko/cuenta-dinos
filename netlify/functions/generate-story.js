exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  try {
    const { dinosaur, style, lesson } = JSON.parse(event.body || '{}')
    if (!dinosaur || !style || !lesson) {
      return { statusCode: 400, body: 'Parámetros inválidos' }
    }
    const styleMap = {
      funny: 'divertido y gracioso',
      adventurous: 'aventurero y emocionante',
      gentle: 'suave y relajante',
      magical: 'mágico y encantador',
      educational: 'educativo y didáctico'
    }
    const prompt = `Crea un cuento para dormir sobre un ${dinosaur}.

El cuento debe:
- Estar escrito en estilo ${styleMap[style] || style}
- Enseñar la lección: ${lesson}
- Ser apropiado para la hora de dormir (final calmante)
- Ser entretenido pero no demasiado estimulante
- Tener alrededor de 300-500 palabras
- Incluir una moraleja sutil tejida naturalmente en la narrativa
- Estar completamente en español
- El dinosaurio debe ser el protagonista principal

Por favor escribe solo el contenido del cuento, sin título ni formato adicional.`

    const apiKey = process.env.CLARIFAI_API_KEY
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Falta CLARIFAI_API_KEY' }) }
    }

    const clarifaiRes = await fetch('https://api.clarifai.com/v2/models/gpt-oss-120b/outputs', {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: [
          {
            data: {
              text: { raw: prompt }
            }
          }
        ]
      })
    })

    const data = await clarifaiRes.json()
    const story =
      data?.outputs?.[0]?.data?.text?.raw ||
      data?.outputs?.[0]?.data?.text?.generated ||
      ''

    if (!story) {
      return { statusCode: 502, body: JSON.stringify({ error: 'No se pudo generar el cuento' }) }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ story })
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error al generar el cuento' }) }
  }
}

