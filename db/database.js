const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Cria o arquivo do banco dentro da pasta 'db'
const dbPath = path.resolve(__dirname, 'livros.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        initDb();
    }
});

function initDb() {
    // Criação da tabela 'livros'
    // id: Chave primária
    // titulo, autor: Texto básico
    // imagem: Caminho da foto no servidor (ex: /uploads/capa1.jpg)
    // resenha: O texto longo (TEXT suporta bastante caracteres)
    // nota: Inteiro (1 a 5)
    // data_criacao: Para ordenarmos na Home (últimas resenhas)
    
    const sqlCreate = `
        CREATE TABLE IF NOT EXISTS livros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            autor TEXT NOT NULL,
            imagem TEXT,
            resumo TEXT,
            resenha TEXT NOT NULL,
            nota INTEGER,
            link_compra TEXT,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.run(sqlCreate, (err) => {
        if (err) {
            console.error('Erro ao criar tabela:', err.message);
        } else {
            console.log('Tabela "livros" pronta para uso.');
        }
    });
}

module.exports = db;