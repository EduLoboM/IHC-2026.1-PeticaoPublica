(function() {
    console.log("Antigravity Accessibility JS Loaded successfully!");
    // ==========================================================================
    // INITIALIZATION & PREFERENCES MANAGEMENT
    // ==========================================================================
    
    // Default accessibility settings
    const DEFAULTS = {
        fontSize: 100,        // 100, 120, 140, 160, 180, 200 (percentage)
        fontFamily: 'default', // default, dyslexic, hyperlegible, limbus, isaac, serif
        buttonSize: 'normal', // small, normal, large, xlarge
        theme: 'default',      // default, dark, contrast, solarized-light, solarized-dark
        lineSpacing: false,
        readingRuler: false,
        largeCursor: false
    };

    // Load preferences from localStorage
    function loadPrefs() {
        try {
            const saved = localStorage.getItem('accessibility_prefs');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Migrate legacy string font sizes to numeric percentage
                if (typeof parsed.fontSize === 'string') {
                    const sizeMapping = {
                        'normal': 100,
                        'large': 120,
                        'xlarge': 150,
                        'xxlarge': 180
                    };
                    parsed.fontSize = sizeMapping[parsed.fontSize] || 100;
                }
                // Migrate legacy solarized theme to solarized-light
                if (parsed.theme === 'solarized') {
                    parsed.theme = 'solarized-light';
                }
                return Object.assign({}, DEFAULTS, parsed);
            }
            return Object.assign({}, DEFAULTS);
        } catch (e) {
            console.error("Erro ao carregar preferências de acessibilidade:", e);
            return Object.assign({}, DEFAULTS);
        }
    }

    // Save preferences to localStorage
    function savePrefs(prefs) {
        try {
            localStorage.setItem('accessibility_prefs', JSON.stringify(prefs));
        } catch (e) {
            console.error("Erro ao salvar preferências de acessibilidade:", e);
        }
    }

    // Current state of settings
    let currentPrefs = loadPrefs();
    let isPanelInitialized = false;

    // Remove all classes matching a specific prefix from body
    function removeClassesWithPrefix(prefix) {
        if (!document.body) return;
        const classes = Array.from(document.body.classList);
        classes.forEach(cls => {
            if (cls.startsWith(prefix)) {
                document.body.classList.remove(cls);
            }
        });
    }

    // Helper to recursively walk through all text nodes in the page (excluding the accessibility panel)
    function walkTextNodes(node, callback) {
        if (!node) return;
        
        // Exclude script, style, and elements with .acc-exclude
        if (node.nodeType === 1) { // Node.ELEMENT_NODE is 1
            if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
            if (node.classList && node.classList.contains('acc-exclude')) return;
            
            // Process inputs (buttons, submits) and placeholders
            if (node.tagName === 'INPUT' && (node.type === 'button' || node.type === 'submit' || node.type === 'text')) {
                callback(node);
            }
            
            for (let i = 0; i < node.childNodes.length; i++) {
                walkTextNodes(node.childNodes[i], callback);
            }
        } else if (node.nodeType === 3) { // Node.TEXT_NODE is 3
            if (node.textContent.trim().length > 0) {
                callback(node);
            }
        }
    }

    // Helper to normalize Portuguese accented characters and ç/Ç for Limbus font
    function normalizeText(text) {
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[çÇ]/g, (match) => match === 'ç' ? 'c' : 'C');
    }

    // Apply or revert Limbus normalization on the document text
    function applyLimbusNormalization(removeAccents) {
        if (!document.body) return;
        
        walkTextNodes(document.body, (node) => {
            if (node.nodeType === 3) { // Node.TEXT_NODE is 3
                if (removeAccents) {
                    if (node._originalText === undefined) {
                        node._originalText = node.textContent;
                    }
                    node.textContent = normalizeText(node._originalText);
                } else {
                    if (node._originalText !== undefined) {
                        node.textContent = node._originalText;
                        delete node._originalText;
                    }
                }
            } else if (node.nodeType === 1 && node.tagName === 'INPUT') { // Node.ELEMENT_NODE is 1
                if (removeAccents) {
                    if (node.type === 'button' || node.type === 'submit') {
                        if (node._originalValue === undefined) {
                            node._originalValue = node.value;
                        }
                        node.value = normalizeText(node._originalValue);
                    }
                    if (node.placeholder) {
                        if (node._originalPlaceholder === undefined) {
                            node._originalPlaceholder = node.placeholder;
                        }
                        node.placeholder = normalizeText(node._originalPlaceholder);
                    }
                } else {
                    if (node._originalValue !== undefined) {
                        node.value = node._originalValue;
                        delete node._originalValue;
                    }
                    if (node._originalPlaceholder !== undefined) {
                        node.placeholder = node._originalPlaceholder;
                        delete node._originalPlaceholder;
                    }
                }
            }
        });
    }

    // Apply the active settings to the document body
    function applyPreferences() {
        if (!document.body) return;

        // 1. Font Size (dynamic zoom applied to page-wrapper only)
        const wrapper = document.getElementById('acc-page-wrapper');
        if (wrapper) {
            const scale = (currentPrefs.fontSize || 100) / 100;
            wrapper.style.zoom = scale;
        }

        // 2. Font Family (safely removing specific font family overrides)
        document.body.classList.remove('acc-font-serif', 'acc-font-dyslexic', 'acc-font-hyperlegible', 'acc-font-limbus', 'acc-font-isaac');
        
        if (currentPrefs.fontFamily === 'serif') {
            document.body.classList.add('acc-font-serif');
        } else if (currentPrefs.fontFamily === 'dyslexic') {
            document.body.classList.add('acc-font-dyslexic');
        } else if (currentPrefs.fontFamily === 'hyperlegible') {
            document.body.classList.add('acc-font-hyperlegible');
        } else if (currentPrefs.fontFamily === 'limbus') {
            document.body.classList.add('acc-font-limbus');
        } else if (currentPrefs.fontFamily === 'isaac') {
            document.body.classList.add('acc-font-isaac');
        }

        // 3. Button Size
        removeClassesWithPrefix('acc-btn-');
        if (currentPrefs.buttonSize === 'small') {
            document.body.classList.add('acc-btn-sm');
        } else if (currentPrefs.buttonSize === 'large') {
            document.body.classList.add('acc-btn-lg');
        } else if (currentPrefs.buttonSize === 'xlarge') {
            document.body.classList.add('acc-btn-xl');
        }

        // 4. Color Theme
        removeClassesWithPrefix('theme-');
        if (currentPrefs.theme === 'dark') {
            document.body.classList.add('theme-dark');
        } else if (currentPrefs.theme === 'contrast') {
            document.body.classList.add('theme-contrast');
        } else if (currentPrefs.theme === 'solarized-light') {
            document.body.classList.add('theme-solarized-light');
        } else if (currentPrefs.theme === 'solarized-dark') {
            document.body.classList.add('theme-solarized-dark');
        }

        // 5. Line Spacing
        if (currentPrefs.lineSpacing) {
            document.body.classList.add('acc-line-spacing-lg');
        } else {
            document.body.classList.remove('acc-line-spacing-lg');
        }

        // 6. Large Cursor
        if (currentPrefs.largeCursor) {
            document.body.classList.add('acc-cursor-large');
        } else {
            document.body.classList.remove('acc-cursor-large');
        }

        // 7. Reading Ruler
        const ruler = document.getElementById('acc-reading-ruler');
        if (ruler) {
            if (currentPrefs.readingRuler) {
                document.body.classList.add('acc-ruler-active');
            } else {
                document.body.classList.remove('acc-ruler-active');
            }
        }

        // 8. Limbus Company Accent Normalization (only if DOM is fully parsed)
        if (document.readyState !== 'loading') {
            if (currentPrefs.fontFamily === 'limbus') {
                applyLimbusNormalization(true);
            } else {
                applyLimbusNormalization(false);
            }
        }

        // Update UI controls to match internal state if panel is loaded
        updateControlsUI();
    }

    // Early Apply (prevents flash of original styles on load)
    function earlyApply() {
        if (document.body) {
            applyPreferences();
        } else {
            setTimeout(earlyApply, 5);
        }
    }
    earlyApply();

    // ==========================================================================
    // DOM GENERATION & INJECTION
    // ==========================================================================
    
    function init() {
        if (isPanelInitialized) return;
        isPanelInitialized = true;
        console.log("Accessibility panel initializing...");

        try {
            // 0. Wrap existing page content in #acc-page-wrapper to prevent accessibility styles from zooming/breaking overlay controls
            if (!document.getElementById('acc-page-wrapper')) {
                const pageWrapper = document.createElement('div');
                pageWrapper.id = 'acc-page-wrapper';
                
                // Move elements to the page wrapper (leaving scripts and styles in body)
                const children = Array.from(document.body.childNodes);
                children.forEach(child => {
                    if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') {
                        // Leave styles and scripts in body to avoid unintended side effects
                    } else {
                        pageWrapper.appendChild(child);
                    }
                });
                document.body.appendChild(pageWrapper);
            }

            // 1. Create reading ruler
            const ruler = document.createElement('div');
            ruler.id = 'acc-reading-ruler';
            ruler.className = 'acc-reading-ruler acc-exclude';
            document.body.appendChild(ruler);

            // 2. Create backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'acc-backdrop acc-exclude';
            document.body.appendChild(backdrop);

            // 3. Create sliding accessibility panel container
            const panel = document.createElement('div');
            panel.className = 'acc-panel acc-exclude';
            panel.setAttribute('aria-hidden', 'true');
            panel.innerHTML = `
                <div class="acc-panel-header">
                    <h2>Acessibilidade</h2>
                    <button class="acc-close-btn" aria-label="Fechar painel">&times;</button>
                </div>
                <div class="acc-panel-body">
                    <!-- Font Size (Slider) -->
                    <div class="acc-section">
                        <div class="acc-slider-header">
                            <h3>Tamanho do Texto</h3>
                            <span id="acc-text-size-val">100%</span>
                        </div>
                        <div class="acc-slider-container">
                            <span class="acc-slider-label-min">A</span>
                            <input type="range" id="acc-text-size-slider" min="100" max="200" step="20" value="100" aria-label="Tamanho do texto">
                            <span class="acc-slider-label-max">A</span>
                        </div>
                    </div>
                    
                    <!-- Font Style -->
                    <div class="acc-section">
                        <h3>Estilo de Fonte</h3>
                        <div class="acc-btn-group">
                            <button class="acc-btn" data-type="fontFamily" data-value="default">Padrão</button>
                            <button class="acc-btn" data-type="fontFamily" data-value="serif" style="font-family: Georgia, serif !important;">Serifa</button>
                            <button class="acc-btn" data-type="fontFamily" data-value="dyslexic" style="font-family: 'Comic Neue', cursive !important;">Dislexia</button>
                            <button class="acc-btn" data-type="fontFamily" data-value="hyperlegible" style="font-family: 'Atkinson Hyperlegible', sans-serif !important;">Hiperlegível</button>
                            <button class="acc-btn" data-type="fontFamily" data-value="limbus" style="font-family: 'Tagmarker', sans-serif !important;">Limbus Company</button>
                            <button class="acc-btn" data-type="fontFamily" data-value="isaac" style="font-family: 'Upheaval TT -BRK-', sans-serif !important;">Binding of Isaac</button>
                        </div>
                    </div>
                    
                    <!-- Color Theme -->
                    <div class="acc-section">
                        <h3>Tema de Cores</h3>
                        <div class="acc-btn-group acc-theme-group">
                            <button class="acc-btn acc-btn-full" data-type="theme" data-value="default">Padrão</button>
                            <button class="acc-btn" data-type="theme" data-value="dark">Escuro</button>
                            <button class="acc-btn" data-type="theme" data-value="contrast">Alto Contraste</button>
                            <button class="acc-btn" data-type="theme" data-value="solarized-light">Solarizado Claro</button>
                            <button class="acc-btn" data-type="theme" data-value="solarized-dark">Solarizado Escuro</button>
                        </div>
                    </div>
                    
                    <!-- Button Sizing -->
                    <div class="acc-section">
                        <h3>Tamanho dos Botões</h3>
                        <div class="acc-btn-group">
                            <button class="acc-btn" data-type="buttonSize" data-value="small">Pequeno</button>
                            <button class="acc-btn" data-type="buttonSize" data-value="normal">Padrão</button>
                            <button class="acc-btn" data-type="buttonSize" data-value="large">Grande</button>
                            <button class="acc-btn" data-type="buttonSize" data-value="xlarge">Gigante</button>
                        </div>
                    </div>
                    
                    <!-- Extra Tools -->
                    <div class="acc-section">
                        <h3>Ferramentas Visuais</h3>
                        
                        <div class="acc-toggle-item">
                            <div class="acc-toggle-label">
                                <span class="acc-toggle-title">Espaçamento de Linhas</span>
                                <span class="acc-toggle-desc">Melhora a leitura de parágrafos</span>
                            </div>
                            <label class="acc-switch">
                                <input type="checkbox" id="acc-chk-spacing">
                                <span class="acc-slider"></span>
                            </label>
                        </div>
                        
                        <div class="acc-toggle-item">
                            <div class="acc-toggle-label">
                                <span class="acc-toggle-title">Régua de Leitura</span>
                                <span class="acc-toggle-desc">Guia visual que segue o mouse</span>
                            </div>
                            <label class="acc-switch">
                                <input type="checkbox" id="acc-chk-ruler">
                                <span class="acc-slider"></span>
                            </label>
                        </div>
                        
                        <div class="acc-toggle-item">
                            <div class="acc-toggle-label">
                                <span class="acc-toggle-title">Cursor Ampliado</span>
                                <span class="acc-toggle-desc">Aumenta o ponteiro do mouse</span>
                            </div>
                            <label class="acc-switch">
                                <input type="checkbox" id="acc-chk-cursor">
                                <span class="acc-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="acc-panel-footer">
                    <button class="acc-reset-btn">Restaurar Configurações</button>
                </div>
            `;
            document.body.appendChild(panel);

            // Apply preferences to sync visual settings classes and synchronize UI
            applyPreferences();

            // Bind events for interactions
            bindEvents(panel, backdrop);
            
            // Initialize global floating FAQ chatbot
            try {
                initFaqChatbot();
            } catch (e) {
                console.error("Failed to initialize global chatbot:", e);
            }
            
            console.log("Accessibility panel initialized successfully!");
        } catch (error) {
            console.error("Failed to initialize accessibility panel:", error);
        }
    }

    // Synchronize Panel UI controls (buttons active state, checkboxes status, slider value) with state
    function updateControlsUI() {
        if (!isPanelInitialized) return;

        // Update button group states
        const buttons = document.querySelectorAll('.acc-panel .acc-btn');
        buttons.forEach(btn => {
            const type = btn.getAttribute('data-type');
            const value = btn.getAttribute('data-value');
            if (currentPrefs[type] === value) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update slider state
        const slider = document.getElementById('acc-text-size-slider');
        const sliderVal = document.getElementById('acc-text-size-val');
        if (slider) {
            slider.value = currentPrefs.fontSize || 100;
        }
        if (sliderVal) {
            sliderVal.textContent = (currentPrefs.fontSize || 100) + '%';
        }

        // Update checkbox states
        const chkSpacing = document.getElementById('acc-chk-spacing');
        if (chkSpacing) chkSpacing.checked = currentPrefs.lineSpacing;

        const chkRuler = document.getElementById('acc-chk-ruler');
        if (chkRuler) chkRuler.checked = currentPrefs.readingRuler;

        const chkCursor = document.getElementById('acc-chk-cursor');
        if (chkCursor) chkCursor.checked = currentPrefs.largeCursor;
    }

    // Toggle the sliding panel open/close
    function togglePanel() {
        const panel = document.querySelector('.acc-panel');
        const backdrop = document.querySelector('.acc-backdrop');
        if (!panel || !backdrop) return;

        const isActive = panel.classList.contains('active');
        if (isActive) {
            panel.classList.remove('active');
            backdrop.classList.remove('active');
            panel.setAttribute('aria-hidden', 'true');
        } else {
            panel.classList.add('active');
            backdrop.classList.add('active');
            panel.setAttribute('aria-hidden', 'false');
        }
    }

    // ==========================================================================
    // INTERACTION HANDLERS & BINDINGS
    // ==========================================================================

    function bindEvents(panel, backdrop) {
        // Toggle panel triggers
        backdrop.addEventListener('click', togglePanel);
        panel.querySelector('.acc-close-btn').addEventListener('click', togglePanel);

        // Slider input for text size
        const slider = panel.querySelector('#acc-text-size-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                currentPrefs.fontSize = val;
                applyPreferences();
                savePrefs(currentPrefs);
            });
        }

        // Button clicks (Themes, Fonts, Sizing)
        panel.addEventListener('click', (e) => {
            const btn = e.target.closest('.acc-btn');
            if (!btn) return;
            
            const type = btn.getAttribute('data-type');
            const value = btn.getAttribute('data-value');
            
            currentPrefs[type] = value;
            applyPreferences();
            savePrefs(currentPrefs);
        });

        // Toggle switches (Line spacing, Reading Ruler, Large Cursor)
        document.getElementById('acc-chk-spacing').addEventListener('change', (e) => {
            currentPrefs.lineSpacing = e.target.checked;
            applyPreferences();
            savePrefs(currentPrefs);
        });

        document.getElementById('acc-chk-ruler').addEventListener('change', (e) => {
            currentPrefs.readingRuler = e.target.checked;
            applyPreferences();
            savePrefs(currentPrefs);
        });

        document.getElementById('acc-chk-cursor').addEventListener('change', (e) => {
            currentPrefs.largeCursor = e.target.checked;
            applyPreferences();
            savePrefs(currentPrefs);
        });

        // Reset settings
        panel.querySelector('.acc-reset-btn').addEventListener('click', () => {
            currentPrefs = Object.assign({}, DEFAULTS);
            applyPreferences();
            savePrefs(currentPrefs);
        });

        // ESC key closes panel
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panel.classList.contains('active')) {
                togglePanel();
            }
        });

        // Reading Ruler Mouse Movement tracking
        window.addEventListener('mousemove', (e) => {
            if (currentPrefs.readingRuler) {
                const ruler = document.getElementById('acc-reading-ruler');
                if (ruler) {
                    ruler.style.top = e.clientY + 'px';
                }
            }
        });
    }

    // ==========================================================================
    // GLOBAL FAQ CHATBOT
    // ==========================================================================
    const faqTree = {
        root: {
            message: "Olá! Sou o assistente do Petição Pública Brasil. Escolha um tema para encontrar sua resposta:",
            options: [
                { label: "Sobre o site", target: "cat_sobre" },
                { label: "Criar abaixo-assinado", target: "cat_criar" },
                { label: "Segurança e contato", target: "cat_seguranca" }
            ]
        },
        cat_sobre: {
            message: "Sobre o Petição Pública — escolha sua dúvida:",
            options: [
                { label: "O que é o PeticaoPublica.com.br?", target: "q_oque" },
                { label: "O que é um abaixo-assinado?", target: "q_abaixo" },
                { label: "Quem pode criar um abaixo-assinado?", target: "q_quem" },
                { label: "O que o site faz? E o que eu faço?", target: "q_oquefaz" },
                { label: "Voltar ao início", target: "root", isBack: true }
            ]
        },
        cat_criar: {
            message: "Criar abaixo-assinado — escolha sua dúvida:",
            options: [
                { label: "Como escrever meu abaixo-assinado?", target: "q_escrever" },
                { label: "Como submeter meu abaixo-assinado?", target: "q_submeter" },
                { label: "O que o site faz? E o que eu faço?", target: "q_oquefaz" },
                { label: "Voltar ao início", target: "root", isBack: true }
            ]
        },
        cat_seguranca: {
            message: "Segurança e contato — escolha sua dúvida:",
            options: [
                { label: "As assinaturas estão seguras?", target: "q_seguras" },
                { label: "Como fazer mais perguntas ao site?", target: "q_contato" },
                { label: "Voltar ao início", target: "root", isBack: true }
            ]
        },
        q_oque: {
            answer: '<div class="faq-answer-text">' +
                '<p>O site PeticaoPublica.com.br fornece <strong>alojamento online gratuito</strong> para petições públicas e abaixo-assinados. Nosso objetivo é constituir um serviço público de qualidade a todos os cidadãos brasileiros.</p>' +
                '<p>Fornecemos um dos mais antigos métodos da democracia, combinado com a última e mais moderna tecnologia digital de comunicação, disponível gratuitamente 24 horas por dia.</p>' +
                '<p>Acreditamos que a internet pode facilitar a criação, divulgação e participação dos cidadãos na subscrição de abaixo-assinados.</p>' +
                '<p>Não serão aceites abaixo-assinados que incitem à violência, ofendam terceiros, utilizem linguagem imprópria ou sejam anónimos. Abaixo-assinados com nomes falsos ou linguagem inaceitável serão removidos imediatamente.</p>' +
                '<p>Qualquer abaixo-assinado é bem-vindo, seja de escala local ou nacional. Os abaixo-assinados aqui armazenados não refletem os pontos de vista do PeticaoPublica.com.br.</p>' +
                '</div>',
            parentCat: "cat_sobre"
        },
        q_abaixo: {
            answer: '<div class="faq-answer-text">' +
                '<p>Abaixo-assinado (or petição pública), em geral, é a <strong>apresentação de um pedido ou de uma proposta</strong> a órgão soberano ou a qualquer autoridade pública, para que adote determinada medida.</p>' +
                '<p><em>Adaptação do Texto da Constituição de 1988, em seu Artigo 153, parágrafo 30.</em></p>' +
                '</div>',
            parentCat: "cat_sobre"
        },
        q_quem: {
            answer: '<div class="faq-answer-text">' +
                '<p>Todo cidadão tem o direito de apresentar, <strong>individual ou coletivamente</strong>, aos órgãos soberanos, aos órgãos de governo dos estados ou a qualquer autoridade:</p>' +
                '<p>• Petições e abaixo-assinados<br>• Representações e reclamações<br>• Queixas para defesa de seus direitos</p>' +
                '<p>Tem também o direito de ser informado, em prazo razoável, sobre o resultado da respetiva apreciação.</p>' +
                '<p><em>Artigo 141, Parágrafo 37 da Constituição.</em></p>' +
                '</div>',
            parentCat: "cat_sobre"
        },
        q_oquefaz: {
            answer: '<div class="faq-answer-text">' +
                '<p><strong>O que você faz:</strong></p>' +
                '<p>1. Escreve o texto do seu abaixo-assinado<br>2. Submete usando nosso formulário online<br>3. Promove seu abaixo-assinado para conseguir assinaturas<br>4. Quando completo, imprime ou encaminha o link aos destinatários</p>' +
                '<p><strong>O que o site faz:</strong></p>' +
                '<p>• Formata automaticamente seu abaixo-assinado para a internet<br>• Aloja de forma segura em nossos servidores<br>• Recolhe, mostra e mantém todas as assinaturas</p>' +
                '</div>',
            parentCat: "cat_sobre"
        },
        q_escrever: {
            answer: '<div class="faq-answer-text">' +
                '<p>A parte mais importante é a <strong>declaração do abaixo-assinado</strong>. Centenas, milhares ou até mais pessoas vão ler seu texto, então ele deve estar bem escrito e sem erros.</p>' +
                '<p><strong>Dicas importantes:</strong></p>' +
                '<p>• Dedique tempo na revisão — isso aumenta o sucesso<br>• Seja claro e objetivo sobre o problema e a solução<br>• Use um corretor ortográfico antes de submeter</p>' +
                '<p><strong>Atenção:</strong> Um abaixo-assinado não pode ser alterado depois de submetido, pois qualquer mudança seria injusta para quem já assinou.</p>' +
                '</div>',
            parentCat: "cat_criar"
        },
        q_submeter: {
            answer: '<div class="faq-answer-text">' +
                '<p>Já tem o texto escrito, visto e revisto? Ótimo! Você pode ir diretamente para a página de criação:</p>' +
                '</div>',
            parentCat: "cat_criar",
            actionLink: { label: "Criar Abaixo-assinado agora", href: "../pcreate/index.html" }
        },
        q_seguras: {
            answer: '<div class="faq-answer-text">' +
                '<p>Sim! As assinaturas são tratadas com <strong>muito cuidado</strong>:</p>' +
                '<p>• Todo o site e assinaturas são guardados diariamente em backup<br>• Tudo é arquivado para facilitar recuperação em caso de problemas<br>• Nossos servidores são seguros</p>' +
                '<p>Do ponto de vista legal, você assume todo o risco de usar nosso serviço de petições públicas.</p>' +
                '</div>',
            parentCat: "cat_seguranca"
        },
        q_contato: {
            answer: '<div class="faq-answer-text">' +
                '<p>Você pode enviar suas questões, comentários e sugestões através do nosso formulário de contato.</p>' +
                '<p><strong>Dica:</strong> Seja claro e objetivo. Se for sobre uma petição específica, inclua o URL dela na mensagem.</p>' +
                '</div>',
            parentCat: "cat_seguranca",
            actionLink: { label: "Ir para o formulário de contato", href: "../contactus/index.html" }
        }
    };

    function initFaqChatbot() {
        // Prevent loading on FAQ page or where the chatbot already exists
        if (document.querySelector('.chatbot-wrapper') || window.location.pathname.includes('/faq/')) {
            console.log("FAQ page or embedded chatbot detected. Skipping global floating chatbot widget.");
            return;
        }

        const botSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>';
        const userSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
        const chatBubbleSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
        const closeCrossSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

        // Create FAB button
        const fab = document.createElement('div');
        fab.className = 'faq-chatbot-fab acc-exclude';
        fab.setAttribute('role', 'button');
        fab.setAttribute('aria-label', 'Abrir Assistente de Ajuda');
        fab.innerHTML = `<span class="faq-fab-icon">${chatBubbleSvg}</span>`;
        document.body.appendChild(fab);

        // Create Chat window
        const win = document.createElement('div');
        win.className = 'faq-chatbot-window acc-exclude';
        win.innerHTML = `
            <div class="faq-chatbot-header">
                <div class="faq-chatbot-header-avatar">${botSvg}</div>
                <div class="faq-chatbot-header-info">
                    <h3>Assistente FAQ</h3>
                    <p>Como posso ajudar você hoje?</p>
                </div>
                <button class="faq-chatbot-close-btn" aria-label="Fechar">${closeCrossSvg}</button>
            </div>
            <div class="faq-chatbot-body" id="faqChatBody"></div>
            <div class="faq-chatbot-footer">
                Não encontrou sua resposta? <a href="../contactus/index.html">Entre em contato</a>
            </div>
        `;
        document.body.appendChild(win);

        const chatBody = win.querySelector('#faqChatBody');
        const closeBtn = win.querySelector('.faq-chatbot-close-btn');
        let currentNode = null;
        let isInitialLoad = true;

        // Toggle visibility
        function toggleChat() {
            const isActive = win.classList.contains('active');
            if (isActive) {
                win.classList.remove('active');
                fab.classList.remove('active');
                fab.innerHTML = `<span class="faq-fab-icon">${chatBubbleSvg}</span>`;
            } else {
                win.classList.add('active');
                fab.classList.add('active');
                fab.innerHTML = `<span class="faq-fab-icon">${closeCrossSvg}</span>`;
                if (isInitialLoad) {
                    isInitialLoad = false;
                    navigateTo('root');
                }
            }
        }

        fab.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', toggleChat);

        function scrollToBottom() {
            setTimeout(function() {
                chatBody.scrollTop = chatBody.scrollHeight;
            }, 50);
        }

        function addBotMessage(html, callback) {
            // Show typing indicator
            const typingEl = document.createElement('div');
            typingEl.className = 'faq-chat-msg';
            typingEl.innerHTML = `
                <div class="faq-chat-avatar bot">${botSvg}</div>
                <div class="faq-chat-bubble bot">
                    <div class="faq-typing-indicator">
                        <div class="faq-typing-dot"></div>
                        <div class="faq-typing-dot"></div>
                        <div class="faq-typing-dot"></div>
                    </div>
                </div>
            `;
            chatBody.appendChild(typingEl);
            scrollToBottom();

            setTimeout(function() {
                typingEl.remove();

                const msgEl = document.createElement('div');
                msgEl.className = 'faq-chat-msg';
                msgEl.innerHTML = `
                    <div class="faq-chat-avatar bot">${botSvg}</div>
                    <div class="faq-chat-bubble bot">${html}</div>
                `;
                chatBody.appendChild(msgEl);
                scrollToBottom();

                if (callback) {
                    setTimeout(callback, 100);
                }
            }, 600);
        }

        function addUserMessage(text) {
            const msgEl = document.createElement('div');
            msgEl.className = 'faq-chat-msg user-msg';
            msgEl.innerHTML = `
                <div class="faq-chat-avatar user">${userSvg}</div>
                <div class="faq-chat-bubble user">${text}</div>
            `;
            chatBody.appendChild(msgEl);
            scrollToBottom();
        }

        function addOptions(options) {
            const optionsEl = document.createElement('div');
            optionsEl.className = 'faq-chat-options';

            for (let i = 0; i < options.length; i++) {
                (function(opt) {
                    const btn = document.createElement('button');
                    btn.className = 'faq-chat-opt-btn';
                    if (opt.isBack) btn.className += ' back-btn';
                    btn.textContent = opt.label;
                    btn.addEventListener('click', function() {
                        handleOptionClick(opt);
                    });
                    optionsEl.appendChild(btn);
                })(options[i]);
            }

            chatBody.appendChild(optionsEl);
            scrollToBottom();
        }

        function addActionLink(actionLink) {
            const linkWrap = document.createElement('div');
            linkWrap.className = 'faq-chat-options';
            const link = document.createElement('a');
            link.className = 'faq-chat-opt-btn action-btn';
            link.href = actionLink.href;
            link.textContent = actionLink.label;
            linkWrap.appendChild(link);
            chatBody.appendChild(linkWrap);
            scrollToBottom();
        }

        function handleOptionClick(opt) {
            // Disable previous option buttons
            const allBtns = chatBody.querySelectorAll('.faq-chat-opt-btn');
            for (let i = 0; i < allBtns.length; i++) {
                allBtns[i].disabled = true;
                allBtns[i].style.opacity = '0.5';
                allBtns[i].style.cursor = 'default';
                allBtns[i].style.pointerEvents = 'none';
            }

            // User bubble selection
            addUserMessage(opt.label);

            navigateTo(opt.target);
        }

        function navigateTo(nodeId) {
            currentNode = faqTree[nodeId];
            if (!currentNode) return;

            if (currentNode.answer) {
                // Answer node
                addBotMessage(currentNode.answer, function() {
                    if (currentNode.actionLink) {
                        addActionLink(currentNode.actionLink);
                    }

                    const navOptions = [];
                    if (currentNode.parentCat) {
                        const catLabel = currentNode.parentCat === 'cat_sobre' ? "Sobre o site" :
                                         currentNode.parentCat === 'cat_criar' ? "Criar abaixo-assinado" : "Segurança e contato";
                        navOptions.push({ label: `Outra sobre ${catLabel}`, target: currentNode.parentCat });
                    }
                    navOptions.push({ label: "Voltar ao início", target: "root", isBack: true });

                    setTimeout(function() {
                        addOptions(navOptions);
                    }, 200);
                });
            } else {
                // Menu node
                addBotMessage(currentNode.message, function() {
                    addOptions(currentNode.options);
                });
            }
        }
    }

    // Scroll reveal header logic (hide when scrolling down, show when scrolling up)
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header');
        if (!header) return;
        
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 70) {
            if (currentScrollY > lastScrollY) {
                // Scrolling down -> hide header
                header.classList.add('header-hidden');
            } else {
                // Scrolling up -> show header
                header.classList.remove('header-hidden');
            }
        } else {
            // Near top of the page -> always show header
            header.classList.remove('header-hidden');
        }
        lastScrollY = currentScrollY;
    });

    // Initialize when the DOM is fully interactive
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
