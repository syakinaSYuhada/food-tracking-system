import { useEffect, useState } from 'react'

export default function useObjectUrl(file) {
  const [objectUrl, setObjectUrl] = useState(null)

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setObjectUrl(null)
      return
    }

    const url = URL.createObjectURL(file)
    setObjectUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  return objectUrl
}
