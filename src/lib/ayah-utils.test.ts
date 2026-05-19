import { describe, it, expect } from 'vitest'
import { compareAyahKeys } from './ayah-utils'

describe('compareAyahKeys', () => {
  it('orders within same surah numerically', () => {
    expect(['2:2', '2:10', '2:1'].sort(compareAyahKeys)).toEqual(['2:1', '2:2', '2:10'])
  })
  it('orders across surahs', () => {
    expect(['10:1', '2:286', '3:1'].sort(compareAyahKeys)).toEqual(['2:286', '3:1', '10:1'])
  })
})
