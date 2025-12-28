import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Loading from '../components/Loading'

describe('Loading', () => {
  it('renders loading text', () => {
    const { getByText } = render(<Loading />)
    expect(getByText(/Loading/)).toBeTruthy()
  })
})
