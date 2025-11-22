import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BetButtons } from '../../components/BetButtons'

describe('BetButtons', () => {
  const mockOnBet = vi.fn()
  const mockOutcomes = ['Yes', 'No']
  const mockEntryFee = 0.1

  it('should render all outcome buttons', () => {
    render(
      <BetButtons
        outcomes={mockOutcomes}
        entryFee={mockEntryFee}
        onBet={mockOnBet}
      />
    )

    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('should call onBet with correct index when button is clicked', () => {
    render(
      <BetButtons
        outcomes={mockOutcomes}
        entryFee={mockEntryFee}
        onBet={mockOnBet}
      />
    )

    fireEvent.click(screen.getByText('Yes'))
    expect(mockOnBet).toHaveBeenCalledWith(0)

    fireEvent.click(screen.getByText('No'))
    expect(mockOnBet).toHaveBeenCalledWith(1)
  })

  it('should disable buttons when disabled prop is true', () => {
    render(
      <BetButtons
        outcomes={mockOutcomes}
        entryFee={mockEntryFee}
        onBet={mockOnBet}
        disabled={true}
      />
    )

    const yesButton = screen.getByText('Yes').closest('button')
    expect(yesButton).toBeDisabled()
  })

  it('should show checkmark for user outcome', () => {
    render(
      <BetButtons
        outcomes={mockOutcomes}
        entryFee={mockEntryFee}
        onBet={mockOnBet}
        userOutcome={0}
      />
    )

    // User already bet on "Yes"
    const yesButton = screen.getByText('Yes').closest('button')
    expect(yesButton).toHaveClass(/selected|active/) // Depends on styling
  })

  it('should display entry fee', () => {
    render(
      <BetButtons
        outcomes={mockOutcomes}
        entryFee={mockEntryFee}
        onBet={mockOnBet}
      />
    )

    expect(screen.getByText(/0.1 SOL/i)).toBeInTheDocument()
  })

  it('should handle multiple outcomes', () => {
    const multiOutcomes = ['Option A', 'Option B', 'Option C', 'Option D']
    
    render(
      <BetButtons
        outcomes={multiOutcomes}
        entryFee={mockEntryFee}
        onBet={mockOnBet}
      />
    )

    multiOutcomes.forEach(outcome => {
      expect(screen.getByText(outcome)).toBeInTheDocument()
    })
  })
})

