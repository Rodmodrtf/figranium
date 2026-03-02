import React from 'react';
import { render } from 'ink';
import { CbagApp } from './ui.js';

async function main() {
    // Enter alternate screen buffer
    process.stdout.write('\x1b[?1049h');

    const { waitUntilExit } = render(<CbagApp />);
    await waitUntilExit();

    // Leave alternate screen buffer
    process.stdout.write('\x1b[?1049l');
    process.exit(0);
}

// Ensure cleanup on forceful exit
process.on('SIGINT', () => {
    process.stdout.write('\x1b[?1049l');
    process.exit(0);
});

main().catch((err) => {
    process.stdout.write('\x1b[?1049l');
    console.error(err);
    process.exit(1);
});
