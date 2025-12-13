const express = require('express');
const router = express.Router();
const db = require('../db/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Módulo nativo para mexer com arquivos

// --- Configuração do Multer (Upload) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- Middleware de Segurança ---
function protegerRota(req, res, next) {
    if (req.session.usuarioLogado) {
        return next();
    }
    res.redirect('/admin/login');
}

// --- ROTAS DE LOGIN (Públicas dentro do contexto admin) ---

router.get('/login', (req, res) => {
    res.render('admin/login', { erro: null });
});


// Rota POST LOGIN
router.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    
    // Agora pegamos do arquivo .env
    const usuarioCorreto = process.env.ADMIN_USER;
    const senhaCorreta = process.env.ADMIN_PASS;

    if (usuario === usuarioCorreto && senha === senhaCorreta) {
        req.session.usuarioLogado = true;
        res.redirect('/admin');
    } else {
        res.render('admin/login', { erro: 'Dados incorretos' });
    }
});

// ... resto do código ...

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- ROTAS DO CRUD (Protegidas) ---

// Dashboard
router.get('/', protegerRota, (req, res) => {
    db.all("SELECT * FROM livros ORDER BY data_criacao DESC", [], (err, rows) => {
        res.render('admin/dashboard', { livros: rows });
    });
});

// Novo Cadastro
router.get('/novo', protegerRota, (req, res) => {
    res.render('admin/cadastro');
});

router.post('/salvar', protegerRota, upload.single('imagem'), (req, res) => {
    const { titulo, autor, resumo, resenha, nota, link_compra } = req.body;
    const imagem = req.file ? '/uploads/' + req.file.filename : null;
    const sql = `INSERT INTO livros (titulo, autor, imagem, resumo, resenha, nota, link_compra) VALUES (?,?,?,?,?,?,?)`;
    
    db.run(sql, [titulo, autor, imagem, resumo, resenha, nota, link_compra], (err) => {
        res.redirect('/admin');
    });
});

// Editar (Formulário)
router.get('/editar/:id', protegerRota, (req, res) => {
    db.get("SELECT * FROM livros WHERE id = ?", [req.params.id], (err, row) => {
        if (!row) return res.redirect('/admin');
        res.render('admin/editar', { livro: row });
    });
});

// Editar (Salvar)
router.post('/editar/salvar/:id', protegerRota, upload.single('imagem'), (req, res) => {
    const id = req.params.id;
    const { titulo, autor, resumo, resenha, nota, link_compra } = req.body;

    if (req.file) {
        // Se subiu imagem nova, idealmente deletamos a antiga aqui também, mas vamos simplificar
        const imagem = '/uploads/' + req.file.filename;
        const sql = `UPDATE livros SET titulo=?, autor=?, imagem=?, resumo=?, resenha=?, nota=?, link_compra=? WHERE id=?`;
        db.run(sql, [titulo, autor, imagem, resumo, resenha, nota, link_compra, id], () => res.redirect('/admin'));
    } else {
        const sql = `UPDATE livros SET titulo=?, autor=?, resumo=?, resenha=?, nota=?, link_compra=? WHERE id=?`;
        db.run(sql, [titulo, autor, resumo, resenha, nota, link_compra, id], () => res.redirect('/admin'));
    }
});

// Deletar (COM REMOÇÃO DO ARQUIVO DE IMAGEM)
router.get('/deletar/:id', protegerRota, (req, res) => {
    const id = req.params.id;

    // 1. Primeiro pegamos o livro para saber qual é a imagem dele
    db.get("SELECT imagem FROM livros WHERE id = ?", [id], (err, row) => {
        if (row && row.imagem) {
            // Caminho completo do arquivo no sistema
            const imagePath = path.join(__dirname, '../public', row.imagem);
            
            // 2. Tenta deletar o arquivo físico
            fs.unlink(imagePath, (err) => {
                if (err) console.log("Erro ao deletar imagem (ou ela não existe):", err.message);
            });
        }

        // 3. Depois deletamos do banco
        db.run("DELETE FROM livros WHERE id = ?", id, (err) => {
            res.redirect('/admin');
        });
    });
});

module.exports = router;