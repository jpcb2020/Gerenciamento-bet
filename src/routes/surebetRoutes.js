const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET all surebet entries for a specific bankroll
router.get('/entries/:bankrollId', async (req, res) => {
    const { bankrollId } = req.params;
    const { period, status, search } = req.query; // Filtros opcionais

    try {
        let query = `
            SELECT 
                se.id, se.evento, se.competicao, se.data_evento, 
                se.retorno_total, se.lucro_total, se.roi_percentual, 
                se.status, se.observacoes, se.data_criacao,
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
            WHERE se.bankroll_id = $1
        `;

        const queryParams = [bankrollId];
        let paramIndex = 2;

        // Aplicar filtros (exemplos simples, podem ser expandidos)
        if (status && status !== 'all') {
            query += ` AND se.status = $${paramIndex++}`;
            queryParams.push(status);
        }
        if (period && period !== 'all') {
            // Lógica de período (ex: '7', '30', '90')
            query += ` AND se.data_evento >= NOW() - INTERVAL '${parseInt(period)} days'`;
        }
        if (search) {
            query += ` AND (se.evento ILIKE $${paramIndex} OR se.competicao ILIKE $${paramIndex} OR EXISTS (SELECT 1 FROM json_array_elements(COALESCE(json_agg(seb.casa_apostas) FILTER (WHERE seb.id IS NOT NULL), '[]'::json)) el WHERE el::text ILIKE $${paramIndex}))`;
            queryParams.push(`%${search}%`);
        }

        query += " GROUP BY se.id ORDER BY se.data_evento DESC, se.id DESC";

        const result = await pool.query(query, queryParams);
        res.json(result.rows);

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
        entryNotes 
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
                (bankroll_id, evento, competicao, data_evento, observacoes, status)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
        `;
        const entryResult = await client.query(surebetEntryQuery, [
            bankrollId,
            entryEvent,
            entryCompetition,
            dataEvento,
            entryNotes,
            'Pendente' // Status inicial
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
            const valorApostado = parseFloat(bet.stake);
            const odds = parseFloat(bet.odds);
            const retornoPotencialIndividual = valorApostado * odds;

            totalValorApostado += valorApostado;
            retornosIndividuais.push(retornoPotencialIndividual);

            const surebetEntryBetQuery = `
                INSERT INTO surebet_entry_bets
                    (surebet_entry_id, casa_apostas, mercado, odds, valor_apostado, retorno_potencial, status_aposta)
                VALUES ($1, $2, $3, $4, $5, $6, $7);
            `;
            await client.query(surebetEntryBetQuery, [
                surebetEntryId,
                bet.house,
                bet.market,
                odds,
                valorApostado,
                retornoPotencialIndividual, // Armazena o retorno desta perna específica
                'Pendente'
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
            'DELETE FROM surebet_entry_bets WHERE surebet_entry_id = $1',
            [entryId]
        );

        // 2. Excluir a entrada principal da tabela surebet_entries
        const result = await client.query(
            'DELETE FROM surebet_entries WHERE id = $1 AND bankroll_id = $2 RETURNING id',
            [entryId, bankrollId]
        );

        // Verificar se algum registro foi excluído
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Entrada não encontrada ou não pertence a este bankroll.' });
        }

        // Confirmar transação
        await client.query('COMMIT');
        res.json({ msg: 'Entrada de surebet excluída com sucesso!', entryId });

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
            'UPDATE surebet_entries SET status = $1 WHERE id = $2 AND bankroll_id = $3 RETURNING id',
            [status, entryId, bankrollId]
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

module.exports = router;