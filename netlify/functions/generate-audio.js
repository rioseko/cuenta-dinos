export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  try {
    const { text } = JSON.parse(event.body || '{}')
    if (!text || typeof text !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Parámetros inválidos' }) }
    }
    const apiKey = process.env.CLARIFAI_API_KEY
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Falta CLARIFAI_API_KEY' }) }
    }
    const userId = 'eleven-labs'
    const appId = 'audio-generation'
    const modelId = 'speech-synthesis'
    const versionId = 'f2cead3a965f4c419a61a4a9b501095c'
    const wantsBinary = (event.queryStringParameters?.format || '').toLowerCase() === 'binary'
    const url = `https://api.clarifai.com/v2/users/${userId}/apps/${appId}/models/${modelId}/versions/${versionId}/outputs`
    const res = await fetch(url, {
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
              text: { raw: text }
            }
          }
        ]
      })
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return {
        statusCode: res.status || 502,
        body: JSON.stringify({ error: 'Clarifai TTS falló', detail: detail?.slice(0, 800) })
      }
    }
    const data = await res.json()
    const audioObj = data?.outputs?.[0]?.data?.audio || {}
    const audioBase64 = audioObj?.base64 || null
    const audioUrl = audioObj?.url || null
    if (!audioBase64 && !audioUrl) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Audio no disponible' }) }
    }
    if (wantsBinary) {
      let base64 = audioBase64
      let mime = 'audio/mpeg'
      if (!base64 && audioUrl) {
        const r2 = await fetch(audioUrl)
        const buf = await r2.arrayBuffer()
        mime = r2.headers.get('content-type') || mime
        base64 = Buffer.from(buf).toString('base64')
      }
      if (!base64) {
        return { statusCode: 502, body: JSON.stringify({ error: 'Audio binario no disponible' }) }
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': mime },
        body: base64,
        isBase64Encoded: true
      }
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({ audioUrl, mime: 'audio/mpeg' })
      }
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error al generar audio' }) }
  }
}
