const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '.')));

// Initialize SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create tables if they don't exist
    db.serialize(() => {
      // Casas de apostas (Betting houses)
      db.run(`CREATE TABLE IF NOT EXISTS casas_apostas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        logo TEXT,
        saldo REAL DEFAULT 0,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Transações (Transactions)
      db.run(`CREATE TABLE IF NOT EXISTS transacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        casa_id INTEGER,
        tipo TEXT CHECK(tipo IN ('deposito', 'saque', 'aposta', 'ganho', 'ajuste')) NOT NULL,
        valor REAL NOT NULL,
        descricao TEXT,
        status TEXT DEFAULT 'completo',
        data DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (casa_id) REFERENCES casas_apostas (id)
      )`);
      
      // Tabelas criadas com sucesso
      console.log('Tabelas verificadas/criadas com sucesso.');
    });
  }
});

// API Endpoints

// Get all betting houses
app.get('/api/casas', (req, res) => {
  db.all('SELECT * FROM casas_apostas ORDER BY saldo DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get a specific betting house
app.get('/api/casas/:id', (req, res) => {
  db.get('SELECT * FROM casas_apostas WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Casa de apostas não encontrada' });
      return;
    }
    res.json(row);
  });
});

// Add a new betting house
app.post('/api/casas', (req, res) => {
  const { nome, logo, saldo = 0 } = req.body;
  
  if (!nome) {
    res.status(400).json({ error: 'O nome da casa de apostas é obrigatório' });
    return;
  }
  
  db.run(
    'INSERT INTO casas_apostas (nome, logo, saldo) VALUES (?, ?, ?)',
    [nome, logo, saldo],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      db.get('SELECT * FROM casas_apostas WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.status(201).json(row);
      });
    }
  );
});

// Update a betting house
app.put('/api/casas/:id', (req, res) => {
  const { nome, logo, saldo } = req.body;
  const updates = [];
  const params = [];
  
  if (nome) { 
    updates.push('nome = ?'); 
    params.push(nome);
  }
  
  if (logo) { 
    updates.push('logo = ?'); 
    params.push(logo);
  }
  
  if (saldo !== undefined) { 
    updates.push('saldo = ?'); 
    params.push(saldo);
  }
  
  if (updates.length === 0) {
    res.status(400).json({ error: 'Nenhum campo para atualizar' });
    return;
  }
  
  params.push(req.params.id);
  
  db.run(
    `UPDATE casas_apostas SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Casa de apostas não encontrada' });
        return;
      }
      
      db.get('SELECT * FROM casas_apostas WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(row);
      });
    }
  );
});

// Delete a betting house
app.delete('/api/casas/:id', (req, res) => {
  const casaId = req.params.id;
  
  // Iniciar transau00e7u00e3o para garantir integridade dos dados
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Atualizar as transau00e7u00f5es relacionadas para preservar o histu00f3rico
    // Definir casa_id como NULL nas transau00e7u00f5es da casa excluu00edda
    db.run('UPDATE transacoes SET casa_id = NULL WHERE casa_id = ?', [casaId], function(err) {
      if (err) {
        db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Agora remover a casa de apostas
      db.run('DELETE FROM casas_apostas WHERE id = ?', [casaId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }
        
        if (this.changes === 0) {
          db.run('ROLLBACK');
          res.status(404).json({ error: 'Casa de apostas não encontrada' });
          return;
        }
        
        // Confirmar todas as alterau00e7u00f5es
        db.run('COMMIT');
        res.json({ message: 'Casa de apostas removida com sucesso. Histórico de transau00e7u00f5es preservado.' });
      });
    });
  });
});

// Get all transactions
app.get('/api/transacoes', (req, res) => {
  const query = `
    SELECT t.*, 
           COALESCE(c.nome, 'Casa Excluída') as casa_nome, 
           COALESCE(c.logo, 'https://via.placeholder.com/30?text=Excluida') as casa_logo 
    FROM transacoes t
    LEFT JOIN casas_apostas c ON t.casa_id = c.id
    ORDER BY t.data DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get transactions for a specific betting house
app.get('/api/casas/:id/transacoes', (req, res) => {
  const query = `
    SELECT t.*, 
           COALESCE(c.nome, 'Casa Excluída') as casa_nome, 
           COALESCE(c.logo, 'https://via.placeholder.com/30?text=Excluida') as casa_logo 
    FROM transacoes t
    LEFT JOIN casas_apostas c ON t.casa_id = c.id
    WHERE t.casa_id = ?
    ORDER BY t.data DESC
  `;
  
  db.all(query, [req.params.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add a new transaction
app.post('/api/transacoes', (req, res) => {
  const { casa_id, tipo, valor, descricao, status = 'completo' } = req.body;
  
  if (!casa_id || !tipo || valor === undefined) {
    res.status(400).json({ error: 'Casa, tipo e valor são obrigatórios' });
    return;
  }
  
  if (!['deposito', 'saque', 'aposta', 'ganho'].includes(tipo)) {
    res.status(400).json({ error: 'Tipo inválido. Deve ser: deposito, saque, aposta ou ganho' });
    return;
  }
  
  // Begin transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Insert the transaction
    db.run(
      'INSERT INTO transacoes (casa_id, tipo, valor, descricao, status) VALUES (?, ?, ?, ?, ?)',
      [casa_id, tipo, valor, descricao, status],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }
        
        const transacaoId = this.lastID;
        
        // Update the balance of the betting house
        let saldoAdjustment = 0;
        if (tipo === 'deposito' || tipo === 'ganho') {
          saldoAdjustment = valor;
        } else if (tipo === 'saque' || tipo === 'aposta') {
          saldoAdjustment = -valor;
        }
        
        db.run(
          'UPDATE casas_apostas SET saldo = saldo + ? WHERE id = ?',
          [saldoAdjustment, casa_id],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              res.status(500).json({ error: err.message });
              return;
            }
            
            db.run('COMMIT');
            
            // Return the new transaction with betting house info
            const query = `
              SELECT t.*, 
                COALESCE(c.nome, 'Casa Excluída') as casa_nome, 
                COALESCE(c.logo, 'https://via.placeholder.com/30?text=Excluida') as casa_logo 
              FROM transacoes t
              LEFT JOIN casas_apostas c ON t.casa_id = c.id
              WHERE t.id = ?
            `;
            
            db.get(query, [transacaoId], (err, row) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }
              res.status(201).json(row);
            });
          }
        );
      }
    );
  });
});

// Delete a transaction
app.delete('/api/transacoes/:id', (req, res) => {
  const transacaoId = req.params.id;
  
  // Iniciar transau00e7u00e3o para garantir integridade dos dados
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Primeiro, vamos obter a informau00e7u00e3o da transau00e7u00e3o para ajustar o saldo
    db.get('SELECT casa_id, tipo, valor FROM transacoes WHERE id = ?', [transacaoId], (err, transacao) => {
      if (err) {
        db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (!transacao) {
        db.run('ROLLBACK');
        res.status(404).json({ error: 'Transau00e7u00e3o nu00e3o encontrada' });
        return;
      }
      
      // Se a transau00e7u00e3o estiver associada a uma casa ativa, revertemos seu efeito no saldo
      if (transacao.casa_id) {
        // Calculamos o ajuste inverso ao efeito original da transau00e7u00e3o
        let saldoAdjustment = 0;
        if (transacao.tipo === 'deposito' || transacao.tipo === 'ganho') {
          saldoAdjustment = -transacao.valor; // negativo porque estamos revertendo
        } else if (transacao.tipo === 'saque' || transacao.tipo === 'aposta') {
          saldoAdjustment = transacao.valor; // positivo porque estamos revertendo
        }

        // Atualizar o saldo da casa, somente se a casa ainda existir
        db.run(
          'UPDATE casas_apostas SET saldo = saldo + ? WHERE id = ?',
          [saldoAdjustment, transacao.casa_id],
          function(err) {
            if (err && err.message.includes('FOREIGN KEY constraint failed')) {
              // A casa nu00e3o existe mais, prosseguimos com a exclusu00e3o da transau00e7u00e3o
              proceedWithDelete();
            } else if (err) {
              db.run('ROLLBACK');
              res.status(500).json({ error: err.message });
              return;
            } else {
              proceedWithDelete();
            }
          }
        );
      } else {
        // Se nu00e3o estiver associada a uma casa, simplesmente deletamos
        proceedWithDelete();
      }
      
      function proceedWithDelete() {
        // Agora podemos excluir a transau00e7u00e3o
        db.run('DELETE FROM transacoes WHERE id = ?', [transacaoId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            res.status(500).json({ error: err.message });
            return;
          }
          
          if (this.changes === 0) {
            db.run('ROLLBACK');
            res.status(404).json({ error: 'Transau00e7u00e3o nu00e3o encontrada' });
            return;
          }
          
          // Confirmar todas as alterau00e7u00f5es
          db.run('COMMIT');
          res.json({ message: 'Transau00e7u00e3o excluu00edda com sucesso' });
        });
      }
    });
  });
});

// Get dashboard summary
app.get('/api/dashboard', (req, res) => {
  db.serialize(() => {
    const result = {};
    
    // Get total balance
    db.get('SELECT SUM(saldo) as saldo_total FROM casas_apostas', (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      result.saldo_total = row.saldo_total || 0;
      
      // Get active betting houses count
      db.get('SELECT COUNT(*) as casas_count FROM casas_apostas', (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        result.casas_count = row.casas_count || 0;
        
        // Get highest balance betting house
        db.get('SELECT nome, saldo FROM casas_apostas ORDER BY saldo DESC LIMIT 1', (err, row) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          result.maior_saldo = row || { nome: 'N/A', saldo: 0 };
          
          // Get month performance
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const dateStr = oneMonthAgo.toISOString().split('T')[0];
          
          db.get(`
            SELECT 
              (SELECT COALESCE(SUM(CASE WHEN tipo IN ('deposito', 'ganho') THEN valor ELSE 0 END), 0) 
               FROM transacoes 
               WHERE data >= ?) as entradas,
              (SELECT COALESCE(SUM(CASE WHEN tipo IN ('saque', 'aposta') THEN valor ELSE 0 END), 0) 
               FROM transacoes 
               WHERE data >= ?) as saidas
          `, [dateStr, dateStr], (err, row) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            
            const entradas = row.entradas || 0;
            const saidas = row.saidas || 0;
            
            // Calculate performance
            let rendimento = 0;
            if (saidas > 0) {
              rendimento = ((entradas - saidas) / saidas) * 100;
            }
            
            result.rendimento = parseFloat(rendimento.toFixed(2));
            res.json(result);
          });
        });
      });
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});
