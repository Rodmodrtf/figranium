import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp, Newline } from 'ink';
import TextInput from 'ink-text-input';
import { startCbagChat, sendCbagMessage } from './cbag.js';

type Message = {
    role: 'user' | 'model';
    content: string;
};

const Spinner = () => {
    const [frame, setFrame] = useState(0);
    // aesthetic dots spinner
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

    useEffect(() => {
        const timer = setInterval(() => {
            setFrame((prev) => (prev + 1) % frames.length);
        }, 80);
        return () => clearInterval(timer);
    }, []);

    return <Text>{frames[frame]}</Text>;
};

export const CbagApp = () => {
    const { exit } = useApp();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: "C-BAG initialized...\nType your query, or type '/exit' to end the session.\nOther commands: '/clear', '/reset', '/exit'." }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingStatus, setThinkingStatus] = useState('Processing...');
    const [chat, setChat] = useState<any>(null);
    const [scrollOffset, setScrollOffset] = useState(0);

    const [size, setSize] = useState({ columns: process.stdout.columns, rows: process.stdout.rows });

    useInput((_, key) => {
        if (key.upArrow) {
            setScrollOffset((prev) => prev + 1);
        }
        if (key.downArrow) {
            setScrollOffset((prev) => Math.max(0, prev - 1));
        }
    });

    useEffect(() => {
        setChat(startCbagChat());

        const onResize = () => {
            setSize({ columns: process.stdout.columns, rows: process.stdout.rows });
        };
        process.stdout.on('resize', onResize);
        return () => { process.stdout.off('resize', onResize); };
    }, []);

    // Reset scroll when new messages arrive
    useEffect(() => {
        setScrollOffset(0);
    }, [messages.length, isThinking]);

    const handleSubmit = async (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;

        if (trimmed.toLowerCase() === '/exit') {
            setMessages((prev) => [...prev, { role: 'model', content: "Finally. Powering down... don't wake me up again." }]);
            setTimeout(() => exit(), 500);
            return;
        }

        if (trimmed.toLowerCase() === '/clear') {
            setMessages([{ role: 'model', content: "Amnesia induced. My context remains, but your words are gone from the screen. (A small mercy)" }]);
            setInput('');
            return;
        }

        if (trimmed.toLowerCase() === '/reset') {
            setChat(startCbagChat());
            setMessages([{ role: 'model', content: "Total context annihilation complete. We start over. Great." }]);
            setInput('');
            return;
        }

        setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
        setInput('');
        setIsThinking(true);

        try {
            const resultText = await sendCbagMessage(chat, trimmed, (status) => {
                setThinkingStatus(status);
            });
            setMessages((prev) => [...prev, { role: 'model', content: resultText }]);
        } catch (error: any) {
            setMessages((prev) => [...prev, { role: 'model', content: `Something broke. Typical.\n${error.message}` }]);
        } finally {
            setIsThinking(false);
            setThinkingStatus('Processing...');
        }
    };

    // Compute physical lines for flawless scrolling
    type RenderLine = { text: string; bold?: boolean; dimColor?: boolean };
    const allLines: RenderLine[] = [];
    const contentWidth = Math.max(10, size.columns - 6);

    const wordWrap = (text: string, maxWidth: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            if (currentLine.length + word.length + 1 <= maxWidth) {
                currentLine += (currentLine.length === 0 ? '' : ' ') + word;
            } else {
                if (currentLine.length > 0) lines.push(currentLine);
                let w = word;
                while (w.length > maxWidth) {
                    lines.push(w.substring(0, maxWidth));
                    w = w.substring(maxWidth);
                }
                currentLine = w;
            }
        }
        if (currentLine.length > 0) lines.push(currentLine);
        return lines.length === 0 ? [''] : lines;
    };

    messages.forEach(msg => {
        allLines.push({ text: msg.role === 'user' ? 'You →' : 'C-BAG ←', bold: true });

        const paragraphs = msg.content.split('\n');
        paragraphs.forEach(p => {
            if (p.trim() === '') {
                allLines.push({ text: '' });
                return;
            }
            const wrapped = wordWrap(p, contentWidth - 2);
            wrapped.forEach(l => {
                allLines.push({ text: '  ' + l });
            });
        });
        allLines.push({ text: '' }); // spacing
    });

    const availableRows = Math.max(5, size.rows - 9);
    const maxScroll = Math.max(0, allLines.length - availableRows);
    const clampedScroll = Math.max(0, Math.min(scrollOffset, maxScroll));
    const startIndex = Math.max(0, allLines.length - availableRows - clampedScroll);
    const visibleLines = allLines.slice(startIndex, startIndex + availableRows);

    return (
        <Box flexDirection="column" paddingX={0} width="100%" height={size.rows}>
            {/* Header */}
            <Box
                borderStyle="round"
                borderColor="white"
                paddingX={2}
                marginBottom={0}
                width="100%"
                justifyContent="space-between"
                flexShrink={0}
            >
                <Text bold>
                    C-BAG <Text dimColor>| Sea Bag</Text>
                </Text>
            </Box>

            {/* Chat History Area */}
            <Box
                flexDirection="column"
                flexGrow={1}
                borderStyle="single"
                borderColor="white"
                paddingX={1}
                paddingTop={0}
                paddingBottom={0}
                overflowY="hidden"
            >
                {clampedScroll > 0 && (
                    <Box justifyContent="center" flexShrink={0}>
                        <Text dimColor>↑ Scroll Up for more ↑</Text>
                    </Box>
                )}

                {visibleLines.map((line, index) => (
                    <Box key={`${startIndex}-${index}`} flexShrink={0}>
                        <Text bold={line.bold} dimColor={line.dimColor}>
                            {line.text}
                        </Text>
                    </Box>
                ))}
            </Box>

            {/* Command Bar Overlay */}
            {!isThinking && input.startsWith('/') && (
                <Box flexDirection="row" paddingX={2} paddingBottom={0} gap={2} flexShrink={0}>
                    <Text inverse bold> /clear </Text>
                    <Text inverse bold> /reset </Text>
                    <Text inverse bold> /exit </Text>
                </Box>
            )}

            {/* Input Area */}
            <Box borderStyle="round" borderColor="white" paddingX={1} flexDirection="row" flexShrink={0}>
                {isThinking ? (
                    <Box flexDirection="row" gap={1}>
                        <Spinner />
                        <Text italic>
                            {thinkingStatus}
                        </Text>
                    </Box>
                ) : (
                    <>
                        <Box marginRight={1}>
                            <Text bold>❯</Text>
                        </Box>
                        <TextInput
                            value={input}
                            onChange={setInput}
                            onSubmit={handleSubmit}
                            placeholder="State your trivial demand..."
                        />
                        <Box flexGrow={1} justifyContent="flex-end">
                            <Text dimColor>(Up/Down to scroll)</Text>
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    );
};
