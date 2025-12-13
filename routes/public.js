const express = require('express');
const router = express.Router();
const db = require('../db/database'); // Importando a conexão com o banco

// Rota Home
router.get('/', (req, res) => {
    db.all("SELECT * FROM livros ORDER BY data_criacao DESC", [], (err, rows) => {
        if (err) return console.error(err.message);
        res.render('index', { livros: rows });
    });
});

// Rota Sobre
router.get('/sobre', (req, res) => {
    res.render('sobre');
});

// Rota Contato (GET)
router.get('/contato', (req, res) => {
    res.render('contato', { enviado: false });
});

// Rota Contato (POST)
router.post('/contato/enviar', (req, res) => {
    const { nome, email, mensagem } = req.body;
    console.log(`Mensagem de ${nome}: ${mensagem}`);
    res.render('contato', { enviado: true });
});

// Rota Busca
router.get('/busca', (req, res) => {
    const query = req.query.q;
    if (!query) return res.redirect('/');
    const sql = "SELECT * FROM livros WHERE titulo LIKE ? OR autor LIKE ?";
    db.all(sql, [`%${query}%`, `%${query}%`], (err, rows) => {
        res.render('index', { livros: rows, busca: query });
    });
});

// Rota Detalhes (IMPORTANTE: Deixe sempre por último para não conflitar com outras)
router.get('/livro/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM livros WHERE id = ?", [id], (err, row) => {
        if (!row) return res.status(404).send("Livro não encontrado!");
        res.render('detalhes', { livro: row });
    });
});

module.exports = router;