const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET all surebet entries for a specific bankroll
router.get('/entries/:bankrollId', async (req, res) => {
    const { bankrollId } = req.params;
    const { period, status, search, page = 1, limit = 5, startDate, endDate } = req.query; // Filtros opcionais e paginação

    try {
        let query = `
            SELECT 
                se.id, se.evento, se.competicao, se.data_evento, 
                se.retorno_total, se.lucro_total, se.roi_percentual, 
                se.status, se.observacoes, se.data_criacao,
                se.bonus, se.bonus_value, se.bonus_house, se.bonus_expiry_date,
                se.used_bonus_id, se.used_bonus_value, se.used_bonus_house,
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
            if (period === 'custom' && startDate && endDate) {
                // Período personalizado
                query += ` AND se.data_criacao >= $${paramIndex++} AND se.data_criacao <= $${paramIndex++}`;
                queryParams.push(startDate, endDate);
            } else {
                // Lógica de período (ex: '7', '30', '90')
                query += ` AND se.data_criacao >= NOW() - INTERVAL '${parseInt(period)} days'`;
            }
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
            if (period === 'custom' && startDate && endDate) {
                // Período personalizado
                countQuery += ` AND se.data_criacao >= $${countParamIndex++} AND se.data_criacao <= $${countParamIndex++}`;
                countParams.push(startDate, endDate);
            } else {
                countQuery += ` AND se.data_criacao >= NOW() - INTERVAL '${parseInt(period)} days'`;
            }
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

// GET single surebet entry for editing
router.get('/entries/single/:entryId', async (req, res) => {
    const { entryId } = req.params;

    try {
        const query = `
            SELECT 
                se.id, se.evento, se.competicao, se.data_evento, 
                se.retorno_total, se.lucro_total, se.roi_percentual, 
                se.status, se.observacoes, se.data_criacao,
                se.bonus, se.bonus_value, se.bonus_house, se.bonus_expiry_date,
                se.used_bonus_id, se.used_bonus_value, se.used_bonus_house,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', seb.id,
                            'casa_apostas', seb.casa_apostas,
                            'mercado', seb.mercado,
                            'odds', seb.odds,
                            'valor_apostado', seb.valor_apostado,
                            'retorno_potencial', seb.retorno_potencial,
                            'status_aposta', seb.status_aposta,
                            'is_exchange', seb.is_exchange,
                            'bet_type', seb.bet_type,
                            'commission', seb.commission,
                            'liability', seb.liability
                        )
                    ORDER BY seb.id ASC
                    ) FILTER (WHERE seb.id IS NOT NULL), '[]'::json
                ) AS bets
            FROM surebet_entries se
            LEFT JOIN surebet_entry_bets seb ON se.id = seb.surebet_entry_id
            WHERE se.id = $1 AND se.user_id = $2
            GROUP BY se.id
        `;

        const result = await pool.query(query, [entryId, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Entrada de surebet não encontrada.' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error(`Erro na rota GET /api/surebet/entries/single/${entryId}:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao buscar entrada de surebet.', error: err.message });
    }
});

// POST a new surebet entry
router.post('/entries', async (req, res) => {
    const { 
        bankrollId, 
        entryEvent, 
        entryCompetition, 
        useExistingBonus,
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

        // Buscar informações do bônus usado, se houver
        let usedBonusData = null;
        if (useExistingBonus) {
            const bonusQuery = await client.query(
                'SELECT id, bonus_value, bonus_house FROM user_bonus WHERE id = $1 AND user_id = $2 AND status = $3',
                [useExistingBonus, req.user.id, 'Ativo']
            );
            
            if (bonusQuery.rowCount > 0) {
                usedBonusData = bonusQuery.rows[0];
            }
        }

        // 1. Inserir na tabela surebet_entries
        const surebetEntryQuery = `
            INSERT INTO surebet_entries 
                (bankroll_id, evento, competicao, data_evento, observacoes, status, user_id, bonus, bonus_value, bonus_house, bonus_expiry_date, used_bonus_id, used_bonus_value, used_bonus_house)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id;
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
            entryBonus ? bonusExpiryDate : null,
            usedBonusData ? usedBonusData.id : null,
            usedBonusData ? usedBonusData.bonus_value : null,
            usedBonusData ? usedBonusData.bonus_house : null
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

        // Se uma aposta grátis existente foi selecionada, deletar ela da tabela
        if (useExistingBonus) {
            // Verificar se a aposta grátis pertence ao usuário e está ativa
            const bonusCheck = await client.query(
                'SELECT id, status FROM user_bonus WHERE id = $1 AND user_id = $2 AND status = $3',
                [useExistingBonus, req.user.id, 'Ativo']
            );
            
            if (bonusCheck.rowCount > 0) {
                // Deletar a aposta grátis (as informações ficam preservadas em surebet_entries)
                await client.query(
                    'DELETE FROM user_bonus WHERE id = $1 AND user_id = $2',
                    [useExistingBonus, req.user.id]
                );
            }
        }

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
                'SELECT id, bankroll_id, status, lucro_total, bonus, bonus_value, bonus_house, bonus_expiry_date, user_id FROM surebet_entries WHERE id = $1 AND user_id = $2',
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
            const hasBonus = entry.bonus;
            const bonusValue = entry.bonus_value;
            const bonusHouse = entry.bonus_house;
            const bonusExpiryDate = entry.bonus_expiry_date;
            const userId = entry.user_id;
            
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
                
                // Se há bônus, inserir na tabela user_bonus
                if (hasBonus && bonusValue && bonusHouse && bonusExpiryDate) {
                    await client.query(
                        'INSERT INTO user_bonus (user_id, bonus_value, bonus_house, bonus_expiry_date, surebet_entry_id) VALUES ($1, $2, $3, $4, $5)',
                        [userId, bonusValue, bonusHouse, bonusExpiryDate, entryId]
                    );
                }
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

// GET user's active free bets
router.get('/user-bonus', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, bonus_value, bonus_house, bonus_expiry_date FROM user_bonus WHERE user_id = $1 AND status = $2 ORDER BY bonus_expiry_date ASC',
            [req.user.id, 'Ativo']
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar apostas grátis do usuário:', err.message);
        res.status(500).json({ msg: 'Erro no servidor ao buscar apostas grátis.', error: err.message });
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
        
        // Buscar entradas resolvidas ordenadas por data de criação
        const entriesResult = await pool.query(
            `SELECT 
                DATE(data_criacao) as data,
                SUM(lucro_total) as lucro_diario
             FROM surebet_entries 
             WHERE bankroll_id = $1 AND user_id = $2 AND status = 'Resolvido'
             GROUP BY DATE(data_criacao)
             ORDER BY DATE(data_criacao) ASC`,
            [bankrollId, req.user.id]
        );
        
        // Construir dados de evolução
        const evolutionData = [];
        let saldoAcumulado = saldoInicial;
        
        // Adicionar ponto inicial (data de criação do bankroll ou primeira entrada)
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
        
        // Se não há entradas, adicionar pelo menos um ponto adicional para mostrar linha reta
        if (entriesResult.rows.length === 0) {
            evolutionData.push({
                data: new Date().toISOString().split('T')[0],
                saldo: saldoInicial
            });
        }
        
        res.json(evolutionData);
        
    } catch (err) {
        console.error('Erro ao buscar dados de evolução:', err.message);
        res.status(500).json({ msg: 'Erro no servidor ao buscar dados de evolução.', error: err.message });
    }
});

// GET statistics data for the statistics tab
router.get('/statistics/:bankrollId', async (req, res) => {
    const { bankrollId } = req.params;
    const { period = '30', startDate, endDate } = req.query;
    
    try {
        // Calcular data de início baseada no período
        let dateFilter = '';
        let dateParams = [bankrollId, req.user.id];
        
        if (period === 'custom' && startDate && endDate) {
            // Período personalizado
            dateFilter = ' AND data_criacao >= $3 AND data_criacao <= $4';
            dateParams.push(startDate, endDate);
        } else if (period !== 'all') {
            // Períodos predefinidos
            const daysAgo = parseInt(period);
            dateFilter = ' AND data_criacao >= CURRENT_DATE - INTERVAL \'%s days\'';
            dateFilter = dateFilter.replace('%s', daysAgo);
        }
        
        // Buscar estatísticas gerais (apenas entradas resolvidas)
        const generalStatsQuery = `
            SELECT 
                COUNT(*) as total_bets,
                COALESCE(SUM(lucro_total), 0) as total_profit,
                COALESCE(AVG(lucro_total), 0) as average_profit,
                COALESCE(AVG((SELECT SUM(valor_apostado) FROM surebet_entry_bets seb WHERE seb.surebet_entry_id = se.id)), 0) as average_stake,
                COUNT(*) as resolved_bets,
                COUNT(CASE WHEN lucro_total > 0 THEN 1 END) as winning_bets
            FROM surebet_entries se
            WHERE bankroll_id = $1 AND user_id = $2 AND status = 'Resolvido'${dateFilter}
        `;
        
        const generalStats = await pool.query(generalStatsQuery, dateParams);
        
        // Buscar lucro por período (agrupado por dia/semana/mês dependendo do período)
        let profitPeriodFilter = '';
        let profitPeriodParams = [bankrollId, req.user.id];
        let groupByClause = 'DATE(data_criacao)';
        let selectClause = 'DATE(data_criacao) as date';
        
        if (period === 'custom' && startDate && endDate) {
            // Período personalizado
            profitPeriodFilter = ' AND data_criacao >= $3 AND data_criacao <= $4';
            profitPeriodParams.push(startDate, endDate);
            
            // Calcular diferença de dias para determinar agrupamento
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 30) {
                groupByClause = 'DATE(data_criacao)';
                selectClause = 'DATE(data_criacao) as date';
            } else if (diffDays <= 180) {
                groupByClause = 'DATE_TRUNC(\'week\', data_criacao)';
                selectClause = 'DATE_TRUNC(\'week\', data_criacao) as date';
            } else {
                groupByClause = 'DATE_TRUNC(\'month\', data_criacao)';
                selectClause = 'DATE_TRUNC(\'month\', data_criacao) as date';
            }
        } else if (period !== 'all') {
            // Períodos predefinidos
            const daysAgo = parseInt(period);
            profitPeriodFilter = ` AND data_criacao >= CURRENT_DATE - INTERVAL '${daysAgo} days'`;
            
            // Ajustar agrupamento baseado no período
            if (daysAgo <= 30) {
                // Últimos 30 dias: agrupar por dia
                groupByClause = 'DATE(data_criacao)';
                selectClause = 'DATE(data_criacao) as date';
            } else if (daysAgo <= 180) {
                // 90-180 dias: agrupar por semana
                groupByClause = 'DATE_TRUNC(\'week\', data_criacao)';
                selectClause = 'DATE_TRUNC(\'week\', data_criacao) as date';
            } else {
                // Mais de 180 dias: agrupar por mês
                groupByClause = 'DATE_TRUNC(\'month\', data_criacao)';
                selectClause = 'DATE_TRUNC(\'month\', data_criacao) as date';
            }
        } else {
            // Todo período: agrupar por mês
            groupByClause = 'DATE_TRUNC(\'month\', data_criacao)';
            selectClause = 'DATE_TRUNC(\'month\', data_criacao) as date';
        }
        
        const profitByPeriodQuery = `
            SELECT 
                ${selectClause},
                COALESCE(SUM(lucro_total), 0) as daily_profit,
                COUNT(*) as entries_count,
                COALESCE(AVG(lucro_total), 0) as avg_profit
            FROM surebet_entries 
            WHERE bankroll_id = $1 AND user_id = $2 
                AND status = 'Resolvido'${profitPeriodFilter}
            GROUP BY ${groupByClause}
            ORDER BY date ASC
        `;
        
        const profitByPeriod = await pool.query(profitByPeriodQuery, profitPeriodParams);
        
        // Buscar distribuição por casas de apostas (apenas entradas resolvidas)
        const bookmakerDistributionQuery = `
            SELECT 
                seb.casa_apostas,
                COUNT(*) as bet_count,
                COALESCE(SUM(seb.valor_apostado), 0) as total_stake
            FROM surebet_entry_bets seb
            JOIN surebet_entries se ON seb.surebet_entry_id = se.id
            WHERE se.bankroll_id = $1 AND se.user_id = $2 AND se.status = 'Resolvido'${dateFilter}
            GROUP BY seb.casa_apostas
            ORDER BY bet_count DESC
            LIMIT 10
        `;
        
        const bookmakerDistribution = await pool.query(bookmakerDistributionQuery, dateParams);
        
        // Calcular ROI médio
        const stats = generalStats.rows[0];
        const totalStake = parseFloat(stats.average_stake) * parseInt(stats.total_bets);
        const roi = totalStake > 0 ? (parseFloat(stats.total_profit) / totalStake) * 100 : 0;
        
        res.json({
            general: {
                totalBets: parseInt(stats.total_bets),
                totalProfit: parseFloat(stats.total_profit),
                averageROI: roi,
                averageStake: parseFloat(stats.average_stake),
                resolvedBets: parseInt(stats.resolved_bets),
                winningBets: parseInt(stats.winning_bets),
                winRate: stats.resolved_bets > 0 ? (stats.winning_bets / stats.resolved_bets) * 100 : 0
            },
            profitByPeriod: profitByPeriod.rows,
            bookmakerDistribution: bookmakerDistribution.rows
        });
        
    } catch (err) {
        console.error('Erro ao buscar estatísticas:', err.message);
        res.status(500).json({ msg: 'Erro no servidor ao buscar estatísticas.', error: err.message });
    }
});

// GET bonus data for PDF report
router.get('/bonus/:bankrollId', async (req, res) => {
    const { bankrollId } = req.params;
    
    try {
        // Buscar bônus ativos e expirados do usuário
        const bonusQuery = `
            SELECT 
                id,
                bonus_house,
                bonus_value,
                bonus_expiry_date,
                status,
                created_at
            FROM user_bonus 
            WHERE user_id = $1 
            ORDER BY 
                CASE WHEN status = 'Ativo' THEN 1 ELSE 2 END,
                bonus_expiry_date ASC
        `;
        
        const bonusResult = await pool.query(bonusQuery, [req.user.id]);
        
        res.json(bonusResult.rows);
        
    } catch (err) {
        console.error('Erro ao buscar bônus:', err.message);
        res.status(500).json({ msg: 'Erro no servidor ao buscar bônus.', error: err.message });
    }
});

// PUT update existing surebet entry
router.put('/entries/:entryId', async (req, res) => {
    const { entryId } = req.params;
    const { 
        bankrollId, 
        entryEvent, 
        entryCompetition, 
        useExistingBonus,
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
        return res.status(400).json({ msg: 'Dados incompletos para atualizar a entrada de surebet.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Iniciar transação

        // Verificar se a entrada pertence ao usuário
        const ownershipCheck = await client.query(
            'SELECT id FROM surebet_entries WHERE id = $1 AND user_id = $2',
            [entryId, req.user.id]
        );

        if (ownershipCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Entrada de surebet não encontrada ou não autorizada.' });
        }

        const dataEvento = `${entryDate} ${entryTime}`;

        // Buscar informações do bônus usado, se houver
        let usedBonusData = null;
        if (useExistingBonus) {
            const bonusQuery = await client.query(
                'SELECT id, bonus_value, bonus_house FROM user_bonus WHERE id = $1 AND user_id = $2 AND status = $3',
                [useExistingBonus, req.user.id, 'Ativo']
            );
            
            if (bonusQuery.rowCount > 0) {
                usedBonusData = bonusQuery.rows[0];
            }
        }

        // 1. Atualizar a entrada principal
        const updateEntryQuery = `
            UPDATE surebet_entries 
            SET evento = $1, competicao = $2, data_evento = $3, observacoes = $4,
                bonus = $5, bonus_value = $6, bonus_house = $7, bonus_expiry_date = $8,
                used_bonus_id = $9, used_bonus_value = $10, used_bonus_house = $11
            WHERE id = $12 AND user_id = $13
        `;
        await client.query(updateEntryQuery, [
            entryEvent,
            entryCompetition,
            dataEvento,
            entryNotes || null,
            entryBonus || false,
            entryBonus ? bonusValue : null,
            entryBonus ? bonusHouse : null,
            entryBonus ? bonusExpiryDate : null,
            usedBonusData ? usedBonusData.id : null,
            usedBonusData ? usedBonusData.bonus_value : null,
            usedBonusData ? usedBonusData.bonus_house : null,
            entryId,
            req.user.id
        ]);

        // 2. Deletar todas as apostas existentes da entrada
        await client.query('DELETE FROM surebet_entry_bets WHERE surebet_entry_id = $1', [entryId]);

        // 3. Inserir as novas apostas
        let totalValorApostado = 0;
        let retornosIndividuais = [];

        for (const bet of entryBets) {
            if (!bet.house || !bet.market || !bet.odds || !bet.stake) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: `Dados incompletos para uma das apostas: ${JSON.stringify(bet)}` });
            }

            const valorApostado = parseFloat(bet.stake);
            const odds = parseFloat(bet.odds);
            const retornoPotencial = valorApostado * odds;

            totalValorApostado += valorApostado;
            retornosIndividuais.push(retornoPotencial);

            const betInsertQuery = `
                INSERT INTO surebet_entry_bets 
                    (surebet_entry_id, casa_apostas, mercado, odds, valor_apostado, retorno_potencial, status_aposta, is_exchange, bet_type, commission, liability, user_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;
            await client.query(betInsertQuery, [
                entryId,
                bet.house,
                bet.market,
                odds,
                valorApostado,
                retornoPotencial,
                'Pendente', // Status inicial das apostas
                bet.isExchange || false,
                bet.betType || null,
                bet.commission || null,
                bet.liability || null,
                req.user.id // Adicionar user_id
            ]);
        }

        // 4. Calcular e atualizar totais
        const maiorRetorno = Math.max(...retornosIndividuais);
        const lucroTotal = maiorRetorno - totalValorApostado;
        const roiPercentual = ((lucroTotal / totalValorApostado) * 100).toFixed(2);

        const updateTotalsQuery = `
            UPDATE surebet_entries 
            SET retorno_total = $1, lucro_total = $2, roi_percentual = $3
            WHERE id = $4
        `;
        await client.query(updateTotalsQuery, [
            maiorRetorno,
            lucroTotal,
            parseFloat(roiPercentual),
            entryId
        ]);

        await client.query('COMMIT'); // Confirmar transação

        res.json({ 
            msg: 'Entrada de surebet atualizada com sucesso!',
            entryId: entryId,
            lucroTotal: lucroTotal,
            roiPercentual: roiPercentual
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Reverter transação em caso de erro
        console.error('Erro ao atualizar entrada de surebet:', err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao atualizar entrada de surebet.', error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;