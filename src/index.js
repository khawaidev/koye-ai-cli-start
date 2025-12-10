
/**
 * KOYE Start Server
 * 
 * Responsibilities:
 * - Host install.sh for CLI installation
 * - Provide initial config for koye init
 * - Handle authentication (register, login, status)
 * - Provide plan & profile info
 * - Validate CLI tokens
 */

import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Server URLs
const MAIN_SERVER_URL = process.env.MAIN_SERVER_URL || 'https://api.koye.ai';
const MAKE_PUBLIC_URL = process.env.MAKE_PUBLIC_URL || 'https://public.koye.ai';
const START_SERVER_URL = process.env.START_SERVER_URL || 'https://start.koye.ai';

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ============== INSTALL SCRIPT ==============

// The install.sh script that users run via: curl -fsSL https://start.koye.ai/install.sh | bash
app.get('/install.sh', (req, res) => {
    const installScript = `#!/bin/bash
# ╔═══════════════════════════════════════════════╗
# ║     🎮 KOYE CLI - Game Development AI         ║
# ╚═══════════════════════════════════════════════╝
#
# Installation: curl -fsSL ${START_SERVER_URL}/install.sh | bash

set -e

KOYE_VERSION="1.0.0"
KOYE_HOME="\${HOME}/.koye"
KOYE_BIN="\${KOYE_HOME}/bin"

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║     🎮 KOYE CLI Installer v\${KOYE_VERSION}           ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo ""
    echo "   Please install Node.js 18+ from: https://nodejs.org"
    echo "   Or use a version manager like nvm:"
    echo ""
    echo "   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "   nvm install 18"
    echo ""
    exit 1
fi

NODE_VERSION=\$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "\$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Found: \$(node -v)"
    echo "   Please upgrade Node.js"
    exit 1
fi

echo "✅ Node.js \$(node -v) detected"
echo ""

# Create KOYE directories
echo "📁 Setting up KOYE directories..."
mkdir -p "\${KOYE_HOME}"
mkdir -p "\${KOYE_BIN}"

# Download the CLI script
echo "📦 Downloading KOYE CLI..."
curl -fsSL ${START_SERVER_URL}/cli/koye.js -o "\${KOYE_BIN}/koye.js"

# Create the koye executable wrapper
cat > "\${KOYE_BIN}/koye" << 'KOYE_CLI_WRAPPER'
#!/usr/bin/env node
import('\${HOME}/.koye/bin/koye.js')
KOYE_CLI_WRAPPER

# Make it executable
chmod +x "\${KOYE_BIN}/koye"

# Add to PATH in shell profiles
add_to_path() {
    local profile="\$1"
    if [ -f "\$profile" ]; then
        if ! grep -q "KOYE_HOME" "\$profile"; then
            echo "" >> "\$profile"
            echo "# KOYE CLI" >> "\$profile"
            echo 'export KOYE_HOME="\$HOME/.koye"' >> "\$profile"
            echo 'export PATH="\$KOYE_HOME/bin:\$PATH"' >> "\$profile"
            echo "   Added to \$profile"
        fi
    fi
}

echo ""
echo "🔧 Adding KOYE to PATH..."
add_to_path "\$HOME/.bashrc"
add_to_path "\$HOME/.zshrc"
add_to_path "\$HOME/.profile"

# Export for current session
export KOYE_HOME="\$HOME/.koye"
export PATH="\$KOYE_HOME/bin:\$PATH"

echo ""
echo "═══════════════════════════════════════════════"
echo ""
echo "  ✅ KOYE CLI installed successfully!"
echo ""
echo "  🚀 Quick Start:"
echo ""
echo "     1. Open a new terminal (or run: source ~/.bashrc)"
echo ""
echo "     2. Navigate to your game project folder:"
echo "        cd my-game-project"
echo ""
echo "     3. Initialize KOYE:"
echo "        koye init"
echo ""
echo "     4. Start chatting with KOYE AI:"
echo "        koye chat"
echo ""
echo "  📚 Commands:"
echo "     koye init      - Initialize KOYE in a project"
echo "     koye login     - Login to your account"
echo "     koye register  - Create a new account"
echo "     koye chat      - Start AI chat session"
echo "     koye help      - Show all commands"
echo ""
echo "═══════════════════════════════════════════════"
echo ""
`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'inline; filename="install.sh"');
    res.send(installScript);
});

// PowerShell install script for Windows users
app.get('/install.ps1', (req, res) => {
    const installScript = `# KOYE CLI - Windows Installer
# Installation: irm ${START_SERVER_URL}/install.ps1 | iex

$ErrorActionPreference = "Stop"
$KOYE_VERSION = "1.0.0"
$KOYE_HOME = "$env:USERPROFILE\\.koye"
$KOYE_BIN = "$KOYE_HOME\\bin"

Write-Host ""
Write-Host "KOYE CLI Installer v$KOYE_VERSION" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
try {
    $nodeVersion = node -v 2>$null
    if (-not $nodeVersion) { throw "Node not found" }
    $majorVersion = [int]($nodeVersion -replace 'v(\\d+).*', '\$1')
    if ($majorVersion -lt 18) {
        Write-Host "Node.js 18+ required. Found: $nodeVersion" -ForegroundColor Red
        exit 1
    }
    Write-Host "Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "Node.js is required. Install from: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Create directories
if (-not (Test-Path $KOYE_HOME)) { New-Item -ItemType Directory -Path $KOYE_HOME -Force | Out-Null }
if (-not (Test-Path $KOYE_BIN)) { New-Item -ItemType Directory -Path $KOYE_BIN -Force | Out-Null }

# Download CLI
Write-Host "Downloading KOYE CLI..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "${START_SERVER_URL}/cli/koye.js" -OutFile "$KOYE_BIN\\koye.js" -UseBasicParsing

# Create batch wrapper
Set-Content -Path "$KOYE_BIN\\koye.cmd" -Value '@echo off\nnode "%USERPROFILE%\\.koye\\bin\\koye.js" %*'

# Add to PATH
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -notlike "*$KOYE_BIN*") {
    [Environment]::SetEnvironmentVariable("PATH", "$KOYE_BIN;$userPath", "User")
    $env:PATH = "$KOYE_BIN;$env:PATH"
}

Write-Host ""
Write-Host "KOYE CLI installed! Open a NEW terminal and run: koye help" -ForegroundColor Green
Write-Host ""
`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'inline; filename="install.ps1"');
    res.send(installScript);
});

// ============== CLI SCRIPT (served to users) ==============

// The actual CLI JavaScript that gets downloaded
app.get('/cli/koye.js', (req, res) => {
    const cliScript = `#!/usr/bin/env node
/**
 * KOYE CLI - Game Development AI Assistant
 * Run 'koye help' for usage information
 */

import { createInterface } from 'readline';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const KOYE_HOME = join(homedir(), '.koye');
const AUTH_FILE = join(KOYE_HOME, 'auth.json');
const SERVERS = {
    start: '${START_SERVER_URL}',
    main: '${MAIN_SERVER_URL}',
    public: '${MAKE_PUBLIC_URL}'
};

// ============== Utilities ==============

function loadAuth() {
    if (existsSync(AUTH_FILE)) {
        try { return JSON.parse(readFileSync(AUTH_FILE, 'utf-8')); }
        catch { return null; }
    }
    return null;
}

function saveAuth(auth) {
    mkdirSync(KOYE_HOME, { recursive: true });
    writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
}

function loadConfig() {
    const configPath = join(process.cwd(), 'koye.json');
    if (existsSync(configPath)) {
        try { return JSON.parse(readFileSync(configPath, 'utf-8')); }
        catch { return null; }
    }
    return null;
}

function saveConfig(config) {
    writeFileSync(join(process.cwd(), 'koye.json'), JSON.stringify(config, null, 2));
}

async function apiRequest(server, endpoint, options = {}) {
    const auth = loadAuth();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (auth?.token) headers['Authorization'] = \`Bearer \${auth.token}\`;

    const baseUrl = server === 'start' ? SERVERS.start : server === 'main' ? SERVERS.main : SERVERS.public;
    const response = await fetch(\`\${baseUrl}\${endpoint}\`, { ...options, headers });
    return response.json();
}

function prompt(question) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

// ============== Commands ==============

async function cmdHelp() {
    console.log(\`
╔═══════════════════════════════════════════════╗
║     🎮 KOYE CLI - Game Development AI         ║
╚═══════════════════════════════════════════════╝

Commands:
  koye init       Initialize KOYE in current directory
  koye login      Login to your KOYE account
  koye register   Create a new KOYE account
  koye chat       Start interactive AI chat
  koye profile    View your account info
  koye help       Show this help message

Examples:
  koye init       # Creates koye.json and koye-assets/
  koye chat       # Start chatting with KOYE AI
\`);
}

async function cmdInit() {
    console.log('\\n🎮 Initializing KOYE...\\n');

    const existingConfig = loadConfig();
    if (existingConfig) {
        const answer = await prompt('koye.json already exists. Overwrite? (y/N): ');
        if (answer.toLowerCase() !== 'y') {
            console.log('Keeping existing configuration.');
            return;
        }
    }

    // Get config from server
    let serverConfig = {};
    try {
        const response = await apiRequest('start', '/config/init');
        serverConfig = response.config || {};
    } catch (e) {
        console.log('⚠️  Could not connect to server, using defaults.');
    }

    const projectName = await prompt('Project name (' + (process.cwd().split('/').pop() || 'my-game') + '): ') || process.cwd().split('/').pop() || 'my-game';

    const auth = loadAuth();
    const config = {
        version: '1.0.0',
        project_name: projectName,
        project_id: 'proj_' + Math.random().toString(36).substr(2, 9),
        user_id: auth?.user?.id || '',
        plan: auth?.user?.plan || 'FREE',
        servers: {
            start: SERVERS.start,
            main: SERVERS.main,
            make_public: SERVERS.public
        },
        assets: {
            root: './koye-assets',
            images: 'images',
            videos: 'videos',
            audio: 'audio',
            models3d: '3dmodels',
            other: 'other'
        },
        features: {
            chat_enabled: true,
            sync_chat_history: true,
            allow_make_public: true
        }
    };

    saveConfig(config);

    // Create asset directories
    const assetsRoot = join(process.cwd(), config.assets.root);
    ['images', 'videos', 'audio', '3dmodels', 'other'].forEach(folder => {
        mkdirSync(join(assetsRoot, folder), { recursive: true });
    });

    console.log('\\n✅ KOYE initialized!');
    console.log('   Created: koye.json');
    console.log('   Created: koye-assets/');
    console.log('\\n🚀 Run \\'koye chat\\' to start building with AI\\n');
}

async function cmdLogin() {
    console.log('\\n📧 Login to KOYE\\n');

    const email = await prompt('Email: ');
    const password = await prompt('Password: ');

    const response = await apiRequest('start', '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });

    if (!response.success) {
        console.log('\\n❌ ' + (response.error || 'Login failed'));
        return;
    }

    saveAuth({ token: response.token, user: response.user });

    const config = loadConfig();
    if (config) {
        config.user_id = response.user.id;
        config.plan = response.user.plan;
        saveConfig(config);
    }

    console.log('\\n✅ Logged in as: ' + response.user.email);
    console.log('   Plan: ' + response.user.plan);
    console.log('   Credits: ' + response.user.credits);
    console.log('\\n🚀 Run \\'koye chat\\' to start building\\n');
}

async function cmdRegister() {
    console.log('\\n🎮 Create KOYE Account\\n');

    const email = await prompt('Email: ');
    const password = await prompt('Password (min 6 chars): ');

    const response = await apiRequest('start', '/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });

    if (!response.success) {
        console.log('\\n❌ ' + (response.error || 'Registration failed'));
        return;
    }

    console.log('\\n📧 Check your email for verification link!');
    await prompt('Press ENTER after verifying...');

    // Try to login
    const loginResponse = await apiRequest('start', '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });

    if (loginResponse.success) {
        saveAuth({ token: loginResponse.token, user: loginResponse.user });
        console.log('\\n✅ Account created and logged in!');
    } else {
        console.log('\\n⚠️  Please run \\'koye login\\' after verifying your email');
    }
}

async function cmdProfile() {
    const auth = loadAuth();
    if (!auth) {
        console.log('\\n❌ Not logged in. Run \\'koye login\\'\\n');
        return;
    }

    const response = await apiRequest('start', '/user/profile');
    if (!response.success) {
        console.log('\\n❌ ' + (response.error || 'Failed to fetch profile'));
        return;
    }

    console.log(\`
╔═══════════════════════════════════════════════╗
║              KOYE Account Profile             ║
╠═══════════════════════════════════════════════╣
  Email:   \${response.user.email}
  Plan:    \${response.user.plan}
  Credits: \${response.user.credits}
╚═══════════════════════════════════════════════╝
\`);
}

async function cmdChat() {
    const config = loadConfig();
    if (!config) {
        console.log('\\n❌ koye.json not found. Run \\'koye init\\' first.\\n');
        return;
    }

    const auth = loadAuth();
    if (!auth) {
        console.log('\\n❌ Not logged in. Run \\'koye login\\' first.\\n');
        return;
    }

    console.log(\`
╔═══════════════════════════════════════════════╗
║     🎮 KOYE AI - Game Development Chat        ║
╚═══════════════════════════════════════════════╝

  Logged in as: \${auth.user.email}
  Project: \${config.project_name}

  Type your message, or:
    koye help   - show commands
    koye new    - new chat session
    exit        - quit

─────────────────────────────────────────────────
\`);

    // Create session
    const sessionRes = await apiRequest('main', '/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({ project_id: config.project_id, title: config.project_name })
    });

    if (!sessionRes.success) {
        console.log('\\n❌ Failed to create chat session');
        return;
    }

    const sessionId = sessionRes.session.id;
    
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    const chat = async () => {
        rl.question('\\n\\x1b[36mYou:\\x1b[0m ', async (input) => {
            if (!input.trim()) { chat(); return; }
            if (input.trim().toLowerCase() === 'exit') { 
                console.log('\\n👋 Goodbye!\\n'); 
                rl.close(); 
                return; 
            }
            if (input.trim().toLowerCase() === 'koye help') {
                console.log(\`
  koye help   - Show this help
  koye new    - Start new session
  exit        - Exit chat
\`);
                chat();
                return;
            }

            try {
                const response = await apiRequest('main', \`/chat/sessions/\${sessionId}/messages\`, {
                    method: 'POST',
                    body: JSON.stringify({ content: input })
                });

                if (response.success) {
                    console.log('\\n\\x1b[35mKOYE:\\x1b[0m ' + response.reply);

                    if (response.actions?.length > 0) {
                        console.log('\\n─────────────────────────────────────────────────');
                        for (const action of response.actions) {
                            if (action.success) {
                                console.log(\`  ✅ \${action.action}: \${action.url || action.path || 'done'}\`);
                            } else {
                                console.log(\`  ❌ \${action.action}: \${action.error}\`);
                            }
                        }
                        console.log('─────────────────────────────────────────────────');
                    }
                } else {
                    console.log('\\n❌ ' + (response.error || 'Failed to send message'));
                }
            } catch (e) {
                console.log('\\n❌ Error: ' + e.message);
            }

            chat();
        });
    };

    chat();
}

// ============== Main ==============

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'init': cmdInit(); break;
    case 'login': cmdLogin(); break;
    case 'register': cmdRegister(); break;
    case 'profile': cmdProfile(); break;
    case 'chat': cmdChat(); break;
    case 'help': case '--help': case '-h': case undefined: cmdHelp(); break;
    default: console.log('Unknown command: ' + command + '. Run \\'koye help\\' for usage.');
}
`;

    res.setHeader('Content-Type', 'application/javascript');
    res.send(cliScript);
});

// ============== CONFIGURATION ==============

app.get('/config/init', (req, res) => {
    res.json({
        success: true,
        config: {
            version: process.env.CLI_VERSION || '1.0.0',
            servers: {
                start: START_SERVER_URL,
                main: MAIN_SERVER_URL,
                make_public: MAKE_PUBLIC_URL
            },
            assets: {
                root: './koye-assets',
                images: 'images',
                videos: 'videos',
                audio: 'audio',
                models3d: '3dmodels',
                other: 'other'
            },
            features: {
                chat_enabled: true,
                sync_chat_history: true,
                allow_make_public: true
            }
        }
    });
});

// ============== AUTHENTICATION ==============

app.post('/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: false,
            user_metadata: { plan: 'FREE', credits: 100, registered_via: 'cli' }
        });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        await supabase.auth.resend({ type: 'signup', email });

        res.json({
            success: true,
            message: 'Check your email for verification',
            user_id: data.user.id
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            return res.status(401).json({ success: false, error: error.message });
        }

        if (!data.user.email_confirmed_at) {
            return res.status(403).json({
                success: false,
                error: 'Email not verified',
                needs_verification: true
            });
        }

        const token = jwt.sign(
            { user_id: data.user.id, email: data.user.email, plan: data.user.user_metadata?.plan || 'FREE' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: data.user.id,
                email: data.user.email,
                plan: data.user.user_metadata?.plan || 'FREE',
                credits: data.user.user_metadata?.credits || 100
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

app.get('/auth/status', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email required' });
        }

        const { data } = await supabase.auth.admin.listUsers();
        const user = data.users.find(u => u.email === email);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, email_confirmed: !!user.email_confirmed_at });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Status check failed' });
    }
});

// ============== AUTH MIDDLEWARE ==============

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// ============== USER PROFILE ==============

app.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.auth.admin.getUserById(req.user.user_id);

        if (error || !data.user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email,
                plan: data.user.user_metadata?.plan || 'FREE',
                credits: data.user.user_metadata?.credits || 100,
                created_at: data.user.created_at
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
});

app.get('/auth/validate', authenticateToken, (req, res) => {
    res.json({ success: true, valid: true, user: req.user });
});

// ============== HEALTH CHECK ==============

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'koye-start-server',
        version: process.env.CLI_VERSION || '1.0.0'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 KOYE Start Server running on port ${PORT}`);
    console.log(`   Install: curl -fsSL http://localhost:${PORT}/install.sh | bash`);
});
