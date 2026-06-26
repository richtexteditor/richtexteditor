import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the v2.1 react starter heading', () => {
  render(<App />);
  const heading = screen.getByText(/RichTextEditor for React/i);
  expect(heading).toBeInTheDocument();
});
