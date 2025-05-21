document.addEventListener('DOMContentLoaded', function() {
    // Dados das casas de apostas regulamentadas
    const casasRegulamentadas = [
        // KAIZEN GAMING BRASIL LTDA
        {
            empresa: "KAIZEN GAMING BRASIL LTDA",
            cnpj: "46.786.961/0001-74",
            requerimento: "0001/2024",
            portaria: "SPA/MF nº 246, de 07 de fevereiro de 2025",
            casas: [
                { nome: "BETANO", dominio: "betano.bet.br" }
            ]
        },
        // SPRBT INTERACTIVE BRASIL LTDA
        {
            empresa: "SPRBT INTERACTIVE BRASIL LTDA",
            cnpj: "54.071.596/0001-40",
            requerimento: "0002/2024",
            portaria: "SPA/MF nº 2.090, de 30 de dezembro de 2024",
            casas: [
                { nome: "SUPERBET", dominio: "superbet.bet.br" },
                { nome: "MAGICIACKPOT", dominio: "magicjackpot.bet.br" },
                { nome: "SUPER", dominio: "super.bet.br" }
            ]
        },
        // MMD TECNOLOGIA, ENTRETENIMENTO E MARKETING LTDA
        {
            empresa: "MMD TECNOLOGIA, ENTRETENIMENTO E MARKETING LTDA",
            cnpj: "34.935.286/0001-19",
            requerimento: "0003/2024",
            portaria: "SPA/MF nº 2.091, de 30 de dezembro 2024",
            casas: [
                { nome: "REI DO PITACO", dominio: "reidopitaco.bet.br" },
                { nome: "PITACO", dominio: "pitaco.bet.br" }
            ]
        },
        // VENTMEAR BRASIL S.A.
        {
            empresa: "VENTMEAR BRASIL S.A.",
            cnpj: "52.868.380/0001-84",
            requerimento: "0004/2024",
            portaria: "SPA/MF nº 247, de 07 de fevereiro de 2025",
            casas: [
                { nome: "SPORTINGBET", dominio: "sportingbet.bet.br" },
                { nome: "BETBOO", dominio: "betboo.bet.br" }
            ]
        },
        // BIG BRAZIL TECNOLOGIA E LOTERIA S.A.
        {
            empresa: "BIG BRAZIL TECNOLOGIA E LOTERIA S.A.",
            cnpj: "41.590.869/0001-10",
            requerimento: "0005/2024",
            portaria: "SPA/MF nº 370, de 24 de fevereiro de 2025",
            casas: [
                { nome: "BIG", dominio: "big.bet.br" },
                { nome: "APOSTAR", dominio: "apostar.bet.br" },
                { nome: "CAESARS", dominio: "caesars.bet.br" }
            ]
        },
        // NSX BRASIL S.A.
        {
            empresa: "NSX BRASIL S.A.",
            cnpj: "55.056.104/0001-00",
            requerimento: "0006/2024",
            portaria: "SPA/MF nº 2.092, de 30 de dezembro de 2024",
            casas: [
                { nome: "BETNACIONAL", dominio: "betnacional.bet.br" },
                { nome: "MR. JACK BET", dominio: "mrjack.bet.br" }
            ]
        },
        // APOLLO OPERATIONS LTDA
        {
            empresa: "APOLLO OPERATIONS LTDA",
            cnpj: "54.923.003/0001-26",
            requerimento: "0007/2024",
            portaria: "SPA/MF nº 2.093, de 30 de dezembro de 2024",
            casas: [
                { nome: "KTO", dominio: "kto.bet.br" }
            ]
        },
        // SIMULCASTING BRASIL SOM E IMAGEM S.A.
        {
            empresa: "SIMULCASTING BRASIL SOM E IMAGEM S.A.",
            cnpj: "17.385.948/0001-05",
            requerimento: "0008/2024",
            portaria: "SPA/MF nº 371, de 24 de fevereiro de 2025",
            casas: [
                { nome: "BETSSON", dominio: "betsson.bet.br" }
            ]
        },
        // GALERA GAMING JOGOS ELETRONICOS S.A.
        {
            empresa: "GALERA GAMING JOGOS ELETRONICOS S.A.",
            cnpj: "31.853.299/0001-50",
            requerimento: "0009/2024",
            portaria: "SPA/MF nº 2.094, de 30 de dezembro de 2024",
            casas: [
                { nome: "GALERA.BET", dominio: "galera.bet.br" }
            ]
        },
        // F12 DO BRASIL JOGOS ELETRONICOS LTDA
        {
            empresa: "F12 DO BRASIL JOGOS ELETRONICOS LTDA",
            cnpj: "51.897.834/0001-82",
            requerimento: "0010/2024",
            portaria: "SPA/MF nº 319, de 17 de fevereiro de 2025",
            casas: [
                { nome: "F12.BET", dominio: "f12.bet.br" },
                { nome: "LUVA.BET", dominio: "luva.bet.br" },
                { nome: "BRASILBET", dominio: "brasilbet.bet.br" }
            ]
        },
        // BLAC JOGOS LTDA
        {
            empresa: "BLAC JOGOS LTDA",
            cnpj: "55.988.317/0001-70",
            requerimento: "0011/2024",
            portaria: "SPA/MF nº 2.095, de 30 de dezembro de 2024",
            casas: [
                { nome: "SPORTYBET", dominio: "sporty.bet.br" }
            ]
        },
        // EB INTERMEDIACOES E JOGOS S.A.
        {
            empresa: "EB INTERMEDIACOES E JOGOS S.A.",
            cnpj: "52.639.845/0001-25",
            requerimento: "0012/2024",
            portaria: "SPA/MF nº 320, de 17 de fevereiro de 2025",
            casas: [
                { nome: "ESTRELABET", dominio: "estrelabet.bet.br" }
            ]
        },
        // REALS BRASIL LTDA
        {
            empresa: "REALS BRASIL LTDA",
            cnpj: "56.197.912/0001-50",
            requerimento: "0013/2024",
            portaria: "SPA/MF nº 372, de 24 de fevereiro de 2025",
            casas: [
                { nome: "REALS", dominio: "reals.bet.br" },
                { nome: "UX", dominio: "ux.bet.br" },
                { nome: "NETPIX", dominio: "não registrado" }
            ]
        },
        // BETFAIR BRASIL LTDA
        {
            empresa: "BETFAIR BRASIL LTDA",
            cnpj: "55.229.080/0001-43",
            requerimento: "0014/2024",
            portaria: "SPA/MF nº 248, de 07 de fevereiro de 2025",
            casas: [
                { nome: "BETFAIR", dominio: "betfair.bet.br" }
            ]
        },
        // OIG GAMING BRAZIL LTDA
        {
            empresa: "OIG GAMING BRAZIL LTDA",
            cnpj: "55.459.453/0001-72",
            requerimento: "0015/2024",
            portaria: "SPA/MF nº 2.096, de 30 de dezembro de 2024",
            casas: [
                { nome: "7GAMES", dominio: "7games.bet.br" },
                { nome: "BETAO", dominio: "betao.bet.br" },
                { nome: "R7", dominio: "r7.bet.br" }
            ]
        },
        // HIPER BET TECNOLOGIA LTDA.
        {
            empresa: "HIPER BET TECNOLOGIA LTDA.",
            cnpj: "55.404.799/0001-73",
            requerimento: "0016/2024",
            portaria: "SPA/MF nº 321, de 17 de fevereiro de 2025",
            casas: [
                { nome: "HIPERBET", dominio: "hiper.bet.br" }
            ]
        },
        // NVBT GAMING LTDA
        {
            empresa: "NVBT GAMING LTDA",
            cnpj: "50.587.712/0001-27",
            requerimento: "0017/2024",
            portaria: "SPA/MF nº 249, de 07 de fevereiro de 2025",
            casas: [
                { nome: "NOVIBET", dominio: "novibet.bet.br" }
            ]
        },
        // SEGURO BET LTDA
        {
            empresa: "SEGURO BET LTDA",
            cnpj: "56.268.974/0001-05",
            requerimento: "0018/2024",
            portaria: "SPA/MF nº 2.097, de 30 de dezembro de 2024",
            casas: [
                { nome: "SEGURO BET", dominio: "seguro.bet.br" },
                { nome: "KING PANDA", dominio: "kingpanda.bet.br" }
            ]
        },
        // GAMEWIZ BRASIL LTDA (0019)
        {
            empresa: "GAMEWIZ BRASIL LTDA",
            cnpj: "56.195.099/0001-89",
            requerimento: "0019/2024",
            portaria: "SPA/MF nº 464, de 10 de março de 2025",
            casas: [
                { nome: "9F", dominio: "9f.bet.br" },
                { nome: "6R", dominio: "6r.bet.br" },
                { nome: "BET.APP", dominio: "betapp.bet.br" }
            ]
        },
        // GAMEWIZ BRASIL LTDA (0020)
        {
            empresa: "GAMEWIZ BRASIL LTDA",
            cnpj: "56.195.099/0001-89",
            requerimento: "0020/2024",
            portaria: "SPA/MF nº 465, de 10 de março de 2025",
            casas: [
                { nome: "1JOGO", dominio: "1jogo.bet.br" },
                { nome: "FOGO777", dominio: "fogo777.bet.br" },
                { nome: "P9", dominio: "p9.bet.br" }
            ]
        },
        // HS DO BRASIL LTDA
        {
            empresa: "HS DO BRASIL LTDA",
            cnpj: "47.123.407/0001-70",
            requerimento: "0021/2024",
            portaria: "SPA/MF nº 250, de 07 de fevereiro de 2025",
            casas: [
                { nome: "BET365", dominio: "bet365.bet.br" }
            ]
        },
        // APOSTA GANHA LOTERIAS LTDA
        {
            empresa: "APOSTA GANHA LOTERIAS LTDA",
            cnpj: "56.001.749/0001-08",
            requerimento: "0022/2024",
            portaria: "SPA/MF nº 251, de 07 de fevereiro de 2025",
            casas: [
                { nome: "APOSTA GANHA", dominio: "apostaganha.bet.br" }
            ]
        },
        // FUTURAS APOSTAS LTDA
        {
            empresa: "FUTURAS APOSTAS LTDA",
            cnpj: "55.399.607/0001-88",
            requerimento: "0023/2024",
            portaria: "SPA/MF nº 466, de 10 de março de 2025",
            casas: [
                { nome: "BRAZINO777", dominio: "brazino777.bet.br" }
            ]
        },
        // Lucky Gaming LTDA
        {
            empresa: "Lucky Gaming LTDA",
            cnpj: "56.212.040/0001-51",
            requerimento: "0025/2024",
            portaria: "SPA/MF nº 252, de 07 de fevereiro de 2025",
            casas: [
                { nome: "4WIN", dominio: "4win.bet.br" },
                { nome: "4PLAY", dominio: "4play.bet.br" },
                { nome: "PAGOL", dominio: "pagol.bet.br" }
            ]
        },
        // H2 LICENSED LTDA
        {
            empresa: "H2 LICENSED LTDA",
            cnpj: "56.303.755/0001-10",
            requerimento: "0027/2024",
            portaria: "SPA/MF nº 253, de 07 de fevereiro de 2025",
            casas: [
                { nome: "SEUBET", dominio: "seu.bet.br" },
                { nome: "H2 BET", dominio: "h2.bet.br" }
            ]
        },
        // SC OPERATING BRAZIL LTDA
        {
            empresa: "SC OPERATING BRAZIL LTDA",
            cnpj: "54.058.631/0001-71",
            requerimento: "0028/2024",
            portaria: "SPA/MF nº 254, de 07 de fevereiro de 2025",
            casas: [
                { nome: "VBET", dominio: "vbet.bet.br" },
                { nome: "VIVARO", dominio: "vivaro.bet.br" }
            ]
        },
        // CDA GAMING LTDA
        {
            empresa: "CDA GAMING LTDA",
            cnpj: "56.636.543/0001-54",
            requerimento: "0029/2024",
            portaria: "SPA/MF nº 255, de 07 de fevereiro de 2025",
            casas: [
                { nome: "CASA DE APOSTAS", dominio: "casadeapostas.bet.br" },
                { nome: "BETSUL", dominio: "betsul.bet.br" }
            ]
        },
        // ESPORTES GAMING BRASIL LTDA
        {
            empresa: "ESPORTES GAMING BRASIL LTDA",
            cnpj: "56.075.466/0001-00",
            requerimento: "0030/2024",
            portaria: "SPA/MF nº 136, de 22 de janeiro de 2025",
            casas: [
                { nome: "JOGO ONLINE", dominio: "jogoonline.bet.br" },
                { nome: "ESPORTES DA SORTE", dominio: "esportesdasorte.bet.br" },
                { nome: "ONABET", dominio: "ona.bet.br" },
                { nome: "BETFAST", dominio: "betfast.bet.br" }
            ]
        },
        // FAST GAMING S.A.
        {
            empresa: "FAST GAMING S.A.",
            cnpj: "55.980.542/0001-60",
            requerimento: "0031/2024",
            portaria: "SPA/MF nº 467, de 10 de março de 2025",
            casas: [
                { nome: "FAZ1BET", dominio: "faz1.bet.br" },
                { nome: "TIVOBET", dominio: "tivo.bet.br" }
            ]
        },
        // SUPREMA BET LTDA
        {
            empresa: "SUPREMA BET LTDA",
            cnpj: "56.183.358/0001-51",
            requerimento: "0032/2024",
            portaria: "SPA/MF nº 256, de 07 de fevereiro de 2025",
            casas: [
                { nome: "SUPREMABET", dominio: "suprema.bet.br" },
                { nome: "MAXIMABET", dominio: "maxima.bet.br" },
                { nome: "XPBET", dominio: "xp.bet.br" }
            ]
        },
        // BETESPORTE APOSTAS ON LINE LTDA
        {
            empresa: "BETESPORTE APOSTAS ON LINE LTDA",
            cnpj: "56.295.104/0001-25",
            requerimento: "0033/2024",
            portaria: "SPA/MF nº 257, de 07 de fevereiro de 2025",
            casas: [
                { nome: "BETESPORTE", dominio: "betesporte.bet.br" },
                { nome: "LANCE DE SORTE", dominio: "lancedesorte.bet.br" }
            ]
        },
        // BOA LION S.A.
        {
            empresa: "BOA LION S.A.",
            cnpj: "53.837.227/0001-52",
            requerimento: "0036/2024",
            portaria: "SPA/MF nº 2.098, de 30 de dezembro de 2024",
            casas: [
                { nome: "BETMGM", dominio: "betmgm.bet.br" },
                { nome: "MGM", dominio: "mgm.bet.br" }
            ]
        },
        // BETSPEED LTDA
        {
            empresa: "BETSPEED LTDA",
            cnpj: "56.061.524/0001-47",
            requerimento: "0037/2024",
            portaria: "SPA/MF nº 258, de 07 de fevereiro de 2025",
            casas: [
                { nome: "BETSPEED", dominio: "betspeed.bet.br" }
            ]
        },
        // BLOW MARKETPLACE LTDA
        {
            empresa: "BLOW MARKETPLACE LTDA",
            cnpj: "37.486.405/0001-91",
            requerimento: "0039/2024",
            portaria: "SPA/MF nº 468, de 10 de março de 2025",
            casas: [
                { nome: "BRAVO", dominio: "bravo.bet.br" },
                { nome: "TRADICIONAL", dominio: "tradicional.bet.br" },
                { nome: "APOSTALUDO", dominio: "apostaludo.bet.br" }
            ]
        },
        // LEVANTE BRASIL LTDA
        {
            empresa: "LEVANTE BRASIL LTDA",
            cnpj: "55.045.663/0001-14",
            requerimento: "0040/2024",
            portaria: "SPA/MF nº 259, de 07 de fevereiro de 2025",
            casas: [
                { nome: "SORTE ONLINE", dominio: "sorteonline.bet.br" },
                { nome: "LOTOLAND", dominio: "lotoland.bet.br" }
            ]
        },
        // DIGIPLUS BRAZIL INTERACTIVE LTDA
        {
            empresa: "DIGIPLUS BRAZIL INTERACTIVE LTDA",
            cnpj: "56.060.798/0001-11",
            requerimento: "0041/2024",
            portaria: "SPA/MF nº 2.099, de 30 de dezembro de 2024",
            casas: [
                { nome: "ARENAPLUS", dominio: "arenaplus.bet.br" }
            ]
        },
        // PIXBET SOLUÇÕES TECNOLÓGICAS LTDA.
        {
            empresa: "PIXBET SOLUÇÕES TECNOLÓGICAS LTDA.",
            cnpj: "40.633.348/0001-30",
            requerimento: "0042/2024",
            portaria: "SPA/MF nº 806, de 14 de abril de 2025",
            casas: [
                { nome: "PIXBET", dominio: "pix.bet.br" },
                { nome: "FLABET", dominio: "fla.bet.br" },
                { nome: "BET DA SORTE", dominio: "betdasorte.bet.br" }
            ]
        },
        // BETBR LOTERIAS LTDA
        {
            empresa: "BETBR LOTERIAS LTDA",
            cnpj: "55.881.028/0001-77",
            requerimento: "0045/2024",
            portaria: "SPA/MF nº 373, de 24 de fevereiro de 2025",
            casas: [
                { nome: "APOSTOU", dominio: "apostou.bet.br" },
                { nome: "B1.BET", dominio: "b1bet.bet.br" },
                { nome: "BRBET", dominio: "brbet.bet.br" }
            ]
        },
        // GORILLAS GROUP DO BRASIL LTDA
        {
            empresa: "GORILLAS GROUP DO BRASIL LTDA",
            cnpj: "37.456.039/0001-28",
            requerimento: "0046/2024",
            portaria: "SPA/MF nº 469, de 10 de março de 2025",
            casas: [
                { nome: "BET GORILLAS", dominio: "betgorillas.bet.br" },
                { nome: "BET BUFFALOS", dominio: "betbuffalos.bet.br" },
                { nome: "BET FALCONS", dominio: "betfalcons.bet.br" }
            ]
        },
        // A2FBR LTDA - EXCHANGE
        {
            empresa: "A2FBR LTDA",
            cnpj: "56.147.145/0001-74",
            requerimento: "0067/2024",
            portaria: "SPA/MF nº 2.101, de 30 de dezembro de 2024",
            casas: [
                { nome: "BETBRA", dominio: "betbra-br.com", tipo: "exchange" },
                { nome: "BOLSA DE APOSTA", dominio: "bolsadeaposta.bet.br", tipo: "exchange" }
            ]
        },
        // RKN Gaming N.V.
        {
            empresa: "RKN Gaming N.V.",
            cnpj: "56.636.543/0001-54", // CNPJ temporário - substituir pelo real
            requerimento: "0029/2024",
            portaria: "SPA/MF nº 255, de 07 de fevereiro de 2025",
            casas: [
                { nome: "CASA DE APOSTAS", dominio: "casadeapostas.bet.br", tipo: "exchange" }
            ]
        }
    ];

    // Preenche o select de empresas
    function populateCompanySelect() {
        const companySelect = document.getElementById('companySelect');
        const uniqueCompanies = [...new Set(casasRegulamentadas.map(item => item.empresa))];
        
        uniqueCompanies.sort().forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company;
            companySelect.appendChild(option);
        });
    }

    // Renderiza as casas de apostas
    function renderCasas(casasData = casasRegulamentadas, groupByCompany = true) {
        const container = document.getElementById('regCasasContainer');
        container.innerHTML = '';
        
        if (groupByCompany) {
            // Agrupar por empresa
            casasData.forEach(company => {
                const companySection = document.createElement('div');
                companySection.className = 'company-section';
                
                // Cabeçalho da empresa
                const companyHeader = document.createElement('div');
                companyHeader.className = 'company-info';
                
                companyHeader.innerHTML = `
                    <div class="company-logo">
                        <i class="fas fa-building"></i>
                    </div>
                    <div class="company-details">
                        <h4>${company.empresa}</h4>
                        <p>CNPJ: ${company.cnpj} | Portaria: ${company.portaria}</p>
                    </div>
                `;
                
                companySection.appendChild(companyHeader);
                
                // Container para as casas desta empresa
                const casasContainer = document.createElement('div');
                casasContainer.className = 'reg-casas-container';
                
                // Adiciona cada casa de aposta
                company.casas.forEach(casa => {
                    const casaCard = createCasaCard(casa, company);
                    casasContainer.appendChild(casaCard);
                });
                
                companySection.appendChild(casasContainer);
                container.appendChild(companySection);
            });
        } else {
            // Lista plana de todas as casas
            const allCasas = [];
            
            casasData.forEach(company => {
                company.casas.forEach(casa => {
                    allCasas.push({
                        casa: casa,
                        company: company
                    });
                });
            });
            
            allCasas.forEach(item => {
                const casaCard = createCasaCard(item.casa, item.company);
                container.appendChild(casaCard);
            });
        }
    }
    
    // Cria um card para uma casa de apostas
    function createCasaCard(casa, company) {
        const casaCard = document.createElement('div');
        casaCard.className = 'casa-card';
        
        // Verificar se é do tipo exchange para aplicar classe especial
        if (casa.tipo === 'exchange') {
            casaCard.classList.add('exchange-card');
        }
        
        // Criar badge para exchange
        const exchangeBadge = casa.tipo === 'exchange' ? 
            `<span class="exchange-badge">Exchange</span>` : '';
        
        casaCard.innerHTML = `
            <div class="casa-card-header ${casa.tipo === 'exchange' ? 'exchange-header' : ''}">
                <h4>${casa.nome}</h4>
                <div class="casa-card-detail" data-casa="${casa.nome}" data-company="${company.empresa}">
                    <i class="fas fa-info-circle"></i>
                </div>
            </div>
            <div class="casa-card-body">
                <div class="casa-card-info">
                    <p><i class="fas fa-building"></i> ${company.empresa}</p>
                    <p><i class="fas fa-globe"></i> ${casa.dominio}</p>
                    ${casa.tipo === 'exchange' ? `<p><i class="fas fa-exchange-alt"></i> Tipo: Exchange</p>` : ''}
                </div>
                <a href="https://${casa.dominio}" class="casa-card-link" target="_blank">Visitar Site</a>
            </div>
            ${exchangeBadge}
        `;
        
        // Adiciona listener para o botão de detalhes
        const detailBtn = casaCard.querySelector('.casa-card-detail');
        detailBtn.addEventListener('click', () => {
            showCasaDetails(casa, company);
        });
        
        return casaCard;
    }
    
    // Mostra detalhes da casa no modal
    function showCasaDetails(casa, company) {
        const modal = document.getElementById('casaDetailModal');
        
        // Preenche os dados no modal
        document.getElementById('modalCasaName').textContent = casa.nome;
        document.getElementById('modalCasaNome').textContent = casa.nome;
        document.getElementById('modalCasaEmpresa').textContent = company.empresa;
        document.getElementById('modalCasaCNPJ').textContent = company.cnpj;
        document.getElementById('modalCasaSite').textContent = casa.dominio;
        document.getElementById('modalCasaSite').href = `https://${casa.dominio}`;
        document.getElementById('modalCasaPortaria').textContent = company.portaria;
        document.getElementById('modalCasaLink').href = `https://${casa.dominio}`;
        
        // Logo placeholder
        document.getElementById('modalCasaLogo').src = '/images/default-logo.png';
        
        // Abre o modal
        modal.style.display = 'block';
    }
    
    // Filtra as casas por empresa
    function filterByCompany(companyName) {
        if (companyName === 'todas') {
            renderCasas();
            return;
        }
        
        const filteredData = casasRegulamentadas.filter(company => company.empresa === companyName);
        renderCasas(filteredData);
    }
    
    // Pesquisa casas por nome
    function searchCasas(query) {
        if (!query || query.trim() === '') {
            renderCasas();
            return;
        }
        
        query = query.toLowerCase();
        
        // Filtra empresas que contenham casas que correspondam à pesquisa
        const filteredData = casasRegulamentadas.map(company => {
            const filteredCasas = company.casas.filter(casa =>
                casa.nome.toLowerCase().includes(query) ||
                casa.dominio.toLowerCase().includes(query)
            );
            
            if (filteredCasas.length > 0) {
                return {
                    ...company,
                    casas: filteredCasas
                };
            }
            
            return null;
        }).filter(company => company !== null);
        
        renderCasas(filteredData);
    }
    
    // Ordena por nome da casa
    function sortByName() {
        const sortedData = JSON.parse(JSON.stringify(casasRegulamentadas));
        
        sortedData.forEach(company => {
            company.casas.sort((a, b) => a.nome.localeCompare(b.nome));
        });
        
        renderCasas(sortedData);
    }
    
    // Ordena por nome da empresa
    function sortByCompany() {
        const sortedData = [...casasRegulamentadas].sort((a, b) => 
            a.empresa.localeCompare(b.empresa)
        );
        
        renderCasas(sortedData);
    }
    
    // Filtra apenas casas do tipo Exchange
    function filterExchanges() {
        const exchangesData = casasRegulamentadas.map(company => {
            const exchangeCasas = company.casas.filter(casa => casa.tipo === 'exchange');
            
            if (exchangeCasas.length > 0) {
                return {
                    ...company,
                    casas: exchangeCasas
                };
            }
            
            return null;
        }).filter(company => company !== null);
        
        renderCasas(exchangesData);
    }

    // Função para alternar estado do botão de Exchange
    function toggleExchangeFilter() {
        const btn = document.getElementById('filterExchange');
        const isActive = btn.classList.contains('active');
        
        if (isActive) {
            btn.classList.remove('active');
            renderCasas(); // Volta para visualização normal
        } else {
            btn.classList.add('active');
            filterExchanges(); // Filtra apenas exchanges
        }
    }
    
    // Event Listeners
    document.getElementById('companySelect').addEventListener('change', function() {
        filterByCompany(this.value);
    });
    
    document.getElementById('searchCasas').addEventListener('input', function() {
        searchCasas(this.value);
    });
    
    document.getElementById('sortByName').addEventListener('click', sortByName);
    document.getElementById('sortByCompany').addEventListener('click', sortByCompany);
    document.getElementById('filterExchange').addEventListener('click', toggleExchangeFilter);
    
    // Manipulação do Modal
    document.querySelectorAll('.close-modal, [data-modal-id]').forEach(element => {
        element.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal-id');
            if (modalId) {
                document.getElementById(modalId).style.display = 'none';
            }
        });
    });
    
    // Inicialização
    populateCompanySelect();
    renderCasas();
});
