import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}));

describe('Basic Component Tests', () => {
  it('should render a simple div', () => {
    render(<div data-testid="test-div">Test Content</div>);
    expect(screen.getByTestId('test-div')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should handle basic interactions', () => {
    const handleClick = jest.fn();
    render(
      <button data-testid="test-button" onClick={handleClick}>
        Click me
      </button>
    );
    
    const button = screen.getByTestId('test-button');
    expect(button).toBeInTheDocument();
    
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});