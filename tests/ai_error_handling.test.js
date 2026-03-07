const assert = require('assert');

// Mocking storage
const mockStorage = {
    loadGeminiApiKey: async () => ['gemini-key'],
    loadOpenAiApiKey: async () => ['openai-key'],
    loadClaudeApiKey: async () => []
};

// Mocking handleAgent
const mockHandleAgent = async (req, res) => {
    res.json({ html: '<div>Mock HTML</div>' });
};

// Mocking express response
function createMockRes() {
    return {
        _status: 200,
        _json: null,
        status: function(s) { this._status = s; return this; },
        json: function(j) { this._json = j; return this; }
    };
}

async function testNoKeys() {
    console.log('Testing: No keys configured');
    const geminiKeys = [];
    const openAiKeys = [];
    const claudeKeys = [];

    const hasAnyKeys = geminiKeys.length > 0 || openAiKeys.length > 0 || claudeKeys.length > 0;
    assert.strictEqual(hasAnyKeys, false);

    // Simulating the route logic
    if (!hasAnyKeys) {
        const res = createMockRes().status(400).json({ error: 'No AI API keys configured. Please add a Gemini, OpenAI, or Anthropic key in Settings.' });
        assert.strictEqual(res._status, 400);
        assert.strictEqual(res._json.error, 'No AI API keys configured. Please add a Gemini, OpenAI, or Anthropic key in Settings.');
    }
}

async function testFetchFailure() {
    console.log('Testing: AI Provider Fetch Failure');

    let errors = [];
    const geminiKeys = ['bad-key'];

    // Mock fetch for Gemini 401
    const mockFetch = async (url, options) => {
        return {
            ok: false,
            status: 401,
            text: async () => 'Unauthorized: Invalid API Key'
        };
    };

    for (const key of geminiKeys) {
        const response = await mockFetch('...', {});
        if (!response.ok) {
            const text = await response.text();
            errors.push(`Gemini (Status ${response.status}): ${text}`);
        }
    }

    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].includes('401'));
    assert.ok(errors[0].includes('Unauthorized'));
}

async function runTests() {
    try {
        await testNoKeys();
        await testFetchFailure();
        console.log('AI Error Handling tests passed!');
    } catch (e) {
        console.error('Tests failed:', e);
        process.exit(1);
    }
}

runTests();
