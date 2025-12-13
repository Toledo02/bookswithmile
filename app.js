require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');


const app = express();
const PORT = 3000;

// Configuração do EJS e Pasta Pública
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares Globais
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configuração de Sessão (Login)
app.use(session({
    secret: 'chave-segura-do-projeto',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// --- IMPORTAÇÃO DAS ROTAS ---
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

// Usando as rotas
// Tudo que for '/admin' vai para o adminRoutes
// O resto vai para publicRoutes
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

// Inicialização
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});