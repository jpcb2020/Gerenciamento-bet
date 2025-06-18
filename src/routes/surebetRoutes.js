const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET all surebet entries for a specific bankroll
router.get('/entries/:bankrollId', async (req, res) => {
    const { bankrollId } = req.params;
    const { period, status, search, page = 1, limit = 5 } = req.query; // Filtros opcionais e paginação

    try {
        let query = `
            SELECT 
                se.id, se.evento, se.competicao, se.data_evento, 
                se.retorno_total, se.lucro_total, se.roi_percentual, 
                se.status, se.observacoes, se.data_criacao,
                se.bonus, se.bonus_value, se.bonus_house, se.bonus_expiry_date,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', seb.id,
                            'casa_apostas', seb.casa_apostas,
                            'mercado', seb.mercado,
                            'odds', seb.odds,
                            'valor_apostado', seb.valor_apostado,
                            'retorno_potencial', seb.retorno_potencial,
                            'status_aposta', seb.status_aposta
                        )
                    ORDER BY seb.id ASC
                    ) FILTER (WHERE seb.id IS NOT NULL), '[]'::json
                ) AS bets
            FROM surebet_entries se
            LEFT JOIN surebet_entry_bets seb ON se.id = seb.surebet_entry_id
            WHERE se.bankroll_id = $1 AND se.user_id = $2
        `;

        const queryParams = [bankrollId, req.user.id];
        let paramIndex = 3;

        // Aplicar filtros (exemplos simples, podem ser expandidos)
        if (status && status !== 'all') {
            query += ` AND se.status = $${paramIndex++}`;
            queryParams.push(status);
        }
        if (period && period !== 'all') {
            // Lógica de período (ex: '7', '30', '90')
            query += ` AND se.data_criacao >= NOW() - INTERVAL '${parseInt(period)} days'`;
        }
        if (search) {
            query += ` AND (se.evento ILIKE $${paramIndex} OR se.competicao ILIKE $${paramIndex} OR EXISTS (SELECT 1 FROM surebet_entry_bets seb2 WHERE seb2.surebet_entry_id = se.id AND seb2.casa_apostas ILIKE $${paramIndex}))`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        query += " GROUP BY se.id ORDER BY se.data_criacao DESC, se.id DESC";

        // Adicionar paginação
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 5;
        const offset = (pageNumber - 1) * limitNumber;
        
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(limitNumber, offset);

        // Consulta para contar o total de registros
        let countQuery = `
            SELECT COUNT(DISTINCT se.id) as total
            FROM surebet_entries se
            LEFT JOIN surebet_entry_bets seb ON se.id = seb.surebet_entry_id
            WHERE se.bankroll_id = $1 AND se.user_id = $2
        `;
        
        const countParams = [bankrollId, req.user.id];
        let countParamIndex = 3;
        
        // Aplicar os mesmos filtros na consulta de contagem
        if (status && status !== 'all') {
            countQuery += ` AND se.status = $${countParamIndex++}`;
            countParams.push(status);
        }
        if (period && period !== 'all') {
            countQuery += ` AND se.data_criacao >= NOW() - INTERVAL '${parseInt(period)} days'`;
        }
        if (search) {
            countQuery += ` AND (se.evento ILIKE $${countParamIndex} OR se.competicao ILIKE $${countParamIndex} OR EXISTS (SELECT 1 FROM surebet_entry_bets seb2 WHERE seb2.surebet_entry_id = se.id AND seb2.casa_apostas ILIKE $${countParamIndex}))`;
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
        console.error(`Erro na rota GET /api/surebet/entries/${bankrollId}:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao buscar entradas de surebet.', error: err.message });
    }
});

// POST a new surebet entry
router.post('/entries', async (req, res) => {
    const { 
        bankrollId, 
        entryEvent, 
        entryCompetition, 
        entryDate, 
        entryTime, 
        entryBets, // Espera-se um array de objetos de aposta
        entryNotes,
        entryBonus,
        bonusValue,
        bonusHouse,
        bonusExpiryDate
    } = req.body;

    if (!bankrollId || !entryEvent || !entryDate || !entryTime || !entryBets || entryBets.length === 0) {
        return res.status(400).json({ msg: 'Dados incompletos para registrar a entrada de surebet.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Iniciar transação

        const dataEvento = `${entryDate} ${entryTime}`;

        // 1. Inserir na tabela surebet_entries
        const surebetEntryQuery = `
            INSERT INTO surebet_entries 
                (bankroll_id, evento, competicao, data_evento, observacoes, status, user_id, bonus, bonus_value, bonus_house, bonus_expiry_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id;
        `;
        const entryResult = await client.query(surebetEntryQuery, [
            bankrollId,
            entryEvent,
            entryCompetition,
            dataEvento,
            entryNotes,
            'Pendente', // Status inicial
            req.user.id,
            entryBonus || false,
            entryBonus ? bonusValue : null,
            entryBonus ? bonusHouse : null,
            entryBonus ? bonusExpiryDate : null
        ]);
        const surebetEntryId = entryResult.rows[0].id;

        // 2. Inserir cada aposta na tabela surebet_entry_bets
        let totalValorApostado = 0;
        let retornosIndividuais = [];

        for (const bet of entryBets) {
            if (!bet.house || !bet.market || !bet.odds || !bet.stake) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: `Dados incompletos para uma das apostas: ${JSON.stringify(bet)}` });
            }
            const odds = parseFloat(bet.odds);
            
            // Para apostas Lay em exchange, o valor apostado considerado é a liability
            let valorApostado;
            if (bet.isExchange && bet.betType === 'lay') {
                valorApostado = parseFloat(bet.liability) || 0;
            } else {
                valorApostado = parseFloat(bet.stake);
            }
            
            const retornoPotencialIndividual = valorApostado * odds;

            totalValorApostado += valorApostado;
            // Calcular retorno potencial baseado no tipo de aposta
            let retornoPotencial;
            if (bet.isExchange && bet.betType === 'lay') {
                // Para apostas Lay, o retorno é o valor apostado (liability) + stake
                const stake = parseFloat(bet.stake);
                retornoPotencial = valorApostado + stake;
            } else if (bet.isExchange && bet.betType === 'back') {
                // Para apostas Back em exchange, considerar comissão
                const lucroSemComissao = (odds - 1) * valorApostado;
                const comissao = lucroSemComissao * (bet.commission / 100);
                retornoPotencial = valorApostado + lucroSemComissao - comissao;
            } else {
                // Aposta tradicional
                retornoPotencial = retornoPotencialIndividual;
            }
            
            retornosIndividuais.push(retornoPotencial);

            const surebetEntryBetQuery = `
                INSERT INTO surebet_entry_bets 
                    (surebet_entry_id, casa_apostas, mercado, odds, valor_apostado, retorno_potencial, status_aposta, user_id, is_exchange, bet_type, commission, liability)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
            `;
            await client.query(surebetEntryBetQuery, [
                surebetEntryId,
                bet.house,
                bet.market,
                odds,
                valorApostado,
                retornoPotencial,
                'Pendente',
                req.user.id,
                bet.isExchange || false,
                bet.betType || null,
                bet.commission || null,
                bet.liability || null
            ]);
        }
        
        // Calcular o retorno total garantido da surebet (o menor dos retornos potenciais)
        // Esta é uma simplificação; idealmente as stakes são calculadas para retornos iguais.
        // Se as stakes forem calculadas para equalizar o retorno, qualquer um dos retornosIndividuais pode ser usado.
        // Para segurança, usamos o mínimo, assumindo que o usuário pode não ter balanceado perfeitamente.
        const retornoTotalGarantido = retornosIndividuais.length > 0 ? Math.min(...retornosIndividuais) : 0;
        const lucroTotal = retornoTotalGarantido - totalValorApostado;
        const roiPercentual = totalValorApostado > 0 ? (lucroTotal / totalValorApostado) * 100 : 0;

        await client.query(
            'UPDATE surebet_entries SET retorno_total = $1, lucro_total = $2, roi_percentual = $3 WHERE id = $4',
            [retornoTotalGarantido, lucroTotal, roiPercentual, surebetEntryId]
        );

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Entrada de Surebet registrada com sucesso!', entryId: surebetEntryId });

    } catch (err) {
        await client.query('ROLLBACK'); // Em caso de erro, fazer rollback
        console.error('Erro na rota POST /api/surebet/entries:', err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao registrar entrada de surebet.', error: err.message });
    } finally {
        client.release();
    }
});

// DELETE a surebet entry
router.delete('/entries/:bankrollId/:entryId', async (req, res) => {
    const { bankrollId, entryId } = req.params;

    if (!bankrollId || !entryId) {
        return res.status(400).json({ msg: 'ID do bankroll e da entrada são necessários para exclusão.' });
    }

    const client = await pool.connect();

    try {
        // Iniciar transação para garantir que tudo seja excluído corretamente
        await client.query('BEGIN');

        // 1. Primeiro excluir os registros da tabela surebet_entry_bets que dependem dessa entrada
        await client.query(
            'DELETE FROM surebet_entry_bets WHERE surebet_entry_id = $1 AND user_id = $2',
            [entryId, req.user.id]
        );

        // 2. Verificar se a entrada existe e obter informações antes de excluir
        const entryResult = await client.query(
            'SELECT id, status, lucro_total FROM surebet_entries WHERE id = $1 AND bankroll_id = $2 AND user_id = $3',
            [entryId, bankrollId, req.user.id]
        );

        if (entryResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Entrada não encontrada ou não pertence a este bankroll.' });
        }

        const entry = entryResult.rows[0];
        const isResolved = entry.status && entry.status.toLowerCase() === 'resolvido';
        const lucroTotal = parseFloat(entry.lucro_total) || 0;

        // 3. Se a entrada estava resolvida, atualizar o saldo do bankroll
        if (isResolved) {
            await client.query(
                'UPDATE bankrolls SET saldo_atual = saldo_atual - $1 WHERE id = $2 AND user_id = $3',
                [lucroTotal, bankrollId, req.user.id]
            );
        }

        // 4. Excluir a entrada principal da tabela surebet_entries
        const deleteResult = await client.query(
            'DELETE FROM surebet_entries WHERE id = $1 AND bankroll_id = $2 AND user_id = $3 RETURNING id',
            [entryId, bankrollId, req.user.id]
        );

        // Confirmar transação
        await client.query('COMMIT');
        
        // Preparar mensagem de resposta
        let message = 'Entrada de surebet excluída com sucesso!';
        if (isResolved) {
            if (lucroTotal > 0) {
                message += ` O saldo foi reduzido em ${lucroTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} devido ao lucro da entrada resolvida.`;
            } else if (lucroTotal < 0) {
                message += ` O saldo foi aumentado em ${Math.abs(lucroTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} devido ao prejuízo da entrada resolvida.`;
            }
        }
        
        res.json({ msg: message, entryId });

    } catch (err) {
        await client.query('ROLLBACK'); // Em caso de erro, fazer rollback
        console.error(`Erro na rota DELETE /api/surebet/entries/${bankrollId}/${entryId}:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao excluir entrada de surebet.', error: err.message });
    } finally {
        client.release();
    }
});

// PATCH - Atualizar status de uma entrada de surebet
router.patch('/entries/:bankrollId/:entryId/status', async (req, res) => {
    const { bankrollId, entryId } = req.params;
    const { status } = req.body;
    
    if (!bankrollId || !entryId) {
        return res.status(400).json({ msg: 'ID do bankroll e da entrada são necessários para atualização.' });
    }

    if (!status) {
        return res.status(400).json({ msg: 'O novo status é obrigatório.' });
    }

    // Validar se o status é um dos valores permitidos
    const statusesPermitidos = ['Pendente', 'Resolvido', 'Cancelado'];
    if (!statusesPermitidos.includes(status)) {
        return res.status(400).json({ msg: 'Status inválido. Os valores permitidos são: ' + statusesPermitidos.join(', ') });
    }

    try {
        const result = await pool.query(
            'UPDATE surebet_entries SET status = $1 WHERE id = $2 AND bankroll_id = $3 AND user_id = $4 RETURNING id',
            [status, entryId, bankrollId, req.user.id]
        );

        // Verificar se algum registro foi atualizado
        if (result.rowCount === 0) {
            return res.status(404).json({ msg: 'Entrada não encontrada ou não pertence a este bankroll.' });
        }

        res.json({ msg: 'Status atualizado com sucesso!', status, entryId });
    } catch (err) {
        console.error(`Erro na rota PATCH /api/surebet/entries/${bankrollId}/${entryId}/status:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao atualizar status da entrada de surebet.', error: err.message });
    }
});

// PUT - Atualizar status de uma entrada de surebet (para dropdown)
router.put('/entries/:entryId/status', async (req, res) => {
    const { entryId } = req.params;
    const { status } = req.body;
    
    if (!entryId) {
        return res.status(400).json({ msg: 'ID da entrada é necessário para atualização.' });
    }

    if (!status) {
        return res.status(400).json({ msg: 'O novo status é obrigatório.' });
    }

    // Mapear status do frontend para o banco
    const statusMap = {
        'pendente': 'Pendente',
        'resolvido': 'Resolvido'
    };

    const dbStatus = statusMap[status.toLowerCase()];
    if (!dbStatus) {
        return res.status(400).json({ msg: 'Status inválido. Os valores permitidos são: pendente, resolvido' });
    }

    try {
        // Iniciar transação para garantir consistência
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Buscar dados da entrada antes da atualização
            const entryData = await client.query(
                'SELECT id, bankroll_id, status, lucro_total FROM surebet_entries WHERE id = $1 AND user_id = $2',
                [entryId, req.user.id]
            );
            
            if (entryData.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ msg: 'Entrada não encontrada ou você não tem permissão para alterá-la.' });
            }
            
            const entry = entryData.rows[0];
            const previousStatus = entry.status;
            const bankrollId = entry.bankroll_id;
            const lucroTotal = parseFloat(entry.lucro_total) || 0;
            
            // Atualizar o status da entrada
            await client.query(
                'UPDATE surebet_entries SET status = $1 WHERE id = $2 AND user_id = $3',
                [dbStatus, entryId, req.user.id]
            );
            
            // Se o status mudou para 'Resolvido', somar o lucro (positivo ou negativo) ao saldo do bankroll
            if (dbStatus === 'Resolvido' && previousStatus !== 'Resolvido') {
                await client.query(
                    'UPDATE bankrolls SET saldo_atual = saldo_atual + $1 WHERE id = $2 AND user_id = $3',
                    [lucroTotal, bankrollId, req.user.id]
                );
            }
            
            // Se o status mudou de 'Resolvido' para 'Pendente', subtrair o lucro do saldo do bankroll
            if (dbStatus === 'Pendente' && previousStatus === 'Resolvido') {
                await client.query(
                    'UPDATE bankrolls SET saldo_atual = saldo_atual - $1 WHERE id = $2 AND user_id = $3',
                    [lucroTotal, bankrollId, req.user.id]
                );
            }
            
            await client.query('COMMIT');
            
            let message = 'Status atualizado com sucesso!';
            if (dbStatus === 'Resolvido' && previousStatus !== 'Resolvido') {
                if (lucroTotal > 0) {
                    message += ` Lucro de R$ ${lucroTotal.toFixed(2)} adicionado ao saldo do bankroll.`;
                } else if (lucroTotal < 0) {
                    message += ` Prejuízo de R$ ${Math.abs(lucroTotal).toFixed(2)} subtraído do saldo do bankroll.`;
                } else {
                    message += ` Resultado neutro - saldo do bankroll mantido.`;
                }
            } else if (dbStatus === 'Pendente' && previousStatus === 'Resolvido') {
                if (lucroTotal > 0) {
                    message += ` Lucro de R$ ${lucroTotal.toFixed(2)} removido do saldo do bankroll.`;
                } else if (lucroTotal < 0) {
                    message += ` Prejuízo de R$ ${Math.abs(lucroTotal).toFixed(2)} revertido no saldo do bankroll.`;
                } else {
                    message += ` Resultado neutro revertido - saldo do bankroll mantido.`;
                }
            }
            
            res.json({ msg: message, status: dbStatus, entryId });
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error(`Erro na rota PUT /api/surebet/entries/${entryId}/status:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao atualizar status da entrada de surebet.', error: err.message });
    }
});

module.exports = router;