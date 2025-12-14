import * as readline from 'readline';

export function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

export function askPassword(query: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        // Mute output for password
        const stdin = process.stdin;
        let password = '';

        process.stdout.write(query);

        // Listen to keypress events
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        const onData = (char: string) => {
            const charCode = char.charCodeAt(0);

            // Handle Enter (newline)
            if (char === '\n' || char === '\r' || char === '\r\n') {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.removeListener('data', onData);
                process.stdout.write('\n');
                rl.close();
                resolve(password);
            }
            // Handle Ctrl+C
            else if (charCode === 3) {
                process.exit(1);
            }
            // Handle Backspace
            else if (charCode === 127 || charCode === 8) {
                if (password.length > 0) {
                    password = password.slice(0, -1);
                    // Move cursor back, write space, move back again
                    process.stdout.write('\b \b');
                }
            }
            // Handle normal characters
            else if (charCode >= 32 && charCode <= 126) {
                password += char;
                process.stdout.write('*');
            }
        };

        stdin.on('data', onData);
    });
}
