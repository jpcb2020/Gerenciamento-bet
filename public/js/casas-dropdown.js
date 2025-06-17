// Dropdown personalizado para casas de apostas
document.addEventListener('DOMContentLoaded', function() {
    // Lista de casas de apostas
    const bettingHouses = [
        "BETANO", "SUPERBET", "REI DO PITACO", "SPORTINGBET", "BETBOO",
        "BIG", "APOSTAR", "BETNACIONAL", "KTO", "BETSSON",
        "GALERA.BET", "F12.BET", "LUVA.BET", "SPORTYBET", "ESTRELABET",
        "REALS", "UX", "BETFAIR", "7GAMES", "BETAO",
        "R7", "HIPERBET", "NOVIBET", "SEGURO BET", "KING PANDA",
        "9F", "6R", "BET.APP", "FOGO777", "P9",
        "BET365", "APOSTA GANHA", "BRAZINO777", "4WIN", "4PLAY",
        "PAGOL", "SEUBET", "H2 BET", "VBET", "CASA DE APOSTAS",
        "BETSUL", "ESPORTES DA SORTE", "ONABET", "BETFAST", "FAZ1BET",
        "TIVOBET", "SUPREMABET", "MAXIMABET", "XPBET", "BETESPORTE",
        "LANCE DE SORTE", "BETMGM", "BRAVO", "TRADICIONAL", "SORTE ONLINE",
        "PIXBET", "FLABET", "BET DA SORTE", "APOSTOU", "B1.BET",
        "BRBET", "BET GORILLAS", "BET BUFFALOS", "BET FALCONS", "BETBRA",
        "BOLSA DE APOSTA", "CASA DE APOSTAS", "FULLTBET", "STAKE", "BATEU BET",
        "HANZBET", "ESPORTIVA BET", "BETWARRIOR", "SORTENABET", "BETOU",
        "BETFUSION", "BANDBET", "AFUN", "6Z", "BLAZE",
        "JONBET", "7K", "CASSINO", "VERA", "UPBETBR",
        "9D", "WJCASINO", "ALFA.BET", "MMA", "BETVIP",
        "PAPIGAMES", "BET4", "APOSTA BET", "FAZ O BET", "ESPORTIVAVIP",
        "CBESPORTES", "DONOSDABOLA", "BR4BET", "GOL DE BET", "LOTOGREEN",
        "PINNACLE", "MATCHBOOK", "APOSTA1", "APOSTAMAX", "GINGABET",
        "QGBET", "VIVASORTE", "BACANAPLAY", "PLAYUZU", "BRASIL DA SORTE",
        "MULTIBET", "RICOBET", "BRXBET", "SPIN", "OLEYBET",
        "BETPARK", "MERIDIANBET", "LUCK.BET", "1 PRA 1", "STARTBET",
        "ESPORTE 365", "BET AKI", "JOGO DE OURO", "LÍDERBET", "GERALBET",
        "B2XBET", "BULLSBET", "JOGÃO", "BET.BET", "DONALDBET",
        "RIVALO", "A247", "MCGAMES"
    ];
    
    const input = document.getElementById('houseName');
    const dropdown = document.getElementById('houseNameDropdown');
    const logoInput = document.getElementById('houseLogo');
    
    // Verificar se os elementos existem
    if (!input || !dropdown || !logoInput) {
        console.warn('Elementos do dropdown não encontrados');
        return;
    }
    
    // Mapeamento de nomes para arquivos de logo
    const logoMapping = {
        "BETANO": "Betano.png",
        "SUPERBET": "Superbet.png",
        "REI DO PITACO": "Reidopitaco.png",
        "SPORTINGBET": "sportingbet.png",
        "BETBOO": "Betboo.jpg",
        "BIG": "Big.png",
        "APOSTAR": "Apostar.webp",
        "BETNACIONAL": "Betnacional.png",
        "KTO": "KTO.png",
        "BETSSON": "Betsson.png",
        "GALERA.BET": "Galera.bet.png",
        "F12.BET": "F12.bet.png",
        "LUVA.BET": "Luva.bet.png",
        "SPORTYBET": "SPORTYBET.png",
        "ESTRELABET": "ESTRELABET.png",
        "REALS": "Reals.jpg",
        "UX": "UX.png",
        "BETFAIR": "BETFAIR.png",
        "7GAMES": "7GAMES.jpg",
        "BETAO": "BETAO.png",
        "R7": "R7.jpg",
        "HIPERBET": "HIPERBET.jpg",
        "NOVIBET": "NOVIBET.png",
        "SEGURO BET": "SEGURO BET.jpg",
        "KING PANDA": "KING PANDA.jpg",
        "9F": "9F bet.png",
        "6R": "6R bet.jpg",
        "FOGO777": "FOGO777.png",
        "P9": "P9 bet.jpg",
        "BET365": "BET365.png",
        "APOSTA GANHA": "APOSTA GANHA.png",
        "BRAZINO777": "BRAZINO777.png",
        "4WIN": "4win bet.jpg",
        "4PLAY": "4PLAY bet.png",
        "PAGOL": "Pagol.png",
        "SEUBET": "SEUBET.jpg",
        "H2 BET": "H2 BET.jpg",
        "VBET": "VBET.png",
        "CASA DE APOSTAS": "CASA DE APOSTAS.jpg",
        "BETSUL": "BETSUL.png",
        "ESPORTES DA SORTE": "ESPORTES DA SORTE.png",
        "ONABET": "ONABET.png",
        "BETFAST": "BETFAST.jpg",
        "FAZ1BET": "FAZ1BET.png",
        "TIVOBET": "tivobet.png",
        "SUPREMABET": "SUPREMABET.png",
        "MAXIMABET": "MAXIMABET.png",
        "XPBET": "XPBET.jpg",
        "BETESPORTE": "BETESPORTE.jpg",
        "LANCE DE SORTE": "LANCE DE SORTE.png",
        "BETMGM": "BETMGM.jpg",
        "BRAVO": "BRAVO.png",
        "TRADICIONAL": "TRADICIONAL.jpg",
        "SORTE ONLINE": "SORTE ONLINE.png",
        "PIXBET": "PIXBET.png",
        "FLABET": "FLABET.png",
        "BET DA SORTE": "BET DA SORTE.webp",
        "APOSTOU": "APOSTOU.jpg",
        "B1.BET": "B1.BET.png",
        "BRBET": "BRBET.jpg",
        "BET GORILLAS": "BET GORILLAS.png",
        "BETBRA": "BETBRA.png",
        "BOLSA DE APOSTA": "BOLSA DE APOSTA.jpg",
        "FULLTBET": "FULLTBET.jpg",
        "STAKE": "STAKE.png",
        "BATEU BET": "BATEU BET.png",
        "HANZBET": "HANZBET.png",
        "ESPORTIVA BET": "ESPORTIVA BET.png",
        "BETWARRIOR": "BETWARRIOR.png",
        "SORTENABET": "SORTENABET.png",
        "BETOU": "BETOU.png",
        "BETFUSION": "BETFUSION.png",
        "BANDBET": "BANDBET.png",
        "AFUN": "AFUN.jpg",
        "6Z": "6Z.png",
        "BLAZE": "BLAZE.png",
        "JONBET": "JONBET.png",
        "7K": "7K.jpg",
        "CASSINO": "CASSINO.jpg",
        "VERA": "VERA.png",
        "UPBETBR": "UPBETBR.jpg",
        "9D": "9D.png",
        "WJCASINO": "WJCASINO.jpg",
        "ALFA.BET": "ALFA.BET.png",
        "MMA": "MMA.png",
        "BETVIP": "BETVIP.png",
        "PAPIGAMES": "PAPIGAMES.png",
        "BET4": "BET4.png",
        "APOSTA BET": "APOSTA BET.svg",
        "FAZ O BET": "FAZ O BET.png",
        "ESPORTIVAVIP": "ESPORTIVAVIP.jpg",
        "CBESPORTES": "CBESPORTES.png",
        "DONOSDABOLA": "DONOSDABOLA.png",
        "BR4BET": "BR4BET.jpg",
        "GOL DE BET": "GOL DE BET.png",
        "LOTOGREEN": "LOTOGREEN.jpg",
        "PINNACLE": "PINNACLE.webp",
        "MATCHBOOK": "MATCHBOOK.jpg",
        "APOSTA1": "APOSTA1.png",
        "APOSTAMAX": "APOSTAMAX.png",
        "GINGABET": "GINGABET.jpg",
        "QGBET": "QGBET.png",
        "VIVASORTE": "VIVASORTE.jpg",
        "BACANAPLAY": "BACANAPLAY.png",
        "PLAYUZU": "PLAYUZU.png",
        "BRASIL DA SORTE": "BRASIL DA SORTE.jpg",
        "MULTIBET": "MULTIBET.png",
        "RICOBET": "RICOBET.png",
        "BRXBET": "BRXBET.png",
        "SPIN": "SPIN.jpg",
        "OLEYBET": "OLEYBET.png",
        "BETPARK": "BETPARK.png",
        "MERIDIANBET": "MERIDIANBET.jpg",
        "LUCK.BET": "LUCK.BET.png",
        "1 PRA 1": "1 PRA 1.png",
        "STARTBET": "STARTBET.png",
        "ESPORTE 365": "ESPORTE 365.png",
        "BET AKI": "BET AKI.png",
        "JOGO DE OURO": "JOGO DE OURO.png",
        "LÍDERBET": "LÍDERBET.jpg",
        "GERALBET": "GERALBET.jpg",
        "B2XBET": "B2XBET.png",
        "BULLSBET": "BULLSBET.png",
        "JOGÃO": "JOGÃO.png",
        "BET.BET": "BET.BET.png",
        "DONALDBET": "DONALDBET.png",
        "RIVALO": "RIVALO.png",
        "A247": "A247.png",
        "MCGAMES": "MCGAMES.png"
    };
    
    // Função para obter o caminho do logo
    function getLogoPath(houseName) {
        const logoFile = logoMapping[houseName.toUpperCase()];
        return logoFile ? `/images/logos/${logoFile}` : '/images/bet-default-icon.png';
    }
    
    // Função para popular o dropdown
    function populateDropdown(filter = '') {
        dropdown.innerHTML = '';
        
        const filteredHouses = filter
            ? bettingHouses.filter(house => house.toLowerCase().startsWith(filter.toLowerCase()))
            : bettingHouses;
        
        filteredHouses.forEach(house => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = house;
            item.addEventListener('click', function() {
                input.value = house;
                logoInput.value = getLogoPath(house);
                hideDropdown();
            });
            dropdown.appendChild(item);
        });
        
        if (filteredHouses.length > 0) {
            showDropdown();
        } else {
            hideDropdown();
        }
    }
    
    // Mostrar dropdown
    function showDropdown() {
        dropdown.classList.add('show');
    }
    
    // Esconder dropdown
    function hideDropdown() {
        dropdown.classList.remove('show');
    }
    
    // Mostrar dropdown quando o input recebe foco
    input.addEventListener('focus', function() {
        populateDropdown(input.value);
    });
    
    // Filtrar quando o usuário digita
    input.addEventListener('input', function() {
        populateDropdown(input.value);
    });
    
    // Esconder dropdown quando clicar fora
    document.addEventListener('click', function(event) {
        if (!input.contains(event.target) && !dropdown.contains(event.target)) {
            hideDropdown();
        }
    });
    
    // Prevenção de propagação para evitar que o dropdown feche quando clicar nele
    dropdown.addEventListener('click', function(event) {
        event.stopPropagation();
    });
});