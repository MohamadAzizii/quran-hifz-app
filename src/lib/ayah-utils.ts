export function parseAyahKey(key: string): { surah: number; ayah: number } {
  const [s, a] = key.split(':').map((n) => parseInt(n, 10))
  return { surah: s, ayah: a }
}

export function compareAyahKeys(a: string, b: string): number {
  const pa = parseAyahKey(a)
  const pb = parseAyahKey(b)
  return pa.surah !== pb.surah ? pa.surah - pb.surah : pa.ayah - pb.ayah
}
