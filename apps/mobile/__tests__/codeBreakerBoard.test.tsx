/**
 * The Code Breaker board renders, and composing a guess sends one.
 *
 * Written when its static styles moved into a StyleSheet (issue #2), so that
 * kind of refactor is exercised by a real render, not just by the linter.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ui/index.js';
import { CodeBreakerBoard } from '../src/screens/play/games/CodeBreakerBoard.js';
import { playText } from '../src/screens/play/strings.js';
import { codeBreaker } from '../../../packages/games/src/games/codeBreaker.js';

const players = ['me', 'them'] as const;

async function renderBoard(dispatch: jest.Mock, live = true) {
  const state = codeBreaker.createInitialState({ players: [...players], seed: 7, options: {} });
  return render(
    <ThemeProvider>
      <CodeBreakerBoard
        state={state}
        dispatch={dispatch}
        local="me"
        players={players}
        isHost
        nameFor={(p) => (p === 'me' ? 'You' : 'Maria')}
        turn="me"
        lastAction={null}
        live={live}
        disabledReason={live ? null : 'Waiting for the link'}
        frames={null}
        elapsedMs={0}
        sessionKey="code-breaker-test"
        width={380}
        height={700}
      />
    </ThemeProvider>,
  );
}

test('four taps fill the draft and Guess sends exactly those pegs', async () => {
  const dispatch = jest.fn(() => true);
  const view = await renderBoard(dispatch);

  for (const letter of ['A', 'C', 'C', 'F']) {
    await fireEvent.press(view.getByLabelText(playText.codeBreaker.colour(letter)));
  }
  expect(view.getByLabelText(playText.codeBreaker.slot(1, 'A'))).toBeTruthy();
  expect(view.getByLabelText(playText.codeBreaker.slot(4, 'F'))).toBeTruthy();

  await fireEvent.press(view.getByText(playText.codeBreaker.submit));
  expect(dispatch).toHaveBeenCalledWith('guess', { guess: [0, 2, 2, 5] });
});

test('a full draft disables the palette rather than overwriting a peg', async () => {
  const dispatch = jest.fn(() => true);
  const view = await renderBoard(dispatch);
  for (const letter of ['B', 'B', 'B', 'B']) await fireEvent.press(view.getByLabelText(playText.codeBreaker.colour(letter)));
  await fireEvent.press(view.getByLabelText(playText.codeBreaker.colour('E')));
  expect(view.getByLabelText(playText.codeBreaker.slot(4, 'B'))).toBeTruthy();
});
