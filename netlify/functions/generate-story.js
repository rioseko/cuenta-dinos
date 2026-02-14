export const handler = async (event) => {
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
- Tener alrededor de 200-300 palabras
- Incluir una moraleja sutil tejida naturalmente en la narrativa
- Estar completamente en español
- El dinosaurio debe ser el protagonista principal

Por favor escribe solo el contenido del cuento, sin título ni formato adicional.`

    const apiKey = process.env.CLARIFAI_API_KEY
    const modelId = process.env.CLARIFAI_MODEL_ID
    const modelVersionId = process.env.CLARIFAI_MODEL_VERSION_ID
    const userId = process.env.CLARIFAI_USER_ID
    const appId = process.env.CLARIFAI_APP_ID
    if (!apiKey) {
      console.error('Función: CLARIFAI_API_KEY ausente')
      return { statusCode: 500, body: JSON.stringify({ error: 'Falta CLARIFAI_API_KEY' }) }
    }
    if (!userId || !appId || !modelId || !modelVersionId) {
      console.error('Función: faltan identificadores de Clarifai (usuario/app/modelo/versión)')
      return { statusCode: 500, body: JSON.stringify({ error: 'Faltan CLARIFAI_USER_ID, CLARIFAI_APP_ID, CLARIFAI_MODEL_ID o CLARIFAI_MODEL_VERSION_ID' }) }
    }

    const base = `https://api.clarifai.com/v2/users/${encodeURIComponent(userId)}/apps/${encodeURIComponent(appId)}/models/${encodeURIComponent(modelId)}`
    const url = modelVersionId
      ? `${base}/versions/${encodeURIComponent(modelVersionId)}/outputs`
      : `${base}/outputs`

    let clarifaiRes = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_app_id: { user_id: userId, app_id: appId },
        inputs: [
          {
            data: {
              text: { raw: prompt }
            }
          }
        ]
      })
    })

    if (!clarifaiRes.ok) {
      const firstText = await clarifaiRes.text().catch(() => '')
      clarifaiRes = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_app_id: { user_id: userId, app_id: appId },
          inputs: [
            {
              data: {
                text: prompt
              }
            }
          ]
        })
      })
      if (!clarifaiRes.ok) {
        const secondText = await clarifaiRes.text().catch(() => '')
        console.error('Clarifai error', clarifaiRes.status, firstText || secondText)
        return {
          statusCode: clarifaiRes.status || 502,
          body: JSON.stringify({
            error: 'Clarifai falló',
            status: clarifaiRes.status,
            detail: (firstText || secondText)?.slice(0, 800)
          })
        }
      }
    }

    const data = await clarifaiRes.json()
    const story =
      data?.outputs?.[0]?.data?.text?.raw ||
      data?.outputs?.[0]?.data?.text?.generated ||
      ''

    if (!story) {
      console.error('Clarifai sin story en payload', JSON.stringify(data)?.slice(0, 500))
      return { statusCode: 502, body: JSON.stringify({ error: 'No se pudo generar el cuento' }) }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ story })
    }
  } catch (e) {
    console.error('Excepción en generate-story:', e)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error al generar el cuento' }) }
  }
}
