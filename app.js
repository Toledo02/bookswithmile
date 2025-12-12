const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const db = require('./db/database');

const app = express();
const PORT = 3000;

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

// Rota GET: Exibe o formulário de cadastro (Admin)
app.get('/admin', (req, res) => {
    res.render('admin/cadastro'); // Vamos criar esse arquivo jájá
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
        res.redirect('/'); // Volta para a home (ou para o admin)
    });
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

// --- INICIALIZAÇÃO ---
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});