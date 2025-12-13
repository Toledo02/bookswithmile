const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const db = require('./db/database');
const session = require('express-session');
const app = express();
const PORT = 3000;

// Configuração da Sessão
app.use(session({
    secret: 'chave-super-secreta-do-projeto', // Na vida real, isso iria num arquivo .env
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // false porque estamos em localhost (http) e não https
}));

// Middleware de Autenticação
function protegerRota(req, res, next) {
    if (req.session.usuarioLogado) {
        return next(); // Se tiver logado, deixa passar
    }
    res.redirect('/login'); // Se não, chuta pro login
}

// 1. Configuração do View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Arquivos Estáticos (CSS, Imagens, JS do front)
app.use(express.static(path.join(__dirname, 'public')));

// 3. Middleware para ler dados de formulários (POST)
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 4. Configuração do Upload de Imagens (Multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Salva na pasta pública
    },
    filename: (req, file, cb) => {
        // Gera um nome único: timestamp + extensão original (ex: 1678888.jpg)
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// --- ROTAS (Vamos separar depois, mas por enquanto ficam aqui) ---

// --- ROTAS ADMINISTRATIVAS (CRUD) ---

// DASHBOARD (READ): Lista todos os livros com opções de editar/excluir
app.get('/admin', protegerRota, (req, res) => {
    db.all("SELECT * FROM livros ORDER BY data_criacao DESC", [], (err, rows) => {
        if (err) return res.send("Erro no banco");
        res.render('admin/dashboard', { livros: rows });
    });
});

// CREATE (Formulário)
app.get('/admin/novo', protegerRota, (req, res) => {
    res.render('admin/cadastro'); // Aquele arquivo que já criamos antes
});

// Rota POST: Recebe os dados do formulário e salva no banco
app.post('/admin/salvar', upload.single('imagem'), (req, res) => {
    const { titulo, autor, resumo, resenha, nota, link_compra } = req.body;
    const imagem = req.file ? '/uploads/' + req.file.filename : null; // Caminho da imagem

    const sql = `
        INSERT INTO livros (titulo, autor, imagem, resumo, resenha, nota, link_compra)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [titulo, autor, imagem, resumo, resenha, nota, link_compra], function(err) {
        if (err) {
            console.error(err.message);
            return res.send("Erro ao salvar no banco de dados.");
        }
        console.log(`Livro adicionado com ID: ${this.lastID}`);
        res.redirect('/admin'); 
    });
});

// DELETE
app.get('/admin/deletar/:id', protegerRota, (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM livros WHERE id = ?", id, (err) => {
        if (err) return console.error(err.message);
        res.redirect('/admin');
    });
});

// UPDATE (Formulário de Edição)
app.get('/admin/editar/:id', protegerRota, (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM livros WHERE id = ?", id, (err, row) => {
        if (!row) return res.redirect('/admin');
        res.render('admin/editar', { livro: row });
    });
});

// UPDATE (Salvar Edição)
app.post('/admin/editar/salvar/:id', protegerRota, upload.single('imagem'), (req, res) => {
    const id = req.params.id;
    const { titulo, autor, resumo, resenha, nota, link_compra } = req.body;
    
    // Lógica da Imagem: Se o usuário subiu uma nova, usa ela. Se não, precisamos MANTER a antiga.
    // Como o UPDATE substitui tudo, precisamos fazer um select antes ou lógica SQL dinâmica.
    // Vamos pelo caminho mais fácil: SQL Dinâmico.

    if (req.file) {
        // Usuário mandou imagem nova
        const imagem = '/uploads/' + req.file.filename;
        const sql = `UPDATE livros SET titulo=?, autor=?, imagem=?, resumo=?, resenha=?, nota=?, link_compra=? WHERE id=?`;
        db.run(sql, [titulo, autor, imagem, resumo, resenha, nota, link_compra, id], (err) => {
            res.redirect('/admin');
        });
    } else {
        // Usuário NÃO mandou imagem (mantém a antiga)
        const sql = `UPDATE livros SET titulo=?, autor=?, resumo=?, resenha=?, nota=?, link_compra=? WHERE id=?`;
        db.run(sql, [titulo, autor, resumo, resenha, nota, link_compra, id], (err) => {
            res.redirect('/admin');
        });
    }
});

// Rota GET: Tela de Login
app.get('/login', (req, res) => {
    res.render('admin/login', { erro: null });
});

// Rota POST: Processa o Login
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;

    // Login "Hardcoded" (Simples para o projeto acadêmico)
    // Usuário: admin | Senha: 123
    if (usuario === 'admin' && senha === '123') {
        req.session.usuarioLogado = true;
        res.redirect('/admin');
    } else {
        res.render('admin/login', { erro: 'Usuário ou senha incorretos!' });
    }
});

// Rota Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});



// Rota Home: Lista todos os livros
app.get('/', (req, res) => {
    const sql = "SELECT * FROM livros ORDER BY data_criacao DESC"; // Mais recentes primeiro
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        // Renderiza o arquivo index.ejs e envia a lista de livros (rows)
        res.render('index', { livros: rows });
    });
});

// Rota de Busca
app.get('/busca', (req, res) => {
    const query = req.query.q; // Pega o que foi digitado na URL (?q=...)
    
    // Se a pessoa buscar vazio, manda de volta pra home
    if (!query) {
        return res.redirect('/');
    }

    // SQL com LIKE para buscar partes do texto (ex: '%Harry%')
    // Buscamos tanto no Título quanto no Autor
    const sql = "SELECT * FROM livros WHERE titulo LIKE ? OR autor LIKE ?";
    const params = [`%${query}%`, `%${query}%`];

    db.all(sql, params, (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        // Reutilizamos a view 'index' para mostrar os resultados!
        // Passamos também o termo buscado para mostrar "Resultados para 'X'"
        res.render('index', { livros: rows, busca: query });
    });
});

// Rota Detalhes: Exibe um livro específico
app.get('/livro/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM livros WHERE id = ?";

    db.get(sql, [id], (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (!row) {
            return res.status(404).send("Livro não encontrado!");
        }
        // Renderiza a página detalhes.ejs passando os dados do livro encontrado
        res.render('detalhes', { livro: row });
    });
});

// Rota Sobre: Página da Autora
app.get('/sobre', (req, res) => {
    res.render('sobre');
});

// Rota GET: Exibe a página de contato
app.get('/contato', (req, res) => {
    // Renderiza a página passando 'enviado: false' para não mostrar o alerta de sucesso ainda
    res.render('contato', { enviado: false });
});

// Rota POST: Recebe a mensagem do formulário
app.post('/contato/enviar', (req, res) => {
    // Aqui capturamos os dados
    const { nome, email, mensagem } = req.body;
    
    // SIMULAÇÃO: Apenas mostramos no terminal do VS Code
    console.log("--- NOVA MENSAGEM RECEBIDA ---");
    console.log(`De: ${nome} (${email})`);
    console.log(`Mensagem: ${mensagem}`);
    console.log("------------------------------");

    // Renderiza a mesma página, mas agora com 'enviado: true' para mostrar o alerta verde
    res.render('contato', { enviado: true });
});

// --- INICIALIZAÇÃO ---
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});