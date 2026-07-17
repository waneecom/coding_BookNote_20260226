import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import App from './App';

jest.mock('./supabase', () => {
  const fail = () => Promise.reject(new TypeError('Failed to fetch'));
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: fail,
    single: fail,
    insert: fail,
    upsert: fail
  };

  return {
    isSupabaseConfigured: true,
    supabase: {
      from: () => query
    }
  };
});

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(global, 'crypto', {
    value: webcrypto,
    configurable: true
  });
  Object.defineProperty(global, 'TextEncoder', {
    value: TextEncoder,
    configurable: true
  });
});

test('allows signup with valid credentials when Supabase fetch fails', async () => {
  render(<App />);

  fireEvent.click(await screen.findByRole('button', { name: '회원가입' }));
  fireEvent.change(screen.getByPlaceholderText('이름을 입력하세요'), {
    target: { value: '신지안' }
  });
  fireEvent.change(screen.getByPlaceholderText('비밀번호 (8자 이상, 문자+숫자 필수)'), {
    target: { value: '12345678s' }
  });
  fireEvent.change(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), {
    target: { value: '12345678s' }
  });

  const signupButtons = screen.getAllByRole('button', { name: '회원가입' });
  fireEvent.click(signupButtons[signupButtons.length - 1]);

  await waitFor(() => {
    expect(JSON.parse(localStorage.getItem('booknote_session'))).toEqual({
      id: '신지안',
      displayName: '신지안'
    });
  });
  expect(screen.getByText('자동저장')).toBeInTheDocument();
});
