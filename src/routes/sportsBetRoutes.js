const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET all sports bet entries for a specific bankroll
router.get('/entries/:bankrollId', async (req, res) => {
    const { bankrollId } = req.params;
    const { period, status, search, page = 1, limit = 5, startDate, endDate } = req.query;

    try {
        let query = `
            SELECT 
                sbe.id, sbe.evento, sbe.competicao, sbe.data_evento, 
                sbe.casa_apostas, sbe.mercado, sbe.odds, sbe.valor_apostado,
                sbe.retorno_potencial, sbe.lucro_total, sbe.roi_percentual, 
                sbe.status, sbe.observacoes, sbe.data_criacao,
                sbe.is_exchange, sbe.bet_type, sbe.commission, sbe.liability, sbe.is_freebet,
                sbe.bonus, sbe.bonus_value, sbe.bonus_house, sbe.bonus_expiry_date,
                sbe.used_bonus_id, sbe.used_bonus_value, sbe.used_bonus_house
            FROM sports_bet_entries sbe
            WHERE sbe.bankroll_id = $1 AND sbe.user_id = $2
        `;

        const queryParams = [bankrollId, req.user.id];
        let paramIndex = 3;

        // Aplicar filtros
        if (status && status !== 'all') {
            const statusMap = {
                'pendente': 'Pendente',
                'ganha': 'Ganha',
                'perdida': 'Perdida'
            };
            const dbStatus = statusMap[status.toLowerCase()] || status;
            query += ` AND sbe.status = $${paramIndex++}`;
            queryParams.push(dbStatus);
        }
        if (period && period !== 'all') {
            if (period === 'custom' && startDate && endDate) {
                query += ` AND sbe.data_criacao >= $${paramIndex++} AND sbe.data_criacao <= $${paramIndex++}`;
                queryParams.push(startDate, endDate);
            } else {
                query += ` AND sbe.data_criacao >= NOW() - INTERVAL '${parseInt(period)} days'`;
            }
        }
        if (search) {
            query += ` AND (sbe.evento ILIKE $${paramIndex} OR sbe.competicao ILIKE $${paramIndex} OR sbe.casa_apostas ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        query += " ORDER BY sbe.data_criacao DESC, sbe.id DESC";

        // Adicionar paginação
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 5;
        const offset = (pageNumber - 1) * limitNumber;
        
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(limitNumber, offset);

        // Consulta para contar o total de registros
        let countQuery = `
            SELECT COUNT(*) as total
            FROM sports_bet_entries sbe
            WHERE sbe.bankroll_id = $1 AND sbe.user_id = $2
        `;
        
        const countParams = [bankrollId, req.user.id];
        let countParamIndex = 3;
        
        // Aplicar os mesmos filtros na consulta de contagem
        if (status && status !== 'all') {
            const statusMap = {
                'pendente': 'Pendente',
                'ganha': 'Ganha',
                'perdida': 'Perdida'
            };
            const dbStatus = statusMap[status.toLowerCase()] || status;
            countQuery += ` AND sbe.status = $${countParamIndex++}`;
            countParams.push(dbStatus);
        }
        if (period && period !== 'all') {
            if (period === 'custom' && startDate && endDate) {
                countQuery += ` AND sbe.data_criacao >= $${countParamIndex++} AND sbe.data_criacao <= $${countParamIndex++}`;
                countParams.push(startDate, endDate);
            } else {
                countQuery += ` AND sbe.data_criacao >= NOW() - INTERVAL '${parseInt(period)} days'`;
            }
        }
        if (search) {
            countQuery += ` AND (sbe.evento ILIKE $${countParamIndex} OR sbe.competicao ILIKE $${countParamIndex} OR sbe.casa_apostas ILIKE $${countParamIndex})`;
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
        console.error(`Erro na rota GET /api/sports-bet/entries/${bankrollId}:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao buscar entradas de apostas esportivas.', error: err.message });
    }
});

// GET single sports bet entry for editing
router.get('/entries/single/:entryId', async (req, res) => {
    const { entryId } = req.params;

    try {
        const query = `
            SELECT 
                sbe.id, sbe.evento, sbe.competicao, sbe.data_evento, 
                sbe.casa_apostas, sbe.mercado, sbe.odds, sbe.valor_apostado,
                sbe.retorno_potencial, sbe.lucro_total, sbe.roi_percentual, 
                sbe.status, sbe.observacoes, sbe.data_criacao,
                sbe.is_exchange, sbe.bet_type, sbe.commission, sbe.liability, sbe.is_freebet,
                sbe.bonus, sbe.bonus_value, sbe.bonus_house, sbe.bonus_expiry_date,
                sbe.used_bonus_id, sbe.used_bonus_value, sbe.used_bonus_house
            FROM sports_bet_entries sbe
            WHERE sbe.id = $1 AND sbe.user_id = $2
        `;

        const result = await pool.query(query, [entryId, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Entrada de aposta esportiva não encontrada.' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error(`Erro na rota GET /api/sports-bet/entries/single/${entryId}:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao buscar entrada de aposta esportiva.', error: err.message });
    }
});

// POST a new sports bet entry
router.post('/entries', async (req, res) => {
    const { 
        bankrollId, 
        entryEvent, 
        entryCompetition, 
        useExistingBonus,
        entryDate, 
        entryTime, 
        betHouse,
        betMarket,
        betOdds,
        betStake,
        isExchange,
        betType,
        commission,
        liability,
        isFreebet,
        entryNotes,
        entryBonus,
        bonusValue,
        bonusHouse,
        bonusExpiryDate
    } = req.body;

    if (!bankrollId || !entryEvent || !entryDate || !entryTime || !betHouse || !betMarket || !betOdds || !betStake) {
        return res.status(400).json({ msg: 'Dados incompletos para registrar a entrada de aposta esportiva.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

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

        // Calcular valores
        const odds = parseFloat(betOdds);
        let valorApostado = parseFloat(betStake);
        let retornoPotencial;

        // Validações adicionais para prevenir overflow
        if (isNaN(odds) || odds <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Odd deve ser um número válido maior que zero.' });
        }

        if (isNaN(valorApostado) || valorApostado <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Valor apostado deve ser um número válido maior que zero.' });
        }

        // Calcular retorno baseado no tipo de aposta
        if (isExchange && betType === 'lay') {
            // Para apostas Lay, o valor apostado considerado é a liability
            valorApostado = parseFloat(liability) || 0;
            const stake = parseFloat(betStake);
            retornoPotencial = valorApostado + stake;
        } else if (isExchange && betType === 'back') {
            // Para apostas Back em exchange, considerar comissão
            const lucroSemComissao = (odds - 1) * valorApostado;
            const comissaoValor = lucroSemComissao * (parseFloat(commission) / 100);
            retornoPotencial = valorApostado + lucroSemComissao - comissaoValor;
        } else {
            // Aposta tradicional
            retornoPotencial = valorApostado * odds;
        }

        // Validar se os valores calculados não excedem os limites do banco
        if (retornoPotencial > 9999999999999.99) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                msg: `O retorno potencial (${formatCurrency(retornoPotencial)}) é muito alto. Por favor, reduza a odd ou o valor apostado.` 
            });
        }

        const lucroTotal = retornoPotencial - valorApostado;
        
        if (Math.abs(lucroTotal) > 9999999999999.99) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                msg: `O lucro calculado (${formatCurrency(lucroTotal)}) é muito alto. Por favor, reduza a odd ou o valor apostado.` 
            });
        }

        const roiPercentual = valorApostado > 0 ? (lucroTotal / valorApostado) * 100 : 0;

        // Inserir a entrada
        const insertQuery = `
            INSERT INTO sports_bet_entries 
                (bankroll_id, user_id, evento, competicao, data_evento, 
                 casa_apostas, mercado, odds, valor_apostado, retorno_potencial, 
                 lucro_total, roi_percentual, status, observacoes,
                 is_exchange, bet_type, commission, liability, is_freebet,
                 bonus, bonus_value, bonus_house, bonus_expiry_date,
                 used_bonus_id, used_bonus_value, used_bonus_house)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26) 
            RETURNING id
        `;

        const entryResult = await client.query(insertQuery, [
            bankrollId,
            req.user.id,
            entryEvent,
            entryCompetition,
            dataEvento,
            betHouse,
            betMarket,
            odds,
            valorApostado,
            retornoPotencial,
            lucroTotal,
            roiPercentual,
            'Pendente',
            entryNotes,
            isExchange || false,
            betType || null,
            commission || null,
            liability || null,
            isFreebet || false,
            entryBonus || false,
            entryBonus ? bonusValue : null,
            entryBonus ? bonusHouse : null,
            entryBonus ? bonusExpiryDate : null,
            usedBonusData ? usedBonusData.id : null,
            usedBonusData ? usedBonusData.bonus_value : null,
            usedBonusData ? usedBonusData.bonus_house : null
        ]);

        const sportsBetEntryId = entryResult.rows[0].id;

        // Se uma aposta grátis existente foi selecionada, deletar ela da tabela
        if (useExistingBonus) {
            const bonusCheck = await client.query(
                'SELECT id, status FROM user_bonus WHERE id = $1 AND user_id = $2 AND status = $3',
                [useExistingBonus, req.user.id, 'Ativo']
            );
            
            if (bonusCheck.rowCount > 0) {
                await client.query(
                    'DELETE FROM user_bonus WHERE id = $1 AND user_id = $2',
                    [useExistingBonus, req.user.id]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Entrada de aposta esportiva registrada com sucesso!', entryId: sportsBetEntryId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro na rota POST /api/sports-bet/entries:', err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao registrar entrada de aposta esportiva.', error: err.message });
    } finally {
        client.release();
    }
});

// PUT update existing sports bet entry
router.put('/entries/:entryId', async (req, res) => {
    const { entryId } = req.params;
    const { 
        bankrollId, 
        entryEvent, 
        entryCompetition, 
        useExistingBonus,
        entryDate, 
        entryTime, 
        betHouse,
        betMarket,
        betOdds,
        betStake,
        isExchange,
        betType,
        commission,
        liability,
        isFreebet,
        entryNotes,
        entryBonus,
        bonusValue,
        bonusHouse,
        bonusExpiryDate
    } = req.body;

    if (!bankrollId || !entryEvent || !entryDate || !entryTime || !betHouse || !betMarket || !betOdds || !betStake) {
        return res.status(400).json({ msg: 'Dados incompletos para atualizar a entrada de aposta esportiva.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verificar se a entrada pertence ao usuário
        const ownershipCheck = await client.query(
            'SELECT id FROM sports_bet_entries WHERE id = $1 AND user_id = $2',
            [entryId, req.user.id]
        );

        if (ownershipCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Entrada de aposta esportiva não encontrada ou não autorizada.' });
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

        // Calcular valores
        const odds = parseFloat(betOdds);
        let valorApostado = parseFloat(betStake);
        let retornoPotencial;

        // Validações adicionais para prevenir overflow
        if (isNaN(odds) || odds <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Odd deve ser um número válido maior que zero.' });
        }

        if (isNaN(valorApostado) || valorApostado <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Valor apostado deve ser um número válido maior que zero.' });
        }

        // Calcular retorno baseado no tipo de aposta
        if (isExchange && betType === 'lay') {
            // Para apostas Lay, o valor apostado considerado é a liability
            valorApostado = parseFloat(liability) || 0;
            const stake = parseFloat(betStake);
            retornoPotencial = valorApostado + stake;
        } else if (isExchange && betType === 'back') {
            // Para apostas Back em exchange, considerar comissão
            const lucroSemComissao = (odds - 1) * valorApostado;
            const comissaoValor = lucroSemComissao * (parseFloat(commission) / 100);
            retornoPotencial = valorApostado + lucroSemComissao - comissaoValor;
        } else {
            // Aposta tradicional
            retornoPotencial = valorApostado * odds;
        }

        // Validar se os valores calculados não excedem os limites do banco
        if (retornoPotencial > 9999999999999.99) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                msg: `O retorno potencial (${formatCurrency(retornoPotencial)}) é muito alto. Por favor, reduza a odd ou o valor apostado.` 
            });
        }

        const lucroTotal = retornoPotencial - valorApostado;
        
        if (Math.abs(lucroTotal) > 9999999999999.99) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                msg: `O lucro calculado (${formatCurrency(lucroTotal)}) é muito alto. Por favor, reduza a odd ou o valor apostado.` 
            });
        }

        const roiPercentual = valorApostado > 0 ? (lucroTotal / valorApostado) * 100 : 0;

        // Atualizar a entrada
        const updateQuery = `
            UPDATE sports_bet_entries 
            SET evento = $1, competicao = $2, data_evento = $3, 
                casa_apostas = $4, mercado = $5, odds = $6, valor_apostado = $7, 
                retorno_potencial = $8, lucro_total = $9, roi_percentual = $10,
                observacoes = $11, is_exchange = $12, bet_type = $13, commission = $14, 
                liability = $15, is_freebet = $16, bonus = $17, bonus_value = $18, 
                bonus_house = $19, bonus_expiry_date = $20, used_bonus_id = $21, 
                used_bonus_value = $22, used_bonus_house = $23
            WHERE id = $24 AND user_id = $25
        `;

        await client.query(updateQuery, [
            entryEvent,
            entryCompetition,
            dataEvento,
            betHouse,
            betMarket,
            odds,
            valorApostado,
            retornoPotencial,
            lucroTotal,
            roiPercentual,
            entryNotes || null,
            isExchange || false,
            betType || null,
            commission || null,
            liability || null,
            isFreebet || false,
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

        await client.query('COMMIT');

        res.json({ 
            msg: 'Entrada de aposta esportiva atualizada com sucesso!',
            entryId: entryId,
            lucroTotal: lucroTotal,
            roiPercentual: roiPercentual
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar entrada de aposta esportiva:', err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao atualizar entrada de aposta esportiva.', error: err.message });
    } finally {
        client.release();
    }
});

// DELETE a sports bet entry
router.delete('/entries/:bankrollId/:entryId', async (req, res) => {
    const { bankrollId, entryId } = req.params;

    if (!bankrollId || !entryId) {
        return res.status(400).json({ msg: 'ID do bankroll e da entrada são necessários para exclusão.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verificar se a entrada existe e obter informações antes de excluir
        const entryResult = await client.query(
            'SELECT id, status, lucro_total FROM sports_bet_entries WHERE id = $1 AND bankroll_id = $2 AND user_id = $3',
            [entryId, bankrollId, req.user.id]
        );

        if (entryResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Entrada não encontrada ou não pertence a este bankroll.' });
        }

        const entry = entryResult.rows[0];
        const isResolved = entry.status && entry.status.toLowerCase() === 'resolvido';
        const lucroTotal = parseFloat(entry.lucro_total) || 0;

        // Se a entrada estava resolvida, atualizar o saldo do bankroll
        if (isResolved) {
            await client.query(
                'UPDATE bankrolls SET saldo_atual = saldo_atual - $1 WHERE id = $2 AND user_id = $3',
                [lucroTotal, bankrollId, req.user.id]
            );
        }

        // Excluir a entrada
        await client.query(
            'DELETE FROM sports_bet_entries WHERE id = $1 AND bankroll_id = $2 AND user_id = $3',
            [entryId, bankrollId, req.user.id]
        );

        await client.query('COMMIT');
        
        let message = 'Entrada de aposta esportiva excluída com sucesso!';
        if (isResolved) {
            if (lucroTotal > 0) {
                message += ` O saldo foi reduzido em ${lucroTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} devido ao lucro da entrada resolvida.`;
            } else if (lucroTotal < 0) {
                message += ` O saldo foi aumentado em ${Math.abs(lucroTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} devido ao prejuízo da entrada resolvida.`;
            }
        }
        
        res.json({ msg: message, entryId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Erro na rota DELETE /api/sports-bet/entries/${bankrollId}/${entryId}:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao excluir entrada de aposta esportiva.', error: err.message });
    } finally {
        client.release();
    }
});

// PUT update status of a sports bet entry
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
        'ganha': 'Ganha',
        'perdida': 'Perdida'
    };

    const dbStatus = statusMap[status.toLowerCase()];
    if (!dbStatus) {
        return res.status(400).json({ msg: 'Status inválido. Os valores permitidos são: pendente, ganha, perdida' });
    }

    try {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Buscar dados da entrada antes da atualização
            const entryData = await client.query(
                'SELECT id, bankroll_id, status, lucro_total, valor_apostado, bonus, bonus_value, bonus_house, bonus_expiry_date, user_id FROM sports_bet_entries WHERE id = $1 AND user_id = $2',
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
            const valorApostado = parseFloat(entry.valor_apostado) || 0;
            const hasBonus = entry.bonus;
            const bonusValue = entry.bonus_value;
            const bonusHouse = entry.bonus_house;
            const bonusExpiryDate = entry.bonus_expiry_date;
            const userId = entry.user_id;
            
            // Atualizar o status da entrada
            await client.query(
                'UPDATE sports_bet_entries SET status = $1 WHERE id = $2 AND user_id = $3',
                [dbStatus, entryId, req.user.id]
            );
            
            let balanceChange = 0;
            let message = 'Status atualizado com sucesso!';
            
            // Reverter alteração anterior no saldo se necessário
            if (previousStatus === 'Ganha') {
                // Remove o lucro que foi adicionado
                balanceChange -= lucroTotal;
            } else if (previousStatus === 'Perdida') {
                // Remove o prejuízo que foi subtraído (adiciona de volta)
                balanceChange += valorApostado;
            }
            
            // Aplicar nova alteração no saldo
            if (dbStatus === 'Ganha') {
                // Adiciona o lucro
                balanceChange += lucroTotal;
                message += ` Lucro de ${formatCurrency(lucroTotal)} adicionado ao saldo.`;
                
                // Se há bônus, inserir na tabela user_bonus
                if (hasBonus && bonusValue && bonusHouse && bonusExpiryDate) {
                    await client.query(
                        'INSERT INTO user_bonus (user_id, bonus_value, bonus_house, bonus_expiry_date, sports_bet_entry_id) VALUES ($1, $2, $3, $4, $5)',
                        [userId, bonusValue, bonusHouse, bonusExpiryDate, entryId]
                    );
                }
            } else if (dbStatus === 'Perdida') {
                // Subtrai o valor apostado
                balanceChange -= valorApostado;
                message += ` Prejuízo de ${formatCurrency(valorApostado)} subtraído do saldo.`;
            } else if (dbStatus === 'Pendente') {
                message += ' Aposta voltou para pendente - saldo ajustado.';
            }
            
            // Atualizar saldo do bankroll se houve mudança
            if (balanceChange !== 0) {
                await client.query(
                    'UPDATE bankrolls SET saldo_atual = saldo_atual + $1 WHERE id = $2 AND user_id = $3',
                    [balanceChange, bankrollId, req.user.id]
                );
            }
            
            await client.query('COMMIT');
            
            res.json({ msg: message, status: dbStatus, entryId });
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error(`Erro na rota PUT /api/sports-bet/entries/${entryId}/status:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao atualizar status da entrada de aposta esportiva.', error: err.message });
    }
});

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

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
                SUM(CASE 
                    WHEN status = 'Ganha' THEN lucro_total 
                    WHEN status = 'Perdida' THEN -valor_apostado 
                    ELSE 0 
                END) as lucro_diario
             FROM sports_bet_entries 
             WHERE bankroll_id = $1 AND user_id = $2 AND status IN ('Ganha', 'Perdida')
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
            dateFilter = ' AND data_criacao >= $3 AND data_criacao <= $4';
            dateParams.push(startDate, endDate);
        } else if (period !== 'all') {
            const daysAgo = parseInt(period);
            dateFilter = ` AND data_criacao >= CURRENT_DATE - INTERVAL '${daysAgo} days'`;
        }
        
        // Buscar estatísticas gerais (apenas entradas resolvidas)
        const generalStatsQuery = `
            SELECT 
                COUNT(*) as total_bets,
                COALESCE(SUM(CASE 
                    WHEN status = 'Ganha' THEN lucro_total 
                    WHEN status = 'Perdida' THEN -valor_apostado 
                    ELSE 0 
                END), 0) as total_profit,
                COALESCE(AVG(CASE 
                    WHEN status = 'Ganha' THEN lucro_total 
                    WHEN status = 'Perdida' THEN -valor_apostado 
                    ELSE 0 
                END), 0) as average_profit,
                COALESCE(AVG(valor_apostado), 0) as average_stake,
                COUNT(*) as resolved_bets,
                COUNT(CASE WHEN status = 'Ganha' THEN 1 END) as winning_bets
            FROM sports_bet_entries sbe
            WHERE bankroll_id = $1 AND user_id = $2 AND status IN ('Ganha', 'Perdida')${dateFilter}
        `;
        
        const generalStats = await pool.query(generalStatsQuery, dateParams);
        
        // Buscar lucro por período
        let groupByClause = 'DATE(data_criacao)';
        let selectClause = 'DATE(data_criacao) as date';
        
        if (period === 'custom' && startDate && endDate) {
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
            const daysAgo = parseInt(period);
            if (daysAgo <= 30) {
                groupByClause = 'DATE(data_criacao)';
                selectClause = 'DATE(data_criacao) as date';
            } else if (daysAgo <= 180) {
                groupByClause = 'DATE_TRUNC(\'week\', data_criacao)';
                selectClause = 'DATE_TRUNC(\'week\', data_criacao) as date';
            } else {
                groupByClause = 'DATE_TRUNC(\'month\', data_criacao)';
                selectClause = 'DATE_TRUNC(\'month\', data_criacao) as date';
            }
        } else {
            groupByClause = 'DATE_TRUNC(\'month\', data_criacao)';
            selectClause = 'DATE_TRUNC(\'month\', data_criacao) as date';
        }
        
        const profitByPeriodQuery = `
            SELECT 
                ${selectClause},
                COALESCE(SUM(CASE 
                    WHEN status = 'Ganha' THEN lucro_total 
                    WHEN status = 'Perdida' THEN -valor_apostado 
                    ELSE 0 
                END), 0) as daily_profit,
                COUNT(*) as entries_count,
                COALESCE(AVG(CASE 
                    WHEN status = 'Ganha' THEN lucro_total 
                    WHEN status = 'Perdida' THEN -valor_apostado 
                    ELSE 0 
                END), 0) as avg_profit
            FROM sports_bet_entries 
            WHERE bankroll_id = $1 AND user_id = $2 
                AND status IN ('Ganha', 'Perdida')${dateFilter}
            GROUP BY ${groupByClause}
            ORDER BY date ASC
        `;
        
        const profitByPeriod = await pool.query(profitByPeriodQuery, dateParams);
        
        // Buscar distribuição por casas de apostas
        const bookmakerDistributionQuery = `
            SELECT 
                casa_apostas,
                COUNT(*) as bet_count,
                COALESCE(SUM(valor_apostado), 0) as total_stake
            FROM sports_bet_entries
            WHERE bankroll_id = $1 AND user_id = $2 AND status IN ('Ganha', 'Perdida')${dateFilter}
            GROUP BY casa_apostas
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

// GET header statistics (ROI and period)
router.get('/header-stats/:bankrollId', async (req, res) => {
    const { bankrollId } = req.params;

    try {
        // Buscar todas as entradas resolvidas para calcular ROI
        const entriesQuery = `
            SELECT 
                lucro_total,
                valor_apostado,
                status,
                data_criacao
            FROM sports_bet_entries
            WHERE bankroll_id = $1 AND user_id = $2 AND status IN ('Ganha', 'Perdida')
            ORDER BY data_criacao ASC
        `;

        const entriesResult = await pool.query(entriesQuery, [bankrollId, req.user.id]);
        
        let roi = 0;
        let period = 'Sem entradas';
        
        if (entriesResult.rows.length > 0) {
            // Calcular ROI total usando nova lógica
            let totalLucro = 0;
            let totalApostado = 0;
            
            entriesResult.rows.forEach(entry => {
                const valorApostado = parseFloat(entry.valor_apostado || 0);
                totalApostado += valorApostado;
                
                if (entry.status === 'Ganha') {
                    totalLucro += parseFloat(entry.lucro_total || 0);
                } else if (entry.status === 'Perdida') {
                    totalLucro -= valorApostado;
                }
            });
            
            if (totalApostado > 0) {
                roi = (totalLucro / totalApostado) * 100;
            }
            
            // Calcular período
            const firstEntry = new Date(entriesResult.rows[0].data_criacao);
            const lastEntry = new Date(entriesResult.rows[entriesResult.rows.length - 1].data_criacao);
            
            const diffTime = Math.abs(lastEntry - firstEntry);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                period = '1 dia';
            } else if (diffDays < 30) {
                period = `${diffDays + 1} dias`;
            } else if (diffDays < 365) {
                const months = Math.round(diffDays / 30);
                period = months === 1 ? '1 mês' : `${months} meses`;
            } else {
                const years = Math.round(diffDays / 365);
                period = years === 1 ? '1 ano' : `${years} anos`;
            }
        }
        
        // Se não há entradas resolvidas, verificar se há entradas pendentes
        if (entriesResult.rows.length === 0) {
            const pendingEntriesQuery = `
                SELECT COUNT(*) as count, MIN(data_criacao) as first_entry
                FROM sports_bet_entries 
                WHERE bankroll_id = $1 AND user_id = $2
            `;
            
            const pendingResult = await pool.query(pendingEntriesQuery, [bankrollId, req.user.id]);
            
            if (pendingResult.rows[0].count > 0) {
                const firstEntry = new Date(pendingResult.rows[0].first_entry);
                const now = new Date();
                const diffTime = Math.abs(now - firstEntry);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    period = 'Hoje';
                } else if (diffDays < 30) {
                    period = `${diffDays} dias (pendente)`;
                } else if (diffDays < 365) {
                    const months = Math.round(diffDays / 30);
                    period = months === 1 ? '1 mês (pendente)' : `${months} meses (pendente)`;
                } else {
                    const years = Math.round(diffDays / 365);
                    period = years === 1 ? '1 ano (pendente)' : `${years} anos (pendente)`;
                }
            }
        }

        res.json({
            roi: roi,
            period: period,
            totalEntries: entriesResult.rows.length
        });

    } catch (err) {
        console.error(`Erro na rota GET /api/sports-bet/header-stats/${bankrollId}:`, err.message, err.stack);
        res.status(500).json({ msg: 'Erro no servidor ao buscar estatísticas do cabeçalho.', error: err.message });
    }
});

module.exports = router; 