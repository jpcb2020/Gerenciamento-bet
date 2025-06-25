const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET all general entries for a specific bankroll
router.get('/entries/:bankrollId', async (req, res) => {
    const { bankrollId } = req.params;
    const { period, search, page = 1, limit = 10 } = req.query;

    try {
        let query = `
            SELECT 
                id, data_criacao, descricao_lucro, 
                quantia_lucro, status, observacoes
            FROM general_entries
            WHERE bankroll_id = $1 AND user_id = $2
        `;

        const queryParams = [bankrollId, req.user.id];
        let paramIndex = 3;

        // Aplicar filtros
        if (period && period !== 'all') {
            query += ` AND data_criacao >= NOW() - INTERVAL '${parseInt(period)} days'`;
        }
        
        if (search) {
            query += ` AND (descricao_lucro ILIKE $${paramIndex} OR observacoes ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        query += " ORDER BY data_criacao DESC";

        // Adicionar paginação
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const offset = (pageNumber - 1) * limitNumber;
        
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(limitNumber, offset);

        // Consulta para contar o total de registros
        let countQuery = `
            SELECT COUNT(*) as total
            FROM general_entries
            WHERE bankroll_id = $1 AND user_id = $2
        `;
        
        const countParams = [bankrollId, req.user.id];
        let countParamIndex = 3;
        
        // Aplicar os mesmos filtros na consulta de contagem
        if (period && period !== 'all') {
            countQuery += ` AND data_criacao >= NOW() - INTERVAL '${parseInt(period)} days'`;
        }
        
        if (search) {
            countQuery += ` AND (descricao_lucro ILIKE $${countParamIndex} OR observacoes ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
            countParamIndex++;
        }

        const [result, countResult] = await Promise.all([
            pool.query(query, queryParams),
            pool.query(countQuery, countParams)
        ]);
        
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limitNumber);
        
        res.json({
            entries: result.rows,
            pagination: {
                currentPage: pageNumber,
                totalPages,
                totalEntries: total,
                entriesPerPage: limitNumber,
                hasNextPage: pageNumber < totalPages,
                hasPreviousPage: pageNumber > 1
            }
        });

    } catch (err) {
        console.error(`Erro na rota GET /api/general/entries/${bankrollId}:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao buscar entradas gerais.', error: err.message });
    }
});

// GET single general entry for editing
router.get('/entries/single/:entryId', async (req, res) => {
    const { entryId } = req.params;

    try {
        const query = `
            SELECT 
                id, data_criacao, descricao_lucro, 
                quantia_lucro, status, observacoes
            FROM general_entries
            WHERE id = $1 AND user_id = $2
        `;

        const result = await pool.query(query, [entryId, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Entrada geral não encontrada.' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error(`Erro na rota GET /api/general/entries/single/${entryId}:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao buscar entrada geral.', error: err.message });
    }
});

// POST a new general entry
router.post('/entries', async (req, res) => {
    const { 
        bankrollId, 
        descricaoLucro, 
        quantiaLucro,
        observacoes
    } = req.body;

    if (!bankrollId || !descricaoLucro || quantiaLucro === undefined) {
        return res.status(400).json({ msg: 'Dados incompletos para registrar a entrada geral.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Inserir na tabela general_entries
        const insertQuery = `
            INSERT INTO general_entries 
                (bankroll_id, user_id, descricao_lucro, quantia_lucro, observacoes, status)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
        `;
        
        const entryResult = await client.query(insertQuery, [
            bankrollId,
            req.user.id,
            descricaoLucro,
            parseFloat(quantiaLucro),
            observacoes || null,
            'Resolvido' // Status padrão para entradas gerais
        ]);

        const entryId = entryResult.rows[0].id;

        // Atualizar o saldo do bankroll
        await client.query(
            'UPDATE bankrolls SET saldo_atual = saldo_atual + $1 WHERE id = $2 AND user_id = $3',
            [parseFloat(quantiaLucro), bankrollId, req.user.id]
        );

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Entrada geral registrada com sucesso!', entryId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro na rota POST /api/general/entries:', err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao registrar entrada geral.', error: err.message });
    } finally {
        client.release();
    }
});

// PUT update a general entry
router.put('/entries/:entryId', async (req, res) => {
    const { entryId } = req.params;
    const { 
        descricaoLucro, 
        quantiaLucro,
        observacoes
    } = req.body;

    if (!descricaoLucro || quantiaLucro === undefined) {
        return res.status(400).json({ msg: 'Dados incompletos para atualizar a entrada geral.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Buscar entrada atual para calcular diferença no saldo
        const currentEntryResult = await client.query(
            'SELECT bankroll_id, quantia_lucro FROM general_entries WHERE id = $1 AND user_id = $2',
            [entryId, req.user.id]
        );

        if (currentEntryResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Entrada não encontrada.' });
        }

        const currentEntry = currentEntryResult.rows[0];
        const oldAmount = parseFloat(currentEntry.quantia_lucro);
        const newAmount = parseFloat(quantiaLucro);
        const amountDifference = newAmount - oldAmount;

        // Atualizar a entrada
        const updateQuery = `
            UPDATE general_entries 
            SET descricao_lucro = $1, quantia_lucro = $2, 
                observacoes = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND user_id = $5
            RETURNING id
        `;

        const updateResult = await client.query(updateQuery, [
            descricaoLucro,
            newAmount,
            observacoes || null,
            entryId,
            req.user.id
        ]);

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Entrada não encontrada.' });
        }

        // Ajustar o saldo do bankroll com a diferença
        if (amountDifference !== 0) {
            await client.query(
                'UPDATE bankrolls SET saldo_atual = saldo_atual + $1 WHERE id = $2 AND user_id = $3',
                [amountDifference, currentEntry.bankroll_id, req.user.id]
            );
        }

        await client.query('COMMIT');
        res.json({ msg: 'Entrada geral atualizada com sucesso!', entryId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro na rota PUT /api/general/entries/:entryId:', err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao atualizar entrada geral.', error: err.message });
    } finally {
        client.release();
    }
});

// DELETE a general entry
router.delete('/entries/:entryId', async (req, res) => {
    const { entryId } = req.params;

    if (!entryId) {
        return res.status(400).json({ msg: 'ID da entrada é necessário para exclusão.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Buscar entrada para obter informações antes de excluir
        const entryResult = await client.query(
            'SELECT id, bankroll_id, quantia_lucro FROM general_entries WHERE id = $1 AND user_id = $2',
            [entryId, req.user.id]
        );

        if (entryResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Entrada não encontrada.' });
        }

        const entry = entryResult.rows[0];
        const quantiaLucro = parseFloat(entry.quantia_lucro);

        // Excluir a entrada
        await client.query(
            'DELETE FROM general_entries WHERE id = $1 AND user_id = $2',
            [entryId, req.user.id]
        );

        // Reverter o valor do saldo do bankroll
        await client.query(
            'UPDATE bankrolls SET saldo_atual = saldo_atual - $1 WHERE id = $2 AND user_id = $3',
            [quantiaLucro, entry.bankroll_id, req.user.id]
        );

        await client.query('COMMIT');
        
        let message = 'Entrada geral excluída com sucesso!';
        if (quantiaLucro > 0) {
            message += ` O saldo foi reduzido em ${quantiaLucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`;
        } else if (quantiaLucro < 0) {
            message += ` O saldo foi aumentado em ${Math.abs(quantiaLucro).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`;
        }
        
        res.json({ msg: message, entryId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Erro na rota DELETE /api/general/entries/${entryId}:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao excluir entrada geral.', error: err.message });
    } finally {
        client.release();
    }
});

// GET statistics for general bankroll
router.get('/statistics/:bankrollId', async (req, res) => {
    const { bankrollId } = req.params;
    const { period = '30' } = req.query;

    try {
        // Calcular data de início baseada no período
        let dateFilter = '';
        if (period !== 'all') {
            const daysAgo = parseInt(period);
            dateFilter = ` AND data_criacao >= CURRENT_DATE - INTERVAL '${daysAgo} days'`;
        }

        // Buscar estatísticas gerais
        const statsQuery = `
            SELECT 
                COUNT(*) as total_entries,
                COALESCE(SUM(quantia_lucro), 0) as total_profit,
                COALESCE(AVG(quantia_lucro), 0) as average_profit,
                COUNT(CASE WHEN quantia_lucro > 0 THEN 1 END) as positive_entries,
                COUNT(CASE WHEN quantia_lucro < 0 THEN 1 END) as negative_entries
            FROM general_entries
            WHERE bankroll_id = $1 AND user_id = $2${dateFilter}
        `;

        const statsResult = await pool.query(statsQuery, [bankrollId, req.user.id]);
        const stats = statsResult.rows[0];

        // Buscar evolução por período
        const evolutionQuery = `
            SELECT 
                DATE(data_criacao) as data,
                SUM(quantia_lucro) as lucro_diario
            FROM general_entries 
            WHERE bankroll_id = $1 AND user_id = $2${dateFilter}
            GROUP BY DATE(data_criacao)
            ORDER BY DATE(data_criacao) ASC
        `;

        const evolutionResult = await pool.query(evolutionQuery, [bankrollId, req.user.id]);

        res.json({
            general: {
                totalEntries: parseInt(stats.total_entries),
                totalProfit: parseFloat(stats.total_profit),
                averageProfit: parseFloat(stats.average_profit),
                positiveEntries: parseInt(stats.positive_entries),
                negativeEntries: parseInt(stats.negative_entries)
            },
            evolution: evolutionResult.rows
        });

    } catch (err) {
        console.error('Erro ao buscar estatísticas gerais:', err.message);
        res.status(500).json({ msg: 'Erro no servidor ao buscar estatísticas gerais.', error: err.message });
    }
});

// GET evolution data for chart
router.get('/evolution/:bankrollId', async (req, res) => {
    const { bankrollId } = req.params;
    
    try {
        // Buscar o saldo inicial do bankroll
        const bankrollResult = await pool.query(
            'SELECT saldo_inicial FROM bankrolls WHERE id = $1 AND user_id = $2',
            [bankrollId, req.user.id]
        );
        
        if (bankrollResult.rowCount === 0) {
            return res.status(404).json({ msg: 'Bankroll não encontrado.' });
        }
        
        const saldoInicial = parseFloat(bankrollResult.rows[0].saldo_inicial);
        
        // Buscar entradas ordenadas por data
        const entriesResult = await pool.query(
            `SELECT 
                DATE(data_criacao) as data,
                SUM(quantia_lucro) as lucro_diario
             FROM general_entries 
             WHERE bankroll_id = $1 AND user_id = $2
             GROUP BY DATE(data_criacao)
             ORDER BY DATE(data_criacao) ASC`,
            [bankrollId, req.user.id]
        );
        
        // Construir dados de evolução
        const evolutionData = [];
        let saldoAcumulado = saldoInicial;
        
        // Adicionar ponto inicial
        const firstDate = entriesResult.rows.length > 0 
            ? entriesResult.rows[0].data 
            : new Date().toISOString().split('T')[0];
            
        evolutionData.push({
            data: firstDate,
            saldo: saldoInicial
        });
        
        // Adicionar cada ponto de evolução
        entriesResult.rows.forEach(row => {
            saldoAcumulado += parseFloat(row.lucro_diario);
            evolutionData.push({
                data: row.data,
                saldo: saldoAcumulado
            });
        });
        
        // Se não há entradas, adicionar pelo menos um ponto adicional
        if (entriesResult.rows.length === 0) {
            evolutionData.push({
                data: new Date().toISOString().split('T')[0],
                saldo: saldoInicial
            });
        }
        
        res.json(evolutionData);
        
    } catch (err) {
        console.error('Erro ao buscar dados de evolução geral:', err.message);
        res.status(500).json({ msg: 'Erro no servidor ao buscar dados de evolução.', error: err.message });
    }
});

module.exports = router; 